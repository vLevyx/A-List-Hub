// src/hooks/useUserProfile.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { getDiscordId } from '@/lib/utils'
import { withTimeout } from '@/lib/timeout'

interface UserProfile {
  discord_id: string
  username: string | null
  created_at: string
  revoked: boolean
  last_login: string | null
  login_count: number
  hub_trial: boolean
  trial_expiration: string | null
}

interface Blueprint {
  id: string
  discord_id: string
  blueprint_name: string
  created_at: string
}

interface UseUserProfileReturn {
  profile: UserProfile | null
  blueprints: Blueprint[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  isOwner: boolean
  canEdit: boolean
  lastUpdated: number | null
  invalidateCache: () => void
}

// SECURITY ENHANCEMENT 1: Configurable cache with shorter TTL
const PROFILE_CACHE_KEY = 'user_profile_cache'
const BLUEPRINTS_CACHE_KEY = 'user_blueprints_cache'
const CACHE_TTL = 3 * 60 * 1000 // 3 minutes (reduced from typical 15 minutes)
const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY = 1000

export function useUserProfile(targetDiscordId?: string | null): UseUserProfileReturn {
  const { user, isAdmin, canViewAnalytics } = useAuth()
  const currentUserDiscordId = getDiscordId(user)
  
  // ENHANCEMENT 2: Smart target resolution with security checks
  const resolvedTargetId = targetDiscordId || currentUserDiscordId
  const isOwner = currentUserDiscordId === resolvedTargetId
  const canEdit = isOwner || isAdmin
  const canView = isOwner || isAdmin || canViewAnalytics

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const retryCountRef = useRef(0)
  const supabase = createClient()

  // ENHANCEMENT 3: Secure cache invalidation
  const invalidateCache = useCallback(() => {
    try {
      localStorage.removeItem(`${PROFILE_CACHE_KEY}_${resolvedTargetId}`)
      localStorage.removeItem(`${BLUEPRINTS_CACHE_KEY}_${resolvedTargetId}`)
      setLastUpdated(null)
    } catch (error) {
      console.error('Error invalidating profile cache:', error)
    }
  }, [resolvedTargetId])

  // ENHANCEMENT 4: Secure cache loading with validation
  const loadFromCache = useCallback((): boolean => {
    if (!resolvedTargetId || !canView) return false

    try {
      const profileKey = `${PROFILE_CACHE_KEY}_${resolvedTargetId}`
      const blueprintsKey = `${BLUEPRINTS_CACHE_KEY}_${resolvedTargetId}`
      
      const cachedProfile = localStorage.getItem(profileKey)
      const cachedBlueprints = localStorage.getItem(blueprintsKey)

      if (!cachedProfile || !cachedBlueprints) return false

      const profileData = JSON.parse(cachedProfile)
      const blueprintsData = JSON.parse(cachedBlueprints)

      const profileAge = Date.now() - profileData.timestamp
      const blueprintsAge = Date.now() - blueprintsData.timestamp

      const isProfileFresh = profileAge < CACHE_TTL
      const areBlueprintsFresh = blueprintsAge < CACHE_TTL

      if (isProfileFresh && areBlueprintsFresh) {
        // SECURITY: Validate data structure before using
        if (profileData.data?.discord_id === resolvedTargetId) {
          setProfile(profileData.data)
          setBlueprints(blueprintsData.data || [])
          setLastUpdated(Math.min(profileData.timestamp, blueprintsData.timestamp))
          setLoading(false)
          return true
        }
      }

      // Clear stale cache
      if (!isProfileFresh || !areBlueprintsFresh) {
        invalidateCache()
      }
    } catch (error) {
      console.error('Error loading cached profile data:', error)
      invalidateCache()
    }

    return false
  }, [resolvedTargetId, canView, invalidateCache])

  // ENHANCEMENT 5: RLS-aware data fetching with admin support
  const fetchProfile = useCallback(async (skipCache = false) => {
    if (!resolvedTargetId) {
      setLoading(false)
      setError('No Discord ID provided')
      return
    }

    if (!canView) {
      setLoading(false)
      setError('Access denied: Cannot view this profile')
      return
    }

    // Try cache first unless skipping
    if (!skipCache && loadFromCache()) {
      // Still fetch in background for freshness if cache is getting old
      const lastUpdate = lastUpdated || 0
      const cacheAge = Date.now() - lastUpdate
      if (cacheAge < CACHE_TTL / 2) return // Cache is fresh enough
    }

    try {
      setLoading(true)
      setError(null)

      // ENHANCEMENT 6: Direct Supabase queries leveraging RLS policies
      // Your RLS policies will automatically handle access control
      
      // Fetch profile data
      const { data: profileData, error: profileError } = await withTimeout(
        supabase
          .from('users')
          .select('*')
          .eq('discord_id', resolvedTargetId)
          .single()
      )

      if (profileError) {
        // Handle "not found" vs "access denied" differently
        if (profileError.code === 'PGRST116') {
          throw new Error('User profile not found')
        } else {
          throw new Error(`Failed to fetch profile: ${profileError.message}`)
        }
      }

      // Fetch blueprints data
      const { data: blueprintsData, error: blueprintsError } = await withTimeout(
        supabase
          .from('user_blueprints')
          .select('*')
          .eq('discord_id', resolvedTargetId)
          .order('created_at', { ascending: false })
      )

      if (blueprintsError) {
        console.warn('Error fetching blueprints:', blueprintsError)
        // Don't fail the whole request if blueprints fail
      }

      // ENHANCEMENT 7: Atomic state updates with caching
      const timestamp = Date.now()
      
      setProfile(profileData as UserProfile)
      setBlueprints((blueprintsData || []) as Blueprint[])
      setLastUpdated(timestamp)

      // ENHANCEMENT 8: Secure caching with user-specific keys
      try {
        const profileKey = `${PROFILE_CACHE_KEY}_${resolvedTargetId}`
        const blueprintsKey = `${BLUEPRINTS_CACHE_KEY}_${resolvedTargetId}`

        localStorage.setItem(profileKey, JSON.stringify({
          data: profileData,
          timestamp,
        }))

        localStorage.setItem(blueprintsKey, JSON.stringify({
          data: blueprintsData || [],
          timestamp,
        }))
      } catch (cacheError) {
        console.warn('Failed to cache profile data:', cacheError)
        // Don't fail the request if caching fails
      }

      retryCountRef.current = 0 // Reset retry count on success

    } catch (err: any) {
      console.error('Failed to fetch profile:', err)
      
      const errorMessage = err.message || 'An unexpected error occurred'
      setError(errorMessage)

      // ENHANCEMENT 9: Intelligent retry logic
      if (retryCountRef.current < MAX_RETRY_ATTEMPTS && 
          !errorMessage.includes('Access denied') && 
          !errorMessage.includes('not found')) {
        
        retryCountRef.current++
        const delay = RETRY_DELAY * retryCountRef.current
        
        console.log(`Retrying profile fetch in ${delay}ms (attempt ${retryCountRef.current})`)
        setTimeout(() => fetchProfile(true), delay)
        return
      }

      // Don't clear existing data on error - keep showing stale data
      if (!profile) {
        setProfile(null)
        setBlueprints([])
      }
    } finally {
      setLoading(false)
    }
  }, [resolvedTargetId, canView, loadFromCache, lastUpdated, profile, supabase])

  // ENHANCEMENT 10: Optimized effect with dependency tracking
  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      if (!cancelled) {
        await fetchProfile()
      }
    }

