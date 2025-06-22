import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const createClient = () => {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
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
}