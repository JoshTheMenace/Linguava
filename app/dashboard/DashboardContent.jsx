'use client'

import { useState, useEffect } from 'react'
import LanguageSelector from '@/components/language/LanguageSelector'
import UserLanguages from '@/components/language/UserLanguages'

export default function DashboardContent({ user, availableLanguages, initialUserLanguages }) {
  const [userLanguages, setUserLanguages] = useState(initialUserLanguages)
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check if user has any languages (with valid language data)
  const hasLanguages = userLanguages && userLanguages.filter(ul => ul && ul.languages).length > 0

  const handleLanguageSelected = (newUserLanguage) => {
    // Add the new language to the list
    setUserLanguages(prev => [...prev, newUserLanguage])
    setShowLanguageSelector(false)
  }

  const handleLanguageUpdated = () => {
    // Refresh the page to get updated data
    window.location.reload()
  }

  const handleAddAnotherLanguage = () => {
    setShowLanguageSelector(true)
  }

  if (showLanguageSelector) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setShowLanguageSelector(false)}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
          <LanguageSelector 
            languages={availableLanguages}
            onLanguageSelected={handleLanguageSelected}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      {hasLanguages ? (
        <>
          {/* User Languages Display */}
          <UserLanguages 
            userLanguages={userLanguages}
            onLanguageUpdated={handleLanguageUpdated}
          />
          
          {/* Add Another Language Button */}
          <div className="mt-8 text-center">
            <button
              onClick={handleAddAnotherLanguage}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              + Add Another Language
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Welcome Message for New Users */}
          <div className="text-center mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto">
              <div className="text-4xl mb-4">🎯</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to LinguaVa!
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Start your language learning journey by selecting your first language. 
                We'll track your progress and help you achieve your goals.
              </p>
              
              {/* User Quick Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <span>📧 {user.email}</span>
                  <span>•</span>
                  <span>🔒 Account Secured</span>
                  <span>•</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    user.email_confirmed_at 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.email_confirmed_at ? '✓ Verified' : 'Email Pending'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleAddAnotherLanguage}
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                🚀 Choose Your First Language
              </button>
            </div>
          </div>

          {/* Quick Stats/Features Preview */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Progress Tracking</h3>
              <p className="text-sm text-gray-600">
                Monitor your learning streaks, study time, and proficiency levels
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalized Goals</h3>
              <p className="text-sm text-gray-600">
                Set target proficiency levels and track your journey to fluency
              </p>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">🌍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">50+ Languages</h3>
              <p className="text-sm text-gray-600">
                Choose from a comprehensive collection of world languages
              </p>
            </div>
          </div>

          {/* Popular Languages Preview */}
          <div className="mt-12 max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              Popular Language Choices
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(availableLanguages || [])
                .filter(lang => lang && lang.is_featured)
                .slice(0, 8)
                .map((language) => (
                <div key={language.id} className="bg-white rounded-lg border border-gray-200 p-4 text-center hover:border-indigo-300 transition-colors">
                  <div className="text-2xl mb-2">{language.flag_emoji || '🏳️'}</div>
                  <div className="text-sm font-medium text-gray-900">{language.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{language.native_name || language.name || 'Unknown'}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
} 