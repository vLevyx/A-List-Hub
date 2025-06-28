'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { usePageTracking } from '@/hooks/usePageTracking'
import Image from 'next/image'

// Server IDs and labels - moved outside component to prevent recreation
const SERVER_IDS = [
  { id: "27429034", label: "Island 1" },
  { id: "28035581", label: "Island 2" },
  { id: "30844316", label: "Island 3" },
  { id: "31614162", label: "Island 4" },
  { id: "29675841", label: "Island 5" },
  { id: "30871980", label: "Island 6" },
  { id: "33676045", label: "Island 7" }
] as const

// Country name mapping - optimized for performance
const COUNTRY_NAMES: Record<string, string> = {
  us: "United States", ca: "Canada", gb: "United Kingdom", de: "Germany",
  fr: "France", nl: "Netherlands", au: "Australia", ru: "Russia",
  se: "Sweden", no: "Norway", fi: "Finland", es: "Spain",
  it: "Italy", br: "Brazil", unk: "Unknown"
} as const

// Server data interface
interface ServerData {
  name: string
  status: string
  players: number
  maxPlayers: number
  country?: string
  region?: string
}

// Stats interface for better type safety
interface ServerStats {
  totalServers: number
  onlineServers: number
  totalPlayers: number
  avgCapacity: number
}

