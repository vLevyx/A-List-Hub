'use client'

import { useState, useRef } from 'react'
import { usePageTracking } from '@/hooks/usePageTracking'
import { useAuth } from '@/hooks/useAuth'
import { useEffect } from 'react'

// Station data
const stations = [
  { position: 1, name: 'Monti Gas Station', type: '⛽' },
  { position: 2, name: 'Meaux Harbour - Crabapple Bay', type: '⚓' },
  { position: 3, name: 'Étoupe Gas Station (Parcel 4)', type: '⛽' },
  { position: 4, name: 'VW Dealer', type: '⛽' },
  { position: 5, name: 'St Philippe Gas Station', type: '⛽' },
  { position: 6, name: 'St Philippe - Charlet Bay', type: '⚓' },
  { position: 7, name: 'St Philippe - Birchwood Bay', type: '⚓' },
  { position: 8, name: 'Airport', type: '🛫' },
  { position: 9, name: 'Lamentin Gas Station', type: '⛽' },
  { position: 10, name: 'St Pierre Gas Station', type: '⛽' },
  { position: 11, name: 'Montingac Farm', type: '🐏' },
  { position: 12, name: 'Morton Bay', type: '⚓' }
]

// Statistics
const stats = [
  { value: 12, label: 'Total Stations' },
  { value: 8, label: 'Fuel Stations' },
  { value: 3, label: 'Harbor Points' },
  { value: 1, label: 'Airport Hub' }
]

interface StationModalProps {
  station: { position: number; name: string; type: string } | null
  onClose: () => void
}

const StationModal: React.FC<StationModalProps> = ({ station, onClose }) => {
  if (!station) return null

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#1e1e1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-[#00c6ff]">{station.name}</h3>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="mb-4">
          <div className="text-4xl text-center my-4">{station.type}</div>
          <p className="text-white/80">Position: {station.position}</p>
        </div>
        
        <div className="h-[200px] bg-white/5 rounded-lg flex items-center justify-center mb-4">
          <p className="text-white/50">Map image will be available soon</p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full py-2 px-4 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white font-semibold rounded-lg hover:shadow-lg transition-all"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default function OverFuelPage() {
  usePageTracking()
  const { hasAccess, loading } = useAuth()
  const [selectedStation, setSelectedStation] = useState<typeof stations[0] | null>(null)
  
  // Redirect if no access
  useEffect(() => {
    if (!loading && !hasAccess) {
      window.location.href = '/'
    }
  }, [hasAccess, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0b] to-[#1a1a1b]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c6ff]"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0b] to-[#1a1a1b] text-[#f0f0f0]">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col min-h-screen">
        {/* Header */}
        <header className="text-center py-8 border-b border-white/8 mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text mb-2">
            OverFuel+
          </h1>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 text-center transition-all hover:bg-[#00c6ff]/5 hover:border-[#00c6ff]/20 hover:-translate-y-0.5 backdrop-blur-lg"
            >
              <div className="text-3xl font-bold text-[#00c6ff] mb-2">{stat.value}</div>
              <div className="text-sm text-white/70 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Stations Section */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden backdrop-blur-lg flex-1">
          <div className="bg-[#00c6ff]/10 border-b border-[#00c6ff]/20 p-5">
            <h2 className="text-xl font-semibold text-[#00c6ff]">Station Directory</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/[0.03] border-b-2 border-white/10">
                <tr>
                  <th className="p-4 md:p-5 text-left font-semibold text-sm text-[#00c6ff] uppercase tracking-wider">Position</th>
                  <th className="p-4 md:p-5 text-left font-semibold text-sm text-[#00c6ff] uppercase tracking-wider">Station</th>
                  <th className="p-4 md:p-5 text-left font-semibold text-sm text-[#00c6ff] uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody>
                {stations.map((station) => (
                  <tr 
                    key={station.position}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => setSelectedStation(station)}
                  >
                    <td className="p-4 md:p-5 font-semibold text-[#00c6ff] w-[80px] md:w-auto">{station.position}</td>
                    <td className="p-4 md:p-5 text-white/95 font-medium">{station.name}</td>
                    <td className="p-4 md:p-5 text-2xl text-center w-[80px] md:w-auto">{station.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Station Modal */}
      {selectedStation && (
        <StationModal 
          station={selectedStation} 
          onClose={() => setSelectedStation(null)} 
        />
      )}
    </div>
  )
}