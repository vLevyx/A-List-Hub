'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDiscordId, isUserWhitelisted, hasValidTrial } from '@/lib/utils'
import type { AuthState, AuthUser, AuthSession } from '@/types/auth'
import type { User } from '@/types/database'

// Define auth context with extended functionality
const AuthContext = createContext<AuthState & {
  signInWithDiscord: () => Promise<void>
  signOut: () => Promise<void>
  refreshUserData: () => Promise<void>
  isLoading: boolean
  isRefreshing: boolean
  lastUpdated: number | null
  error: Error | null
}>({
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
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Configuration constants
const AUTH_CACHE_KEY = 'auth_cache_v2'
const AUTH_CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000 // 1 second

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Enhanced state management
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    hasAccess: false,
    isTrialActive: false,
  })
  
  // Additional state for advanced features
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [error, setError] = useState<Error | null>(null)
  
  // Refs for tracking retry attempts and intervals
  const retryAttemptsRef = useRef(0)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const initialLoadAttemptedRef = useRef(false)
  const authChangeListenerRef = useRef<any>(null)
  
  // Create the Supabase client once and reuse it
  const supabase = useRef(createClient()).current

  // Load cached auth data on initial render
  useEffect(() => {
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        const isExpired = Date.now() - timestamp > AUTH_CACHE_TTL
        
        if (!isExpired && data.user && data.session) {
          console.log('Using cached auth data')
          setState({
            user: data.user,
            session: data.session,
            loading: false,
            hasAccess: data.hasAccess,
            isTrialActive: data.isTrialActive,
          })
          setLastUpdated(timestamp)
          
          // Verify session is still valid in background
          setTimeout(() => refreshUserDataInternal(data.session), 100)
        } else {
          // Clear expired cache
          localStorage.removeItem(AUTH_CACHE_KEY)
        }
      }
    } catch (error) {
      console.error('Error loading cached auth data:', error)
      localStorage.removeItem(AUTH_CACHE_KEY)
    }
  }, [])

  // Check user access with retry mechanism
  const checkUserAccess = async (user: AuthUser, attempt = 1): Promise<{ hasAccess: boolean; isTrialActive: boolean }> => {
    const discordId = getDiscordId(user)
    if (!discordId) return { hasAccess: false, isTrialActive: false }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('revoked, hub_trial, trial_expiration')
        .eq('discord_id', discordId)
        .single()

      if (error) {
        if (attempt < MAX_RETRY_ATTEMPTS) {
          console.warn(`Retry attempt ${attempt} for user access check`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
          return checkUserAccess(user, attempt + 1)
        }
        throw error
      }

      const isTrialActive = hasValidTrial(data)
      const hasAccess = isUserWhitelisted(data)

      return { hasAccess, isTrialActive }
    } catch (error) {
      console.error('Error checking user access:', error)
      setError(error instanceof Error ? error : new Error('Failed to check user access'))
      return { hasAccess: false, isTrialActive: false }
    }
  }

  // Refresh user data with optimized approach
  const refreshUserDataInternal = async (session: AuthSession | null = null) => {
    const currentSession = session || state.session
    if (!currentSession?.user) return
    
    setIsRefreshing(true)
    setError(null)
    
    try {
      // First verify the session is still valid
      const { data: { session: validSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !validSession) {
        console.warn('Session invalid, clearing auth state')
        await signOut()
        return
      }
      
      const { hasAccess, isTrialActive } = await checkUserAccess(validSession.user as AuthUser)
      
      const newState = {
        user: validSession.user as AuthUser,
        session: validSession as AuthSession,
        loading: false,
        hasAccess,
        isTrialActive,
      }
      
      setState(newState)
      setLastUpdated(Date.now())
      
      // Cache the updated auth data
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
        data: newState,
        timestamp: Date.now()
      }))
      
    } catch (error) {
      console.error('Error refreshing user data:', error)
      setError(error instanceof Error ? error : new Error('Failed to refresh user data'))
    } finally {
      setIsRefreshing(false)
    }
  }

  // Public refresh method
  const refreshUserData = async () => {
    await refreshUserDataInternal()
  }

  // Sign in with Discord
  const signInWithDiscord = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Discord:', error)
      setError(error instanceof Error ? error : new Error('Failed to sign in with Discord'))
    }
  }

  // Sign out with cleanup
  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Clear auth cache
      localStorage.removeItem(AUTH_CACHE_KEY)
      
      // Reset state
      setState({
        user: null,
        session: null,
        loading: false,
        hasAccess: false,
        isTrialActive: false,
      })
      
      setLastUpdated(null)
      
      // Clear any active intervals
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      
    } catch (error) {
      console.error('Error signing out:', error)
      setError(error instanceof Error ? error : new Error('Failed to sign out'))
    }
  }

  // Initialize auth state
  useEffect(() => {
    if (initialLoadAttemptedRef.current) return
    initialLoadAttemptedRef.current = true
    
    const getSession = async () => {
      try {
        setState(prev => ({ ...prev, loading: true }))
        setError(null)
        
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (session?.user) {
          const { hasAccess, isTrialActive } = await checkUserAccess(session.user as AuthUser)
          
          const newState = {
            user: session.user as AuthUser,
            session: session as AuthSession,
            loading: false,
            hasAccess,
            isTrialActive,
          }
          
          setState(newState)
          setLastUpdated(Date.now())
          
          // Cache the auth data
          localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
            data: newState,
            timestamp: Date.now()
          }))

          // Track login
          const discordId = getDiscordId(session.user)
          const username = session.user.user_metadata?.full_name || 'Discord User'
          
          if (discordId) {
            await supabase.rpc('upsert_user_login', {
              target_discord_id: discordId,
              user_name: username
            })
          }
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
      } catch (error) {
        console.error('Error in getSession:', error)
        setState(prev => ({ ...prev, loading: false }))
        setError(error instanceof Error ? error : new Error('Failed to get session'))
        
        // Retry logic
        if (retryAttemptsRef.current < MAX_RETRY_ATTEMPTS) {
          retryAttemptsRef.current++
          setTimeout(getSession, RETRY_DELAY * retryAttemptsRef.current)
        }
      }
    }

    getSession()

    // Set up auth state change listener with improved error handling
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event)
        
        if (event === 'SIGNED_IN' && session?.user) {
          const { hasAccess, isTrialActive } = await checkUserAccess(session.user as AuthUser)
          
          const newState = {
            user: session.user as AuthUser,
            session: session as AuthSession,
            loading: false,
            hasAccess,
            isTrialActive,
          }
          
          setState(newState)
          setLastUpdated(Date.now())
          
          // Cache the auth data
          localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
            data: newState,
            timestamp: Date.now()
          }))
          
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem(AUTH_CACHE_KEY)
          setState({
            user: null,
            session: null,
            loading: false,
            hasAccess: false,
            isTrialActive: false,
          })
          setLastUpdated(null)
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Update session after token refresh
          setState(prev => ({
            ...prev,
            session: session as AuthSession
          }))
          
          // Update cache
          const cached = localStorage.getItem(AUTH_CACHE_KEY)
          if (cached) {
            const { data } = JSON.parse(cached)
            localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
              data: { ...data, session: session as AuthSession },
              timestamp: Date.now()
            }))
          }
        }
      }
    )
    
    authChangeListenerRef.current = subscription

    return () => {
      if (authChangeListenerRef.current) {
        authChangeListenerRef.current.unsubscribe()
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [supabase]) // Add supabase as dependency

  // Set up periodic refresh for active sessions
  useEffect(() => {
    if (state.session && !refreshIntervalRef.current) {
      refreshIntervalRef.current = setInterval(() => {
        refreshUserDataInternal()
      }, 5 * 60 * 1000) // Refresh every 5 minutes
    } else if (!state.session && refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [state.session])

  const value = {
    ...state,
    signInWithDiscord,
    signOut,
    refreshUserData,
    isLoading: state.loading,
    isRefreshing,
    lastUpdated,
    error,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}