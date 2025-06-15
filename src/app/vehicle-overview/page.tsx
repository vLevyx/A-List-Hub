'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePageTracking } from '@/hooks/usePageTracking'
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

// Vehicle data
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

export default function VehicleOverviewPage() {
  usePageTracking()

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>(VEHICLES)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Format price with commas
  const formatPrice = useCallback((price: number): string => {
    return `$${Math.round(price).toLocaleString()}`
  }, [])

  // Get resource display text
  const getResourceDisplay = useCallback((vehicle: Vehicle): string => {
    if (vehicle.Canisters) return `Canisters: ${vehicle.Canisters}`
    if (vehicle.honeycombs) return `Honeycombs: ${vehicle.honeycombs}`
    return `Ores: ${vehicle.ores}`
  }, [])

  // Filter vehicles based on search term
  const filterVehicles = useCallback((term: string) => {
    if (!term.trim()) {
      setFilteredVehicles(VEHICLES)
      return
    }
    
    const normalizedTerm = term.toLowerCase().trim()
    const filtered = VEHICLES.filter(vehicle => 
      vehicle.name.toLowerCase().includes(normalizedTerm)
    )
    
    setFilteredVehicles(filtered)
  }, [])

  // Handle search input with debouncing
  const handleSearchInput = useCallback((value: string) => {
    setSearchTerm(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      filterVehicles(value)
    }, 150)
  }, [filterVehicles])

  // Open modal with vehicle details
  const openModal = useCallback((vehicle: Vehicle) => {
    setSelectedVehicle(vehicle)
    setIsModalOpen(true)
  }, [])

  // Close modal
  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedVehicle(null)
  }, [])

  // Handle escape key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isModalOpen, closeModal])

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] to-[#1a1a1a] text-[#f0f0f0] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-8 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text w-full">
          Vehicle Overview
        </h1>
        
        {/* Search Box */}
        <div className="flex justify-center mb-8">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search vehicles..."
            className="w-full max-w-md px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-[#00c6ff] focus:ring-2 focus:ring-[#00c6ff]/20 transition-all"
          />
        </div>
        
        {/* Vehicle Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.name}
              className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl p-4 shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-white/20 cursor-pointer"
              onClick={() => openModal(vehicle)}
            >
              <div className="relative w-full h-48 mb-4 overflow-hidden rounded-xl">
                <Image
                  src={vehicle.photo}
                  alt={vehicle.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  style={{ objectFit: 'cover' }}
                  className="transition-transform hover:scale-105"
                  priority={false}
                />
              </div>
              <div className="p-2">
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">{vehicle.name}</h3>
                <p className="text-[#00c6ff] font-bold mb-1">{formatPrice(vehicle.price)}</p>
                <p className="text-white/80">{getResourceDisplay(vehicle)}</p>
              </div>
            </div>
          ))}
        </div>
        
        {filteredVehicles.length === 0 && (
          <div className="text-center py-12 text-white/60">
            <p className="text-xl">No vehicles found matching "{searchTerm}"</p>
            <button 
              onClick={() => {
                setSearchTerm('')
                setFilteredVehicles(VEHICLES)
              }}
              className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              Clear Search
            </button>
          </div>
        )}
      </div>

      {/* Vehicle Modal */}
      {isModalOpen && selectedVehicle && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-[#1e1e1e]/95 backdrop-blur-xl rounded-2xl max-w-2xl w-full p-6 md:p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 text-2xl text-white/70 hover:text-white transition-colors"
              onClick={closeModal}
            >
              ×
            </button>
            
            <h2 className="text-2xl font-bold text-[#00c6ff] mb-4">{selectedVehicle.name}</h2>
            
            <div className="relative w-full h-64 mb-6 rounded-xl overflow-hidden">
              <Image
                src={selectedVehicle.photo}
                alt={selectedVehicle.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
                priority
              />
            </div>
            
            <div className="space-y-3 mb-6">
              <p className="text-xl font-semibold text-[#00c6ff]">
                {formatPrice(selectedVehicle.price)}
              </p>
              
              {selectedVehicle.ores && (
                <p className="text-white/90"><span className="font-semibold">Ores:</span> {selectedVehicle.ores}</p>
              )}
              
              {selectedVehicle.Canisters && (
                <p className="text-white/90"><span className="font-semibold">Canisters:</span> {selectedVehicle.Canisters}</p>
              )}
              
              {selectedVehicle.honeycombs && (
                <p className="text-white/90"><span className="font-semibold">Honeycombs:</span> {selectedVehicle.honeycombs}</p>
              )}
              
              <p className="text-white/90"><span className="font-semibold">Available Colors:</span> {selectedVehicle.colors}</p>
              <p className="text-white/90"><span className="font-semibold">Where to Buy:</span> {selectedVehicle.whereToBuy}</p>
              <p className="text-white/90"><span className="font-semibold">Recommended Use:</span> {selectedVehicle.usage}</p>
            </div>
            
            <button
              onClick={closeModal}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white font-semibold rounded-lg hover:shadow-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}