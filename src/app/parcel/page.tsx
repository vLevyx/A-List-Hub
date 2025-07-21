'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { usePageTracking } from '@/hooks/usePageTracking'
import { 
  MapPin, 
  Truck, 
  Package, 
  Route, 
  Calculator, 
  Navigation,
  Clock,
  TrendingUp,
  Car,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Zap
} from 'lucide-react'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ParcelStation {
  id: number
  name: string
  gridX: number
  gridZ: number
  x: number
  z: number
}

interface DeliveryJob {
  stationId: number
  parcelCount: number
}

interface RouteResult {
  stations: ParcelStation[]
  totalDistance: number
  estimatedTime: number
  trips: Array<{
    stations: ParcelStation[]
    parcels: number
    distance: number
  }>
}

interface OptimizationSettings {
  vehicleType: 'van' | 'standard'
  strategy: 'distance' | 'efficiency' | 'balanced'
}

// ============================================================================
// CONSTANTS & DATA
// ============================================================================

const PARCEL_STATIONS: ParcelStation[] = [
  { id: 1, name: "Parcel Station 1", gridX: 49, gridZ: 68, x: 4900, z: 6800 },
  { id: 2, name: "Parcel Station 2", gridX: 41, gridZ: 77, x: 4100, z: 7700 },
  { id: 3, name: "Parcel Station 3", gridX: 44, gridZ: 94, x: 4400, z: 9400 },
  { id: 4, name: "Parcel Station 4", gridX: 53, gridZ: 100, x: 5300, z: 10000 },
  { id: 5, name: "Parcel Station 5", gridX: 45, gridZ: 106, x: 4500, z: 10600 },
  { id: 6, name: "Parcel Station 6", gridX: 58, gridZ: 70, x: 5800, z: 7000 },
  { id: 7, name: "Parcel Station 7", gridX: 69, gridZ: 59, x: 6900, z: 5900 },
  { id: 8, name: "Parcel Station 8", gridX: 49, gridZ: 39, x: 4900, z: 3900 },
  { id: 9, name: "Parcel Station 9", gridX: 75, gridZ: 46, x: 7500, z: 4600 },
  { id: 10, name: "Parcel Station 10", gridX: 71, gridZ: 24, x: 7100, z: 2400 },
  { id: 11, name: "Parcel Station 11", gridX: 88, gridZ: 27, x: 8800, z: 2700 },
  { id: 12, name: "Parcel Station 12", gridX: 97, gridZ: 15, x: 9700, z: 1500 }
]

const VEHICLE_CAPACITIES = {
  van: 8,
  standard: 3
} as const

