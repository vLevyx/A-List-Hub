'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDiscordId, isUserWhitelisted, hasValidTrial } from '@/lib/utils'
import type { AuthState, AuthUser, AuthSession } from '@/types/auth'

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

const AUTH_CACHE_KEY = 'auth_cache'
const AUTH_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    hasAccess: false,
    isTrialActive: false,
  })
  
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [error, setError] = useState<Error | null>(null)
  
  const retryAttemptsRef = useRef(0)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const initialLoadAttemptedRef = useRef(false)
  
  const supabase = createClient()

  // Check user access
  const checkUserAccess = async (user: AuthUser): Promise<{ hasAccess: boolean; isTrialActive: boolean }> => {
    const discordId = getDiscordId(user)
    if (!discordId) return { hasAccess: false, isTrialActive: false }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('revoked, hub_trial, trial_expiration')
        .eq('discord_id', discordId)
        .single()

      if (error) throw error

      const isTrialActive = hasValidTrial(data)
      const hasAccess = isUserWhitelisted(data)

      return { hasAccess, isTrialActive }
    } catch (error) {
      console.error('Error checking user access:', error)
      return { hasAccess: false, isTrialActive: false }
    }
  }

  // Get fresh session from Supabase
  const getSession = async (skipCache = false) => {
    try {
      setState(prev => ({ ...prev, loading: true }))
      setError(null)
      
      // Skip cache if explicitly requested (e.g., after OAuth)
      if (!skipCache) {
        try {
          const cached = localStorage.getItem(AUTH_CACHE_KEY)
          if (cached) {
            const { data, timestamp } = JSON.parse(cached)
            const isExpired = Date.now() - timestamp > AUTH_CACHE_TTL
            
            if (!isExpired && data.user) {
              console.log('Using cached auth data')
              setState(data)
              setLastUpdated(timestamp)
              setState(prev => ({ ...prev, loading: false }))
              return
            }
          }
        } catch (error) {
          console.warn('Error reading auth cache:', error)
        }
      }

      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error

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
        if (!skipCache) {
          localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
            data: newState,
            timestamp: Date.now()
          }))
        }

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
    }
  }

  // Public refresh method
  const refreshUserData = useCallback(async () => {
    setIsRefreshing(true)
    await getSession(true) // Skip cache when refreshing
    setIsRefreshing(false)
  }, [])

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

  // Sign out
  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      localStorage.removeItem(AUTH_CACHE_KEY)
      setState({
        user: null,
        session: null,
        loading: false,
        hasAccess: false,
        isTrialActive: false,
      })
      setLastUpdated(null)
    } catch (error) {
      console.error('Error signing out:', error)
      setError(error instanceof Error ? error : new Error('Failed to sign out'))
    }
  }

  // Initialize auth state
  useEffect(() => {
    if (initialLoadAttemptedRef.current) return
    initialLoadAttemptedRef.current = true
    getSession()

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id)
        
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
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{
      ...state,
      signInWithDiscord,
      signOut,
      refreshUserData,
      isLoading: state.loading,
      isRefreshing,
      lastUpdated,
      error,
    }}>
      {children}
    </AuthContext.Provider>
  )
}