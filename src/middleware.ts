import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    // Wrap updateSession in try-catch to handle refresh token errors gracefully
    const response = await updateSession(request)
    
    // Add cache control headers for auth-dependent pages
    const authDependentPages = ['/whitelist', '/profile', '/admin']
    const isAuthPage = authDependentPages.some(page => 
      request.nextUrl.pathname.startsWith(page)
    )
    
    if (isAuthPage) {
      // Prevent caching for authentication-dependent pages
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      response.headers.set('Surrogate-Control', 'no-store')
      // Vercel-specific header to bypass edge cache
      response.headers.set('X-Vercel-Cache', 'BYPASS')
    }
    
    return response
    
  } catch (error: any) {
    // Handle authentication errors gracefully
    console.warn('Middleware auth error:', error?.message || error)
    
    // Check if it's a refresh token error
    if (error?.message?.includes('refresh') || 
        error?.message?.includes('Refresh Token Not Found') ||
        error?.name === 'AuthApiError') {
      
      // Create a clean response without throwing
      const response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })
      
      // Clear problematic auth cookies
      const authCookies = [
        'sb-access-token',
        'sb-refresh-token', 
        'supabase-auth-token',
        'supabase.auth.token'
      ]
      
      authCookies.forEach(cookieName => {
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
      
      // Add cache control headers for auth-dependent pages
      const authDependentPages = ['/whitelist', '/profile', '/admin']
      const isAuthPage = authDependentPages.some(page => 
        request.nextUrl.pathname.startsWith(page)
      )
      
      if (isAuthPage) {
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
        response.headers.set('Surrogate-Control', 'no-store')
        response.headers.set('X-Vercel-Cache', 'BYPASS')
      }
      
      return response
    }
    
    // For other types of errors, still continue the request
    console.error('Unexpected middleware error:', error)
    
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}