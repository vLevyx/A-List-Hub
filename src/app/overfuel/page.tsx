'use client'

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { usePageTracking } from '@/hooks/usePageTracking'
import { useAuth } from '@/hooks/useAuth'

// Lazy load the modal for code splitting
const StationModal = lazy(() => import('@/components/OverFuel/StationModal').then(module => ({ default: module.StationModal })))

// Station data
const stations = [
  { position: 1, name: 'Monti Gas Station', type: '⛽', category: 'Fuel' },
  { position: 2, name: 'Meaux Harbour - Crabapple Bay', type: '⚓', category: 'Harbor' },
  { position: 3, name: 'Étoupe Gas Station (Parcel 4)', type: '⛽', category: 'Fuel' },
  { position: 4, name: 'VW Dealer', type: '⛽', category: 'Fuel' },
  { position: 5, name: 'St Philippe Gas Station', type: '⛽', category: 'Fuel' },
  { position: 6, name: 'St Philippe - Charlet Bay', type: '⚓', category: 'Harbor' },
  { position: 7, name: 'St Philippe - Birchwood Bay', type: '⚓', category: 'Harbor' },
  { position: 8, name: 'Airport', type: '🛫', category: 'Airport' },
  { position: 9, name: 'Lamentin Gas Station', type: '⛽', category: 'Fuel' },
  { position: 10, name: 'St Pierre Gas Station', type: '⛽', category: 'Fuel' },
  { position: 11, name: 'Montingac Farm', type: '🐏', category: 'Farm' },
  { position: 12, name: 'Morton Bay', type: '⚓', category: 'Harbor' }
]

// Statistics
const stats = [
  { value: 12, label: 'Total Stations', ariaLabel: '12 total stations' },
  { value: 8, label: 'Fuel Stations', ariaLabel: '8 fuel stations' },
  { value: 3, label: 'Harbor Points', ariaLabel: '3 harbor points' },
  { value: 1, label: 'Airport Hub', ariaLabel: '1 airport hub' }
]

interface Station {
  position: number
  name: string
  type: string
  category: string
}

// Loading spinner component for modal
const ModalLoadingSpinner = () => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-40">
    <div className="bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#00c6ff] mx-auto"></div>
      <p className="text-white/70 mt-4 text-center">Loading station details...</p>
    </div>
  </div>
)

export default function OverFuelPage() {
  usePageTracking()
  const { hasAccess, loading } = useAuth()
  const [selectedStation, setSelectedStation] = useState<Station | null>(null)
  const [preloadedImages, setPreloadedImages] = useState<Set<number>>(new Set())

  // Preload ALL images when component mounts
  useEffect(() => {
    const loadedImages = new Set<number>()
    let loadedCount = 0
    
    stations.forEach((station) => {
      const img = document.createElement('img')
      img.src = `/OverFuelMaps/gas${station.position}.png`
      img.onload = () => {
        loadedImages.add(station.position)
        loadedCount++
        setPreloadedImages(new Set(loadedImages))
        if (loadedCount === stations.length) {
          console.log('All station images preloaded')
        }
      }
      img.onerror = () => {
        loadedCount++
        if (loadedCount === stations.length) {
          console.log('Image preloading completed (some may have failed)')
        }
      }
    })
  }, [])

  // Station selection handler
  const handleStationSelect = useCallback((station: Station) => {
    setSelectedStation(station)
  }, [])

  // Modal close handler
  const handleCloseModal = useCallback(() => {
    setSelectedStation(null)
  }, [])

  // Keyboard event handler for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedStation) {
        handleCloseModal()
      }
    }

    if (selectedStation) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [selectedStation, handleCloseModal])

  // Redirect if no access
  useEffect(() => {
    if (!loading && !hasAccess) {
      window.location.href = '/'
    }
  }, [loading, hasAccess])

  // Memoized station rows for performance
  const stationRows = useMemo(() => 
    stations.map((station) => (
      <tr
        key={station.position}
        className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors cursor-pointer focus-within:bg-white/[0.02]"
        onClick={() => handleStationSelect(station)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleStationSelect(station)
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`View details for ${station.name}, position ${station.position}, ${station.category} station`}
      >
        <td className="p-4 md:p-5 font-semibold text-[#00c6ff] w-[80px] md:w-auto">
          {station.position}
        </td>
        <td className="p-4 md:p-5 text-white/95 font-medium">
          {station.name}
        </td>
        <td className="p-4 md:p-5 text-left text-2xl w-[80px] md:w-auto" aria-label={station.category}>
          {station.type}
        </td>
      </tr>
    )), [handleStationSelect])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0b] to-[#1a1a1b]">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c6ff]"
          role="status"
          aria-label="Loading page content"
        />
      </div>
    )
  }

  // No access state
  if (!hasAccess) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] to-[#1a1a1b] text-[#f0f0f0]">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col min-h-screen">
        {/* Header */}
        <header className="text-center py-8 border-b border-white/8 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text mb-2">
            OverFuel+
          </h1>
          <p className="text-white/70 text-lg mt-2">Complete station directory and route planning</p>
        </header>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" aria-label="Station statistics">
          {stats.map((stat, idx) => (
            <div
              key={`stat-${idx}`}
              className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 text-center transition-all hover:bg-[#00c6ff]/5 hover:border-[#00c6ff]/20 hover:-translate-y-0.5 backdrop-blur-lg"
              role="region"
              aria-label={stat.ariaLabel}
            >
              <div className="text-3xl font-bold text-[#00c6ff] mb-2" aria-hidden="true">
                {stat.value}
              </div>
              <div className="text-sm text-white/70 uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </section>

        {/* Stations Section */}
        <main className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden backdrop-blur-lg flex-1">
          <div className="bg-[#00c6ff]/10 border-b border-[#00c6ff]/20 p-5">
            <h2 className="text-xl font-semibold text-[#00c6ff]">Station Directory</h2>
            <p className="text-white/60 text-sm mt-1">Click any station to view detailed location map</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full" role="table" aria-label="Station directory table">
              <thead className="bg-white/[0.03] border-b-2 border-white/10">
                <tr>
                  <th 
                    className="p-4 md:p-5 text-left font-semibold text-sm text-[#00c6ff] uppercase tracking-wider"
                    scope="col"
                  >
                    Position
                  </th>
                  <th 
                    className="p-4 md:p-5 text-left font-semibold text-sm text-[#00c6ff] uppercase tracking-wider"
                    scope="col"
                  >
                    Station
                  </th>
                  <th 
                    className="p-4 md:p-5 text-left font-semibold text-sm text-[#00c6ff] uppercase tracking-wider"
                    scope="col"
                  >
                    Type
                  </th>
                </tr>
              </thead>
              <tbody>
                {stationRows}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* Modal with Suspense for code splitting */}
      {selectedStation && (
        <Suspense fallback={<ModalLoadingSpinner />}>
          <StationModal
            station={selectedStation}
            onClose={handleCloseModal}
          />
        </Suspense>
      )}
    </div>
  )
}