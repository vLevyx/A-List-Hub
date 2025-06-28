'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { usePageTracking } from '@/hooks/usePageTracking'
import { Search, Filter, X, TrendingUp, Users, DollarSign, Truck, Car, Plane } from 'lucide-react'
import Image from 'next/image'

// Types
interface Vehicle {
  name: string
  price: number
  ores?: number
  Canisters?: number
  honeycombs?: number
  photo: string
  colors: string
  whereToBuy: string
  usage: string
}

// Vehicle categories for enhanced filtering
const VEHICLE_CATEGORIES = {
  'light': ['M151A2', 'UAZ-469', 'S105', 'Pickup'],
  'armored': ['M1025', 'M998'],
  'trucks': ['M923A1', 'Ural-4320', 'UAZ-452'],
  'specialty': ['Laboratory', 'Fuel', 'Banana'],
  'aircraft': ['MI8-MT', 'UH-1H'],
  'civilian': ['VW', 'S1203', 'Pickup']
}

// Vehicle data (same as original)
const VEHICLES: Vehicle[] = [
  {
    "name": "M1025 Light Armored Vehicle",
    "price": 250000,
    "ores": 18,
    "photo": "/images/m1025.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Vehicle Shop (Outpost)",
    "usage": "Quick transport with armor protection"
  },
  {
    "name": "M151A2 Off-Road",
    "price": 25000,
    "ores": 16,
    "photo": "/images/m151a2_cover.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Inexpensive scouting and patrols"
  },
  {
    "name": "M151A2 Off-Road - Open Top",
    "price": 25000,
    "ores": 16,
    "photo": "/images/m151a2offroad-opentop.png",
    "colors": "Olive, Camo, Black, Blue, Brown, Green, Khaki, Orange, Pink, Red, White, Yellow",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Recon missions and off-road traversal"
  },
  {
    "name": "M998 Light Utility Vehicle",
    "price": 150000,
    "ores": 18,
    "photo": "/images/m998LUV.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Vehicle Shop (Outpost)",
    "usage": "Tactical mobility and personel transport"
  },
  {
    "name": "M998 Light Utility Vehicle - Canopy",
    "price": 175000,
    "ores": 18,
    "photo": "/images/m998LUVcanopy.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Vehicle Shop (Outpost)",
    "usage": "Tactical mobility and personel transport"
  },
  {
    "name": "M923A1 Fuel Truck",
    "price": 1000000,
    "Canisters": 53,
    "photo": "/images/m923a1_fuel.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "American Fuel Truck. Used for Fuel and Polyester refining. NOTE: American trucks CANNOT be lock picked."
  },
  {
    "name": "M923A1 Transport Truck",
    "price": 800000,
    "ores": 50,
    "photo": "/images/m923a1.png",
    "colors": "Olive, Camo, Black, Blue, Brown, Green, Khaki, Orange, Red, White, Yellow",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Bulk personel or item transport. NOTE: American trucks CANNOT be lock picked."
  },
  {
    "name": "M923A1 Transport Truck - Canopy",
    "price": 1800000,
    "ores": 83,
    "photo": "/images/m923a1_cover.png",
    "colors": "Olive, Camo, Black, Blue, Brown, Green, Khaki, Orange, Red, White, Yellow",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Bulk personel or item transport, comes with a canopy for better concealment. NOTE: American trucks CANNOT be lock picked."
  },
  {
    "name": "Pickup Truck",
    "price": 500000,
    "ores": 18,
    "photo": "/images/pickuptruck.png",
    "colors": "Red, Black, Yellow, Gray, Green, Purple, White, Turquoise",
    "whereToBuy": "Luca's Vehicle Import (Levie)",
    "usage": "All-purpose civilian transport"
  },
  {
    "name": "UAZ-452 Off-Road",
    "price": 95000,
    "ores": 28,
    "photo": "/images/uaz452offroad.png",
    "colors": "Olive, Red, Green, Purple",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Rugged off-road delivery or utility"
  },
  {
    "name": "UAZ-452 Off-Road - Laboratory",
    "price": 2000000,
    "ores": 57,
    "Canisters": 110,
    "photo": "/images/uaz452-laboratory.png",
    "colors": "Grey",
    "whereToBuy": "Black Market",
    "usage": "Rugged off-road meth-laboratory."
  },
  {
    "name": "UAZ-452 Off-Road - Banana",
    "price": 450000,
    "ores": 28,
    "photo": "/images/uaz452banana.png",
    "colors": "Banana",
    "whereToBuy": "Banana's Chillout Zone",
    "usage": "Drive around in a banana van. Why WOULDN'T you want to do that?"
  },
  {
    "name": "UAZ-469 Off-Road",
    "price": 10000,
    "ores": 13,
    "photo": "/images/uaz469_cover.png",
    "colors": "Olive, Camo, Black, Brown, Green, Orange, Red, White, Teal",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Light scout and general use"
  },
  {
    "name": "UAZ-469 Off-Road - Open Top",
    "price": 10000,
    "ores": 13,
    "photo": "/images/uaz469offroad-opentop.png",
    "colors": "Olive, Camo",
    "whereToBuy": "Car Shops (Main Towns)",
    "usage": "Open recon with basic mobility"
  },
  {
    "name": "Ural-4320 Fuel Truck",
    "price": 2800000,
    "Canisters": 83,
    "photo": "/images/ural4320_fuel.png",
    "colors": "Olive, Camo, Blue, Orange, White-Blue, White-Red",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Large-scale Fuel Truck. Used for Fuel and Polyester refining. NOTE: Russian trucks CAN be lock picked."
  },
  {
    "name": "Ural-4320 Transport Truck",
    "price": 2800000,
    "ores": 100,
    "photo": "/images/ural4320transporttruck.png",
    "colors": "Olive, Camo, Blue, Orange, White-Blue",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Large-scale / Bulk personel or item transport. NOTE: Russian trucks CAN be lock picked."
  },
  {
    "name": "Ural-4320 Transport Truck - Canopy",
    "price": 4000000,
    "ores": 116,
    "photo": "/images/ural4320_cover.png",
    "colors": "Olive, Camo, Blue, Orange, White-Blue",
    "whereToBuy": "Truck Shops (Main Towns)",
    "usage": "Large-scale / Bulk personel or item transport, comes with a canopy for better concealment. NOTE: Russian trucks CAN be lock picked."
  },
  {
    "name": "VW Rolf",
    "price": 800000,
    "ores": 18,
    "photo": "/images/vwrolf.png",
    "colors": "Black, White",
    "whereToBuy": "VW Car Dealer",
    "usage": "Stylish personal vehicle, quick car to get from point A to point B."
  },
  {
    "name": "S105 Car",
    "price": 85000,
    "ores": 18,
    "photo": "/images/s105car.png",
    "colors": "Light Blue, Tan, Dark Blue, Brown, Dark Red, Green, Olive, Red, White, Yellow",
    "whereToBuy": "Import Vehicles (Meaux, Regina)",
    "usage": "Budget personal vehicle"
  },
  {
    "name": "S1203 Minibus",
    "price": 185000,
    "ores": 18,
    "photo": "/images/S1203-Minibus.png",
    "colors": "Red, Blue, Brown, Yellow, Khaki",
    "whereToBuy": "Import Vehicles (Meaux, Regina)",
    "usage": "Small group and item transport"
  },
  {
    "name": "MI8-MT Transport Helicopter",
    "price": 68000000,
    "ores": 26,
    "photo": "/images/mi8-mt.png",
    "colors": "Camo",
    "whereToBuy": "Only obtainable through crafting",
    "usage": "Russian High-capacity air transport. Holds: 3 Pilots - 13 Passengers"
  },
  {
    "name": "UH-1H Transport Helicopter",
    "price": 60000000,
    "ores": 26,
    "photo": "/images/uh-1h.png",
    "colors": "Green",
    "whereToBuy": "Only obtainable through crafting",
    "usage": "United States Tactical helicopter mobility. Holds: 2 Pilots - 10 Passengers"
  }
]

