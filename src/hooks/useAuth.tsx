"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getDiscordId, isUserWhitelisted, hasValidTrial } from "@/lib/utils";
import type { AuthState, AuthUser, AuthSession } from "@/types/auth";
import type { User } from "@/types/database";
import { useRouter } from "next/navigation";
import { withTimeout } from "@/lib/timeout";

// Define auth context with extended functionality
const AuthContext = createContext<
  AuthState & {
    signInWithDiscord: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUserData: () => Promise<void>;
    isLoading: boolean;
    isRefreshing: boolean;
    lastUpdated: number | null;
    error: Error | null;
  }
>({
  user: null,
  session: null,
  loading: true,
  hasAccess: false,
  isTrialActive: false,
  signInWithDiscord: async () => {},
  signOut: async () => {},
  refreshUserData: async () => {},
  isLoading: true,
  isRefreshing: false,
  lastUpdated: null,
  error: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Configuration constants
const AUTH_CACHE_KEY = "auth_cache";
const AUTH_CACHE_TTL = 0 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

// Enhanced LoadingSpinner component with proper sizing
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-16 w-16"
  };

  return (
    <div className="relative">
      <div className={`animate-spin rounded-full border-t-4 border-b-4 border-[#ffd700] ${sizeClasses[size]}`}></div>
      <div className={`absolute inset-0 animate-ping rounded-full border-2 border-[#ffd700]/30 ${sizeClasses[size]}`}></div>
    </div>
  );
}

// Error boundary component for auth failures
export function AuthErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  // Reset error state when children change
  useEffect(() => {
    if (hasError) {
      setHasError(false);
    }
  }, [children]);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c0c0c] via-[#1a1a2e] to-[#16213e]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Authentication Error</h2>
          <p className="text-white/70 mb-6">Something went wrong with authentication. Please try refreshing the page.</p>
          <button
            onClick={() => {
              setHasError(false);
              window.location.reload();
            }}
            className="bg-[#ffd700] hover:bg-[#ffc400] text-black px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  try {
    return <>{children}</>;
  } catch (error) {
    console.error("Auth error caught by boundary:", error);
    setHasError(true);
    return null;
  }
}

// User data interface for type safety
interface UserData {
  hub_trial: boolean;
  revoked: boolean;
  trial_expiration: string | null;
}

// Optimized user data fetching hook
export function useUserData() {
  const { user, loading } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const supabase = createClient();

  const fetchUserData = useCallback(async () => {
    if (!user || loading) return;

    setIsDataLoading(true);

    try {
      const discordId = getDiscordId(user);
      if (!discordId) return;

      const { data, error } = await withTimeout(
        supabase
          .from("users")
          .select("hub_trial, revoked, trial_expiration")
          .eq("discord_id", discordId)
          .single()
      );

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user data:", error);
        return;
      }

      setUserData(
        data || { hub_trial: false, revoked: true, trial_expiration: null }
      );
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setIsDataLoading(false);
    }
  }, [user, loading, supabase]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return { userData, isDataLoading, refetch: fetchUserData };
}

