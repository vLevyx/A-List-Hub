// src/hooks/useSessionAnalytics.ts

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { getDiscordId } from '@/lib/utils'

interface SessionAnalytics {
  totalSessions: number
  totalTimeSpent: number // in seconds
  averageSessionDuration: number // in seconds
  activeSessions: number
  completedSessions: number
  completionRate: number // percentage
  topPages: Array<{
    page_path: string
    session_count: number
    total_time: number
    average_time: number
    completion_rate: number
  }>
  recentSessions: Array<{
    id: string
    page_path: string
    enter_time: string
    exit_time: string | null
    time_spent_seconds: number | null
    is_active: boolean
    updated_at: string
  }>
  timeDistribution: {
    under30s: number
    under2m: number
    under5m: number
    under15m: number
    over15m: number
  }
}

interface AnalyticsOptions {
  dateRange?: { from: Date; to: Date }
  pagePath?: string
  includeActive?: boolean
}

export function useSessionAnalytics(options: AnalyticsOptions = {}) {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const { 
    dateRange = { 
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      to: new Date() 
    },
    pagePath,
    includeActive = true
  } = options

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

        // Build query
        let query = supabase
          .from('page_sessions')
          .select('*')
          .eq('discord_id', discordId)
          .gte('enter_time', dateRange.from.toISOString())
          .lte('enter_time', dateRange.to.toISOString())

        // Add page filter if specified
        if (pagePath) {
          query = query.eq('page_path', pagePath)
        }

        // Add active session filter if specified
        if (!includeActive) {
          query = query.eq('is_active', false)
        }

        const { data: sessions, error: sessionsError } = await query
          .order('enter_time', { ascending: false })

        if (sessionsError) throw sessionsError

        if (!sessions || sessions.length === 0) {
          setAnalytics({
            totalSessions: 0,
            totalTimeSpent: 0,
            averageSessionDuration: 0,
            activeSessions: 0,
            completedSessions: 0,
            completionRate: 0,
            topPages: [],
            recentSessions: [],
            timeDistribution: {
              under30s: 0,
              under2m: 0,
              under5m: 0,
              under15m: 0,
              over15m: 0
            }
          })
          return
        }

        // Calculate basic metrics
        const totalSessions = sessions.length
        const activeSessions = sessions.filter(s => s.is_active).length
        const completedSessions = sessions.filter(s => s.time_spent_seconds !== null).length
        const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

        // Calculate time metrics
        const sessionsWithTime = sessions.filter(s => s.time_spent_seconds !== null)
        const totalTimeSpent = sessionsWithTime.reduce((sum, s) => sum + (s.time_spent_seconds || 0), 0)
        const averageSessionDuration = sessionsWithTime.length > 0 
          ? totalTimeSpent / sessionsWithTime.length 
          : 0

        // Calculate time distribution
        const timeDistribution = {
          under30s: 0,
          under2m: 0,
          under5m: 0,
          under15m: 0,
          over15m: 0
        }

        sessionsWithTime.forEach(session => {
          const seconds = session.time_spent_seconds || 0
          if (seconds < 30) timeDistribution.under30s++
          else if (seconds < 120) timeDistribution.under2m++
          else if (seconds < 300) timeDistribution.under5m++
          else if (seconds < 900) timeDistribution.under15m++
          else timeDistribution.over15m++
        })

        // Calculate page statistics
        const pageStats = new Map<string, {
          session_count: number
          total_time: number
          completed_sessions: number
          total_sessions: number
        }>()

        sessions.forEach(session => {
          const path = session.page_path
          const existing = pageStats.get(path) || {
            session_count: 0,
            total_time: 0,
            completed_sessions: 0,
            total_sessions: 0
          }
          
          existing.total_sessions += 1
          if (session.time_spent_seconds !== null) {
            existing.session_count += 1
            existing.total_time += session.time_spent_seconds
            existing.completed_sessions += 1
          }
          
          pageStats.set(path, existing)
        })

        const topPages = Array.from(pageStats.entries())
          .map(([page_path, stats]) => ({
            page_path,
            session_count: stats.total_sessions,
            total_time: stats.total_time,
            average_time: stats.completed_sessions > 0 
              ? stats.total_time / stats.completed_sessions 
              : 0,
            completion_rate: stats.total_sessions > 0
              ? (stats.completed_sessions / stats.total_sessions) * 100
              : 0
          }))
          .sort((a, b) => b.total_time - a.total_time)

        setAnalytics({
          totalSessions,
          totalTimeSpent,
          averageSessionDuration,
          activeSessions,
          completedSessions,
          completionRate,
          topPages,
          recentSessions: sessions.slice(0, 50), // Last 50 sessions
          timeDistribution
        })
      } catch (err) {
        console.error('Error fetching session analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user, dateRange.from, dateRange.to, pagePath, includeActive, supabase])

  return { analytics, loading, error }
}

// Utility function to format time duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
}

// Utility function to format percentage
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100) / 100}%`
}

// Hook for real-time session monitoring (admin use)
export function useRealtimeSessionMonitoring() {
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchActiveSessions = async () => {
      const { data, error } = await supabase
        .from('page_sessions')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setActiveSessions(data)
      }
      setLoading(false)
    }

    fetchActiveSessions()

    // Set up real-time subscription
    const channel = supabase
      .channel('active-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'page_sessions',
          filter: 'is_active=eq.true'
        },
        fetchActiveSessions
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return { activeSessions, loading }
}
