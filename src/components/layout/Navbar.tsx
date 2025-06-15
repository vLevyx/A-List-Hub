'use client'

import { useState } from 'react'
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

export function Navbar() {
  const { user, loading, signInWithDiscord, signOut } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isAdmin = user?.user_metadata?.provider_id && 
    ADMIN_DISCORD_IDS.includes(user.user_metadata.provider_id)

  if (loading) {
    return (
      <nav className="backdrop-blur-md bg-background-secondary/60 border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-primary-500 relative">
              A-List Hub
              <span className="absolute -top-0.5 -right-6 text-[0.60rem] bg-primary-500 text-black px-1.5 py-0.5 rounded-sm font-bold leading-none">v2</span>
            </Link>
            <LoadingSpinner />
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="backdrop-blur-md bg-background-secondary/60 border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-xl font-bold text-primary-500 hover:text-primary-400 transition-colors relative">
            A-List Hub
            <span className="absolute -top-0.5 -right-6 text-[0.60rem] bg-primary-500 text-black px-1.5 py-0.5 rounded-sm font-bold leading-none">v2</span>
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center space-x-3 text-white hover:text-primary-400 transition-colors"
              >
                <Image
                  src={getAvatarUrl(user)}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <span className="hidden sm:block font-medium">{getUsername(user)}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-background-secondary/95 backdrop-blur-md rounded-lg shadow-lg border border-white/10 z-20">
                    <div className="py-1">
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4 mr-3" />
                          Admin Suite
                        </Link>
                      )}
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="w-4 h-4 mr-3" />
                        View Profile
                      </Link>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false)
                          signOut()
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button onClick={signInWithDiscord} variant="secondary">
              Login with Discord
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}