const STRATEGY_DESCRIPTIONS = {
  distance: 'Shortest total travel distance',
  efficiency: 'Prioritize stations with more parcels',
  balanced: 'Balance distance and parcel density'
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateDistance(station1: ParcelStation, station2: ParcelStation): number {
  const dx = station1.x - station2.x
  const dz = station1.z - station2.z
  return Math.sqrt(dx * dx + dz * dz)
}

function optimizeRoute(
  currentStation: ParcelStation,
  deliveries: DeliveryJob[],
  settings: OptimizationSettings
): RouteResult {
  // Create a working copy to avoid mutating the original data
  const workingDeliveries = deliveries.map(job => ({ ...job }))
  const deliveryStations = workingDeliveries.map(job => 
    PARCEL_STATIONS.find(station => station.id === job.stationId)!
  )
  
  const capacity = VEHICLE_CAPACITIES[settings.vehicleType]
  let unvisited = [...deliveryStations]
  let currentPos = currentStation
  let totalDistance = 0
  const trips: RouteResult['trips'] = []
  
  while (unvisited.length > 0) {
    const trip: RouteResult['trips'][0] = { stations: [], parcels: 0, distance: 0 }
    let tripDistance = 0
    let currentTripPos = currentPos
    
    // Fill this trip up to capacity
    while (trip.parcels < capacity && unvisited.length > 0) {
      let nextStation: ParcelStation
      
      if (settings.strategy === 'distance') {
        // Nearest neighbor approach
        nextStation = unvisited.reduce((nearest, station) => {
          const distToStation = calculateDistance(currentTripPos, station)
          const distToNearest = calculateDistance(currentTripPos, nearest)
          return distToStation < distToNearest ? station : nearest
        })
      } else if (settings.strategy === 'efficiency') {
        // Prioritize stations with more parcels
        nextStation = unvisited.reduce((best, station) => {
          const stationJob = workingDeliveries.find(job => job.stationId === station.id)!
          const bestJob = workingDeliveries.find(job => job.stationId === best.id)!
          
          if (stationJob.parcelCount > bestJob.parcelCount) return station
          if (stationJob.parcelCount < bestJob.parcelCount) return best
          
          // If tied, choose closer one
          const distToStation = calculateDistance(currentTripPos, station)
          const distToBest = calculateDistance(currentTripPos, best)
          return distToStation < distToBest ? station : best
        })
      } else {
        // Balanced approach
        nextStation = unvisited.reduce((best, station) => {
          const stationJob = workingDeliveries.find(job => job.stationId === station.id)!
          const bestJob = workingDeliveries.find(job => job.stationId === best.id)!
          
          const distToStation = calculateDistance(currentTripPos, station)
          const distToBest = calculateDistance(currentTripPos, best)
          
          // Score combines parcels and inverse distance
          const stationScore = stationJob.parcelCount * 100 - distToStation / 10
          const bestScore = bestJob.parcelCount * 100 - distToBest / 10
          
          return stationScore > bestScore ? station : best
        })
      }
      
      const jobForStation = workingDeliveries.find(job => job.stationId === nextStation.id)!
      const parcelsToTake = Math.min(jobForStation.parcelCount, capacity - trip.parcels)
      
      const distanceToNext = calculateDistance(currentTripPos, nextStation)
      tripDistance += distanceToNext
      
      trip.stations.push(nextStation)
      trip.parcels += parcelsToTake
      trip.distance = tripDistance
      
      // Update remaining parcels for this job (working copy only)
      jobForStation.parcelCount -= parcelsToTake
      if (jobForStation.parcelCount <= 0) {
        unvisited = unvisited.filter(s => s.id !== nextStation.id)
      }
      
      currentTripPos = nextStation
    }
    
    trips.push(trip)
    totalDistance += tripDistance
  }
  
  // Estimate time (assuming 60 km/h average speed, distance in meters)
  const estimatedTime = Math.round((totalDistance / 1000) / 60 * 60) // minutes
  
  return {
    stations: deliveryStations,
    totalDistance: Math.round(totalDistance),
    estimatedTime,
    trips
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ParcelRoutePlanner() {
  usePageTracking()
  const { user, loading, hasAccess } = useAuth()
  
  // ===== STATE =====
  const [currentStationId, setCurrentStationId] = useState<number>(1)
  const [deliveries, setDeliveries] = useState<DeliveryJob[]>([])
  const [settings, setSettings] = useState<OptimizationSettings>({
    vehicleType: 'van',
    strategy: 'balanced'
  })
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  
  // ===== COMPUTED VALUES =====
  const currentStation = PARCEL_STATIONS.find(s => s.id === currentStationId)!
  const totalParcels = deliveries.reduce((sum, job) => sum + job.parcelCount, 0)
  const selectedStations = deliveries.map(job => 
    PARCEL_STATIONS.find(s => s.id === job.stationId)!
  )
  
  // ===== HANDLERS =====
  const handleStationToggle = (stationId: number) => {
    setDeliveries(prev => {
      const existing = prev.find(job => job.stationId === stationId)
      if (existing) {
        return prev.filter(job => job.stationId !== stationId)
      } else {
        return [...prev, { stationId, parcelCount: 1 }]
      }
    })
  }
  
  const handleParcelCountChange = (stationId: number, count: number) => {
    if (count <= 0) {
      setDeliveries(prev => prev.filter(job => job.stationId !== stationId))
    } else {
      setDeliveries(prev => 
        prev.map(job => 
          job.stationId === stationId 
            ? { ...job, parcelCount: Math.min(count, 50) }
            : job
        )
      )
    }
  }
  
  const handleDelivered = (stationId: number) => {
    setDeliveries(prev => prev.filter(job => job.stationId !== stationId))
    // Recalculate route if there are still deliveries remaining
    if (deliveries.length > 1) {
      setTimeout(() => {
        if (deliveries.filter(d => d.stationId !== stationId).length > 0) {
          calculateRoute()
        }
      }, 100)
    } else {
      // If this was the last delivery, clear the route
      setRouteResult(null)
    }
  }
  
  const calculateRoute = async () => {
    if (deliveries.length === 0) return
    
    setIsCalculating(true)
    // Add realistic loading delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const result = optimizeRoute(currentStation, deliveries, settings)
    setRouteResult(result)
    setIsCalculating(false)
  }
  
  const resetForm = () => {
    setDeliveries([])
    setRouteResult(null)
    setCurrentStationId(1)
  }
  
  // ===== LOADING STATES =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (!hasAccess) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-primary via-background-secondary to-background-primary">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-primary-600/5" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header Section */}
          <motion.header 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 text-transparent bg-clip-text mb-4">
              Parcel Route Planner
            </h1>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              Optimize your parcel delivery routes across Everon Island for maximum efficiency and profit
            </p>
          </motion.header>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Left Column - Input Panel */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="xl:col-span-2 space-y-6"
            >
              
              {/* Settings Panel */}
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 backdrop-blur-lg">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary-500" />
                  Route Configuration
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Current Station */}
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">
                      Current Station
                    </label>
                    <select
                      value={currentStationId}
                      onChange={(e) => setCurrentStationId(Number(e.target.value))}
                      className="w-full bg-background-tertiary border border-white/20 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
                    >
                      {PARCEL_STATIONS.map(station => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Vehicle Type */}
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">
                      Vehicle Type
                    </label>
                    <select
                      value={settings.vehicleType}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        vehicleType: e.target.value as 'van' | 'standard' 
                      }))}
                      className="w-full bg-background-tertiary border border-white/20 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
                    >
                      <option value="van">Parcel Van (8 capacity)</option>
                      <option value="standard">Standard Vehicle (3 capacity)</option>
                    </select>
                  </div>
                  
                  {/* Strategy */}
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">
                      Optimization Strategy
                    </label>
                    <select
                      value={settings.strategy}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        strategy: e.target.value as OptimizationSettings['strategy'] 
                      }))}
                      className="w-full bg-background-tertiary border border-white/20 rounded-lg px-3 py-2 text-white focus:border-primary-500 focus:outline-none"
                    >
                      <option value="distance">Shortest Distance</option>
                      <option value="efficiency">Parcel Efficiency</option>
                      <option value="balanced">Balanced Route</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                  <p className="text-primary-300 text-sm">
                    <strong>Strategy:</strong> {STRATEGY_DESCRIPTIONS[settings.strategy]}
                  </p>
                </div>
              </div>

              {/* Station Selection */}
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 backdrop-blur-lg">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  Select Delivery Stations
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PARCEL_STATIONS.filter(station => station.id !== currentStationId).map(station => {
                    const delivery = deliveries.find(job => job.stationId === station.id)
                    const isSelected = !!delivery
                    
                    return (
                      <div
                        key={station.id}
                        className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary-500/20 border-primary-500/50 shadow-lg'
                            : 'bg-white/[0.03] border-white/10 hover:border-primary-500/30 hover:bg-white/[0.05]'
                        }`}
                        onClick={() => handleStationToggle(station.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-white">{station.name}</h3>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-primary-500" />}
                        </div>
                        <p className="text-white/60 text-sm">
                          Grid: {station.gridX.toString().padStart(3, '0')}/{station.gridZ.toString().padStart(3, '0')}
                        </p>
                        
                        {isSelected && (
                          <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              <label className="text-white/70 text-sm">Parcels:</label>
                              <input
                                type="number"
                                min="1"
                                max="50"
                                value={delivery.parcelCount}
                                onChange={(e) => handleParcelCountChange(station.id, Number(e.target.value))}
                                className="w-16 bg-background-tertiary border border-white/20 rounded px-2 py-1 text-white text-sm focus:border-primary-500 focus:outline-none"
                              />
                            </div>
                            <button
                              onClick={() => handleDelivered(station.id)}
                              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-2 rounded transition-colors duration-200 flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Delivered
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={calculateRoute}
                  disabled={deliveries.length === 0 || isCalculating}
                  className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {isCalculating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Route className="w-4 h-4" />
                      Calculate Optimal Route
                    </>
                  )}
                </button>
                
                <button
                  onClick={resetForm}
                  className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/20 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
            </motion.div>

            {/* Right Column - Results & Summary */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              
              {/* Quick Stats */}
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 backdrop-blur-lg">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-500" />
                  Current Setup
                </h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Starting from:</span>
                    <span className="text-white font-medium">{currentStation.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Delivery stations:</span>
                    <span className="text-primary-500 font-bold">{deliveries.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Total parcels:</span>
                    <span className="text-primary-500 font-bold">{totalParcels}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">Vehicle capacity:</span>
                    <span className="text-white font-medium">
                      {VEHICLE_CAPACITIES[settings.vehicleType]} parcels
                    </span>
                  </div>
                  {totalParcels > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/70">Est. trips needed:</span>
                      <span className="text-yellow-400 font-bold">
                        {Math.ceil(totalParcels / VEHICLE_CAPACITIES[settings.vehicleType])}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Route Results */}
              <AnimatePresence mode="wait">
                {routeResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gradient-to-br from-primary-500/10 to-primary-600/10 border border-primary-500/20 rounded-xl p-6 backdrop-blur-lg"
                  >
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary-500" />
                      Optimized Route
                    </h2>
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-primary-500 mb-1">
                          {(routeResult.totalDistance / 1000).toFixed(1)}km
                        </div>
                        <div className="text-white/60 text-sm">Total Distance</div>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-primary-500 mb-1">
                          {routeResult.estimatedTime}min
                        </div>
                        <div className="text-white/60 text-sm">Est. Time</div>
                      </div>
                    </div>
                    
                    {/* Trip Breakdown */}
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium text-white">Trip Breakdown:</h3>
                      {routeResult.trips.map((trip, index) => (
                        <div key={index} className="bg-white/5 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-medium">Trip {index + 1}</span>
                            <span className="text-primary-500 text-sm">
                              {trip.parcels} parcels • {(trip.distance / 1000).toFixed(1)}km
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-white/70 text-sm">
                            <Navigation className="w-3 h-3" />
                            {trip.stations.map((station, stationIndex) => (
                              <span key={station.id} className="flex items-center">
                                {station.name.replace('Parcel Station ', '')}
                                {stationIndex < trip.stations.length - 1 && (
                                  <ArrowRight className="w-3 h-3 mx-1" />
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {/* Current deliveries list for easy tracking */}
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <h4 className="text-white font-medium mb-2">Current Deliveries:</h4>
                        <div className="space-y-2">
                          {deliveries.map(delivery => {
                            const station = PARCEL_STATIONS.find(s => s.id === delivery.stationId)!
                            return (
                              <div key={delivery.stationId} className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                                <span className="text-white/80 text-sm">
                                  {station.name.replace('Parcel Station ', 'Station ')}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-primary-500 text-sm font-medium">
                                    {delivery.parcelCount} parcels
                                  </span>
                                  <button
                                    onClick={() => handleDelivered(delivery.stationId)}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-2 rounded transition-colors duration-200 flex items-center gap-1"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    Done
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tips */}
              <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 backdrop-blur-lg">
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Pro Tips
                </h2>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                    Use the Parcel Van for maximum efficiency with 8-parcel capacity
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                    "Balanced" strategy often provides the best real-world results
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                    Use the "Delivered" button to mark completed deliveries and update your route
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 bg-primary-500 rounded-full mt-2 flex-shrink-0" />
                    You can pick up additional parcels at any station - just update the count
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}