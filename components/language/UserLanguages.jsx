'use client'

import { useState, useTransition } from 'react'
import { updateLanguagePreferences, removeLanguage } from '@/lib/actions/languages'

export default function UserLanguages({ userLanguages = [], onLanguageUpdated }) {
  const [editingLanguage, setEditingLanguage] = useState(null)
  const [isPending, startTransition] = useTransition()

  const handleUpdateLanguage = async (formData) => {
    startTransition(async () => {
      const result = await updateLanguagePreferences(formData)
      if (result.success) {
        setEditingLanguage(null)
        if (onLanguageUpdated) {
          onLanguageUpdated(result.userLanguage)
        }
      } else {
        alert(result.error || 'Failed to update language preferences')
      }
    })
  }

  const handleRemoveLanguage = async (userLanguageId) => {
    if (!confirm('Are you sure you want to remove this language from your learning list?')) {
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append('userLanguageId', userLanguageId)
      
      const result = await removeLanguage(formData)
      if (result.success) {
        if (onLanguageUpdated) {
          onLanguageUpdated()
        }
      } else {
        alert(result.error || 'Failed to remove language')
      }
    })
  }

  const getProficiencyColor = (level) => {
    switch (level) {
      case 'A1': return 'bg-red-50 text-red-700 border-red-200'
      case 'A2': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'B1': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'B2': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'C1': return 'bg-green-50 text-green-700 border-green-200'
      case 'C2': return 'bg-purple-50 text-purple-700 border-purple-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getDifficultyStars = (level) => {
    const stars = '★'.repeat(level) + '☆'.repeat(5 - level)
    return stars
  }

  if (userLanguages.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📚</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No languages selected yet</h3>
        <p className="text-gray-500">Choose a language to start your learning journey</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Your Language Journey
        </h2>
        <p className="text-lg text-gray-600">
          Track your progress and continue learning
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userLanguages.filter(userLang => userLang && userLang.languages).map((userLang) => {
          const language = userLang.languages
          const isEditing = editingLanguage === userLang.id

          // Skip if language data is missing
          if (!language) {
            console.warn('Language data missing for user language:', userLang.id)
            return null
          }

          return (
            <div key={userLang.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              {/* Language Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">{language.flag_emoji || '🏳️'}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {language.name || 'Unknown Language'}
                        {userLang.is_primary && (
                          <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                            Primary
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">{language.native_name || language.name || 'Unknown'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingLanguage(isEditing ? null : userLang.id)}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      {isEditing ? '✕' : '⚙️'}
                    </button>
                  </div>
                </div>

                                 {/* Language Metadata */}
                 <div className="flex items-center justify-between text-sm">
                   <span className="text-gray-500">
                     {getDifficultyStars(language.difficulty_level || 3)} {language.family || 'Unknown'}
                   </span>
                   <span className={`px-2 py-1 rounded-full border text-xs font-medium ${getProficiencyColor(userLang.proficiency_level || 'A1')}`}>
                     {userLang.proficiency_level || 'A1'}
                   </span>
                 </div>
              </div>

              {/* Edit Form */}
              {isEditing ? (
                <div className="p-6">
                  <form action={handleUpdateLanguage}>
                    <input type="hidden" name="userLanguageId" value={userLang.id} />
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Level
                        </label>
                        <select 
                          name="proficiencyLevel" 
                          defaultValue={userLang.proficiency_level}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
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
                          defaultValue={userLang.target_proficiency}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        >
                          <option value="A2">A2 - Elementary</option>
                          <option value="B1">B1 - Intermediate</option>
                          <option value="B2">B2 - Upper Intermediate</option>
                          <option value="C1">C1 - Advanced</option>
                          <option value="C2">C2 - Proficient</option>
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            name="isPrimary" 
                            value="true"
                            defaultChecked={userLang.is_primary}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">Set as primary language</span>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Learning Reason
                        </label>
                        <textarea 
                          name="learningReason"
                          defaultValue={userLang.learning_reason || ''}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          placeholder="Why are you learning this language?"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
                      >
                        {isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveLanguage(userLang.id)}
                        disabled={isPending}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Progress Display */
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Progress Stats */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-lg font-semibold text-gray-900">
                          {userLang.current_streak_days}
                        </div>
                        <div className="text-xs text-gray-500">Day Streak</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-lg font-semibold text-gray-900">
                          {Math.floor((userLang.total_study_time_minutes || 0) / 60)}h
                        </div>
                        <div className="text-xs text-gray-500">Total Time</div>
                      </div>
                    </div>

                    {/* Learning Progress */}
                    <div>
                                             <div className="flex justify-between text-sm mb-2">
                         <span className="text-gray-600">Progress to {userLang.target_proficiency || 'B2'}</span>
                         <span className="text-gray-900 font-medium">
                           {userLang.proficiency_level || 'A1'} → {userLang.target_proficiency || 'B2'}
                         </span>
                       </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${((userLang.confidence_score || 0) / 100) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {userLang.confidence_score || 0}% confidence
                      </div>
                    </div>

                    {/* Learning Reason */}
                    {userLang.learning_reason && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-blue-900 mb-1">Learning Goal</div>
                        <div className="text-sm text-blue-800">{userLang.learning_reason}</div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2">
                      <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                        Continue Learning
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
} 