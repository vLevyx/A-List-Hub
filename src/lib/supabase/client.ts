import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Global variable to store the singleton instance
let supabaseInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null

export const createClient = () => {
  // Return existing instance if it already exists
  if (supabaseInstance) {
    return supabaseInstance
  }

  // Create new instance only if one doesn't exist
  supabaseInstance = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        // Use a unique storage key to avoid conflicts
        storageKey: 'alist-hub-auth-token'
      },
      realtime: {
        // Disable realtime to prevent WebSocket connection issues
        params: {
          eventsPerSecond: 0
        }
      },
      global: {
        headers: {
          'X-Client-Info': 'alist-hub-web'
        }
      }
    }
  )

  return supabaseInstance
}

// Optional: Function to reset the singleton (useful for testing or manual cleanup)
export const resetSupabaseClient = () => {
  supabaseInstance = null
}