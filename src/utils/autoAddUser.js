import { supabase } from './supabase.js'

/**
 * Auto-add user to profiles table when they login
 * Call this after successful login
 */
export async function addUserToProfiles(user) {
  try {
    if (!user || !user.email) {
      console.warn('No user data provided')
      return
    }

    console.log('🔄 Checking if user exists:', user.email)

    // Check if user already exists in profiles
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', user.email)
      .single()

    if (existingProfile) {
      console.log('✅ User exists, updating last_sign_in_at')
      // User already exists, update last_sign_in_at
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ last_sign_in_at: new Date().toISOString() })
        .eq('email', user.email)

      if (updateError) {
        console.error('❌ Error updating last sign in:', updateError)
      } else {
        console.log('✅ Last sign in updated successfully')
      }
      return
    }

    console.log('🆕 User does not exist, creating new profile...')

    // User doesn't exist, add them
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          department: user.user_metadata?.department || 'N/A',
          role: user.user_metadata?.role || 'User',
          last_sign_in_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      console.error('❌ Error adding user to profiles:', error)
      return
    }

    console.log('✅ User added to profiles:', data[0])
  } catch (err) {
    console.error('❌ Error in addUserToProfiles:', err)
  }
}
