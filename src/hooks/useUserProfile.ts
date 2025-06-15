import { useState, useEffect, useCallback } from 'react'
import { getUserProfileAndBlueprints } from '@/lib/supabase/utils'

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
}

export function useUserProfile(discordId: string | null): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!discordId) {
      setLoading(false)
      setError('No Discord ID provided')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const result = await getUserProfileAndBlueprints(discordId)
      
      if (result.success) {
        setProfile(result.profile)
        setBlueprints(result.blueprints)
      } else {
        setError(result.error || 'Failed to fetch profile')
        // Don't clear existing data on error - keep showing stale data
      }
    } catch (err: any) {
      console.error('Failed to fetch profile:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }, [discordId])

  useEffect(() => {
    let cancelled = false
    
    const loadProfile = async () => {
      if (!cancelled) {
        await fetchProfile()
      }
    }
    
    loadProfile()
    
    return () => {
      cancelled = true
    }
  }, [fetchProfile])

  return {
    profile,
    blueprints,
    loading,
    error,
    refetch: fetchProfile
  }
}