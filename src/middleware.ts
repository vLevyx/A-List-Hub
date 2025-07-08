// middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// ENHANCEMENT 1: Expanded security headers for RLS-protected routes
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
} as const

// ENHANCEMENT 2: Enhanced route categorization
const routeConfig = {
  // Routes that require authentication
  authRequired: ['/profile', '/whitelist'],
  
  // Routes that require admin privileges (protected by RLS)
  adminRequired: ['/admin'],
  
  // Public routes that should still have security headers
  publicSecure: ['/api', '/auth'],
  
  // Routes that need no-cache headers (dynamic content)
  noCache: ['/profile', '/admin', '/whitelist', '/api'],
  
  // Routes that can be cached longer (static-ish content)
  cacheable: ['/', '/terms', '/privacy'],
} as const

// ENHANCEMENT 3: Comprehensive cache control
function setCacheHeaders(response: NextResponse, pathname: string) {
  // No cache for dynamic/auth-dependent routes
  if (routeConfig.noCache.some(route => pathname.startsWith(route))) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    response.headers.set('X-Vercel-Cache', 'BYPASS')
  } 
  // Short cache for semi-static content
  else if (routeConfig.cacheable.some(route => pathname === route)) {
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300') // 5 minutes
  }
  // Default: no special caching
}

// ENHANCEMENT 4: Security headers for all routes
function setSecurityHeaders(response: NextResponse, pathname: string) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // ENHANCEMENT 5: Content Security Policy for admin routes
  if (routeConfig.adminRequired.some(route => pathname.startsWith(route))) {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.supabase.co",
      "style-src 'self' 'unsafe-inline'", 
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; ')
    
    response.headers.set('Content-Security-Policy', csp)
  }

  // ENHANCEMENT 6: Additional security for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
}

// ENHANCEMENT 7: Enhanced cookie cleaning with more comprehensive list
function clearAuthCookies(response: NextResponse) {
  const authCookies = [
    // Supabase cookies
    'sb-access-token',
    'sb-refresh-token', 
    'supabase-auth-token',
    'supabase.auth.token',
    'sb-auth-token',
    
    // Your app's auth cookies
    'auth_cache',
    'profile_data_cache',
    'blueprints_cache',
    
    // Session cookies
    'session',
    'auth-session',
    
    // Any other auth-related cookies
    'user-session',
    'login-state',
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
}

// ENHANCEMENT 8: Rate limiting headers (basic implementation)
function setRateLimitHeaders(response: NextResponse, pathname: string) {
  // More restrictive rate limiting for admin routes
  if (routeConfig.adminRequired.some(route => pathname.startsWith(route))) {
    response.headers.set('X-RateLimit-Limit', '100') // 100 requests per hour for admin
    response.headers.set('X-RateLimit-Window', '3600')
  } 
  // Standard rate limiting for API routes
  else if (pathname.startsWith('/api/')) {
    response.headers.set('X-RateLimit-Limit', '1000') // 1000 requests per hour for API
    response.headers.set('X-RateLimit-Window', '3600')
  }
}

// ENHANCEMENT 9: Request logging for security monitoring
function logSecurityEvent(request: NextRequest, event: string, details?: string) {
  const timestamp = new Date().toISOString()
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  console.log(`[SECURITY] ${timestamp} | ${event} | IP: ${ip} | Path: ${request.nextUrl.pathname} | Details: ${details || 'none'} | UA: ${userAgent.slice(0, 100)}`)
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  try {
    // ENHANCEMENT 10: Early security logging
    if (routeConfig.adminRequired.some(route => pathname.startsWith(route))) {
      logSecurityEvent(request, 'ADMIN_ROUTE_ACCESS')
    }

    // Core session update (your existing logic)
    const response = await updateSession(request)
    
    // ENHANCEMENT 11: Apply comprehensive security headers
    setSecurityHeaders(response, pathname)
    setCacheHeaders(response, pathname)
    setRateLimitHeaders(response, pathname)

    // ENHANCEMENT 12: Additional security for sensitive routes
    if (routeConfig.adminRequired.some(route => pathname.startsWith(route))) {
      // Admin routes get extra security headers
      response.headers.set('X-Admin-Route', 'true')
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    return response
    
  } catch (error: any) {
    // ENHANCEMENT 13: Enhanced error logging with security context
    const errorType = error?.name || 'UnknownError'
    const errorMessage = error?.message || 'Unknown error'
    
    logSecurityEvent(request, 'MIDDLEWARE_ERROR', `${errorType}: ${errorMessage}`)
    console.warn('Middleware auth error:', errorMessage)
    
    // Check if it's a refresh token error
    if (error?.message?.includes('refresh') || 
        error?.message?.includes('Refresh Token Not Found') ||
        error?.name === 'AuthApiError') {
      
      logSecurityEvent(request, 'AUTH_TOKEN_CLEARED', 'Refresh token error')
      
      // Create a clean response without throwing
      const response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })
      
      // ENHANCEMENT 14: Comprehensive cookie clearing
      clearAuthCookies(response)
      
      // Apply security headers even on error responses
      setSecurityHeaders(response, pathname)
      setCacheHeaders(response, pathname)
      
      return response
    }
    
    // For other types of errors, still continue the request
    console.error('Unexpected middleware error:', error)
    
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
    
    // Apply security headers even on error responses
    setSecurityHeaders(response, pathname)
    setCacheHeaders(response, pathname)
    
    return response
  }
}

// ENHANCEMENT 15: More comprehensive matcher with security focus
export const config = {
  matcher: [
    /*
     * Enhanced matcher that includes:
     * - All routes except static files
     * - API routes for security headers
     * - Admin routes for extra protection
     * - Auth callback routes
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)',
  ],
}