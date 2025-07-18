import { createServerComponentClient, createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for use in Server Components
 * This client is used for server-side rendering and data fetching
 * It reads cookies from the request headers
 * 
 * @returns {Object} Supabase client instance for server components
 */
export const createServerClient = async () => {
  const cookieStore = await cookies()
  return createServerComponentClient({ cookies: () => cookieStore })
}

/**
 * Creates a Supabase client for use in Server Actions
 * This client is used for server-side mutations and actions
 * It reads cookies from the request headers
 * 
 * @returns {Object} Supabase client instance for server actions
 */
export const createServerActionClientCustom = async () => {
  const cookieStore = await cookies()
  return createServerActionClient({ cookies: () => cookieStore })
}

/**
 * Default export for convenience - returns the server component client
 */
export default createServerClient 