// src/hooks/usePageTracking.ts
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { getDiscordId, getUsername } from '@/lib/utils'

interface PageSession {
  id: string
  discord_id: string
  page_path: string
  enter_time: string
  is_active: boolean
}

export function usePageTracking() {
  const { user } = useAuth()
  const pathname = usePathname()
  const supabase = createClient()
  
  // Session management refs
  const currentSessionRef = useRef<PageSession | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sessionCreationLockRef = useRef<boolean>(false)
  const isMountedRef = useRef<boolean>(true)

  const endCurrentSession = useCallback(async (skipCleanup = false) => {
    if (!currentSessionRef.current) return

    try {
      const exitTime = new Date().toISOString()
      
      // With new RLS policy, users can only update their own sessions
      // Admins can update any session
      await supabase
        .from('page_sessions')
        .update({
          exit_time: exitTime,
          is_active: false
        })
        .eq('id', currentSessionRef.current.id)

      if (!skipCleanup) {
        currentSessionRef.current = null
      }
    } catch (error) {
      console.error('Error ending page session:', error)
    }
  }, [supabase])

  const startNewSession = useCallback(async (pagePath: string, discordId: string, username: string) => {
    // Prevent multiple simultaneous session creations
    if (sessionCreationLockRef.current) return
    sessionCreationLockRef.current = true

    try {
      // End any existing session first
      if (currentSessionRef.current) {
        await endCurrentSession(true)
      }

      // Clean up any orphaned active sessions for this user/page combination
      // RLS policy ensures users can only update their own sessions
      await supabase
        .from('page_sessions')
        .update({
          exit_time: new Date().toISOString(),
          is_active: false
        })
        .eq('discord_id', discordId) // RLS will automatically filter to user's own data
        .eq('page_path', pagePath)
        .eq('is_active', true)

      // Create new session - WITH CHECK ensures discord_id matches current user
      const enterTime = new Date().toISOString()
      const { data, error } = await supabase
        .from('page_sessions')
        .insert([
          {
            discord_id: discordId, // Must match current user's discord_id
            username,
            page_path: pagePath,
            enter_time: enterTime,
            is_active: true
          }
        ])
        .select('id, discord_id, page_path, enter_time, is_active')
        .single()

      if (error) {
        console.error('Error starting page session:', error)
        return
      }

      if (data && isMountedRef.current) {
        currentSessionRef.current = data
        startHeartbeat()
      }
    } catch (error) {
      console.error('Error in startNewSession:', error)
    } finally {
      sessionCreationLockRef.current = false
    }
  }, [supabase, endCurrentSession])

  const updateSessionActivity = useCallback(async (isActive: boolean) => {
    if (!currentSessionRef.current) return

    try {
      // RLS policy ensures users can only update their own sessions
      await supabase
        .from('page_sessions')
        .update({ 
          is_active: isActive
        })
        .eq('id', currentSessionRef.current.id)
    } catch (error) {
      console.error('Error updating session activity:', error)
    }
  }, [supabase])

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }

    // Send heartbeat every 5 minutes when page is visible
    heartbeatIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && currentSessionRef.current) {
        updateSessionActivity(true)
      }
    }, 5 * 60 * 1000) // 5 minutes
  }, [updateSessionActivity])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }, [])

  const handleVisibilityChange = useCallback(() => {
    if (!currentSessionRef.current) return

    if (document.visibilityState === 'hidden') {
      updateSessionActivity(false)
      stopHeartbeat()
      
      // Set a timeout to end the session if the page stays hidden for more than 8 minutes
      visibilityTimeoutRef.current = setTimeout(() => {
        if (currentSessionRef.current && document.visibilityState === 'hidden') {
          endCurrentSession()
        }
      }, 8 * 60 * 1000) // 8 minutes
    } else if (document.visibilityState === 'visible') {
      updateSessionActivity(true)
      startHeartbeat()
      
      // Cancel the timeout since the page is visible again
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
        visibilityTimeoutRef.current = null
      }
    }
  }, [updateSessionActivity, startHeartbeat, stopHeartbeat, endCurrentSession])

  const handlePageUnload = useCallback(() => {
    // Enhanced unload handling with keepalive fetch
    if (currentSessionRef.current) {
      const exitTime = new Date().toISOString()
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (supabaseUrl && apiKey && 'fetch' in window) {
        const url = `${supabaseUrl}/rest/v1/page_sessions?id=eq.${currentSessionRef.current.id}`
        
        const updatePayload = JSON.stringify({
          exit_time: exitTime,
          is_active: false
        })
        
        try {
          // Use fetch with keepalive for better browser support
          fetch(url, {
            method: 'PATCH',
            headers: {
              'apikey': apiKey,
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: updatePayload,
            keepalive: true // This ensures the request continues even if page unloads
          }).catch(error => {
            console.error('Error sending keepalive request:', error)
          })
        } catch (error) {
          console.error('Error sending unload request:', error)
          // Fallback to sendBeacon if fetch fails
          if (navigator.sendBeacon) {
            try {
              const beaconUrl = `${url}&apikey=${apiKey}`
              navigator.sendBeacon(beaconUrl, updatePayload)
            } catch (beaconError) {
              console.error('Error with sendBeacon fallback:', beaconError)
            }
          }
        }
      }
    }
    
    // Always attempt regular API call as final fallback
    endCurrentSession()
  }, [endCurrentSession])

  // Main effect for session management
  useEffect(() => {
    if (!user) {
      // Clean up any existing session when user logs out
      if (currentSessionRef.current) {
        endCurrentSession()
      }
      return
    }

    const discordId = getDiscordId(user)
    const username = getUsername(user)
    
    if (!discordId) return

    // Start new session for the current page
    startNewSession(pathname, discordId, username)

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true })
    window.addEventListener('beforeunload', handlePageUnload, { passive: true })
    window.addEventListener('pagehide', handlePageUnload, { passive: true })

    // Cleanup function
    return () => {
      isMountedRef.current = false
      
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handlePageUnload)
      window.removeEventListener('pagehide', handlePageUnload)
      
      stopHeartbeat()
      
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current)
        visibilityTimeoutRef.current = null
      }
      
      endCurrentSession()
    }
  }, [user, pathname]) // Only depend on user and pathname

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])
}