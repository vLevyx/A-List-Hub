'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { getDiscordId } from '@/lib/utils'

interface SessionAnalytics {
  totalSessions: number
  totalTimeSpent: number // in seconds
  averageSessionDuration: number // in seconds
  topPages: Array<{
    page_path: string
    session_count: number
    total_time: number
    average_time: number
  }>
  recentSessions: Array<{
    id: string
    page_path: string
    enter_time: string
    exit_time: string | null
    time_spent_seconds: number | null
    is_active: boolean
  }>
}

export function useSessionAnalytics(dateRange: { from: Date; to: Date }) {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!user) {
      setAnalytics(null)
      setLoading(false)
      return
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const discordId = getDiscordId(user)
        if (!discordId) throw new Error('No Discord ID found')

        // Fetch sessions within date range
        const { data: sessions, error: sessionsError } = await supabase
          .from('page_sessions')
          .select('*')
          .eq('discord_id', discordId)
          .gte('enter_time', dateRange.from.toISOString())
          .lte('enter_time', dateRange.to.toISOString())
          .order('enter_time', { ascending: false })

        if (sessionsError) throw sessionsError

        if (!sessions || sessions.length === 0) {
          setAnalytics({
            totalSessions: 0,
            totalTimeSpent: 0,
            averageSessionDuration: 0,
            topPages: [],
            recentSessions: []
          })
          return
        }

        // Calculate analytics
        const totalSessions = sessions.length
        const completedSessions = sessions.filter(s => s.time_spent_seconds !== null)
        const totalTimeSpent = completedSessions.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0)
        const averageSessionDuration = completedSessions.length > 0 
          ? totalTimeSpent / completedSessions.length 
          : 0

        // Calculate top pages
        const pageStats = new Map<string, {
          session_count: number
          total_time: number
          completed_sessions: number
        }>()

        sessions.forEach(session => {
          const path = session.page_path
          const existing = pageStats.get(path) || {
            session_count: 0,
            total_time: 0,
            completed_sessions: 0
          }
          
          existing.session_count += 1
          if (session.time_spent_seconds !== null) {
            existing.total_time += session.time_spent_seconds
            existing.completed_sessions += 1
          }
          
          pageStats.set(path, existing)
        })

        const topPages = Array.from(pageStats.entries())
          .map(([page_path, stats]) => ({
            page_path,
            session_count: stats.session_count,
            total_time: stats.total_time,
            average_time: stats.completed_sessions > 0 
              ? stats.total_time / stats.completed_sessions 
              : 0
          }))
          .sort((a, b) => b.total_time - a.total_time)

        setAnalytics({
          totalSessions,
          totalTimeSpent,
          averageSessionDuration,
          topPages,
          recentSessions: sessions.slice(0, 20) // Last 20 sessions
        })
      } catch (err) {
        console.error('Error fetching session analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user, dateRange.from, dateRange.to, supabase])

  return { analytics, loading, error }
}

// Utility function to format time duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}
