'use client'

import { useEffect, useState, useRef } from 'react'
import { usePageTracking } from '@/hooks/usePageTracking'
import Image from 'next/image'

// Server IDs and labels
const SERVER_IDS = [
  { id: "27429034", label: "Island 1" },
  { id: "28035581", label: "Island 2" },
  { id: "30844316", label: "Island 3" },
  { id: "31614162", label: "Island 4" },
  { id: "29675841", label: "Island 5" },
  { id: "30871980", label: "Island 6" },
  { id: "33676045", label: "Island 7" }
]

// Country name mapping
const COUNTRY_NAMES: Record<string, string> = {
  us: "United States", ca: "Canada", gb: "United Kingdom", de: "Germany",
  fr: "France", nl: "Netherlands", au: "Australia", ru: "Russia",
  se: "Sweden", no: "Norway", fi: "Finland", es: "Spain",
  it: "Italy", br: "Brazil", un: "Unknown"
}

// Server data interface
interface ServerData {
  name: string
  status: string
  players: number
  maxPlayers: number
  country?: string
  region?: string
}

export default function ServerStatusPage() {
  usePageTracking()

  // State
  const [serverData, setServerData] = useState<Record<string, ServerData>>({})
  const [lastUpdated, setLastUpdated] = useState<string>('--')
  const [isLoading, setIsLoading] = useState(true)
  
  // Refs
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate statistics
  const stats = {
    totalServers: SERVER_IDS.length,
    onlineServers: Object.values(serverData).filter(s => s?.status === 'online').length,
    totalPlayers: Object.values(serverData).reduce((sum, s) => sum + (s?.players || 0), 0),
    avgCapacity: Object.values(serverData).length > 0 
      ? Object.values(serverData).reduce((sum, s) => sum + ((s?.players || 0) / 128 * 100), 0) / Object.values(serverData).length 
      : 0
  }

  // Determine capacity class based on percentage
  const getCapacityClass = (percentage: number): string => {
    if (percentage <= 25) return 'bg-gradient-to-r from-[#00c6ff] to-[#0072ff]'
    if (percentage <= 50) return 'bg-gradient-to-r from-[#0072ff] to-[#00c6ff]'
    if (percentage <= 75) return 'bg-gradient-to-r from-[#ff6b35] to-[#f7931e]'
    return 'bg-gradient-to-r from-[#ff4757] to-[#ff3838]'
  }

  // Fetch server data
  const fetchServerData = async (serverId: string) => {
    try {
      const res = await fetch(`https://api.battlemetrics.com/servers/${serverId}`)
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
      console.error(`Error fetching data for server ${serverId}:`, err)
    }
  }

  // Update all servers
  const updateAllServers = async () => {
    setIsLoading(true)
    const fetchPromises = SERVER_IDS.map(({ id }) => fetchServerData(id))
    await Promise.allSettled(fetchPromises)
    setLastUpdated(new Date().toLocaleTimeString())
    setIsLoading(false)
  }

  // Initialize and set up interval
  useEffect(() => {
    updateAllServers()
    
    // Set up interval for updates
    updateIntervalRef.current = setInterval(updateAllServers, 60000) // Update every minute
    
    // Clean up interval on unmount
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#121212] text-white px-4 py-6 relative">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(0,198,255,0.03)_0%,transparent_50%),radial-gradient(circle_at_75%_75%,rgba(0,114,255,0.03)_0%,transparent_50%)]"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text mb-1">
            ELAN Life
          </h1>
          <p className="text-[#888888] text-lg">Live Server Status Dashboard</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-center transition-all hover:border-[#00c6ff]/30">
            <div className="text-3xl font-bold text-[#00c6ff] mb-1">{stats.totalServers}</div>
            <div className="text-xs text-[#888888] uppercase tracking-wider">Total Servers</div>
          </div>
          
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-center transition-all hover:border-[#00c6ff]/30">
            <div className="text-3xl font-bold text-[#00c6ff] mb-1">
              {isLoading ? '--' : stats.onlineServers}
            </div>
            <div className="text-xs text-[#888888] uppercase tracking-wider">Online</div>
          </div>
          
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-center transition-all hover:border-[#00c6ff]/30">
            <div className="text-3xl font-bold text-[#00c6ff] mb-1">
              {isLoading ? '--' : stats.totalPlayers}
            </div>
            <div className="text-xs text-[#888888] uppercase tracking-wider">Total Players</div>
          </div>
          
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-center transition-all hover:border-[#00c6ff]/30">
            <div className="text-3xl font-bold text-[#00c6ff] mb-1">
              {isLoading ? '--' : `${Math.round(stats.avgCapacity)}%`}
            </div>
            <div className="text-xs text-[#888888] uppercase tracking-wider">Avg Capacity</div>
          </div>
        </div>

        {/* Servers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {SERVER_IDS.map(({ id, label }) => {
            const server = serverData[id]
            const isOnline = server?.status === 'online'
            const players = server?.players || 0
            const maxPlayers = server?.maxPlayers || 128
            const percentage = Math.min((players / maxPlayers) * 100, 100)
            const countryCode = server?.country?.toLowerCase() || 'un'
            const region = server?.region
            const location = region || COUNTRY_NAMES[countryCode] || "Unknown"
            
            return (
              <div 
                key={id}
                className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.08] rounded-xl p-6 transition-all hover:border-[#00c6ff]/20"
              >
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
                    <span className="w-1 h-1 rounded-full bg-current"></span>
                    {isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-[#888888] uppercase tracking-wider">Players</div>
                    <div className="text-white font-semibold">
                      {isLoading ? '--/--' : `${players}/${maxPlayers}`}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-[#888888] uppercase tracking-wider">Location</div>
                    <div className="text-white font-semibold flex items-center gap-2">
                      {location}
                      {countryCode && (
                        <Image 
                          src={`https://flagcdn.com/h20/${countryCode}.png`}
                          alt={countryCode}
                          width={16}
                          height={12}
                          className="rounded-sm"
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#888888]">
                      {isLoading ? '--' : `${Math.round(percentage)}% full`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getCapacityClass(percentage)}`}
                      style={{ width: `${isLoading ? 0 : percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Last Updated */}
        <div className="fixed bottom-4 right-4 bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg text-xs text-[#888888] border border-white/5 md:static md:mt-8 md:text-center">
          Last updated: <span>{lastUpdated}</span>
        </div>
      </div>
    </div>
  )
}