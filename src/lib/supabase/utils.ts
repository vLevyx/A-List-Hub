import { createClient } from './client'
import type { PostgrestError } from '@supabase/supabase-js'

export interface SupabaseResponse<T> {
  data: T | null
  error: PostgrestError | null
}

export interface FunctionResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Enhanced function to call Supabase RPC functions with retry logic
export async function callSupabaseFunction<T>(
  functionName: string,
  params: any,
  options?: { retries?: number; retryDelay?: number }
): Promise<T> {
  const { retries = 2, retryDelay = 1000 } = options || {}
  const supabase = createClient()
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.rpc(functionName, params)
      
      if (error) {
        console.error(`Supabase function error (${functionName}):`, error)
        
        // Check for specific error types
        if (error.code === 'PGRST301') {
          throw new Error('Permission denied. Please try logging in again.')
        }
        
        if (error.code === '42501') {
          throw new Error('Authentication required. Please log in.')
        }
        
        if (error.message?.includes('JWT')) {
          throw new Error('Session expired. Please log in again.')
        }
        
        // If it's the last attempt, throw the error
        if (attempt === retries) {
          throw new Error(error.message || 'Database operation failed')
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        continue
      }
      
      // Check if the function returned an error in its response
      if (data && typeof data === 'object' && 'success' in data && !data.success) {
        if (attempt === retries) {
          throw new Error(data.error || data.message || 'Operation failed')
        }
        // For function-level errors, retry might help
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        continue
      }
      
      return data as T
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed for ${functionName}:`, error)
      
      if (attempt === retries) {
        throw error
      }
    }
  }
  
  throw new Error('Max retries exceeded')
}

// Wrapper for database queries with error handling
export async function supabaseQuery<T>(
  queryBuilder: Promise<SupabaseResponse<T>>,
  options?: { 
    errorMessage?: string
    retries?: number
    retryDelay?: number
  }
): Promise<T> {
  const { errorMessage = 'Database query failed', retries = 1, retryDelay = 1000 } = options || {}
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await queryBuilder
      
      if (error) {
        console.error('Supabase query error:', error)
        
        if (error.code === 'PGRST301') {
          throw new Error('You do not have permission to access this data.')
        }
        
        if (attempt === retries) {
          throw new Error(error.message || errorMessage)
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        continue
      }
      
      if (!data) {
        throw new Error('No data returned from query')
      }
      
      return data
    } catch (error: any) {
      if (attempt === retries) {
        throw error
      }
    }
  }
  
  throw new Error('Max retries exceeded')
}

// Specific function for user login with enhanced error handling
export async function updateUserLogin(discordId: string, username?: string): Promise<FunctionResponse<any>> {
  try {
    const result = await callSupabaseFunction<any>(
      'upsert_user_login',
      { 
        target_discord_id: discordId,
        user_name: username 
      },
      { retries: 2, retryDelay: 1500 }
    )
    
    // Handle the response based on your function's return structure
    if (result && typeof result === 'object') {
      if ('success' in result) {
        return result as FunctionResponse<any>
      }
      // If the function doesn't return a success field, wrap it
      return {
        success: true,
        data: result
      }
    }
    
    return {
      success: false,
      error: 'Invalid response from server'
    }
  } catch (error: any) {
    console.error('updateUserLogin error:', error)
    return {
      success: false,
      error: error.message || 'Failed to update user login'
    }
  }
}

// Function to get user profile with blueprints
export async function getUserProfileAndBlueprints(discordId: string) {
  try {
    const result = await callSupabaseFunction<any>(
      'get_profile_and_blueprints',
      { user_discord_id: discordId },
      { retries: 2 }
    )
    
    return {
      success: true,
      profile: result.profile || null,
      blueprints: result.blueprints || []
    }
  } catch (error: any) {
    console.error('getUserProfileAndBlueprints error:', error)
    return {
      success: false,
      profile: null,
      blueprints: [],
      error: error.message
    }
  }
}

// Debug function to check auth status
export async function debugAuthInfo() {
  try {
    const result = await callSupabaseFunction<any>('debug_auth_info', {})
    return result
  } catch (error: any) {
    console.error('debugAuthInfo error:', error)
    return {
      error: error.message,
      jwt_sub: null,
      detected_discord_id: null,
      is_admin: false,
      user_found: false
    }
  }
}