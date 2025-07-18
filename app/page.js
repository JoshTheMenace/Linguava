'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">LinguaVa</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700">Welcome, {user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {user ? (
            // Authenticated user content
            <div className="space-y-8">
              <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
                Welcome back!
              </h1>
              <p className="max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                You're successfully logged in. Ready to explore your dashboard?
              </p>
              <div className="max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                <div className="rounded-md shadow">
                  <Link
                    href="/dashboard"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            // Unauthenticated user content
            <div className="space-y-8">
              <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
                Welcome to{' '}
                <span className="text-indigo-600">LinguaVa</span>
              </h1>
              <p className="max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                Your gateway to powerful language learning and communication tools. 
                Join us today and start your journey to better communication.
              </p>
              <div className="max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
                <div className="rounded-md shadow">
                  <Link
                    href="/login"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
                <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                  <Link
                    href="/login"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Features Section for unauthenticated users */}
        {!user && (
          <div className="mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="lg:text-center">
                <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">Features</h2>
                <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                  Everything you need to succeed
                </p>
              </div>

              <div className="mt-10">
                <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
                  <div className="relative">
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                      🔐
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Secure Authentication</p>
                    <p className="mt-2 ml-16 text-base text-gray-500">
                      Built with Supabase Auth for enterprise-grade security and social login support.
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                      ⚡
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Lightning Fast</p>
                    <p className="mt-2 ml-16 text-base text-gray-500">
                      Built on Next.js 14 with App Router for optimal performance and user experience.
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                      🎯
                    </div>
                    <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Easy to Use</p>
                    <p className="mt-2 ml-16 text-base text-gray-500">
                      Intuitive interface designed for both beginners and advanced users.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
