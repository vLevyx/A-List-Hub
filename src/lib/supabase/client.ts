import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let supabase: ReturnType<typeof createBrowserClient<Database>> | null = null;

export const createClient = (): ReturnType<typeof createBrowserClient<Database>> => {
  if (!supabase) {
    supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
};