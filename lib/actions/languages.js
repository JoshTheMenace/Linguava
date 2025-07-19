'use server'

import { createServerClient, createServerActionClientCustom } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * Get all available languages for selection
 * Returns active languages sorted by popularity and featured status
 */
export async function getAvailableLanguages() {
  const supabase = await createServerClient()
  
  try {
    const { data: languages, error } = await supabase
      .from('languages')
      .select('*')
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('popularity_rank', { ascending: true })

    if (error) {
      console.error('Error fetching languages:', error)
      throw new Error('Failed to fetch languages')
    }

    return { success: true, languages }
  } catch (error) {
    console.error('Error in getAvailableLanguages:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get user's current language selections
 */
export async function getUserLanguages() {
  const supabase = await createServerClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data: userLanguages, error } = await supabase
      .from('user_languages')
      .select(`
        *,
        languages (
          id,
          code,
          name,
          native_name,
          flag_emoji,
          difficulty_level,
          family,
          script
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching user languages:', error)
      throw new Error('Failed to fetch user languages')
    }

    return { success: true, userLanguages: userLanguages || [] }
  } catch (error) {
    console.error('Error in getUserLanguages:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Add a language to user's learning list
 */
export async function selectLanguage(formData) {
  const supabase = await createServerActionClientCustom()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const languageId = formData.get('languageId')
    const relationshipType = formData.get('relationshipType') || 'learning'
    const proficiencyLevel = formData.get('proficiencyLevel') || 'A1'
    const learningReason = formData.get('learningReason') || ''
    const targetProficiency = formData.get('targetProficiency') || 'B2'
    const isPrimary = formData.get('isPrimary') === 'true'

    if (!languageId) {
      throw new Error('Language ID is required')
    }

    // Check if user already has this language
    const { data: existingLanguage } = await supabase
      .from('user_languages')
      .select('id')
      .eq('user_id', user.id)
      .eq('language_id', languageId)
      .single()

    if (existingLanguage) {
      throw new Error('You have already selected this language')
    }

    // If this is set as primary, unset other primary languages
    if (isPrimary) {
      await supabase
        .from('user_languages')
        .update({ is_primary: false })
        .eq('user_id', user.id)
    }

    // Insert the new user language
    const { data: newUserLanguage, error } = await supabase
      .from('user_languages')
      .insert({
        user_id: user.id,
        language_id: languageId,
        relationship_type: relationshipType,
        proficiency_level: proficiencyLevel,
        learning_reason: learningReason,
        target_proficiency: targetProficiency,
        is_primary: isPrimary,
        is_active: true,
        last_studied_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding language:', error)
      throw new Error('Failed to add language')
    }

    // Update user profile last active date
    await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        last_active_date: new Date().toISOString().split('T')[0]
      })

    revalidatePath('/dashboard')
    return { success: true, userLanguage: newUserLanguage }
  } catch (error) {
    console.error('Error in selectLanguage:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Update user language preferences
 */
export async function updateLanguagePreferences(formData) {
  const supabase = await createServerActionClientCustom()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const userLanguageId = formData.get('userLanguageId')
    const proficiencyLevel = formData.get('proficiencyLevel')
    const targetProficiency = formData.get('targetProficiency')
    const learningReason = formData.get('learningReason')
    const isPrimary = formData.get('isPrimary') === 'true'

    if (!userLanguageId) {
      throw new Error('User language ID is required')
    }

    // If this is set as primary, unset other primary languages
    if (isPrimary) {
      await supabase
        .from('user_languages')
        .update({ is_primary: false })
        .eq('user_id', user.id)
    }

    // Update the user language
    const { data: updatedUserLanguage, error } = await supabase
      .from('user_languages')
      .update({
        proficiency_level: proficiencyLevel,
        target_proficiency: targetProficiency,
        learning_reason: learningReason,
        is_primary: isPrimary,
        updated_at: new Date().toISOString()
      })
      .eq('id', userLanguageId)
      .eq('user_id', user.id) // Security: ensure user owns this record
      .select()
      .single()

    if (error) {
      console.error('Error updating language preferences:', error)
      throw new Error('Failed to update language preferences')
    }

    revalidatePath('/dashboard')
    return { success: true, userLanguage: updatedUserLanguage }
  } catch (error) {
    console.error('Error in updateLanguagePreferences:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Remove a language from user's learning list
 */
export async function removeLanguage(formData) {
  const supabase = await createServerActionClientCustom()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const userLanguageId = formData.get('userLanguageId')

    if (!userLanguageId) {
      throw new Error('User language ID is required')
    }

    // Delete the user language (or mark as inactive)
    const { error } = await supabase
      .from('user_languages')
      .update({ is_active: false })
      .eq('id', userLanguageId)
      .eq('user_id', user.id) // Security: ensure user owns this record

    if (error) {
      console.error('Error removing language:', error)
      throw new Error('Failed to remove language')
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error in removeLanguage:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Check if user has selected any languages
 */
export async function hasUserSelectedLanguages() {
  const supabase = await createServerClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, hasLanguages: false }
    }

    const { data: userLanguages, error } = await supabase
      .from('user_languages')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    if (error) {
      console.error('Error checking user languages:', error)
      return { success: false, hasLanguages: false }
    }

    return { success: true, hasLanguages: userLanguages && userLanguages.length > 0 }
  } catch (error) {
    console.error('Error in hasUserSelectedLanguages:', error)
    return { success: false, hasLanguages: false }
  }
} 