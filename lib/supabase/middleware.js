import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

/**
 * Creates a Supabase client for use in Next.js middleware
 * This client is used for authentication checks and session management
 * in the middleware layer before requests reach the route handlers
 * 
 * @param {Object} context - The middleware context containing req and res
 * @returns {Object} Supabase client instance for middleware
 */
export const createClient = (context) => {
  return createMiddlewareClient(context)
}

/**
 * Default export for convenience
 */
export default createClient 