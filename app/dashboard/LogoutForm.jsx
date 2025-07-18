import { createServerActionClientCustom } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Server-side logout form component
 * Uses a server action to handle logout securely on the server
 */
export default function LogoutForm() {
  
  /**
   * Server action to handle user logout
   * This runs on the server and securely clears the session
   */
  async function logout() {
    'use server'
    
    const supabase = await createServerActionClientCustom()
    
    // Sign out the user
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Logout error:', error.message)
      // Even if there's an error, redirect to home for security
    }
    
    // Redirect to home page after logout
    redirect('/')
  }

  return (
    <form action={logout}>
      <button
        type="submit"
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        Logout
      </button>
    </form>
  )
} 