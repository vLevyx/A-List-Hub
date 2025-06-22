import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    // Attempt to get user and refresh session if needed
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      // Check for specific refresh token errors
      if (error.message?.includes('refresh') || 
          error.message?.includes('Refresh Token Not Found') ||
          error.name === 'AuthApiError' ||
          error.status === 400) {
        
        // Log the issue but don't crash the middleware
        console.warn('Invalid auth session detected, clearing cookies:', error.message)
        
        // Clear the problematic auth cookies by setting them to expire
        const authCookieNames = [
          'sb-access-token',
          'sb-refresh-token',
          'supabase-auth-token',
          'supabase.auth.token'
        ]
        
        authCookieNames.forEach(cookieName => {
          response.cookies.set({
            name: cookieName,
            value: '',
            expires: new Date(0),
            path: '/',
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          })
        })
        
        // Return the response with cleaned cookies
        return response
      }
      
      // For other types of auth errors, log but continue
      console.warn('Auth error in middleware (non-critical):', error.message)
    } else if (user) {
      // Session is valid, user is authenticated
      console.debug('Valid session found for user:', user.id)
    }
    
  } catch (error: any) {
    // Catch any unexpected errors and handle gracefully
    console.warn('Unexpected error in auth middleware:', error?.message || error)
    
    // If it's clearly an auth-related error, clear cookies
    if (error?.message?.includes('JWT') || 
        error?.message?.includes('token') ||
        error?.message?.includes('auth')) {
      
      const authCookieNames = [
        'sb-access-token',
        'sb-refresh-token',
        'supabase-auth-token',
        'supabase.auth.token'
      ]
      
      authCookieNames.forEach(cookieName => {
        response.cookies.set({
          name: cookieName,
          value: '',
          expires: new Date(0),
          path: '/',
        })
      })
    }
  }

  return response
}