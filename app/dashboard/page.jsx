import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutForm from './LogoutForm'
import { getAvailableLanguages, getUserLanguages } from '@/lib/actions/languages'
import DashboardContent from './DashboardContent'

/**
 * Server-side Dashboard page that checks authentication
 * This page is server-rendered and requires authentication
 */
export default async function DashboardPage() {
  // Create server-side Supabase client
  const supabase = await createServerClient()

  // Get the current user on the server (more secure than getSession)
  const { data: { user }, error } = await supabase.auth.getUser()

  // If no user or error, redirect to login
  if (error || !user) {
    redirect('/login')
  }

  // Fetch language data
  const [availableLanguagesResult, userLanguagesResult] = await Promise.all([
    getAvailableLanguages(),
    getUserLanguages()
  ])

  const availableLanguages = availableLanguagesResult.success ? availableLanguagesResult.languages : []
  const userLanguages = userLanguagesResult.success ? userLanguagesResult.userLanguages : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user.email}</span>
              <LogoutForm />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <DashboardContent 
          user={user}
          availableLanguages={availableLanguages}
          initialUserLanguages={userLanguages}
        />
      </main>
    </div>
  )
} 