// Error boundary for failed server requests
const ServerCard = ({ 
  server, 
  label, 
  isLoading, 
  getCapacityClass 
}: {
  server: ServerData | undefined
  label: string
  isLoading: boolean
  getCapacityClass: (percentage: number) => string
}) => {
  const isOnline = server?.status === 'online'
  const players = server?.players || 0
  const maxPlayers = server?.maxPlayers || 128
  const percentage = Math.min((players / maxPlayers) * 100, 100)
  const countryCode = server?.country?.toLowerCase() || 'unk'
  const region = server?.region
  const location = region || COUNTRY_NAMES[countryCode] || "Unknown"

  return (
    <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 transition-all hover:border-[#00c6ff]/20">
      <div className="flex justify-between items-center mb-4">
        <div>
          <div className="text-lg font-semibold text-white mb-1">
            {server?.name || 'Loading...'}
          </div>
          <div className="text-sm text-[#666666]">{label}</div>
        </div>
        
        <div className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
          isOnline 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
        }`}>
          <span className="w-1 h-1 rounded-full bg-current" role="presentation" aria-hidden="true"></span>
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <div className="text-xs text-[#888888] uppercase tracking-wider">Players</div>
          <div className="text-white font-semibold" aria-live="polite">
            {isLoading ? '--/--' : `${players}/${maxPlayers}`}
          </div>
        </div>
        
        <div className="flex flex-col gap-1">
          <div className="text-xs text-[#888888] uppercase tracking-wider">Location</div>
          <div className="text-white font-semibold flex items-center gap-2">
            {location}
            {countryCode && countryCode !== 'unk' && (
              <Image 
                src={`https://flagcdn.com/h20/${countryCode}.png`}
                alt={`${COUNTRY_NAMES[countryCode] || countryCode} flag`}
                width={16}
                height={12}
                className="rounded-sm"
                loading="lazy"
                unoptimized={true}
              />
            )}
          </div>
        </div>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#888888]" aria-live="polite">
            {isLoading ? '--' : `${Math.round(percentage)}% full`}
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
          <div 
            className={`h-full rounded-full transition-all duration-500 ${getCapacityClass(percentage)}`}
            style={{ width: `${isLoading ? 0 : percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}

// Loading skeleton component
const LoadingSkeleton = () => (
  <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div>
        <div className="h-6 bg-white/10 rounded w-32 mb-2"></div>
        <div className="h-4 bg-white/5 rounded w-20"></div>
      </div>
      <div className="h-6 bg-white/5 rounded w-16"></div>
    </div>
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="space-y-2">
        <div className="h-3 bg-white/5 rounded w-16"></div>
        <div className="h-5 bg-white/10 rounded w-12"></div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-white/5 rounded w-16"></div>
        <div className="h-5 bg-white/10 rounded w-20"></div>
      </div>
    </div>
    <div className="h-1.5 bg-white/5 rounded-full"></div>
  </div>
)

export default function ServerStatusPage() {
  usePageTracking()

  // State with better initial values
  const [serverData, setServerData] = useState<Record<string, ServerData>>({})
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Refs
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Memoized statistics calculation
  const stats: ServerStats = useMemo(() => {
    const servers = Object.values(serverData)
    const onlineServers = servers.filter(s => s?.status === 'online')
    
    return {
      totalServers: SERVER_IDS.length,
      onlineServers: onlineServers.length,
      totalPlayers: servers.reduce((sum, s) => sum + (s?.players || 0), 0),
      avgCapacity: servers.length > 0 
        ? servers.reduce((sum, s) => sum + ((s?.players || 0) / (s?.maxPlayers || 128) * 100), 0) / servers.length 
        : 0
    }
  }, [serverData])

  // Memoized capacity class function
  const getCapacityClass = useCallback((percentage: number): string => {
    if (percentage <= 25) return 'bg-gradient-to-r from-[#00c6ff] to-[#0072ff]'
    if (percentage <= 50) return 'bg-gradient-to-r from-[#0072ff] to-[#00c6ff]'
    if (percentage <= 75) return 'bg-gradient-to-r from-[#ff6b35] to-[#f7931e]'
    return 'bg-gradient-to-r from-[#ff4757] to-[#ff3838]'
  }, [])

  // Optimized fetch with abort controller and error handling
  const fetchServerData = useCallback(async (serverId: string, signal: AbortSignal) => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const res = await fetch(`https://api.battlemetrics.com/servers/${serverId}`, {
        signal: AbortSignal.any([signal, controller.signal]),
        headers: {
          'Accept': 'application/json',
        },
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }
      
      const data = await res.json()
      const server = data.data.attributes
      
      setServerData(prev => ({
        ...prev,
        [serverId]: {
          name: server.name,
          status: server.status,
          players: server.players,
          maxPlayers: server.maxPlayers,
          country: server.country,
          region: server.details?.regionName
        }
      }))
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error(`Error fetching data for server ${serverId}:`, err)
        setError(prev => prev || `Failed to load server ${serverId}`)
      }
    }
  }, [])

  // Optimized update function with proper error handling
  const updateAllServers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Cancel any existing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      abortControllerRef.current = new AbortController()
      
      const fetchPromises = SERVER_IDS.map(({ id }) => 
        fetchServerData(id, abortControllerRef.current!.signal)
      )
      
      await Promise.allSettled(fetchPromises)
      
      setLastUpdated(new Date().toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }))
    } catch (err) {
      console.error('Error updating servers:', err)
      setError('Failed to update server data')
    } finally {
      setIsLoading(false)
    }
  }, [fetchServerData])

  // Initialize and set up interval with cleanup
  useEffect(() => {
    updateAllServers()
    
    // Set up interval for updates (reduced frequency for better performance)
    updateIntervalRef.current = setInterval(updateAllServers, 30000) // Update every 30 seconds
    
    // Cleanup function
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [updateAllServers])

  // Handle page visibility change to pause updates when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current)
        }
      } else {
        updateAllServers()
        updateIntervalRef.current = setInterval(updateAllServers, 30000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [updateAllServers])

  return (
    <div className="min-h-screen bg-[#121212] text-white px-4 py-6 relative">
      {/* Background gradient - moved to CSS for better performance */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(0,198,255,0.03)_0%,transparent_50%),radial-gradient(circle_at_75%_75%,rgba(0,114,255,0.03)_0%,transparent_50%)]"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header with improved SEO */}
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text mb-1">
            ELAN Life Server Status
          </h1>
          <p className="text-[#888888] text-lg">Live Server Status Dashboard - Real-time player counts and server information</p>
        </header>

        {/* Error message */}
        {error && (
          <div className="mb-8 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Stats Overview with better semantics */}
        <section aria-label="Server Statistics Overview" className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-center transition-all hover:border-[#00c6ff]/30">
            <div className="text-3xl font-bold text-[#00c6ff] mb-1" aria-label={`${stats.totalServers} total servers`}>
              {stats.totalServers}
            </div>
            <div className="text-xs text-[#888888] uppercase tracking-wider">Total Servers</div>
          </div>
          
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-center transition-all hover:border-[#00c6ff]/30">
            <div className="text-3xl font-bold text-[#00c6ff] mb-1" aria-live="polite" aria-label={`${stats.onlineServers} servers online`}>
              {isLoading ? '–' : stats.onlineServers}
            </div>
            <div className="text-xs text-[#888888] uppercase tracking-wider">Online</div>
          </div>
          
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-center transition-all hover:border-[#00c6ff]/30">
            <div className="text-3xl font-bold text-[#00c6ff] mb-1" aria-live="polite" aria-label={`${stats.totalPlayers} total players`}>
              {isLoading ? '–' : stats.totalPlayers}
            </div>
            <div className="text-xs text-[#888888] uppercase tracking-wider">Total Players</div>
          </div>
          
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-center transition-all hover:border-[#00c6ff]/30">
            <div className="text-3xl font-bold text-[#00c6ff] mb-1" aria-live="polite" aria-label={`${Math.round(stats.avgCapacity)}% average capacity`}>
              {isLoading ? '–' : `${Math.round(stats.avgCapacity)}%`}
            </div>
            <div className="text-xs text-[#888888] uppercase tracking-wider">Avg Capacity</div>
          </div>
        </section>

        {/* Servers Grid with improved accessibility */}
        <section aria-label="Individual Server Status" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {SERVER_IDS.map(({ id, label }) => {
            const server = serverData[id]
            
            return (
              <article key={id} aria-label={`${label} server status`}>
                {isLoading && !server ? (
                  <LoadingSkeleton />
                ) : (
                  <ServerCard 
                    server={server}
                    label={label}
                    isLoading={isLoading}
                    getCapacityClass={getCapacityClass}
                  />
                )}
              </article>
            )
          })}
        </section>

        {/* Last Updated with better accessibility */}
        <footer className="fixed bottom-4 right-4 bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-[#888888] border border-white/5 md:static md:mt-8 md:text-center">
          <span aria-live="polite">
            Last updated: <time dateTime={new Date().toISOString()}>{lastUpdated || 'Loading...'}</time>
          </span>
        </footer>
      </div>
    </div>
  )
}