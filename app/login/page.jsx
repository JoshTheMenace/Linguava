'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or create a new account to get started
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#404040',
                    brandAccent: '#22c55e',
                  },
                },
              },
            }}
            providers={['google', 'github']}
            redirectTo={`${window.location.origin}/auth/callback`}
            onlyThirdPartyProviders={false}
            magicLink={true}
            showLinks={true}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email address',
                  password_label: 'Password',
                  button_label: 'Sign in',
                  loading_button_label: 'Signing in...',
                  social_provider_text: 'Sign in with {{provider}}',
                  link_text: 'Already have an account? Sign in',
                  email_input_placeholder: 'Your email address',
                  password_input_placeholder: 'Your password',
                },
                sign_up: {
                  email_label: 'Email address',
                  password_label: 'Password',
                  button_label: 'Sign up',
                  loading_button_label: 'Signing up...',
                  social_provider_text: 'Sign up with {{provider}}',
                  link_text: "Don't have an account? Sign up",
                  email_input_placeholder: 'Your email address',
                  password_input_placeholder: 'Your password',
                },
                magic_link: {
                  email_input_label: 'Email address',
                  email_input_placeholder: 'Your email address',
                  button_label: 'Send magic link',
                  loading_button_label: 'Sending magic link...',
                  link_text: 'Send a magic link email',
                  confirmation_text: 'Check your email for the login link',
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
} 