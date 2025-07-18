import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogoutForm from './LogoutForm'

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
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                🎉 Welcome to your Dashboard!
              </h2>
              <p className="text-gray-600 mb-8">
                You've successfully authenticated with Supabase Auth. 
                This page is server-rendered and protected by authentication middleware.
              </p>
              
              {/* User information card */}
              <div className="bg-white overflow-hidden shadow rounded-lg max-w-md mx-auto">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    User Information
                  </h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-1">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">User ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono text-xs break-all">
                        {user.id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Sign In</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email Verified</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.email_confirmed_at 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.email_confirmed_at ? 'Verified' : 'Pending'}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-medium text-gray-900">What's Next?</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
                  <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm">
                    <div className="text-center">
                      <h4 className="text-base font-medium text-gray-900 mb-2">🔒 Protected Routes</h4>
                      <p className="text-sm text-gray-500">
                        This page is protected by middleware and server-side auth checks
                      </p>
                    </div>
                  </div>
                  <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm">
                    <div className="text-center">
                      <h4 className="text-base font-medium text-gray-900 mb-2">👤 User Profiles</h4>
                      <p className="text-sm text-gray-500">
                        Add user profile management and preferences
                      </p>
                    </div>
                  </div>
                  <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm">
                    <div className="text-center">
                      <h4 className="text-base font-medium text-gray-900 mb-2">🌐 Social Auth</h4>
                      <p className="text-sm text-gray-500">
                        Google and GitHub authentication are configured
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 