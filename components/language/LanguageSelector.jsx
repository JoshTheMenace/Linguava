'use client'

import { useState, useEffect, useTransition } from 'react'
import { selectLanguage } from '@/lib/actions/languages'

export default function LanguageSelector({ languages = [], onLanguageSelected }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [filteredLanguages, setFilteredLanguages] = useState(languages)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isPending, startTransition] = useTransition()

  // Filter languages based on search and category
  useEffect(() => {
    let filtered = languages

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(lang => 
        lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.native_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      switch (selectedCategory) {
        case 'featured':
          filtered = filtered.filter(lang => lang.is_featured)
          break
        case 'easy':
          filtered = filtered.filter(lang => lang.difficulty_level <= 2)
          break
        case 'european':
          filtered = filtered.filter(lang => lang.family === 'Indo-European' && 
            ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'no', 'da', 'pl', 'cs', 'hu', 'ro', 'el'].includes(lang.code))
          break
        case 'asian':
          filtered = filtered.filter(lang => 
            ['ja', 'ko', 'zh', 'hi', 'th', 'vi', 'id'].includes(lang.code) ||
            lang.family === 'Sino-Tibetan' || 
            lang.family === 'Japonic' || 
            lang.family === 'Koreanic'
          )
          break
      }
    }

    setFilteredLanguages(filtered)
  }, [searchTerm, selectedCategory, languages])

  const getDifficultyColor = (level) => {
    switch (level) {
      case 1: return 'bg-green-100 text-green-800 border-green-200'
      case 2: return 'bg-blue-100 text-blue-800 border-blue-200'
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 4: return 'bg-orange-100 text-orange-800 border-orange-200'
      case 5: return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDifficultyText = (level) => {
    switch (level) {
      case 1: return 'Very Easy'
      case 2: return 'Easy'
      case 3: return 'Medium'
      case 4: return 'Hard'
      case 5: return 'Very Hard'
      default: return 'Unknown'
    }
  }

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language)
    setShowForm(true)
  }

  const handleFormSubmit = async (formData) => {
    startTransition(async () => {
      const result = await selectLanguage(formData)
      if (result.success) {
        setShowForm(false)
        setSelectedLanguage(null)
        if (onLanguageSelected) {
          onLanguageSelected(result.userLanguage)
        }
      } else {
        alert(result.error || 'Failed to select language')
      }
    })
  }

  const categories = [
    { id: 'all', name: 'All Languages', icon: '🌍' },
    { id: 'featured', name: 'Popular', icon: '⭐' },
    { id: 'easy', name: 'Easy to Learn', icon: '🟢' },
    { id: 'european', name: 'European', icon: '🇪🇺' },
    { id: 'asian', name: 'Asian', icon: '🌏' },
  ]

  if (showForm && selectedLanguage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              Start Learning {selectedLanguage.flag_emoji} {selectedLanguage.name}
            </h3>
            <button 
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form action={handleFormSubmit}>
            <input type="hidden" name="languageId" value={selectedLanguage.id} />
            <input type="hidden" name="isPrimary" value="true" />
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Level
                </label>
                <select 
                  name="proficiencyLevel" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  defaultValue="A1"
                >
                  <option value="A1">A1 - Beginner</option>
                  <option value="A2">A2 - Elementary</option>
                  <option value="B1">B1 - Intermediate</option>
                  <option value="B2">B2 - Upper Intermediate</option>
                  <option value="C1">C1 - Advanced</option>
                  <option value="C2">C2 - Proficient</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Level
                </label>
                <select 
                  name="targetProficiency" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  defaultValue="B2"
                >
                  <option value="A2">A2 - Elementary</option>
                  <option value="B1">B1 - Intermediate</option>
                  <option value="B2">B2 - Upper Intermediate</option>
                  <option value="C1">C1 - Advanced</option>
                  <option value="C2">C2 - Proficient</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why are you learning {selectedLanguage.name}? (Optional)
                </label>
                <textarea 
                  name="learningReason"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., For travel, work, family, or personal interest..."
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Adding...' : 'Start Learning'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Language
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select a language to start your learning journey. We'll track your progress and customize your experience.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md mx-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search languages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Languages Section */}
      {selectedCategory === 'all' && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            ⭐ Most Popular Languages
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {languages.filter(lang => lang.is_featured).slice(0, 8).map((language) => (
              <LanguageCard 
                key={language.id} 
                language={language} 
                onSelect={handleLanguageSelect}
                getDifficultyColor={getDifficultyColor}
                getDifficultyText={getDifficultyText}
                featured={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Languages Grid */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center justify-between">
          <span>
            {selectedCategory === 'all' ? '🌍 All Languages' : 
             categories.find(c => c.id === selectedCategory)?.icon + ' ' + 
             categories.find(c => c.id === selectedCategory)?.name}
          </span>
          <span className="text-sm text-gray-500 font-normal">
            {filteredLanguages.length} languages
          </span>
        </h3>
        
        {filteredLanguages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No languages found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredLanguages.map((language) => (
              <LanguageCard 
                key={language.id} 
                language={language} 
                onSelect={handleLanguageSelect}
                getDifficultyColor={getDifficultyColor}
                getDifficultyText={getDifficultyText}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Language Card Component
function LanguageCard({ language, onSelect, getDifficultyColor, getDifficultyText, featured = false }) {
  return (
    <button
      onClick={() => onSelect(language)}
      className={`group relative bg-white border rounded-xl p-4 hover:shadow-lg transition-all duration-200 text-left w-full ${
        featured ? 'border-indigo-200 hover:border-indigo-300' : 'border-gray-200 hover:border-gray-300'
      } hover:scale-105`}
    >
      {featured && (
        <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
          Popular
        </div>
      )}
      
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">{language.flag_emoji}</div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColor(language.difficulty_level)}`}>
          {getDifficultyText(language.difficulty_level)}
        </div>
      </div>
      
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
          {language.name}
        </h3>
        <p className="text-sm text-gray-500">{language.native_name}</p>
        <p className="text-xs text-gray-400">{language.family}</p>
      </div>
      
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>{language.speakers_count?.toLocaleString()} speakers</span>
        <span className="text-indigo-600 group-hover:text-indigo-700 font-medium">
          Select →
        </span>
      </div>
    </button>
  )
} 