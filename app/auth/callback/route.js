import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Handle GET requests to the auth callback
 * This route processes the authentication code exchange after a user
 * successfully authenticates via magic link or OAuth providers
 */
export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })
    
    try {
      // Exchange the auth code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error.message)
        // Redirect to login with error
        return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin))
      }

      if (data?.session) {
        // Successful authentication - redirect to dashboard
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
      }
    } catch (error) {
      console.error('Unexpected error during auth callback:', error)
      return NextResponse.redirect(new URL('/login?error=unexpected_error', requestUrl.origin))
    }
  }

  // No code parameter or other issues - redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
} 