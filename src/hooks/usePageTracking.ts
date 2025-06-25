'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { getDiscordId, getUsername } from '@/lib/utils'

export function usePageTracking() {
  const { user } = useAuth()
  const pathname = usePathname()
  const supabase = createClient()
  const sessionIdRef = useRef<string | null>(null)
  const lastPageRef = useRef<string | null>(null)
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!user) return

    const discordId = getDiscordId(user)
    const username = getUsername(user)
    
    if (!discordId) return

    const startPageSession = async (pagePath: string) => {
      try {
        // End previous session if exists
        if (sessionIdRef.current && lastPageRef.current) {
          await supabase
            .from('page_sessions')
            .update({
              exit_time: new Date().toISOString(),
              is_active: false
            })
            .eq('id', sessionIdRef.current)
        }

        // Start new session
        const { data, error } = await supabase
          .from('page_sessions')
          .insert([
            {
              discord_id: discordId,
              username,
              page_path: pagePath,
              enter_time: new Date().toISOString(),
              is_active: true
            }
          ])
          .select('id')
          .single()

        if (error) {
          console.error('Error starting page session:', error)
        } else {
          sessionIdRef.current = data?.id || null
          lastPageRef.current = pagePath
        }
      } catch (error) {
        console.error('Error in startPageSession:', error)
      }
    }

    const endPageSession = async () => {
      if (sessionIdRef.current) {
        try {
          await supabase
            .from('page_sessions')
            .update({
              exit_time: new Date().toISOString(),
              is_active: false
            })
            .eq('id', sessionIdRef.current)
          
          // Clear the session reference
          sessionIdRef.current = null
        } catch (error) {
          console.error('Error ending page session:', error)
        }
      }
    }

    const markAsActive = async () => {
      if (sessionIdRef.current && document.visibilityState === 'visible') {
        try {
          await supabase
            .from('page_sessions')
            .update({ 
              is_active: true,
              // Update enter_time to prevent stale sessions
              enter_time: new Date().toISOString()
            })
            .eq('id', sessionIdRef.current)
        } catch (error) {
          console.error('Error marking as active:', error)
        }
      }
    }

    const markAsInactive = async () => {
      if (sessionIdRef.current) {
        try {
          await supabase
            .from('page_sessions')
            .update({ is_active: false })
            .eq('id', sessionIdRef.current)
        } catch (error) {
          console.error('Error marking as inactive:', error)
        }
      }
    }

    // Start session for current page
    startPageSession(pathname)

    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markAsInactive()
        // Clear heartbeat when tab is hidden
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current)
          heartbeatInterval.current = null
        }
      } else if (document.visibilityState === 'visible') {
        markAsActive()
        // Restart heartbeat when tab becomes visible
        if (!heartbeatInterval.current) {
          heartbeatInterval.current = setInterval(markAsActive, 30000)
        }
      }
    }

    // Handle page unload
    const handleBeforeUnload = () => {
      endPageSession()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    // Also handle page hide event for better mobile support
    window.addEventListener('pagehide', handleBeforeUnload)

    // Activity heartbeat - only start if page is visible
    if (document.visibilityState === 'visible') {
      heartbeatInterval.current = setInterval(markAsActive, 30000)
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
        heartbeatInterval.current = null
      }
      
      endPageSession()
    }
  }, [user, pathname, supabase])

  // Handle route changes
  useEffect(() => {
    if (!user || !sessionIdRef.current) return

    const discordId = getDiscordId(user)
    const username = getUsername(user)
    
    if (!discordId) return

    const startNewSession = async () => {
      // End current session
      if (sessionIdRef.current) {
        await supabase
          .from('page_sessions')
          .update({
            exit_time: new Date().toISOString(),
            is_active: false
          })
          .eq('id', sessionIdRef.current)
      }

      // Start new session
      const { data, error } = await supabase
        .from('page_sessions')
        .insert([
          {
            discord_id: discordId,
            username,
            page_path: pathname,
            enter_time: new Date().toISOString(),
            is_active: true
          }
        ])
        .select('id')
        .single()

      if (!error && data) {
        sessionIdRef.current = data.id
        lastPageRef.current = pathname
      }
    }

    if (lastPageRef.current !== pathname) {
      startNewSession()
    }
  }, [pathname, user, supabase])
}