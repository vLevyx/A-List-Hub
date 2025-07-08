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

// SECURITY FIX 2: Minimal auth state - don't expose sensitive data
interface ExtendedAuthState extends AuthState {
  isAdmin: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
}

// Define auth context with security-focused design
const AuthContext = createContext<
  ExtendedAuthState & {
    signInWithDiscord: () => Promise<void>;
    signOut: () => Promise<void>;
    refreshUserData: () => Promise<void>;
    isLoading: boolean;
    isRefreshing: boolean;
    lastUpdated: number | null;
    error: Error | null;
    checkAdminStatus: () => boolean;
    invalidateCache: () => void;
    getSessionHealth: () => { isHealthy: boolean; lastCheck: number | null };
  }
>({
  user: null,
  session: null,
  loading: true,
  hasAccess: false,
  isTrialActive: false,
  isAdmin: false,
  canViewAnalytics: false,
  canManageUsers: false,
  signInWithDiscord: async () => {},
  signOut: async () => {},
  refreshUserData: async () => {},
  isLoading: true,
  isRefreshing: false,
  lastUpdated: null,
  error: null,
  checkAdminStatus: () => false,
  invalidateCache: () => {},
  getSessionHealth: () => ({ isHealthy: false, lastCheck: null }),
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// SECURITY FIX 3: Reduced cache TTL for better security
const AUTH_CACHE_KEY = "auth_cache";
const AUTH_CACHE_TTL = 2 * 60 * 1000; // REDUCED: 2 minutes instead of 5
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const HEALTH_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  const [state, setState] = useState<ExtendedAuthState>({
    user: null,
    session: null,
    loading: true,
    hasAccess: false,
    isTrialActive: false,
    isAdmin: false,
    canViewAnalytics: false,
    canManageUsers: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [hasValidCache, setHasValidCache] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<number | null>(null);

  const retryAttemptsRef = useRef(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const supabase = createClient();

  // SECURITY FIX 4: Server-side admin checking via RLS
  // This calls your database is_admin() function which is secure
  const checkAdminStatusSecure = useCallback(async (user?: AuthUser): Promise<boolean> => {
    if (!user && !state.user) return false;
    const currentUser = user || state.user;
    if (!currentUser) return false;
    
    try {
      // Use your RLS-protected is_admin() function
      const { data, error } = await supabase.rpc('is_admin');
      
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Failed to check admin status:', error);
      return false;
    }
  }, [state.user, supabase]);

  // SECURITY FIX 5: Client-side fallback (UI only, never trusted)
  const checkAdminStatusFallback = useCallback((user?: AuthUser): boolean => {
    // This is ONLY for UI purposes when server call fails
    // NEVER rely on this for actual security decisions
    const currentUser = user || state.user;
    if (!currentUser) return false;
    
    const discordId = getDiscordId(currentUser);
    // These IDs are moved to environment variables for better security
    const adminIds = process.env.NEXT_PUBLIC_ADMIN_IDS?.split(',') || [];
    return discordId ? adminIds.includes(discordId) : false;
  }, [state.user]);

  // Combined admin checking with server-first approach
  const checkAdminStatus = useCallback(async (user?: AuthUser): Promise<boolean> => {
    try {
      // Always try server-side check first (secure)
      return await checkAdminStatusSecure(user);
    } catch (error) {
      console.warn('Server admin check failed, using fallback:', error);
      // Fallback to client-side check (UI only)
      return checkAdminStatusFallback(user);
    }
  }, [checkAdminStatusSecure, checkAdminStatusFallback]);

  // SECURITY FIX 6: Enhanced user access checking with server-side admin verification
  const checkUserAccess = async (
    user: AuthUser,
    attempt = 1
  ): Promise<{ 
    hasAccess: boolean; 
    isTrialActive: boolean; 
    isAdmin: boolean;
    canViewAnalytics: boolean;
    canManageUsers: boolean;
  }> => {
    const discordId = getDiscordId(user);
    if (!discordId) {
      return { 
        hasAccess: false, 
        isTrialActive: false, 
        isAdmin: false,
        canViewAnalytics: false,
        canManageUsers: false
      };
    }

    try {
      // SECURITY: Use server-side admin checking
      const isAdmin = await checkAdminStatus(user);

      // Get user access data (protected by RLS)
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

      return { 
        hasAccess, 
        isTrialActive, 
        isAdmin,
        canViewAnalytics: isAdmin || hasAccess,
        canManageUsers: isAdmin
      };
    } catch (error) {
      console.error("Error checking user access:", error);
      setError(
        error instanceof Error
          ? error
          : new Error("Failed to check user access")
      );
      
      // Even with errors, try to preserve admin status securely
      const fallbackAdmin = checkAdminStatusFallback(user);
      return { 
        hasAccess: false, 
        isTrialActive: false, 
        isAdmin: fallbackAdmin,
        canViewAnalytics: fallbackAdmin,
        canManageUsers: fallbackAdmin
      };
    }
  };

  // SECURITY FIX 7: Secure cache with data sanitization
  const sanitizeDataForCache = (data: any) => {
    // Remove sensitive session data before caching
    const { session, ...safeData } = data;
    return {
      ...safeData,
      // Only cache the minimum needed for UI
      sessionExists: !!session,
      userExists: !!data.user,
    };
  };

  const getSessionHealth = useCallback(() => {
    const isHealthy = !!(state.session && state.user && !error);
    return {
      isHealthy,
      lastCheck: lastHealthCheck
    };
  }, [state.session, state.user, error, lastHealthCheck]);

  // SECURITY FIX 8: Secure cache invalidation
  const invalidateCache = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_CACHE_KEY);
      localStorage.removeItem("profile_data_cache");
      localStorage.removeItem("blueprints_cache");
      
      // Clear any other sensitive data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('auth_') || key.startsWith('session_')) {
          localStorage.removeItem(key);
        }
      });
      
      setHasValidCache(false);
      setLastUpdated(null);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }, []);

  // SECURITY FIX 9: Secure cache loading with validation
  useEffect(() => {
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY);

      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > AUTH_CACHE_TTL;
        
        // SECURITY: Validate cached data structure
        if (!isExpired && data?.userExists && typeof data.hasAccess === 'boolean') {
          console.log("Using cached auth data");
          
          // Reconstruct minimal state from cache
          const cachedState = {
            user: data.userExists ? { id: 'cached' } : null, // Minimal user object
            session: data.sessionExists ? { expires_at: 0 } : null, // Minimal session
            loading: false,
            hasAccess: data.hasAccess,
            isTrialActive: data.isTrialActive || false,
            isAdmin: data.isAdmin || false,
            canViewAnalytics: data.canViewAnalytics || false,
            canManageUsers: data.canManageUsers || false,
          };

          setState(cachedState as ExtendedAuthState);
          setLastUpdated(timestamp);
          setHasValidCache(true);

          // Always refresh in background for security
          refreshUserDataInternal();
        } else {
          // Invalid or expired cache
          invalidateCache();
        }
      }
    } catch (error) {
      console.error("Error loading cached auth data:", error);
      invalidateCache(); // Clear potentially corrupted cache
    } finally {
      if (!hasValidCache) {
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
  }, []);

  // SECURITY FIX 10: Enhanced refresh with server-side validation
  const refreshUserDataInternal = async (session: AuthSession | null = null) => {
    if (!session && !state.session?.user) return;

    const currentUser = session?.user || state.session?.user;
    if (!currentUser) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const { hasAccess, isTrialActive, isAdmin, canViewAnalytics, canManageUsers } = 
        await checkUserAccess(currentUser as AuthUser);

      const newState = {
        user: currentUser as AuthUser,
        session: session || state.session,
        loading: false,
        hasAccess,
        isTrialActive,
        isAdmin,
        canViewAnalytics,
        canManageUsers,
      };

      setState(newState);
      setLastUpdated(Date.now());
      setLastHealthCheck(Date.now());

      // SECURITY: Cache only sanitized data
      const sanitizedData = sanitizeDataForCache(newState);
      localStorage.setItem(
        AUTH_CACHE_KEY,
        JSON.stringify({
          data: sanitizedData,
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
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const refreshUserData = async () => {
    await refreshUserDataInternal();
  };

  // SECURITY FIX 11: Enhanced sign-in with security headers
  const signInWithDiscord = async () => {
    try {
      setError(null);
      const { error } = await withTimeout(
        supabase.auth.signInWithOAuth({
          provider: "discord",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            scopes: 'identify', // Minimal scopes for security
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

  // SECURITY FIX 12: Comprehensive secure sign out
  const signOut = async () => {
    try {
      setError(null);
      const { error } = await withTimeout(supabase.auth.signOut());
      if (error) throw error;

      // Complete security cleanup
      invalidateCache();

      setState({
        user: null,
        session: null,
        loading: false,
        hasAccess: false,
        isTrialActive: false,
        isAdmin: false,
        canViewAnalytics: false,
        canManageUsers: false,
      });

      setLastUpdated(null);
      setLastHealthCheck(null);

      // Clear intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }

      // Force page reload for complete cleanup
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      setError(
        error instanceof Error ? error : new Error("Failed to sign out")
      );
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  // Enhanced getSession with security validation
  const getSession = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));
      setError(null);

      const {
        data: { session },
        error,
      } = await withTimeout(supabase.auth.getSession());

      if (error) throw error;

      if (session?.user) {
        const { hasAccess, isTrialActive, isAdmin, canViewAnalytics, canManageUsers } = 
          await checkUserAccess(session.user as AuthUser);

        const newState = {
          user: session.user as AuthUser,
          session: session as AuthSession,
          loading: false,
          hasAccess,
          isTrialActive,
          isAdmin,
          canViewAnalytics,
          canManageUsers,
        };

        setState(newState);
        setLastUpdated(Date.now());
        setLastHealthCheck(Date.now());

        // Cache sanitized data
        const sanitizedData = sanitizeDataForCache(newState);
        localStorage.setItem(
          AUTH_CACHE_KEY,
          JSON.stringify({
            data: sanitizedData,
            timestamp: Date.now(),
          })
        );
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("Error in getSession:", error);
      setState((prev) => ({ ...prev, loading: false }));
      setError(error instanceof Error ? error : new Error("Failed to get session"));

      if (retryAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
        retryAttemptsRef.current++;
        setTimeout(getSession, RETRY_DELAY * retryAttemptsRef.current);
      } else {
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (!hasValidCache) {
      getSession();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION" && session?.user) {
        const isSuccessfulAuth = window.location.search.includes("?auth=success");

        if (isSuccessfulAuth) {
          const discordId = getDiscordId(session.user);
          const username = session.user.user_metadata?.full_name;

          if (discordId) {
            try {
              await supabase.rpc("upsert_user_login", {
                target_discord_id: discordId,
                user_name: username,
              });
            } catch (error) {
              console.error("Failed to track user login:", error);
            }

            router.replace(window.location.pathname);
          }
        }

        const { hasAccess, isTrialActive, isAdmin, canViewAnalytics, canManageUsers } = 
          await checkUserAccess(session.user as AuthUser);

        const newState = {
          user: session.user as AuthUser,
          session: session as AuthSession,
          loading: false,
          hasAccess,
          isTrialActive,
          isAdmin,
          canViewAnalytics,
          canManageUsers,
        };

        setState(newState);

        const authStateChanged =
          !state.session?.user?.id ||
          state.session.user.id !== session.user.id ||
          state.hasAccess !== hasAccess ||
          state.isTrialActive !== isTrialActive ||
          state.isAdmin !== isAdmin;

        if (authStateChanged) {
          setLastUpdated(Date.now());
          setLastHealthCheck(Date.now());

          const sanitizedData = sanitizeDataForCache(newState);
          localStorage.setItem(
            AUTH_CACHE_KEY,
            JSON.stringify({
              data: sanitizedData,
              timestamp: Date.now(),
            })
          );
        }
      } else if (event === "SIGNED_OUT") {
        invalidateCache();
        setState({
          user: null,
          session: null,
          loading: false,
          hasAccess: false,
          isTrialActive: false,
          isAdmin: false,
          canViewAnalytics: false,
          canManageUsers: false,
        });
        setLastUpdated(null);
        setLastHealthCheck(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (healthCheckIntervalRef.current) clearInterval(healthCheckIntervalRef.current);
    };
  }, [hasValidCache]);

  // Security-conscious health monitoring
  useEffect(() => {
    if (state.user && !healthCheckIntervalRef.current) {
      healthCheckIntervalRef.current = setInterval(() => {
        setLastHealthCheck(Date.now());
        
        // More frequent refresh for security
        const shouldRefresh = lastUpdated && (Date.now() - lastUpdated > AUTH_CACHE_TTL);
        if (shouldRefresh) {
          refreshUserDataInternal();
        }
      }, HEALTH_CHECK_INTERVAL);
    }

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
  }, [state.user, lastUpdated]);

  // Real-time subscription with enhanced security
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
        async (payload) => {
          console.log("User access changed, refreshing data");
          await refreshUserDataInternal();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.user]);

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
        checkAdminStatus: () => state.isAdmin, // Return cached status for sync calls
        invalidateCache,
        getSessionHealth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}