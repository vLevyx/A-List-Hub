// Update your middleware.ts file to add cache control headers

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
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