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
            .update({ is_active: true })
            .eq('id', sessionIdRef.current)
        } catch (error) {
          console.error('Error marking as active:', error)
        }
      }
    }

    // Start session for current page
    startPageSession(pathname)

    // Handle visibility changes
    const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    if (sessionIdRef.current) {
      Promise.resolve(
        supabase
          .from('page_sessions')
          .update({ is_active: false })
          .eq('id', sessionIdRef.current)
      )
        .then(() => {})
        .catch(console.error)
    }
  } else if (document.visibilityState === 'visible') {
    markAsActive()
  }
}


    // Handle page unload
    const handleBeforeUnload = () => {
      endPageSession()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Activity heartbeat
    const activityInterval = setInterval(markAsActive, 30000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearInterval(activityInterval)
      endPageSession()
    }
  }, [user, pathname])

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
  }, [pathname, user])
}