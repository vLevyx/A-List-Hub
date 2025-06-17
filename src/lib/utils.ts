import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// User data extraction utilities with enhanced error handling
export function getDiscordId(user: any): string | null {
  if (!user) return null
  
  try {
    // More reliable extraction with fallbacks
    const discordId = 
      user?.user_metadata?.provider_id || 
      user?.user_metadata?.sub || 
      user?.identities?.find((id: any) => id.provider === 'discord')?.id ||
      user?.id || 
      null
    
    // Validate the ID format (Discord IDs are numeric strings)
    if (discordId && /^\d{17,19}$/.test(discordId)) {
      return discordId
    }
    
    console.warn('Invalid Discord ID format:', discordId)
    return null
  } catch (error) {
    console.error('Error extracting Discord ID:', error)
    return null
  }
}

export function getUsername(user: any): string {
  if (!user) return 'Discord User'
  
  try {
    // Try multiple possible locations for the username with fallbacks
    return user?.user_metadata?.full_name || 
           user?.user_metadata?.name || 
           user?.user_metadata?.user_name || 
           user?.user_metadata?.preferred_username ||
           user?.user_metadata?.email?.split('@')[0] ||
           'Discord User'
  } catch (error) {
    console.error('Error extracting username:', error)
    return 'Discord User'
  }
}

export function getAvatarUrl(user: any): string {
  if (!user) return 'https://cdn.discordapp.com/embed/avatars/0.png'
  
  try {
    // Try to get avatar with fallbacks
    const avatarUrl = user?.user_metadata?.avatar_url || 
                      user?.user_metadata?.picture ||
                      `https://cdn.discordapp.com/avatars/${getDiscordId(user)}/avatar.png` ||
                      'https://cdn.discordapp.com/embed/avatars/0.png'
    
    // Validate URL format
    if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
      return avatarUrl
    }
    
    return 'https://cdn.discordapp.com/embed/avatars/0.png'
  } catch (error) {
    console.error('Error extracting avatar URL:', error)
    return 'https://cdn.discordapp.com/embed/avatars/0.png'
  }
}

export function hasValidTrial(userData: any): boolean {
  if (!userData?.hub_trial) return false
  if (!userData?.trial_expiration) return false
  
  try {
    const now = new Date()
    const expirationDate = new Date(userData.trial_expiration)
    
    return expirationDate > now
  } catch (error) {
    console.error('Error checking trial validity:', error)
    return false
  }
}

export function isUserWhitelisted(userData: any): boolean {
  if (!userData) return false
  
  try {
    return userData.revoked === false || hasValidTrial(userData)
  } catch (error) {
    console.error('Error checking whitelist status:', error)
    return false
  }
}

export function formatPrice(price: number): string {
  return `$${Math.round(price).toLocaleString()}`
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// New utility functions for enhanced profile handling

// Safely parse JSON with error handling
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.error('Error parsing JSON:', error)
    return fallback
  }
}

// Check if a value is a valid date
export function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

// Format date with fallback
export function formatDate(dateString: string | null | undefined, fallback: string = '—'): string {
  if (!dateString) return fallback
  
  try {
    const date = new Date(dateString)
    if (!isValidDate(date)) return fallback
    
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return fallback
  }
}

// Get time ago string (e.g., "2 hours ago")
export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return 'never'
  
  try {
    const date = new Date(dateString)
    if (!isValidDate(date)) return 'invalid date'
    
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    // Time intervals in seconds
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    }
    
    if (seconds < 60) return 'just now'
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit)
      if (interval >= 1) {
        return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`
      }
    }
    
    return 'just now'
  } catch (error) {
    console.error('Error calculating time ago:', error)
    return 'unknown'
  }
}

// Detect device type for optimized loading
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1200
  
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

// Check if connection is slow
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return false
  }
  
  const connection = (navigator as any).connection
  
  if (!connection) return false
  
  // Check for slow connection types
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
    return true
  }
  
  // Check if downlink is less than 1 Mbps
  if (connection.downlink && connection.downlink < 1) {
    return true
  }
  
  return false
}