    if (resolvedTargetId && canView) {
      loadProfile()
    } else {
      setLoading(false)
      if (!canView) {
        setError('Access denied')
      }
    }

    return () => {
      cancelled = true
    }
  }, [resolvedTargetId, canView]) // Removed fetchProfile to avoid infinite loops

  // ENHANCEMENT 11: Real-time updates for own profile
  useEffect(() => {
    if (!resolvedTargetId || !isOwner) return

    const channel = supabase
      .channel(`profile-changes-${resolvedTargetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `discord_id=eq.${resolvedTargetId}`,
        },
        (payload) => {
          console.log('Profile changed, refreshing:', payload)
          fetchProfile(true) // Skip cache on real-time updates
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_blueprints',
          filter: `discord_id=eq.${resolvedTargetId}`,
        },
        (payload) => {
          console.log('Blueprints changed, refreshing:', payload)
          fetchProfile(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [resolvedTargetId, isOwner, supabase])

  // ENHANCEMENT 12: Cleanup on user change
  useEffect(() => {
    return () => {
      retryCountRef.current = 0
    }
  }, [currentUserDiscordId])

  return {
    profile,
    blueprints,
    loading,
    error,
    refetch: () => fetchProfile(true),
    isOwner,
    canEdit,
    lastUpdated,
    invalidateCache,
  }
}