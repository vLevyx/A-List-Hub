'use client'

import { usePageTracking } from '@/hooks/usePageTracking'
import { useAuth } from '@/hooks/useAuth'
import { useEffect, useState, useRef } from 'react'

// Types
interface RawMaterialPrices {
  [key: string]: number
}

interface ComponentRecipe {
  [component: string]: number
}

interface ItemData {
  [category: string]: {
    [itemName: string]: {
      'HQ'?: ComponentRecipe
      'Non-HQ'?: ComponentRecipe
    }
  }
}

export default function PricePlannerPage() {
  usePageTracking()
  const { hasAccess, loading } = useAuth()

  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [selectedItem, setSelectedItem] = useState<string>('')
  const [selectedComponent, setSelectedComponent] = useState<string>('')
  const [componentQuantity, setComponentQuantity] = useState<number>(1)
  const [itemQuantity, setItemQuantity] = useState<number>(1)
  const [priceMultiplier, setPriceMultiplier] = useState<number>(100)
  const [timeSpent, setTimeSpent] = useState<number | undefined>(undefined)
  const [hourlyRate, setHourlyRate] = useState<number | undefined>(undefined)
  const [customPrices, setCustomPrices] = useState<RawMaterialPrices>({})
  const [showSettings, setShowSettings] = useState<boolean>(false)
  const [result, setResult] = useState<any>(null)

  // Refs for settings panel
  const settingsPanelRef = useRef<HTMLDivElement>(null)

  // Data
  const rawMaterialPrices: RawMaterialPrices = {
    'Glass': 2000,
    'Copper Ingot': 2200,
    'Iron Ingot': 2600,
    'Silver Ingot': 2800,
    'Gold Ingot': 3000,
    'Wooden Plank': 2800,
    'Firewood': 2800,
    'Charcoal': 2800,
    'Fabric': 3500,
    'Polyester': 3500,
    'Petrol': 4250,
    'Special Rotor': 20000000,
    'Special Gun Barrel': 2500000
  }

  const componentRecipes: { [key: string]: ComponentRecipe } = {
    'Ammo': { 'Iron Ingot': 1, 'Charcoal': 1 },
    'Attachment Part': { 'Copper Ingot': 2, 'Silver Ingot': 1 },
    'Cloth': { 'Fabric': 1, 'Polyester': 1 },
    'Component': { 'Iron Ingot': 1, 'Copper Ingot': 1 },
    'Engine Part': { 'Iron Ingot': 1, 'Copper Ingot': 1, 'Petrol': 1 },
    'Interior Part': { 'Fabric': 2, 'Polyester': 2 },
    'Iron Plate': { 'Iron Ingot': 1, 'Fabric': 1, 'Polyester': 1 },
    'Kevlar': { 'Iron Plate': 1, 'Iron Ingot': 20 },
    'Mechanical Component': { 'Iron Ingot': 2, 'Copper Ingot': 2 },
    'Rotor': { 'Charcoal': 1, 'Polyester': 1 },
    'Stabilizer': { 'Iron Ingot': 2, 'Gold Ingot': 1 },
    'Tempered Glass': { 'Glass': 2, 'Polyester': 1 },
    'Weapon Part': { 'Iron Ingot': 1, 'Copper Ingot': 1 },
    'Ammo (HQ)': { 'Ammo': 3, 'Petrol': 1 },
    'Attachment Part (HQ)': { 'Attachment Part': 3, 'Wooden Plank': 15 },
    'Component (HQ)': { 'Component': 2, 'Gold Ingot': 15 },
    'Engine Part (HQ)': { 'Engine Part': 9, 'Copper Ingot': 45, 'Petrol': 45 },
    'Interior Part (HQ)': { 'Interior Part': 9, 'Wooden Plank': 45 },
    'Mechanical Component (HQ)': { 'Mechanical Component': 9, 'Gold Ingot': 45 },
    'Rotor (HQ)': { 'Rotor': 9, 'Silver Ingot': 30 },
    'Stabilizer (HQ)': { 'Stabilizer': 3, 'Polyester': 15 },
    'Weapon Part (HQ)': { 'Weapon Part': 3, 'Iron Ingot': 15, 'Copper Ingot': 16 },
    'Special Rotor': { 'Special Rotor': 1 },
    'Special Gun Barrel': { 'Special Gun Barrel': 1 }
  }

  const itemData: ItemData = {
    'Weapons': {
      'AK-74': { 'HQ': { 'Weapon Part (HQ)': 2, 'Stabilizer (HQ)': 2, 'Attachment Part (HQ)': 2 } },
      'AKS-74U': { 'HQ': { 'Weapon Part (HQ)': 1, 'Stabilizer (HQ)': 1, 'Attachment Part (HQ)': 1 } },
      'CheyTac M200 Intervention': { 'HQ': { 'Weapon Part (HQ)': 4, 'Stabilizer (HQ)': 4, 'Attachment Part (HQ)': 5, 'Special Gun Barrel': 1 } },
      'Colt 1911': { 'Non-HQ': { 'Weapon Part': 5, 'Stabilizer': 3, 'Attachment Part': 3 } },
      'Desert Eagle': { 'Non-HQ': { 'Weapon Part': 13, 'Stabilizer': 7, 'Attachment Part': 8 } },
      'M16 Carbine': { 'Non-HQ': { 'Weapon Part': 29, 'Stabilizer': 16, 'Attachment Part': 18 } },
      'M16A2': { 'Non-HQ': { 'Weapon Part': 27, 'Stabilizer': 15, 'Attachment Part': 17 } },
      'M16A2 - AUTO': { 'Non-HQ': { 'Weapon Part': 29, 'Stabilizer': 16, 'Attachment Part': 18 } },
      'M21 SWS': { 'Non-HQ': { 'Weapon Part': 39, 'Stabilizer': 21, 'Attachment Part': 24 } },
      'M249 SAW': { 'HQ': { 'Weapon Part (HQ)': 9, 'Stabilizer (HQ)': 9, 'Attachment Part (HQ)': 11, 'Special Gun Barrel': 1 } },
      'M416': { 'Non-HQ': { 'Weapon Part': 34, 'Stabilizer': 19, 'Attachment Part': 21 } },
      'M9': { 'Non-HQ': { 'Weapon Part': 5, 'Stabilizer': 3, 'Attachment Part': 3 } },
      'MP 43 1C': { 'HQ': { 'Weapon Part (HQ)': 1, 'Stabilizer (HQ)': 1, 'Attachment Part (HQ)': 1 } },
      'MP5A2': { 'Non-HQ': { 'Weapon Part': 15, 'Stabilizer': 8, 'Attachment Part': 9 } },
      'MP7A2': { 'Non-HQ': { 'Weapon Part': 15, 'Stabilizer': 8, 'Attachment Part': 9 } },
      'PKM': { 'HQ': { 'Weapon Part (HQ)': 12, 'Stabilizer (HQ)': 12, 'Attachment Part (HQ)': 15, 'Special Gun Barrel': 1 } },
      'PM': { 'Non-HQ': { 'Weapon Part': 4, 'Stabilizer': 2, 'Attachment Part': 2 } },
      'RPK-74': { 'HQ': { 'Weapon Part (HQ)': 2, 'Stabilizer (HQ)': 2, 'Attachment Part (HQ)': 3 } },
      'SR-25 Rifle': { 'HQ': { 'Weapon Part (HQ)': 2, 'Stabilizer (HQ)': 2, 'Attachment Part (HQ)': 3 } },
      'SSG10A2-Sniper': { 'HQ': { 'Weapon Part (HQ)': 2, 'Stabilizer (HQ)': 2, 'Attachment Part (HQ)': 3 } },
      'Sa-58P': { 'HQ': { 'Weapon Part (HQ)': 2, 'Stabilizer (HQ)': 2, 'Attachment Part (HQ)': 2 } },
      'Sa-58V': { 'HQ': { 'Weapon Part (HQ)': 2, 'Stabilizer (HQ)': 2, 'Attachment Part (HQ)': 2 } },
      'Scar-H': { 'HQ': { 'Weapon Part (HQ)': 2, 'Stabilizer (HQ)': 2, 'Attachment Part (HQ)': 3 } },
      'SIG MCX': { 'Non-HQ': { 'Weapon Part': 38, 'Stabilizer': 20, 'Attachment Part': 23 } },
      'SIG MCX SPEAR': { 'HQ': { 'Weapon Part (HQ)': 2, 'Stabilizer (HQ)': 2, 'Attachment Part (HQ)': 3 } },
      'SVD': { 'HQ': { 'Weapon Part (HQ)': 6, 'Stabilizer (HQ)': 6, 'Attachment Part (HQ)': 7 } },
      'Steyr AUG': { 'Non-HQ': { 'Weapon Part': 33, 'Stabilizer': 18, 'Attachment Part': 20 } }
    },
    'Magazines': {
      '.300 Blackout Mag': { 'Non-HQ': { 'Ammo': 2 } },
      '.338 5rnd FMJ': { 'Non-HQ': { 'Ammo': 2 } },
      '.50 AE 7rnd Mag': { 'HQ': { 'Ammo (HQ)': 2 } },
      '12/70 7mm Buckshot': { 'Non-HQ': { 'Ammo': 1 } },
      '30rnd 9x19 Mag': { 'Non-HQ': { 'Ammo': 1 } },
      '4.6x40 40rnd Mag': { 'Non-HQ': { 'Ammo': 1 } },
      '7Rnd M200 Magazine': { 'HQ': { 'Ammo (HQ)': 3 } },
      '7.62x39mm 30rnd Sa-58 Mag': { 'Non-HQ': { 'Ammo': 1 } },
      '7.62x51mm 20rnd M14 Mag': { 'Non-HQ': { 'Ammo': 1 } },
      '7.62x51mm 30rnd Mag': { 'Non-HQ': { 'Ammo': 1 } },
      'SR25 7.62x51mm 20rnd': { 'HQ': { 'Ammo (HQ)': 1 } },
      '8rnd .45 ACP': { 'Non-HQ': { 'Ammo': 1 } },
      '9x18mm 8rnd PM Mag': { 'Non-HQ': { 'Ammo': 1 } },
      '9x19mm 15rnd M9 Mag': { 'Non-HQ': { 'Ammo': 1 } },
      '100rnd PK Belt': { 'Non-HQ': { 'Ammo': 1 } },
      '5.56x45mm 200rnd M249 Belt': { 'HQ': { 'Ammo (HQ)': 15 } },
      '5.56x45mm 30rnd AUG Mag': { 'Non-HQ': { 'Ammo': 1 } },
      '5.56x45mm 30rnd STANAG Mag': { 'Non-HQ': { 'Ammo': 1 } },
      '5.45x39mm 30rnd AK Mag': { 'Non-HQ': { 'Ammo': 2 } },
      '5.45x39mm 45rnd RPK-74 Tracer Mag': { 'HQ': { 'Ammo (HQ)': 1 } },
      '7.62x51mm FMJ': { 'HQ': { 'Ammo (HQ)': 1 } },
      '7.62x54mmR 100rnd PK Belt': { 'HQ': { 'Ammo (HQ)': 15 } },
      '7.62x54mmR 10rnd SVD Sniper Mag': { 'HQ': { 'Ammo (HQ)': 1 } },
      'SPEAR 6.8x51 25rnd': { 'HQ': { 'Ammo (HQ)': 1 } }
    },
    'Attachments': {
      '4x20 Carry Handle Scope': { 'Non-HQ': { 'Component': 41, 'Tempered Glass': 18 } },
      '4.7mm FlashHider': { 'Non-HQ': { 'Component': 1 } },
      '6.8x51mm FlashHider': { 'Non-HQ': { 'Component': 2, 'Tempered Glass': 1 } },
      '6P20 Muzzle Brake': { 'Non-HQ': { 'Component': 2, 'Tempered Glass': 1 } },
      '6P26 Flash Hider': { 'Non-HQ': { 'Component': 2, 'Tempered Glass': 1 } },
      '7.62x51mm FlashHider': { 'Non-HQ': { 'Component': 3, 'Tempered Glass': 1 } },
      'A2 Flash Hider': { 'Non-HQ': { 'Component': 2, 'Tempered Glass': 1 } },
      'ART II Scope': { 'Non-HQ': { 'Component': 2, 'Tempered Glass': 1 } },
      'Carry Handle Red-Dot-Sight': { 'Non-HQ': { 'Component': 5, 'Tempered Glass': 2 } },
      'EOTECH XPS3': { 'Non-HQ': { 'Component': 2, 'Tempered Glass': 1 } },
      'Elcan Specter': { 'Non-HQ': { 'Component': 11, 'Tempered Glass': 5 } },
      'Leupold VX-6': { 'Non-HQ': { 'Component': 17, 'Tempered Glass': 8 } },
      'PSO-1 Scope': { 'Non-HQ': { 'Component': 4, 'Tempered Glass': 1 } },
      'Reflex Scope': { 'Non-HQ': { 'Component': 2, 'Tempered Glass': 1 } }
    },
    'Vehicles': {
      'M1025 Light Armoured Vehicle': { 'Non-HQ': { 'Mechanical Component': 9, 'Interior Part': 5, 'Engine Part': 9 } },
      'M151A2 Off-Road': { 'Non-HQ': { 'Mechanical Component': 1, 'Engine Part': 1 } },
      'M151A2 Off-Road Open Top': { 'Non-HQ': { 'Mechanical Component': 1, 'Engine Part': 1 } },
      'M923A1 Fuel Truck': { 'HQ': { 'Mechanical Component (HQ)': 1, 'Interior Part (HQ)': 1, 'Engine Part (HQ)': 1 } },
      'M923A1 Transport Truck': { 'Non-HQ': { 'Mechanical Component': 31, 'Interior Part': 19, 'Engine Part': 31 } },
      'M923A1 Transport Truck - Canopy': { 'HQ': { 'Mechanical Component (HQ)': 2, 'Interior Part (HQ)': 2, 'Engine Part (HQ)': 1 } },
      'M998 Light Utility Vehicle': { 'Non-HQ': { 'Mechanical Component': 5, 'Interior Part': 3, 'Engine Part': 5 } },
      'M998 Light Utility Vehicle - Canopy': { 'Non-HQ': { 'Mechanical Component': 6, 'Interior Part': 4, 'Engine Part': 4 } },
      'Mi-8MT Transport Helicopter': { 'HQ': { 'Mechanical Component (HQ)': 30, 'Interior Part (HQ)': 27, 'Engine Part (HQ)': 19, 'Rotor (HQ)': 48, 'Special Rotor': 1 } },
      'Pickup-Truck': { 'Non-HQ': { 'Mechanical Component': 19, 'Interior Part': 11, 'Engine Part': 19 } },
      'S105 Car': { 'Non-HQ': { 'Mechanical Component': 3, 'Interior Part': 2, 'Engine Part': 3 } },
      'S1203 - Laboratory': { 'Non-HQ': { 'Mechanical Component': 41, 'Interior Part': 25, 'Engine Part': 41 } },
      'S1203 Minibus': { 'Non-HQ': { 'Mechanical Component': 7, 'Interior Part': 4, 'Engine Part': 7 } },
      'UAZ-452 Off-road': { 'Non-HQ': { 'Mechanical Component': 3, 'Interior Part': 2, 'Engine Part': 3 } },
      'UAZ-452 Off-road - Laboratory': { 'HQ': { 'Mechanical Component (HQ)': 4, 'Interior Part (HQ)': 3, 'Engine Part (HQ)': 2 } },
      'UAZ-469 Off-road': { 'Non-HQ': { 'Mechanical Component': 1, 'Interior Part': 1, 'Engine Part': 1 } },
      'UAZ-469 Off-road - Open Top': { 'Non-HQ': { 'Mechanical Component': 1, 'Interior Part': 1, 'Engine Part': 1 } },
      'UH-1H Transport Helicopter': { 'HQ': { 'Mechanical Component (HQ)': 19, 'Interior Part (HQ)': 17, 'Engine Part (HQ)': 12, 'Rotor (HQ)': 30, 'Special Rotor': 1 } },
      'Ural (Device)': { 'HQ': { 'Mechanical Component (HQ)': 29, 'Interior Part (HQ)': 26, 'Engine Part (HQ)': 18 } },
      'Ural-4320 Fuel Truck': { 'HQ': { 'Mechanical Component (HQ)': 4, 'Interior Part (HQ)': 3, 'Engine Part (HQ)': 2 } },
      'Ural-4320 Transport Truck': { 'HQ': { 'Mechanical Component (HQ)': 4, 'Interior Part (HQ)': 3, 'Engine Part (HQ)': 2 } },
      'Ural-4320 Transport Truck - Canopy': { 'HQ': { 'Mechanical Component (HQ)': 5, 'Interior Part (HQ)': 5, 'Engine Part (HQ)': 3 } },
      'VW Rolf': { 'Non-HQ': { 'Mechanical Component': 31, 'Interior Part': 19, 'Engine Part': 31 } }
    },
    'Vests': {
      '6B2 Vest': { 'Non-HQ': { 'Iron Plate': 10, 'Cloth': 14 } },
      '6B3 Vest': { 'HQ': { 'Kevlar': 7 } },
      'M69 Vest': { 'Non-HQ': { 'Iron Plate': 10, 'Cloth': 14 } },
      'PASGT Vest': { 'Non-HQ': { 'Iron Plate': 10, 'Cloth': 14 } }
    },
    'Helmets': {
      'PASGT Helmet': { 'Non-HQ': { 'Iron Plate': 2, 'Cloth': 2 } },
      'PASGT Helmet - Camouflaged': { 'Non-HQ': { 'Iron Plate': 2, 'Cloth': 2 } },
      'PASGT Helmet - Camouflaged Netting': { 'Non-HQ': { 'Iron Plate': 2, 'Cloth': 2 } },
      'SPH-4 Helmet': { 'Non-HQ': { 'Iron Plate': 7, 'Cloth': 10 } },
      'SSh-68 Helmet': { 'Non-HQ': { 'Iron Plate': 2, 'Cloth': 2 } },
      'SSh-68 Helmet - Camouflaged': { 'Non-HQ': { 'Iron Plate': 2, 'Cloth': 2 } },
      'SSh-68 Helmet - Cover': { 'Non-HQ': { 'Iron Plate': 2, 'Cloth': 2 } },
      'SSh-68 Helmet - KZS': { 'Non-HQ': { 'Iron Plate': 2, 'Cloth': 2 } },
      'SSh-68 Helmet - Netting': { 'Non-HQ': { 'Iron Plate': 2, 'Cloth': 2 } },
      'ZSh-5 Helmet': { 'Non-HQ': { 'Iron Plate': 7, 'Cloth': 10 } }
    },
    'Clothes': {
      'ALICE Medium Backpack': { 'Non-HQ': { 'Cloth': 2 } },
      'Bandana': { 'Non-HQ': { 'Cloth': 1 } },
      'Balaclava': { 'Non-HQ': { 'Cloth': 1 } },
      'BDU Blouse': { 'Non-HQ': { 'Cloth': 1 } },
      'BDU Blouse - Rolled-up': { 'Non-HQ': { 'Cloth': 1 } },
      'BDU Trousers': { 'Non-HQ': { 'Cloth': 1 } },
      'Beanie': { 'Non-HQ': { 'Cloth': 1 } },
      'Boonie': { 'Non-HQ': { 'Cloth': 1 } },
      'Cap - All Variants': { 'Non-HQ': { 'Cloth': 1 } },
      'Cargo Pants': { 'Non-HQ': { 'Cloth': 1 } },
      'Cargo Pants (Colored)': { 'Non-HQ': { 'Cloth': 1 } },
      'Cardigan': { 'Non-HQ': { 'Cloth': 1 } },
      'Classic Shoe': { 'Non-HQ': { 'Cloth': 2 } },
      'CWU-27 Pilot Coveralls': { 'Non-HQ': { 'Cloth': 20 } },
      'Dress': { 'Non-HQ': { 'Cloth': 3 } },
      'Fedora': { 'Non-HQ': { 'Cloth': 1 } },
      'Fisher Hat': { 'Non-HQ': { 'Cloth': 1 } },
      'Flat Cap': { 'Non-HQ': { 'Cloth': 1 } },
      'Half Mask': { 'Non-HQ': { 'Cloth': 1 } },
      'Hunting Vest': { 'Non-HQ': { 'Cloth': 1 } },
      'IIFS Large Combat Field Pack': { 'Non-HQ': { 'Cloth': 32 } },
      'Jacket': { 'Non-HQ': { 'Cloth': 2 } },
      'Jeans': { 'Non-HQ': { 'Cloth': 1 } },
      'Jeans (Colored)': { 'Non-HQ': { 'Cloth': 1 } },
      'Knit Cap': { 'Non-HQ': { 'Cloth': 1 } },
      'Kolobok Backpack': { 'Non-HQ': { 'Cloth': 1 } },
      'M70 Backpack': { 'Non-HQ': { 'Cloth': 2 } },
      'M70 Cap': { 'Non-HQ': { 'Cloth': 1 } },
      'M70 Parka': { 'Non-HQ': { 'Cloth': 2 } },
      'M70 Trousers': { 'Non-HQ': { 'Cloth': 2 } },
      'M88 Field Cap': { 'Non-HQ': { 'Cloth': 1 } },
      'M88 Jacket': { 'Non-HQ': { 'Cloth': 1 } },
      'M88 Jacket - Rolled-up': { 'Non-HQ': { 'Cloth': 1 } },
      'M88 Trousers': { 'Non-HQ': { 'Cloth': 1 } },
      'Mask (Medical)': { 'Non-HQ': { 'Cloth': 1 } },
      'Mask (Latex)': { 'Non-HQ': { 'Cloth': 1 } },
      'Mask (Ski)': { 'Non-HQ': { 'Cloth': 1 } },
      'Officer\'s Cap': { 'Non-HQ': { 'Cloth': 64 } },
      'Panamka': { 'Non-HQ': { 'Cloth': 1 } },
      'Paper Bag': { 'Non-HQ': { 'Cloth': 1 } },
      'Polo': { 'Non-HQ': { 'Cloth': 1 } },
      'Pullover': { 'Non-HQ': { 'Cloth': 1 } },
      'Robe': { 'Non-HQ': { 'Cloth': 7 } },
      'Runner Shoe': { 'Non-HQ': { 'Cloth': 2 } },
      'Sneaker': { 'Non-HQ': { 'Cloth': 4 } },
      'Soviet Combat Boots': { 'Non-HQ': { 'Cloth': 1 } },
      'Soviet Pilot Jacket': { 'Non-HQ': { 'Cloth': 11 } },
      'Soviet Pilot Pants': { 'Non-HQ': { 'Cloth': 1 } },
      'Suit Jacket': { 'Non-HQ': { 'Cloth': 61 } },
      'Suit Pants': { 'Non-HQ': { 'Cloth': 50 } },
      'Sweater': { 'Non-HQ': { 'Cloth': 1 } },
      'Sweat Pants': { 'Non-HQ': { 'Cloth': 1 } },
      'TShirt': { 'Non-HQ': { 'Cloth': 1 } },
      'US Combat Boots': { 'Non-HQ': { 'Cloth': 1 } },
      'Veshmeshok Backpack': { 'Non-HQ': { 'Cloth': 1 } },
      'Wool Hat': { 'Non-HQ': { 'Cloth': 50 } }
    }
  }

  // Redirect if no access
  useEffect(() => {
    if (!loading && !hasAccess) {
      window.location.href = '/'
    }
  }, [hasAccess, loading])

  // Initialize component list
  useEffect(() => {
    // Load custom prices from localStorage if available
    const savedPrices = localStorage.getItem('customMaterialPrices')
    if (savedPrices) {
      try {
        setCustomPrices(JSON.parse(savedPrices))
      } catch (e) {
        console.error('Failed to parse saved prices:', e)
      }
    }
  }, [])

  // Handle click outside settings panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsPanelRef.current && 
        !settingsPanelRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.settings-toggle')
      ) {
        setShowSettings(false)
      }
    }

    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettings])

  // Handle escape key to close settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettings) {
        setShowSettings(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showSettings])

  // Helper functions
  const calculateComponentCost = (name: string, qty: number = 1): number => {
    const price = customPrices[name] || rawMaterialPrices[name]
    if (price) return price * qty
    
    if (componentRecipes[name]) {
      return Object.entries(componentRecipes[name]).reduce((sum, [sub, count]) => {
        return sum + calculateComponentCost(sub, count * qty)
      }, 0)
    }
    
    return 0
  }

  const breakdownResources = (components: ComponentRecipe): { [key: string]: number } => {
    const flat: { [key: string]: number } = {}
    
    const recurse = (name: string, qty: number) => {
      if (rawMaterialPrices[name] !== undefined || customPrices[name] !== undefined) {
        flat[name] = (flat[name] || 0) + qty
      } else if (componentRecipes[name]) {
        for (const [sub, count] of Object.entries(componentRecipes[name])) {
          recurse(sub, count * qty)
        }
      }
    }
    
    for (const [comp, qty] of Object.entries(components)) {
      recurse(comp, qty)
    }
    
    return flat
  }

  const calculateCost = () => {
    if (!selectedItem) {
      setResult({ error: "Please select an item." })
      return
    }

    let found = null
    let variant = null
    
    for (const [category, items] of Object.entries(itemData)) {
      if (items[selectedItem]) {
        found = items[selectedItem]
        variant = found.HQ || found['Non-HQ']
        break
      }
    }
    
    if (!variant) {
      setResult({ error: "Item not found." })
      return
    }

    const quantity = itemQuantity || 1
    const hours = timeSpent || 0
    const rate = hourlyRate || 0
    const laborCost = hours * rate

    let baseCost = 0
    for (const [comp, qty] of Object.entries(variant)) {
      baseCost += calculateComponentCost(comp, qty)
    }
    baseCost *= quantity

    const rawBreakdown = breakdownResources(variant)
    const multiplier = priceMultiplier / 100
    const materialCostWithMultiplier = baseCost * multiplier
    const totalCost = materialCostWithMultiplier + laborCost

    setResult({
      type: 'item',
      itemName: selectedItem,
      quantity,
      baseCost,
      materialCost: materialCostWithMultiplier,
      laborCost,
      totalCost,
      breakdown: rawBreakdown,
      hours,
      rate
    })
  }

  const calculateComponentOnly = () => {
    if (!selectedComponent || componentQuantity < 1) {
      setResult({ error: "Please select a component and enter a valid quantity." })
      return
    }

    const baseCost = calculateComponentCost(selectedComponent, componentQuantity)
    const multiplier = priceMultiplier / 100
    const totalCost = baseCost * multiplier
    const breakdown = breakdownResources({ [selectedComponent]: componentQuantity })

    setResult({
      type: 'component',
      componentName: selectedComponent,
      quantity: componentQuantity,
      baseCost,
      totalCost,
      breakdown,
      multiplier: priceMultiplier
    })
  }

  const applyPrices = () => {
    localStorage.setItem('customMaterialPrices', JSON.stringify(customPrices))
    setShowSettings(false)
    
    // If there's a result, recalculate with new prices
    if (result) {
      if (result.type === 'item') {
        calculateCost()
      } else if (result.type === 'component') {
        calculateComponentOnly()
      }
    }
  }

  const resetPrices = () => {
    setCustomPrices({})
    localStorage.removeItem('customMaterialPrices')
  }

  const getMultiplierStatus = () => {
    if (priceMultiplier === 100) {
      return { text: 'Base Price', className: 'status-base' }
    } else if (priceMultiplier < 100) {
      return { text: 'Below Base', className: 'status-lower' }
    } else {
      return { text: 'Above Base', className: 'status-higher' }
    }
  }

  const multiplierStatus = getMultiplierStatus()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#121212] text-[#e5e5e5]">
      {/* Settings Panel Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          showSettings ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={() => setShowSettings(false)}
      />

      {/* Settings Toggle Button */}
      <button 
        className="fixed top-8 right-8 z-50 w-12 h-12 rounded-full bg-[rgba(0,153,255,0.2)] border border-[rgba(0,198,255,0.3)] text-[#00c6ff] flex items-center justify-center transition-all hover:bg-[rgba(0,198,255,0.3)] hover:rotate-45"
        onClick={() => setShowSettings(!showSettings)}
        title="Material Price Settings"
      >
        ⚙️
      </button>

      {/* Settings Panel */}
      <div 
        ref={settingsPanelRef}
        className={`fixed top-0 right-0 w-[400px] max-w-full h-full bg-[rgba(18,18,18,0.95)] backdrop-blur-xl border-l border-white/10 z-50 transition-all duration-300 overflow-y-auto ${
          showSettings ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-8 border-b border-white/10">
          <h3 className="text-[#00c6ff] text-2xl font-semibold mb-2">Material Price Settings</h3>
          <p className="text-[#a0a0a0]">Customize raw material prices</p>
        </div>
        
        <div className="p-8">
          <div className="space-y-3">
            {Object.entries(rawMaterialPrices).map(([name, defaultPrice]) => (
              <div key={name} className="flex justify-between items-center py-3 border-b border-white/10">
                <label className="text-white/90 font-medium">{name}</label>
                <div className="flex items-center bg-white/5 border border-white/20 rounded overflow-hidden">
                  <span className="px-2 py-1 bg-white/5 border-r border-white/10 text-white/90">$</span>
                  <input
                    type="number"
                    value={customPrices[name] !== undefined ? customPrices[name] : defaultPrice}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (!isNaN(value) && value >= 0) {
                        setCustomPrices({...customPrices, [name]: value})
                      }
                    }}
                    min="0"
                    step="1"
                    className="w-24 px-2 py-1 bg-transparent border-none text-white/90 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-4 mt-8">
            <button
              onClick={applyPrices}
              className="px-4 py-2 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              APPLY
            </button>
            <button
              onClick={resetPrices}
              className="px-4 py-2 bg-white/10 text-white/90 border border-white/20 font-semibold rounded-lg hover:bg-white/15 transition-all"
            >
              DEFAULT
            </button>
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] inline-block text-transparent bg-clip-text">
            Price Planner
          </h1>
          <p className="text-[#a0a0a0] text-lg">Estimate item value through raw material analysis.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Item Calculator */}
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-lg">
            <h2 className="text-2xl font-semibold mb-6 text-[#00c6ff]">Item Calculator</h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="categorySelect" className="block mb-2 font-semibold">
                  Filter by Category
                </label>
                <select
                  id="categorySelect"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 bg-[#2c2c2c] border border-white/20 rounded-lg text-white/90 focus:border-[#00c6ff] focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/20 transition-all"
                >
                  <option value="All">All Categories</option>
                  {Object.keys(itemData).map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="itemSelect" className="block mb-2 font-semibold">
                  Select Item
                </label>
                <select
                  id="itemSelect"
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full p-3 bg-[#2c2c2c] border border-white/20 rounded-lg text-white/90 focus:border-[#00c6ff] focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/20 transition-all"
                >
                  <option value="">Choose an item...</option>
                  {Object.entries(itemData).map(([category, items]) => {
                    if (selectedCategory !== 'All' && category !== selectedCategory) return null
                    
                    return Object.keys(items).map(itemName => (
                      <option key={`${category}-${itemName}`} value={itemName}>
                        {itemName}
                      </option>
                    ))
                  })}
                </select>
              </div>

              <div>
                <label htmlFor="itemQuantity" className="block mb-2 font-semibold">
                  Quantity
                </label>
                <input
                  type="number"
                  id="itemQuantity"
                  value={itemQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value)
                    if (!isNaN(value) && value >= 1) {
                      setItemQuantity(value)
                    }
                  }}
                  min="1"
                  className="w-full p-3 bg-[#2c2c2c] border border-white/20 rounded-lg text-white/90 focus:border-[#00c6ff] focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/20 transition-all"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-semibold">Price Multiplier</label>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg">{priceMultiplier}%</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      multiplierStatus.className === 'status-base' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      multiplierStatus.className === 'status-lower' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {multiplierStatus.text}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  id="priceMultiplier"
                  min="0"
                  max="200"
                  value={priceMultiplier}
                  onChange={(e) => setPriceMultiplier(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-md appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(0, 198, 255, 0.5) 0%, rgba(0, 198, 255, 0.5) ${priceMultiplier/2}%, rgba(255, 255, 255, 0.1) ${priceMultiplier/2}%, rgba(255, 255, 255, 0.1) 100%)`
                  }}
                />
              </div>

              <div>
                <label htmlFor="timeSpent" className="block mb-2 font-semibold">
                  Time Spent (hours)
                </label>
                <input
                  type="number"
                  id="timeSpent"
                  value={timeSpent === undefined ? '' : timeSpent}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    setTimeSpent(isNaN(value) ? undefined : value)
                  }}
                  step="0.1"
                  placeholder="e.g., 1.5"
                  className="w-full p-3 bg-[#2c2c2c] border border-white/20 rounded-lg text-white/90 focus:border-[#00c6ff] focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/20 transition-all"
                />
              </div>

              <div>
                <label htmlFor="hourlyRate" className="block mb-2 font-semibold">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  id="hourlyRate"
                  value={hourlyRate === undefined ? '' : hourlyRate}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value)
                    setHourlyRate(isNaN(value) ? undefined : value)
                  }}
                  step="1"
                  placeholder="e.g., 2000"
                  className="w-full p-3 bg-[#2c2c2c] border border-white/20 rounded-lg text-white/90 focus:border-[#00c6ff] focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/20 transition-all"
                />
              </div>

              <button
                onClick={calculateCost}
                className="w-full py-3 px-6 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white font-semibold rounded-lg uppercase tracking-wider transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                Calculate Item Cost
              </button>
            </div>
          </div>

          {/* Component Calculator */}
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-lg">
            <h2 className="text-2xl font-semibold mb-6 text-[#00c6ff]">Component Calculator</h2>

            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="componentSelect" className="block mb-2 font-semibold">
                    Select Component
                  </label>
                  <select
                    id="componentSelect"
                    value={selectedComponent}
                    onChange={(e) => setSelectedComponent(e.target.value)}
                    className="w-full p-3 bg-[#2c2c2c] border border-white/20 rounded-lg text-white/90 focus:border-[#00c6ff] focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/20 transition-all"
                  >
                    <option value="">Choose component...</option>
                    {Object.keys(componentRecipes).map(comp => (
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                </div>
                
                <div className="w-full md:w-32">
                  <label htmlFor="componentQty" className="block mb-2 font-semibold">
                    Quantity
                  </label>
                  <input
                    type="number"
                    id="componentQty"
                    value={componentQuantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value)
                      if (!isNaN(value) && value >= 1) {
                        setComponentQuantity(value)
                      }
                    }}
                    min="1"
                    placeholder="Qty"
                    className="w-full p-3 bg-[#2c2c2c] border border-white/20 rounded-lg text-white/90 focus:border-[#00c6ff] focus:outline-none focus:ring-2 focus:ring-[#00c6ff]/20 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={calculateComponentOnly}
                className="w-full py-3 px-6 bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white font-semibold rounded-lg uppercase tracking-wider transition-all hover:shadow-lg hover:-translate-y-0.5 mt-8"
              >
                Calculate Component Cost
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-lg mt-8 animate-fadeIn">
            {result.error ? (
              <div className="text-red-400 text-xl font-semibold">{result.error}</div>
            ) : result.type === 'item' ? (
              <>
                <h3 className="text-3xl font-bold mb-6 text-[#00c6ff]">
                  {result.quantity} × {result.itemName}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white/5 p-4 rounded-lg text-center">
                    <div className="text-[#a0a0a0] text-sm mb-1">Base Material Cost</div>
                    <div className="text-2xl font-bold text-[#10b981]">${result.baseCost.toLocaleString()}</div>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-lg text-center">
                    <div className="text-[#a0a0a0] text-sm mb-1">Material Cost ({priceMultiplier}%)</div>
                    <div className="text-2xl font-bold text-[#10b981]">${result.materialCost.toLocaleString()}</div>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-lg text-center">
                    <div className="text-[#a0a0a0] text-sm mb-1">Labor Cost ({result.hours}h × ${result.rate})</div>
                    <div className="text-2xl font-bold text-[#10b981]">${result.laborCost.toLocaleString()}</div>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-lg text-center">
                    <div className="text-[#a0a0a0] text-sm mb-1">Total Cost</div>
                    <div className="text-3xl font-bold text-[#00c6ff]">${result.totalCost.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="bg-white/[0.03] rounded-lg p-6">
                  <h4 className="text-xl font-semibold mb-4 text-[#ffc107]">Raw Material Breakdown</h4>
                  <ul className="space-y-2">
                    {Object.entries(result.breakdown).map(([name, qty]) => {
                      const price = customPrices[name] || rawMaterialPrices[name]
                      const totalQty = (qty as number) * result.quantity
                      const itemCost = price * totalQty
                      
                      return (
                        <li key={name} className="flex justify-between items-center py-2 border-b border-white/10">
                          <span className="text-white/90">{totalQty} × {name} @ ${price.toLocaleString()}</span>
                          <span className="text-[#10b981] font-semibold">${itemCost.toLocaleString()}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-3xl font-bold mb-6 text-[#00c6ff]">
                  {result.quantity} × {result.componentName}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  <div className="bg-white/5 p-4 rounded-lg text-center">
                    <div className="text-[#a0a0a0] text-sm mb-1">Base Cost</div>
                    <div className="text-2xl font-bold text-[#10b981]">${result.baseCost.toLocaleString()}</div>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-lg text-center">
                    <div className="text-[#a0a0a0] text-sm mb-1">Total Cost ({result.multiplier}%)</div>
                    <div className="text-3xl font-bold text-[#00c6ff]">${result.totalCost.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="bg-white/[0.03] rounded-lg p-6">
                  <h4 className="text-xl font-semibold mb-4 text-[#ffc107]">Raw Material Breakdown</h4>
                  <ul className="space-y-2">
                    {Object.entries(result.breakdown).map(([name, qty]) => {
                      const price = customPrices[name] || rawMaterialPrices[name]
                      const itemCost = price * (qty as number)
                      
                      return (
                        <li key={name} className="flex justify-between items-center py-2 border-b border-white/10">
                          <span className="text-white/90">{qty as number} × {name} @ ${price.toLocaleString()}</span>
                          <span className="text-[#10b981] font-semibold">${itemCost.toLocaleString()}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        /* Custom range slider styling */
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: #00c6ff;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 198, 255, 0.4);
        }

        input[type=range]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #00c6ff;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(0, 198, 255, 0.4);
        }

        /* Hide number input arrows */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type=number] {
          -moz-appearance: textfield;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}