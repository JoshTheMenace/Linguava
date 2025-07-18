import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * Creates a Supabase client for use in Client Components
 * This client is used for browser-side authentication and data operations
 * It automatically handles cookies and session management
 * 
 * @returns {Object} Supabase client instance
 */
export const createClient = () => {
  return createClientComponentClient()
}

/**
 * Default export for convenience
 */
export default createClient 