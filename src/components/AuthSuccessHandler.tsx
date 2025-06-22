'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function AuthSuccessHandler() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { refreshUserData } = useAuth()

  useEffect(() => {
    const authSuccess = searchParams.get('auth')
    
    if (authSuccess === 'success') {
      console.log('Auth success detected, refreshing user data...')
      
      // Clear any cached auth data that might be stale
      localStorage.removeItem('auth_cache')
      
      // Force refresh auth state
      refreshUserData()
        .then(() => {
          console.log('Auth refresh completed')
          // Remove the auth parameter from URL
          const url = new URL(window.location.href)
          url.searchParams.delete('auth')
          router.replace(url.pathname + url.search, { scroll: false })
        })
        .catch((error) => {
          console.error('Auth refresh failed:', error)
        })
    }
  }, [searchParams, refreshUserData, router])

  return null // This component doesn't render anything
}