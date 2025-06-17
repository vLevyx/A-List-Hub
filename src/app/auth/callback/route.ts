// Update your auth callback route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    const supabase = createClient()
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('Session exchange error:', exchangeError)
        throw exchangeError
      }

      if (data.session) {
        // Verify the session is valid
        const { data: user, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user.user) {
          throw new Error('Invalid session after exchange')
        }

        // Build redirect URL
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        let redirectUrl: string
        if (isLocalEnv) {
          redirectUrl = `${origin}${next}`
        } else if (forwardedHost) {
          redirectUrl = `https://${forwardedHost}${next}`
        } else {
          redirectUrl = `${origin}${next}`
        }

        // Add success indicator
        const url = new URL(redirectUrl)
        url.searchParams.set('auth', 'success')
        
        return NextResponse.redirect(url.toString())
      }
    } catch (error) {
      console.error('Auth callback error:', error)
    }
  }

  // Redirect to error page with details
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}