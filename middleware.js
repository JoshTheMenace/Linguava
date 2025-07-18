import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'

/**
 * Next.js Middleware for handling authentication and route protection
 * This middleware runs before requests are processed and handles:
 * - Session refresh
 * - Route protection for authenticated areas
 * - Redirects based on authentication state
 */
export async function middleware(req) {
  const res = NextResponse.next()
  
  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res })

  try {
    // Refresh session if expired - required for Server Components
    // This will update the cookies if the session is refreshed
    const { data: { session }, error } = await supabase.auth.getSession()

    const url = req.nextUrl.clone()
    const isAuthPage = url.pathname.startsWith('/login') || url.pathname.startsWith('/auth')
    const isProtectedRoute = url.pathname.startsWith('/dashboard')

    // Handle authentication flow
    if (error) {
      console.error('Middleware auth error:', error.message)
      // On auth error, redirect to login unless already on auth pages
      if (!isAuthPage) {
        url.pathname = '/login'
        url.searchParams.set('error', 'session_error')
        return NextResponse.redirect(url)
      }
    }

    // Redirect authenticated users away from auth pages
    if (session && isAuthPage && !url.pathname.startsWith('/auth/callback')) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Protect routes that require authentication
    if (!session && isProtectedRoute) {
      url.pathname = '/login'
      url.searchParams.set('redirectTo', req.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    // Handle post-login redirects
    if (session && url.searchParams.has('redirectTo')) {
      const redirectTo = url.searchParams.get('redirectTo')
      if (redirectTo && redirectTo.startsWith('/')) {
        url.pathname = redirectTo
        url.searchParams.delete('redirectTo')
        return NextResponse.redirect(url)
      }
    }

  } catch (error) {
    console.error('Unexpected middleware error:', error)
    // On unexpected errors, allow the request to continue
    // but log the error for debugging
  }

  return res
}

/**
 * Configure which routes this middleware should run on
 * This matcher ensures the middleware only runs on relevant routes
 * and excludes static files and API routes that don't need auth
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 