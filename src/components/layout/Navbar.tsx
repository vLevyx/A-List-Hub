'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { getAvatarUrl, getUsername } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ChevronDown, LogOut, User, Settings } from 'lucide-react'

const ADMIN_DISCORD_IDS = [
  "154388953053659137",
  "344637470908088322",
  "796587763851198474",
  "492053410967846933",
  "487476487386038292"
]

// Default avatar for fallback
const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png'

export function Navbar() {
  const { user, loading, signInWithDiscord, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [avatarSrc, setAvatarSrc] = useState<string>(DEFAULT_AVATAR)
  const [username, setUsername] = useState<string>('Loading...')
  const [avatarLoaded, setAvatarLoaded] = useState<boolean>(false)
  const [avatarError, setAvatarError] = useState<boolean>(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  
  // Refs for tracking loading states and timeouts
  const avatarTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const loadAttemptsRef = useRef<number>(0)
  
  // Handle user data loading with fallbacks
  useEffect(() => {
    if (!user) {
      setAvatarSrc(DEFAULT_AVATAR)
      setUsername('Loading...')
      setAvatarLoaded(false)
      setAvatarError(false)
      setIsAdmin(false)
      return
    }
    
    // Check if user is admin
    const discordId = user?.user_metadata?.provider_id
    setIsAdmin(!!discordId && ADMIN_DISCORD_IDS.includes(discordId))
    
    // Load username with timeout fallback
    if (usernameTimeoutRef.current) {
      clearTimeout(usernameTimeoutRef.current)
    }
    
    usernameTimeoutRef.current = setTimeout(() => {
      const displayName = getUsername(user)
      setUsername(displayName || 'Discord User')
    }, 100)
    
    // Load avatar with progressive enhancement
    loadAvatar()
    
    return () => {
      if (avatarTimeoutRef.current) clearTimeout(avatarTimeoutRef.current)
      if (usernameTimeoutRef.current) clearTimeout(usernameTimeoutRef.current)
    }
  }, [user])
  
  // Progressive avatar loading with fallbacks
  const loadAvatar = () => {
    if (!user) return
    
    setAvatarLoaded(false)
    setAvatarError(false)
    loadAttemptsRef.current += 1
    
    // Try to get avatar from user metadata
    const avatarUrl = getAvatarUrl(user)
    
    // Set timeout for avatar loading
    if (avatarTimeoutRef.current) {
      clearTimeout(avatarTimeoutRef.current)
    }
    
    // Preload image
    const img = new window.Image()
    img.onload = () => {
      setAvatarSrc(avatarUrl)
      setAvatarLoaded(true)
      setAvatarError(false)
    }
    
    img.onerror = () => {
      // Try fallback if first attempt fails
      if (loadAttemptsRef.current < 3) {
        console.warn(`Avatar load attempt ${loadAttemptsRef.current} failed, trying fallback`)
        avatarTimeoutRef.current = setTimeout(() => {
          loadAvatar()
        }, 1000)
      } else {
        console.warn('Avatar loading failed after multiple attempts, using default')
        setAvatarSrc(DEFAULT_AVATAR)
        setAvatarLoaded(true)
        setAvatarError(true)
      }
    }
    
    img.src = avatarUrl
    
    // Set timeout fallback
    avatarTimeoutRef.current = setTimeout(() => {
      if (!avatarLoaded) {
        console.warn('Avatar loading timed out, using default')
        setAvatarSrc(DEFAULT_AVATAR)
        setAvatarLoaded(true)
        setAvatarError(true)
      }
    }, 3000)
  }
  
  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen && 
        menuRef.current && 
        buttonRef.current && 
        !menuRef.current.contains(event.target as Node) && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])
  
  // Handle escape key to close menu
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false)
      }
    }
    
    document.addEventListener('keydown', handleEscKey)
    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isMenuOpen])

  // Render loading state
  if (loading) {
    return (
      <nav className="backdrop-blur-md bg-background-secondary/60 border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-primary-500">
              A-List <span className="text-xs bg-primary-500 text-black px-2 py-1 rounded ml-2">v2</span>
            </Link>
            <div className="flex items-center space-x-2">
              <span className="text-white/50 text-sm mr-2">Loading</span>
              <LoadingSpinner size="sm" />
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="backdrop-blur-md bg-background-secondary/60 border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-primary-500 hover:text-primary-400 transition-colors">
            A-List <span className="text-xs bg-primary-500 text-black px-2 py-1 rounded ml-2">v2</span>
          </Link>

          {user ? (
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center space-x-3 text-white hover:text-primary-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 rounded-lg p-1"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary-500/30 to-primary-600/30 flex items-center justify-center">
                  {!avatarLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background-secondary">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                  <Image
                    src={avatarSrc}
                    alt="Profile"
                    width={32}
                    height={32}
                    className={`rounded-full transition-opacity duration-300 ${avatarLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setAvatarLoaded(true)}
                    onError={() => {
                      setAvatarError(true)
                      setAvatarSrc(DEFAULT_AVATAR)
                      setAvatarLoaded(true)
                    }}
                    priority
                  />
                </div>
                <span className="hidden sm:block font-medium max-w-[150px] truncate">{username}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMenuOpen && (
                <div
                  ref={menuRef}
                  className="absolute right-0 mt-2 w-48 bg-background-secondary/95 backdrop-blur-md rounded-lg shadow-lg border border-white/10 z-20 animate-fadeIn"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu"
                >
                  <div className="py-1">
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors rounded-t-lg"
                        onClick={() => setIsMenuOpen(false)}
                        role="menuitem"
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        Admin Suite
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                      role="menuitem"
                    >
                      <User className="w-4 h-4 mr-3" />
                      View Profile
                    </Link>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        signOut()
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors rounded-b-lg"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button 
              onClick={signInWithDiscord} 
              variant="secondary"
              className="flex items-center space-x-2"
            >
              <svg width="20" height="20" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor"/>
              </svg>
              Login with Discord
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}