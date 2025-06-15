import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDiscordId(user: any): string | null {
  return user?.user_metadata?.provider_id || user?.user_metadata?.sub || null
}

export function getUsername(user: any): string {
  return user?.user_metadata?.full_name || 
         user?.user_metadata?.name || 
         user?.user_metadata?.user_name || 
         'Discord User'
}

export function getAvatarUrl(user: any): string {
  return user?.user_metadata?.avatar_url || 
         'https://cdn.discordapp.com/embed/avatars/0.png'
}

export function hasValidTrial(userData: any): boolean {
  if (!userData?.hub_trial) return false
  if (!userData?.trial_expiration) return false
  
  const now = new Date()
  const expirationDate = new Date(userData.trial_expiration)
  
  return expirationDate > now
}

export function isUserWhitelisted(userData: any): boolean {
  if (!userData) return false
  return userData.revoked === false || hasValidTrial(userData)
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