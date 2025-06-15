'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDiscordId, isUserWhitelisted, hasValidTrial } from '@/lib/utils'
import type { AuthState, AuthUser, AuthSession } from '@/types/auth'
import type { User } from '@/types/database'

const AuthContext = createContext<AuthState & {
  signInWithDiscord: () => Promise<void>
  signOut: () => Promise<void>
  refreshUserData: () => Promise<void>
}>({
  user: null,
  session: null,
  loading: true,
  hasAccess: false,
  isTrialActive: false,
  signInWithDiscord: async () => {},
  signOut: async () => {},
  refreshUserData: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    hasAccess: false,
    isTrialActive: false,
  })

  const supabase = createClient()

  const checkUserAccess = async (user: AuthUser): Promise<{ hasAccess: boolean; isTrialActive: boolean }> => {
    const discordId = getDiscordId(user)
    if (!discordId) return { hasAccess: false, isTrialActive: false }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('revoked, hub_trial, trial_expiration')
        .eq('discord_id', discordId)
        .single()

      if (error || !data) {
        return { hasAccess: false, isTrialActive: false }
      }

      const isTrialActive = hasValidTrial(data)
      const hasAccess = isUserWhitelisted(data)

      return { hasAccess, isTrialActive }
    } catch (error) {
      console.error('Error checking user access:', error)
      return { hasAccess: false, isTrialActive: false }
    }
  }

  const refreshUserData = async () => {
    if (!state.user) return

    const { hasAccess, isTrialActive } = await checkUserAccess(state.user)
    setState(prev => ({ ...prev, hasAccess, isTrialActive }))
  }

  const signInWithDiscord = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setState({
        user: null,
        session: null,
        loading: false,
        hasAccess: false,
        isTrialActive: false,
      })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
          setState(prev => ({ ...prev, loading: false }))
          return
        }

        if (session?.user) {
          const { hasAccess, isTrialActive } = await checkUserAccess(session.user as AuthUser)
          
          setState({
            user: session.user as AuthUser,
            session: session as AuthSession,
            loading: false,
            hasAccess,
            isTrialActive,
          })

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
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { hasAccess, isTrialActive } = await checkUserAccess(session.user as AuthUser)
          
          setState({
            user: session.user as AuthUser,
            session: session as AuthSession,
            loading: false,
            hasAccess,
            isTrialActive,
          })
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            loading: false,
            hasAccess: false,
            isTrialActive: false,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Set up real-time subscription for user access changes
  useEffect(() => {
    if (!state.user) return

    const discordId = getDiscordId(state.user)
    if (!discordId) return

    const channel = supabase
      .channel('user-access-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `discord_id=eq.${discordId}`
        },
        async (payload) => {
          console.log('User access changed:', payload)
          await refreshUserData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [state.user])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signInWithDiscord,
        signOut,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}