// Page-level authentication wrapper
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c0c0c] via-[#1a1a2e] to-[#16213e]">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    return <Component {...props} />;
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  // Enhanced state management
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    hasAccess: false,
    isTrialActive: false,
  });

  // Additional state for advanced features
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Refs for tracking retry attempts and intervals
  const retryAttemptsRef = useRef(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadAttemptedRef = useRef(false);
  const realtimeChannelRef = useRef<any>(null);

  const supabase = createClient();

  // Memoized supabase client to prevent recreation
  const memoizedSupabase = useMemo(() => createClient(), []);

  // Load cached auth data on initial render
  useEffect(() => {
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        console.log("Cached auth data found:", data);
        const isExpired = Date.now() - timestamp > AUTH_CACHE_TTL;

        if (!isExpired && data.user) {
          console.log("Using cached auth data");
          setState({
            user: data.user,
            session: data.session,
            loading: false,
            hasAccess: data.hasAccess,
            isTrialActive: data.isTrialActive,
          });
          setLastUpdated(timestamp);

          // Still refresh in background to ensure data is current
          refreshUserDataInternal(data.session);
        }
      }
    } catch (error) {
      console.error("Error loading cached auth data:", error);
      // Continue with normal auth flow if cache fails
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  // Check user access with retry mechanism - memoized for performance
  const checkUserAccess = useCallback(async (
    user: AuthUser,
    attempt = 1
  ): Promise<{ hasAccess: boolean; isTrialActive: boolean }> => {
    const discordId = getDiscordId(user);
    if (!discordId) return { hasAccess: false, isTrialActive: false };

    try {
      const { data, error } = await withTimeout(
        memoizedSupabase
          .from("users")
          .select("revoked, hub_trial, trial_expiration")
          .eq("discord_id", discordId)
          .single()
      );

      if (error) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
          console.warn(`Retry attempt ${attempt} for user access check`);
          await new Promise((resolve) =>
            setTimeout(resolve, RETRY_DELAY * attempt)
          );
          return checkUserAccess(user, attempt + 1);
        }
        throw error;
      }

      const isTrialActive = hasValidTrial(data);
      const hasAccess = isUserWhitelisted(data);

      return { hasAccess, isTrialActive };
    } catch (error) {
      console.error("Error checking user access:", error);
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to check user access")
      );
      return { hasAccess: false, isTrialActive: false };
    }
  }, [memoizedSupabase]);

  // Refresh user data with optimized approach - memoized
  const refreshUserDataInternal = useCallback(async (
    session: AuthSession | null = null
  ) => {
    if (!session && !state.session?.user) return;

    const currentUser = session?.user || state.session?.user;
    if (!currentUser) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const { hasAccess, isTrialActive } = await checkUserAccess(
        currentUser as AuthUser
      );

      const newState = {
        user: currentUser as AuthUser,
        session: session || state.session,
        loading: false,
        hasAccess,
        isTrialActive,
      };

      setState(newState);
      setLastUpdated(Date.now());

      // Cache the updated auth data
      localStorage.setItem(
        AUTH_CACHE_KEY,
        JSON.stringify({
          data: newState,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Error refreshing user data:", error);
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to refresh user data")
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [state.session, checkUserAccess]);

  // Public refresh method - memoized to prevent recreation
  const refreshUserData = useCallback(async () => {
    await refreshUserDataInternal();
  }, [refreshUserDataInternal]);

  // Sign in with Discord - memoized
  const signInWithDiscord = useCallback(async () => {
    try {
      setError(null);
      const { error } = await withTimeout(
        memoizedSupabase.auth.signInWithOAuth({
          provider: "discord",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })
      );
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Discord:", error);
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to sign in with Discord")
      );
    }
  }, [memoizedSupabase]);

  // Sign out with cleanup - memoized
  const signOut = useCallback(async () => {
    try {
      setError(null);
      
      // Clean up realtime subscription before signing out
      if (realtimeChannelRef.current) {
        memoizedSupabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }

      const { error } = await withTimeout(memoizedSupabase.auth.signOut());
      if (error) throw error;

      // Clear auth cache
      localStorage.removeItem(AUTH_CACHE_KEY);
      localStorage.removeItem("profile_data_cache");
      localStorage.removeItem("blueprints_cache");

      // Reset state
      setState({
        user: null,
        session: null,
        loading: false,
        hasAccess: false,
        isTrialActive: false,
      });

      setLastUpdated(null);

      // Clear any active intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }

      // Redirect to homepage & refresh since next.js uses soft navigations by default
      if (router) {
        router.push("/");
        router.refresh();
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error signing out:", error);
      setError(
        error instanceof Error ? error : new Error("Failed to sign out")
      );
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [memoizedSupabase, router]);

  // Define getSession at component level - memoized and stabilized
  const getSession = useCallback(async () => {
    console.log("getSession called");
    try {
      setState((prev) => ({ ...prev, loading: true }));
      setError(null);

      const {
        data: { session },
        error,
      } = await withTimeout(memoizedSupabase.auth.getSession());

      if (error) {
        throw error;
      }

      if (session?.user) {
        const { hasAccess, isTrialActive } = await checkUserAccess(
          session.user as AuthUser
        );

        const newState = {
          user: session.user as AuthUser,
          session: session as AuthSession,
          loading: false,
          hasAccess,
          isTrialActive,
        };

        setState(newState);
        setLastUpdated(Date.now());

        // Cache the auth data
        localStorage.setItem(
          AUTH_CACHE_KEY,
          JSON.stringify({
            data: newState,
            timestamp: Date.now(),
          })
        );
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
      
      // Reset retry attempts on successful session
      retryAttemptsRef.current = 0;
      
    } catch (error) {
      console.error("Error in getSession:", error);
      setState((prev) => ({ ...prev, loading: false }));
      setError(
        error instanceof Error ? error : new Error("Failed to get session")
      );

      // Retry logic
      if (retryAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
        retryAttemptsRef.current++;
        setTimeout(getSession, RETRY_DELAY * retryAttemptsRef.current);
      } else {
        // After max retries, ensure loading is set to false
        setState((prev) => ({ ...prev, loading: false }));
        console.error(
          "Max retry attempts reached in getSession. Stopping further retries and setting loading to false."
        );
      }
    }
  }, [memoizedSupabase, checkUserAccess]);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;
    
    if (mounted) {
      getSession();
    }

    // Set up auth state change listener with error handling
    const {
      data: { subscription },
    } = memoizedSupabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log("Auth state change:", event);
      
      if (event === "INITIAL_SESSION" && session?.user) {
        // Only track login if we're on the OAuth callback URL with success parameter
        const isSuccessfulAuth =
          typeof window !== 'undefined' && window.location.search.includes("?auth=success");

        if (isSuccessfulAuth) {
          const discordId = getDiscordId(session.user);
          const username = session.user.user_metadata?.full_name;

          if (discordId) {
            try {
              await memoizedSupabase.rpc("upsert_user_login", {
                target_discord_id: discordId,
                user_name: username,
              });

              // Remove the auth parameter from URL without page refresh
              const newUrl = window.location.pathname;
              router.replace(newUrl);
            } catch (error) {
              console.error("Error tracking login:", error);
            }
          }
        }

        const { hasAccess, isTrialActive } = await checkUserAccess(
          session.user as AuthUser
        );

        const newState = {
          user: session.user as AuthUser,
          session: session as AuthSession,
          loading: false,
          hasAccess,
          isTrialActive,
        };

        setState(newState);

        // Only update timestamp if auth state actually changed
        const authStateChanged =
          !state.session?.user?.id ||
          state.session.user.id !== session.user.id ||
          state.hasAccess !== hasAccess ||
          state.isTrialActive !== isTrialActive;

        if (authStateChanged) {
          setLastUpdated(Date.now());

          // Cache the auth data
          localStorage.setItem(
            AUTH_CACHE_KEY,
            JSON.stringify({
              data: newState,
              timestamp: Date.now(),
            })
          );
        }
      } else if (event === "SIGNED_OUT") {
        // Clean up realtime subscription
        if (realtimeChannelRef.current) {
          memoizedSupabase.removeChannel(realtimeChannelRef.current);
          realtimeChannelRef.current = null;
        }

        // Clear auth cache
        localStorage.removeItem(AUTH_CACHE_KEY);
        localStorage.removeItem("profile_data_cache");
        localStorage.removeItem("blueprints_cache");

        setState({
          user: null,
          session: null,
          loading: false,
          hasAccess: false,
          isTrialActive: false,
        });

        setLastUpdated(null);

        // Clear refresh interval
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      // Clean up realtime subscription
      if (realtimeChannelRef.current) {
        memoizedSupabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [getSession, memoizedSupabase, router, checkUserAccess]);

  // Set up real-time subscription for user access changes with better error handling
  useEffect(() => {
    if (!state.user) {
      // Clean up existing subscription if user is not present
      if (realtimeChannelRef.current) {
        memoizedSupabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    const discordId = getDiscordId(state.user);
    if (!discordId) return;

    // Clean up existing subscription before creating new one
    if (realtimeChannelRef.current) {
      memoizedSupabase.removeChannel(realtimeChannelRef.current);
    }

    try {
      const channel = memoizedSupabase
        .channel(`user-access-changes-${discordId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "users",
            filter: `discord_id=eq.${discordId}`,
          },
          async (payload) => {
            console.log("Real-time user access change detected:", payload);
            try {
              await refreshUserDataInternal();
            } catch (error) {
              console.error("Error handling real-time update:", error);
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error("Real-time subscription error:", err);
            // Don't throw error, just log it
          } else {
            console.log("Real-time subscription status:", status);
          }
        });

      realtimeChannelRef.current = channel;
    } catch (error) {
      console.error("Error setting up real-time subscription:", error);
      // Continue without real-time updates if subscription fails
    }

    return () => {
      if (realtimeChannelRef.current) {
        memoizedSupabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [state.user, memoizedSupabase, refreshUserDataInternal]);

  // Ensures user loading is false whenever there is a user
  useEffect(() => {
    if (state.user && state.loading) {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state.user, state.loading]);

  // Memoize auth context value to prevent unnecessary provider re-renders
  const authContextValue = useMemo(() => ({
    user: state.user,
    session: state.session,
    loading: state.loading,
    hasAccess: state.hasAccess,
    isTrialActive: state.isTrialActive,
    signInWithDiscord,
    signOut,
    refreshUserData,
    isLoading: state.loading,
    isRefreshing,
    lastUpdated,
    error,
  }), [
    state.user,
    state.session,
    state.loading,
    state.hasAccess,
    state.isTrialActive,
    signInWithDiscord,
    signOut,
    refreshUserData,
    isRefreshing,
    lastUpdated,
    error,
  ]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}