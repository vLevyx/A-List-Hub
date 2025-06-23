"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
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
const AUTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

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

  const supabase = createClient();

  // Load cached auth data on initial render
  useEffect(() => {
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        console.log(data);
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

  // Check user access with retry mechanism
  const checkUserAccess = async (
    user: AuthUser,
    attempt = 1
  ): Promise<{ hasAccess: boolean; isTrialActive: boolean }> => {
    const discordId = getDiscordId(user);
    if (!discordId) return { hasAccess: false, isTrialActive: false };

    try {
      const { data, error } = await withTimeout(
        supabase
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
  };

  // Refresh user data with optimized approach
  const refreshUserDataInternal = async (
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
  };

  // Public refresh method
  const refreshUserData = async () => {
    await refreshUserDataInternal();
  };

  // Sign in with Discord
  const signInWithDiscord = async () => {
    try {
      setError(null);
      const { error } = await withTimeout(
        supabase.auth.signInWithOAuth({
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
  };

  // Sign out with cleanup
  const signOut = async () => {
    try {
      setError(null);
      const { error } = await withTimeout(supabase.auth.signOut());
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
  };

  // Initialize auth state
  useEffect(() => {
    // if (initialLoadAttemptedRef.current) {
    //   setState((prev) => ({ ...prev, loading: false }));
    //   return;
    // }

    // initialLoadAttemptedRef.current = true;

    const getSession = async () => {
      console.log("called");
      try {
        setState((prev) => ({ ...prev, loading: true }));
        setError(null);

        const {
          data: { session },
          error,
        } = await withTimeout(supabase.auth.getSession());

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
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    if (typeof window !== "undefined") {
      getSession();
    }

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
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

        // Track login
        const discordId = getDiscordId(session.user);
        const username =
          session.user.user_metadata?.full_name || "Discord User";

        if (discordId) {
          await withTimeout(
            supabase.rpc("upsert_user_login", {
              target_discord_id: discordId,
              user_name: username,
            })
          );
        }

        //Silently refresh or reload screen since nextjs uses soft navigations
        if (router) {
          router.refresh();
        } else {
          window.location.reload();
        }

        // Cache the auth data
        localStorage.setItem(
          AUTH_CACHE_KEY,
          JSON.stringify({
            data: newState,
            timestamp: Date.now(),
          })
        );

        // Set up periodic refresh
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }

        refreshIntervalRef.current = setInterval(() => {
          refreshUserDataInternal();
        }, AUTH_CACHE_TTL);
      } else if (event === "SIGNED_OUT") {
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
      subscription.unsubscribe();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Set up real-time subscription for user access changes
  useEffect(() => {
    if (!state.user) return;

    const discordId = getDiscordId(state.user);
    if (!discordId) return;

    const channel = supabase
      .channel("user-access-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `discord_id=eq.${discordId}`,
        },
        async () => {
          await refreshUserDataInternal();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.user]);

  //Ensures user loading is false whenever there is a user
  useEffect(() => {
    if (state.user && state.loading) {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [state.user, state.loading]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithDiscord,
        signOut,
        refreshUserData,
        isLoading: state.loading,
        isRefreshing,
        lastUpdated,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
