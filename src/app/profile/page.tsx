'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { usePageTracking } from '@/hooks/usePageTracking'
import { createClient } from '@/lib/supabase/client'
import { getDiscordId, getUsername, getAvatarUrl } from '@/lib/utils'

// Default categories that should be checked by default
const DEFAULT_ON_CATEGORIES = ['Components', 'HQ Components']

// Blueprint categories and items - with proper type definition
const itemsByCategory: { [key: string]: string[] } = {
  'Weapons': ['AK-74', 'AKS-74U', 'CheyTac M200 Intervention', 'Colt 1911', 'Desert Eagle', 'M16A2', 'M16A2 - AUTO', 'M16 Carbine', 'M21 SWS', 'M249 SAW', 'M416', 'M9', 'MP 43 1C', 'MP5A2', 'MP7A2', 'PKM', 'PM', 'RPK-74',
    'Sa-58P', 'Sa-58V', 'Scar-H', 'SIG MCX', 'SIG MCX SPEAR', 'SSG10A2-Sniper', 'Steyr AUG', 'SR-25 Rifle', 'SVD'],

  'Magazines': ['30rnd 9x19 Mag', '8rnd .45 ACP', '9x18mm 8rnd PM Mag', '9x19mm 15rnd M9 Mag', '.300 Blackout Mag', '.338 5rnd FMJ', '.50 AE 7rnd Mag',
    '12/70 7mm Buckshot', '4.6x40 40rnd Mag', '5.45x39mm 30rnd AK Mag', '5.45x39mm 45rnd RPK-74 Tracer Mag', '5.56x45mm 30rnd AUG Mag',
    '5.56x45mm 30rnd STANAG Mag', '5.56x45mm 200rnd M249 Belt', '7Rnd M200 Magazine', '7.62x39mm 30rnd Sa-58 Mag', '7.62x51mm FMJ', '7.62x51mm 20rnd M14 Mag',
    '7.62x51mm 30rnd Mag', 'SR25 7.62x51mm 20rnd', '7.62x54mmR 100rnd PK Belt', '7.62x54mmR 10rnd SVD Sniper Mag', 'SPEAR 6.8x51 25rnd'],

  'Attachments': ['A2 Flash Hider', 'ART II Scope', 'Carry Handle Red-Dot-Sight', 'EOTECH XPS3', 'Elcan Specter', 'Leupold VX-6', 'PSO-1 Scope', 'Reflex Scope', '4x20 Carry Handle Scope', '4.7mm FlashHider', '6.8x51mm FlashHider', '6P26 Flash Hider',
    '6P20 Muzzle Brake', '7.62x51mm FlashHider'],

  'Vehicles': ['M1025 Light Armoured Vehicle', 'M151A2 Off-Road', 'M151A2 Off-Road Open Top', 'M923A1 Fuel Truck', 'M923A1 Transport Truck', 'M923A1 Transport Truck - Canopy',
    'M998 Light Utility Vehicle', 'M998 Light Utility Vehicle - Canopy', 'Mi-8MT Transport Helicopter', 'Pickup-Truck', 'S105 Car', 'S1203 Minibus', 'S1203 - Laboratory', 'UAZ-452 Off-road', 'UAZ-452 Off-road - Laboratory',
    'UAZ-469 Off-road', 'UAZ-469 Off-road - Open Top', 'UH-1H Transport Helicopter', 'Ural-4320 Fuel Truck', 'Ural-4320 Transport Truck', 'Ural-4320 Transport Truck - Canopy', 'Ural (Device)', 'VW Rolf'],

  'Vests': ['6B2 Vest', '6B3 Vest', 'M69 Vest', 'PASGT Vest'],

  'Helmets': ['PASGT Helmet', 'PASGT Helmet - Camouflaged', 'PASGT Helmet - Camouflaged Netting', 'SPH-4 Helmet', 'SSh-68 Helmet',
    'SSh-68 Helmet - Camouflaged', 'SSh-68 Helmet - Cover', 'SSh-68 Helmet - KZS', 'SSh-68 Helmet - Netting', 'ZSh-5 Helmet'],

  'Clothes': ['ALICE Medium Backpack', 'Bandana', 'Balaclava', 'BDU Blouse', 'BDU Blouse - Rolled-up', 'BDU Trousers', 'Beanie', 'Boonie', 'Cap - All Variants', 'Cargo Pants', 'Cargo Pants (Colored)',
    'Cardigan', 'Classic Shoe', 'CWU-27 Pilot Coveralls', 'Dress', 'Fedora', 'Fisher Hat', 'Flat Cap', 'Half Mask', 'Hunting Vest', 'IIFS Large Combat Field Pack',
    'Jacket', 'Jeans', 'Jeans (Colored)', 'KLMK Coveralls', 'Knit Cap', 'Kolobok Backpack', 'M70 Backpack', 'M70 Cap', 'M70 Parka',
    'M70 Trousers', 'M88 Field Cap', 'M88 Jacket', 'M88 Jacket - Rolled-up', 'M88 Trousers', 'Mask (Medical)', 'Mask (Latex)', 'Mask (Ski)', 'Officer\'s Cap',
    'Panamka', 'Paper Bag', 'Polo', 'Pullover', 'Robe', 'Runner Shoe', 'Sneaker', 'Soviet Combat Boots',
    'Soviet Pilot Jacket', 'Soviet Pilot Pants', 'Suit Jacket', 'Suit Pants', 'Sweater', 'Sweat Pants', 'TShirt', 'US Combat Boots',
    'Veshmeshok Backpack', 'Wool Hat'],

  'HQ Components': ['Ammo (HQ)', 'Attachment Part (HQ)', 'Component (HQ)', 'Engine Part (HQ)', 'Interior Part (HQ)',
    'Kevlar', 'Mechanical Component (HQ)', 'Rotor (HQ)', 'Stabilizer (HQ)', 'Weapon Part (HQ)', 'Special Rotor', 'Special Gun Barrel'],

  'Components': ['Cloth', 'Iron Plate', 'Component', 'Tempered Glass', 'Weapon Part', 'Stabilizer', 'Attachment Part',
    'Ammo', 'Mechanical Component', 'Engine Part', 'Interior Part', 'Rotor']
}