type CategoryFilter = keyof typeof VEHICLE_CATEGORIES | 'all'
type SortOption = 'price-asc' | 'price-desc' | 'name' | 'resources'

export default function VehicleOverviewPage() {
  usePageTracking()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('price-asc')
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Memoized calculations
  const vehicleStats = useMemo(() => {
    const totalVehicles = VEHICLES.length
    const dealerLocations = VEHICLES.reduce((dealers, v) => {
      dealers.add(v.whereToBuy)
      return dealers
    }, new Set()).size
    const entryPrice = Math.min(...VEHICLES.map(v => v.price))
    const premiumVehicles = VEHICLES.filter(v => v.price >= 1000000).length
    
    return { totalVehicles, dealerLocations, entryPrice, premiumVehicles }
  }, [])

  // Helper functions
  const formatPrice = useCallback((price: number): string => {
    return `$${Math.round(price).toLocaleString()}`
  }, [])

  const getResourceDisplay = useCallback((vehicle: Vehicle): string => {
    if (vehicle.Canisters) return `${vehicle.Canisters} Canisters`
    if (vehicle.honeycombs) return `${vehicle.honeycombs} Honeycombs`
    return `${vehicle.ores} Ores`
  }, [])

  const getVehicleCategory = useCallback((vehicle: Vehicle): string => {
    const name = vehicle.name.toLowerCase()
    
    if (name.includes('helicopter') || name.includes('mi8') || name.includes('uh-1')) return 'aircraft'
    if (name.includes('truck') || name.includes('ural') || name.includes('m923')) return 'trucks'
    if (name.includes('armored') || name.includes('m1025')) return 'armored'
    if (name.includes('laboratory') || name.includes('fuel') || name.includes('banana')) return 'specialty'
    if (name.includes('vw') || name.includes('s105') || name.includes('s1203') || name.includes('pickup')) return 'civilian'
    
    return 'light'
  }, [])

  // Filtered and sorted vehicles
  const filteredAndSortedVehicles = useMemo(() => {
    let filtered = VEHICLES

    // Apply search filter
    if (searchTerm.trim()) {
      const normalizedTerm = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(vehicle => 
        vehicle.name.toLowerCase().includes(normalizedTerm) ||
        vehicle.usage.toLowerCase().includes(normalizedTerm) ||
        vehicle.whereToBuy.toLowerCase().includes(normalizedTerm)
      )
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(vehicle => {
        const category = getVehicleCategory(vehicle)
        return category === categoryFilter
      })
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'name':
          return a.name.localeCompare(b.name)
        case 'resources':
          const aRes = a.ores || a.Canisters || a.honeycombs || 0
          const bRes = b.ores || b.Canisters || b.honeycombs || 0
          return bRes - aRes
        default:
          return 0
      }
    })

    return sorted
  }, [searchTerm, categoryFilter, sortOption, getVehicleCategory])

  // Handle search input with debouncing
  const handleSearchInput = useCallback((value: string) => {
    setSearchTerm(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      // Search is handled by useMemo dependency
    }, 150)
  }, [])

  // Open detail panel
  const openDetailPanel = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsDetailPanelOpen(true)
  }, [])

  // Close detail panel
  const closeDetailPanel = useCallback(() => {
    setIsDetailPanelOpen(false)
    setTimeout(() => setSelectedVehicle(null), 300)
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDetailPanelOpen) {
        closeDetailPanel()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDetailPanelOpen, closeDetailPanel])

  // Clean up timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-[#f0f0f0]">
      {/* Hero Section with Stats */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00c6ff]/10 to-[#0072ff]/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-[#00c6ff] via-[#0099ff] to-[#0072ff] bg-clip-text text-transparent">
                Vehicle Overview
              </span>
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Discover and compare every vehicle on ELAN.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center group hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-[#00c6ff] mb-1">{vehicleStats.totalVehicles}</div>
              <div className="text-white/60 text-sm">Total Vehicles</div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center group hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-[#00c6ff] mb-1">{vehicleStats.dealerLocations}</div>
              <div className="text-white/60 text-sm">Dealer Locations</div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center group hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-[#00c6ff] mb-1">{formatPrice(vehicleStats.entryPrice)}</div>
              <div className="text-white/60 text-sm">Entry Price</div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center group hover:bg-white/10 transition-all">
              <div className="w-12 h-12 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-bold text-[#00c6ff] mb-1">{vehicleStats.premiumVehicles}</div>
              <div className="text-white/60 text-sm">Million+ Club</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-40 bg-[#121212]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchInput(e.target.value)}
                placeholder="Search vehicles, usage, or dealer..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-[#00c6ff] focus:ring-2 focus:ring-[#00c6ff]/20 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => handleSearchInput('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {(['all', ...Object.keys(VEHICLE_CATEGORIES)] as CategoryFilter[]).map((category) => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    categoryFilter === category
                      ? 'bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white shadow-lg'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
              >
                <Filter className="w-4 h-4" />
                Sort
              </button>
              
              {showFilters && (
                <div className="absolute top-full mt-2 right-0 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/20 rounded-xl p-2 shadow-2xl z-50">
                  {[
                    { value: 'price-asc', label: 'Price: Low to High' },
                    { value: 'price-desc', label: 'Price: High to Low' },
                    { value: 'name', label: 'Name A-Z' },
                    { value: 'resources', label: 'Resources' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortOption(option.value as SortOption)
                        setShowFilters(false)
                      }}
                      className={`block w-full text-left px-4 py-2 rounded-lg text-sm transition-all ${
                        sortOption === option.value
                          ? 'bg-[#00c6ff]/20 text-[#00c6ff]'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results Counter */}
          <div className="mt-4 text-white/60 text-sm">
            Showing {filteredAndSortedVehicles.length} of {VEHICLES.length} vehicles
          </div>
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredAndSortedVehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedVehicles.map((vehicle, index) => (
              <div
                key={vehicle.name}
                className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-[#00c6ff]/50 transition-all duration-500 hover:shadow-2xl hover:shadow-[#00c6ff]/10 cursor-pointer"
                onClick={() => openDetailPanel(vehicle)}
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animation: 'fadeInUp 0.6s ease-out forwards'
                }}
              >
                <div className="relative h-48 overflow-hidden">
                  <Image
                    src={vehicle.photo}
                    alt={vehicle.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    style={{ objectFit: 'cover' }}
                    className="transition-transform duration-500 group-hover:scale-110"
                    priority={index < 8}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  {/* Price Badge */}
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white text-xs font-bold px-3 py-1 rounded-full">
                    {formatPrice(vehicle.price)}
                  </div>

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full border border-white/20">
                    {getVehicleCategory(vehicle)}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-[#00c6ff] transition-colors">
                    {vehicle.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[#00c6ff] font-semibold text-sm">
                      {getResourceDisplay(vehicle)}
                    </span>
                    
                    <div className="flex gap-1">
                      {vehicle.name.toLowerCase().includes('helicopter') && <Plane className="w-4 h-4 text-white/50" />}
                      {vehicle.name.toLowerCase().includes('truck') && <Truck className="w-4 h-4 text-white/50" />}
                      {!vehicle.name.toLowerCase().includes('helicopter') && !vehicle.name.toLowerCase().includes('truck') && <Car className="w-4 h-4 text-white/50" />}
                    </div>
                  </div>
                  
                  <p className="text-white/60 text-sm line-clamp-2">
                    {vehicle.usage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">No vehicles found</h3>
            <p className="text-white/60 mb-6">
              Try adjusting your search term or category filter
            </p>
            <button 
              onClick={() => {
                setSearchTerm('')
                setCategoryFilter('all')
              }}
              className="px-6 py-3 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#00c6ff]/25 transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Slide-out Detail Panel */}
      {isDetailPanelOpen && selectedVehicle && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={closeDetailPanel}
          />
          
          {/* Detail Panel */}
          <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-[#0a0a0a]/95 backdrop-blur-2xl border-l border-white/20 z-50 transform transition-transform duration-500 ease-out overflow-y-auto ${
            isDetailPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}>
            {/* Header */}
            <div className="sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/10 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedVehicle.name}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] bg-clip-text text-transparent">
                      {formatPrice(selectedVehicle.price)}
                    </span>
                    <span className="px-3 py-1 bg-[#00c6ff]/20 text-[#00c6ff] text-sm rounded-full border border-[#00c6ff]/30">
                      {getVehicleCategory(selectedVehicle)}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={closeDetailPanel}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all group"
                >
                  <X className="w-5 h-5 text-white/70 group-hover:text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              {/* Hero Image */}
              <div className="relative h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-white/5 to-white/10 border border-white/10">
                <Image
                  src={selectedVehicle.photo}
                  alt={selectedVehicle.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{ objectFit: 'cover' }}
                  className="transition-transform duration-700 hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-white/60 text-sm mb-1">Resources</div>
                  <div className="text-xl font-bold text-[#00c6ff]">
                    {getResourceDisplay(selectedVehicle)}
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-white/60 text-sm mb-1">Type</div>
                  <div className="text-xl font-bold text-white capitalize">
                    {getVehicleCategory(selectedVehicle)}
                  </div>
                </div>
              </div>

              {/* Detailed Information */}
              <div className="space-y-6">
                {/* Usage */}
                <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#00c6ff] rounded-full"></div>
                    Recommended Usage
                  </h3>
                  <p className="text-white/80 leading-relaxed">{selectedVehicle.usage}</p>
                </div>

                {/* Purchase Information */}
                <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#00c6ff] rounded-full"></div>
                    Where to Buy
                  </h3>
                  <p className="text-white/80">{selectedVehicle.whereToBuy}</p>
                </div>

                {/* Available Colors */}
                <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#00c6ff] rounded-full"></div>
                    Available Colors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedVehicle.colors.split(', ').map((color, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-white/10 text-white/80 text-sm rounded-full border border-white/20"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Resource Breakdown */}
                <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#00c6ff] rounded-full"></div>
                    Resource Requirements
                  </h3>
                  <div className="space-y-3">
                    {selectedVehicle.ores && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">Ores</span>
                        <span className="text-[#00c6ff] font-semibold">{selectedVehicle.ores}</span>
                      </div>
                    )}
                    {selectedVehicle.Canisters && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">Canisters</span>
                        <span className="text-[#00c6ff] font-semibold">{selectedVehicle.Canisters}</span>
                      </div>
                    )}
                    {selectedVehicle.honeycombs && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/70">Honeycombs</span>
                        <span className="text-[#00c6ff] font-semibold">{selectedVehicle.honeycombs}</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 pt-3 mt-3">
                      <div className="flex justify-between items-center text-lg">
                        <span className="text-white font-semibold">Total Price</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-[#00c6ff] to-[#0072ff] bg-clip-text text-transparent">
                          {formatPrice(selectedVehicle.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={closeDetailPanel}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#00c6ff]/25 transition-all transform hover:scale-[1.02]"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}