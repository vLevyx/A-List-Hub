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
  
  // Session management
  const currentSessionRef = useRef<PageSession | null>(null)
  const sessionStartTimeRef = useRef<number | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Prevent multiple simultaneous session creations
  const sessionCreationLockRef = useRef<boolean>(false)
  
  // Track if component is mounted to prevent memory leaks
  const isMountedRef = useRef<boolean>(true)

  const endCurrentSession = useCallback(async (skipCleanup = false) => {
    if (!currentSessionRef.current || !sessionStartTimeRef.current) return

    try {
      const exitTime = new Date().toISOString()
      
      await supabase
        .from('page_sessions')
        .update({
          exit_time: exitTime,
          is_active: false
        })
        .eq('id', currentSessionRef.current.id)

      if (!skipCleanup) {
        currentSessionRef.current = null
        sessionStartTimeRef.current = null
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

      // Clean up any orphaned active sessions for this user/page
      await supabase
        .from('page_sessions')
        .update({
          exit_time: new Date().toISOString(),
          is_active: false
        })
        .eq('discord_id', discordId)
        .eq('page_path', pagePath)
        .eq('is_active', true)

      // Create new session
      const enterTime = new Date().toISOString()
      const { data, error } = await supabase
        .from('page_sessions')
        .insert([
          {
            discord_id: discordId,
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
        sessionStartTimeRef.current = Date.now()
        
        // Start heartbeat for activity tracking
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
      await supabase
        .from('page_sessions')
        .update({ 
          is_active: isActive,
          // DO NOT update enter_time - this preserves the original session start time
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

    // Send heartbeat every 30 seconds when page is visible
    heartbeatIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && currentSessionRef.current) {
        updateSessionActivity(true)
      }
    }, 30000)
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
      
      // Set a timeout to end the session if the page stays hidden too long
      cleanupTimeoutRef.current = setTimeout(() => {
        endCurrentSession()
      }, 5 * 60 * 1000) // 5 minutes
    } else if (document.visibilityState === 'visible') {
      updateSessionActivity(true)
      startHeartbeat()
      
      // Cancel the cleanup timeout since the page is visible again
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
        cleanupTimeoutRef.current = null
      }
    }
  }, [updateSessionActivity, startHeartbeat, stopHeartbeat, endCurrentSession])

  const handlePageUnload = useCallback(() => {
    // Use sendBeacon for more reliable unload tracking
    if (currentSessionRef.current && navigator.sendBeacon) {
      const exitTime = new Date().toISOString()
      const updateData = {
        exit_time: exitTime,
        is_active: false
      }
      
      // Send the update via beacon API for better reliability
      navigator.sendBeacon(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/page_sessions?id=eq.${currentSessionRef.current.id}`,
        JSON.stringify(updateData)
      )
    } else {
      // Fallback to regular API call
      endCurrentSession()
    }
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
      
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
        cleanupTimeoutRef.current = null
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