interface UserProfile {
  created_at: string | null
  last_login: string | null
  revoked: boolean | null
  login_count: number | null
  discord_id: string
  username: string | null
  hub_trial: boolean | null
  trial_expiration: string | null
}

interface Blueprint {
  id: string
  discord_id: string | null
  blueprint_name: string
  created_at: string | null
}

interface CombinedData {
  profile: UserProfile | null
  blueprints: Blueprint[]
}

export default function ProfilePage() {
  usePageTracking()
  const router = useRouter()
  const { user, loading, signOut } = useAuth()
  const supabase = createClient()

  // State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [ownedBlueprints, setOwnedBlueprints] = useState<string[]>([])
  const [selectedBlueprints, setSelectedBlueprints] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Load user profile and blueprints data using the RPC function
  const loadUserData = useCallback(async () => {
    if (!user) return

    try {
      const discordId = getDiscordId(user)
      if (!discordId) {
        setLoadError('Could not determine Discord ID')
        setIsLoading(false)
        return
      }

      console.log('Loading data for Discord ID:', discordId)

      // Use the RPC function to get both profile and blueprints in one call
      const { data, error } = await supabase.rpc(
        'get_profile_and_blueprints',
        { user_discord_id: discordId }
      )

      if (error) {
        console.error('Error fetching user data:', error)
        setLoadError('Failed to load user data')
        setIsLoading(false)
        return
      }

      console.log('Received data:', data)

      // Parse the returned data
      const combinedData = data as CombinedData
      
      if (combinedData.profile) {
        setUserProfile(combinedData.profile)
      }

      if (combinedData.blueprints && Array.isArray(combinedData.blueprints)) {
        const blueprintNames = combinedData.blueprints.map(bp => bp.blueprint_name)
        setOwnedBlueprints(blueprintNames)
        
        // Initialize selected blueprints with owned ones and default categories
        const initialSelected = new Set<string>()
        
        // Add owned blueprints
        blueprintNames.forEach(name => initialSelected.add(name))
        
        // Add default categories
        DEFAULT_ON_CATEGORIES.forEach(category => {
          if (itemsByCategory[category]) {
            itemsByCategory[category].forEach((item: string) => initialSelected.add(item))
          }
        })
        
        setSelectedBlueprints(initialSelected)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load user data:', error)
      setLoadError('An unexpected error occurred')
      setIsLoading(false)
    }
  }, [user, supabase])

  // Fallback method if RPC fails
  const loadDataSeparately = useCallback(async () => {
    if (!user) return

    try {
      const discordId = getDiscordId(user)
      if (!discordId) {
        setLoadError('Could not determine Discord ID')
        setIsLoading(false)
        return
      }

      console.log('Loading data separately for Discord ID:', discordId)

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('discord_id', discordId)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError)
      } else if (profileData) {
        setUserProfile(profileData)
      }

      // Load blueprints
      const { data: blueprintsData, error: blueprintsError } = await supabase
        .from('user_blueprints')
        .select('*')
        .eq('discord_id', discordId)

      if (blueprintsError) {
        console.error('Error fetching blueprints:', blueprintsError)
      } else if (blueprintsData) {
        const blueprintNames = blueprintsData.map(bp => bp.blueprint_name)
        setOwnedBlueprints(blueprintNames)
        
        // Initialize selected blueprints
        const initialSelected = new Set<string>()
        
        // Add owned blueprints
        blueprintNames.forEach(name => initialSelected.add(name))
        
        // Add default categories
        DEFAULT_ON_CATEGORIES.forEach(category => {
          if (itemsByCategory[category]) {
            itemsByCategory[category].forEach((item: string) => initialSelected.add(item))
          }
        })
        
        setSelectedBlueprints(initialSelected)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Failed to load data separately:', error)
      setLoadError('An unexpected error occurred')
      setIsLoading(false)
    }
  }, [user, supabase])

  // Initialize data
  useEffect(() => {
    if (!loading && user) {
      // Try the RPC function first, fall back to separate queries if it fails
      loadUserData().catch(() => {
        console.log('Falling back to separate queries')
        loadDataSeparately()
      })
    } else if (!loading && !user) {
      router.push('/')
    }
  }, [loading, user, loadUserData, loadDataSeparately, router])

  // Handle blueprint toggle
  const handleBlueprintToggle = (blueprint: string) => {
    setSelectedBlueprints(prev => {
      const newSet = new Set(prev)
      if (newSet.has(blueprint)) {
        newSet.delete(blueprint)
      } else {
        newSet.add(blueprint)
      }
      return newSet
    })
  }

  // Save blueprints
  const saveBlueprints = async () => {
    if (!user) return
    
    setIsSaving(true)
    setSaveStatus({ type: null, message: '' })
    
    try {
      const discordId = getDiscordId(user)
      if (!discordId) {
        throw new Error('Could not determine Discord ID')
      }
      
      // Filter out default components that are always selected
      const blueprintsToSave = Array.from(selectedBlueprints).filter(blueprint => {
        // Check if blueprint belongs to a default category
        for (const category of DEFAULT_ON_CATEGORIES) {
          if (itemsByCategory[category]?.includes(blueprint)) {
            return false
          }
        }
        return true
      })
      
      console.log('Saving blueprints:', blueprintsToSave)
      
      // Delete existing blueprints
      const { error: deleteError } = await supabase
        .from('user_blueprints')
        .delete()
        .eq('discord_id', discordId)
      
      if (deleteError) {
        console.error('Error deleting existing blueprints:', deleteError)
        throw deleteError
      }
      
      // Insert new blueprints
      if (blueprintsToSave.length > 0) {
        const inserts = blueprintsToSave.map(name => ({ 
          discord_id: discordId, 
          blueprint_name: name 
        }))
        
        const { error: insertError } = await supabase
          .from('user_blueprints')
          .insert(inserts)
        
        if (insertError) {
          console.error('Error inserting blueprints:', insertError)
          throw insertError
        }
      }
      
      console.log('Blueprints saved successfully')
      setSaveStatus({ 
        type: 'success', 
        message: 'Blueprints saved successfully!' 
      })
      
      // Update owned blueprints
      setOwnedBlueprints(blueprintsToSave)
      
    } catch (error) {
      console.error('Failed to save blueprints:', error)
      setSaveStatus({ 
        type: 'error', 
        message: 'Failed to save blueprints. Please try again.' 
      })
    } finally {
      setIsSaving(false)
      
      // Clear status after 3 seconds
      setTimeout(() => {
        setSaveStatus({ type: null, message: '' })
      }, 3000)
    }
  }

  // Calculate blueprint counts
  const getBlueprintCounts = () => {
    // Count only non-default category blueprints
    const filteredBlueprints = Object.entries(itemsByCategory)
      .filter(([category]) => !DEFAULT_ON_CATEGORIES.includes(category))
      .flatMap(([, items]) => items)
    
    const selectedCount = Array.from(selectedBlueprints)
      .filter(blueprint => filteredBlueprints.includes(blueprint))
      .length
    
    return {
      total: filteredBlueprints.length,
      selected: selectedCount
    }
  }

  const { total, selected } = getBlueprintCounts()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c6ff]"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] text-[#e8e8e8] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 text-[#00c6ff] px-4 py-3 rounded-xl font-semibold transition-all hover:bg-[#00c6ff]/10 hover:border-[#00c6ff]/30 hover:-translate-y-0.5 mb-6"
        >
          ← Back
        </Link>

        {/* Profile Card */}
        <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00c6ff]/50 to-transparent"></div>
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8">
            <div className="w-24 h-24 rounded-full border-3 border-[#00c6ff]/30 bg-gradient-to-br from-[#00c6ff] to-[#0072ff] overflow-hidden flex-shrink-0">
              <Image 
                src={getAvatarUrl(user)} 
                alt="Avatar" 
                width={96} 
                height={96} 
                className="rounded-full object-cover"
                priority
              />
            </div>
            
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold mb-1 bg-gradient-to-r from-white to-[#e8e8e8] inline-block text-transparent bg-clip-text break-words">
                {getUsername(user)}
              </h1>
              <div className="text-[#a0a0a0]">Discord Profile</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
              <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">Discord ID</div>
              <div className="text-white font-semibold break-all">{getDiscordId(user)}</div>
            </div>
            
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
              <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">Status</div>
              <div>
                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${
                  userProfile?.revoked 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                }`}>
                  {userProfile?.revoked ? 'Access Revoked' : 'Whitelisted'}
                </span>
              </div>
            </div>
            
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
              <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">Member Since</div>
              <div className="text-white font-semibold">
                {userProfile?.created_at 
                  ? new Date(userProfile.created_at).toLocaleDateString() 
                  : '—'}
              </div>
            </div>
            
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
              <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">Last Login</div>
              <div className="text-white font-semibold">
                {userProfile?.last_login 
                  ? new Date(userProfile.last_login).toLocaleDateString() 
                  : '—'}
              </div>
            </div>
            
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
              <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">Login Count</div>
              <div className="text-white font-semibold">{userProfile?.login_count || 0}</div>
            </div>
            
            {userProfile?.hub_trial && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 transition-all hover:bg-white/[0.05] hover:border-[#00c6ff]/20 hover:-translate-y-0.5">
                <div className="text-[#a0a0a0] text-xs font-semibold uppercase tracking-wider mb-2">Trial Status</div>
                <div>
                  <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${
                    userProfile.trial_expiration && new Date(userProfile.trial_expiration) > new Date()
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {userProfile.trial_expiration && new Date(userProfile.trial_expiration) > new Date()
                      ? `Trial Active (Expires: ${new Date(userProfile.trial_expiration).toLocaleDateString()})`
                      : 'Trial Expired'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => signOut()}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white border-none py-4 px-8 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-md w-full md:w-auto"
          >
            Sign Out
          </button>
        </div>

        {/* Blueprints Section */}
        <div className="bg-[#141414]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00c6ff]/50 to-transparent"></div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">My Blueprints</h2>
            <div className="bg-[#00c6ff]/10 border border-[#00c6ff]/20 text-[#00c6ff] py-2 px-5 rounded-xl font-semibold text-sm inline-block mb-4">
              📃 Selected: {selected} / {total} Blueprints
            </div>
            
            <p className="text-[#a0a0a0] text-base max-w-2xl mx-auto">
              Select the blueprints you own. These will appear in the Crafting Calculator and help optimize your gameplay experience.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c6ff]"></div>
            </div>
          ) : loadError ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-center mb-8">
              {loadError}
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                {Object.entries(itemsByCategory).map(([category, items]) => {
                  const isDefaultCategory = DEFAULT_ON_CATEGORIES.includes(category)
                  
                  return (
                    <details key={category} className="group bg-white/[0.02] border border-white/[0.08] rounded-xl overflow-hidden">
                      <summary className="flex items-center justify-between p-5 cursor-pointer bg-white/[0.03] font-semibold text-white hover:bg-white/[0.05] transition-all">
                        {category} 
                        <span className="text-[#00c6ff] text-sm transition-transform duration-300 group-open:rotate-180">▼</span>
                      </summary>
                      
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {items.map(item => (
                          <div 
                            key={item} 
                            className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/[0.05] rounded-lg hover:bg-white/[0.04] hover:border-[#00c6ff]/20 transition-all"
                          >
                            <div className="text-[#e8e8e8] text-sm font-medium pr-4 break-words flex-1">{item}</div>
                            
                            <div className="relative flex-shrink-0">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={selectedBlueprints.has(item) || isDefaultCategory}
                                onChange={() => handleBlueprintToggle(item)}
                                disabled={isDefaultCategory}
                              />
                              <div 
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 cursor-pointer ${
                                  selectedBlueprints.has(item) || isDefaultCategory
                                    ? 'bg-gradient-to-r from-[#00c6ff] to-[#0072ff]'
                                    : 'bg-white/20'
                                } ${isDefaultCategory ? 'opacity-60 cursor-not-allowed' : ''}`}
                                onClick={() => !isDefaultCategory && handleBlueprintToggle(item)}
                              >
                                <div 
                                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-lg ${
                                    selectedBlueprints.has(item) || isDefaultCategory ? 'translate-x-6' : 'translate-x-0'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )
                })}
              </div>

              <div className="flex flex-col items-center">
                {saveStatus.type && (
                  <div className={`mb-4 py-3 px-6 rounded-lg text-center ${
                    saveStatus.type === 'success' 
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  }`}>
                    {saveStatus.message}
                  </div>
                )}
                
                <button
                  onClick={saveBlueprints}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-[#00c6ff] to-[#0072ff] text-white border-none py-4 px-8 rounded-xl font-semibold text-base transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Blueprint Selection'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}