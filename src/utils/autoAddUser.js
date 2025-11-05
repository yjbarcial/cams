import { supabase } from './supabase.js'

/**
 * Auto-add user to USERS table when they login
 */
export async function addUserToProfiles(user) {
  try {
    if (!user || !user.email) {
      console.warn('❌ No user data provided')
      return
    }

    console.log('🔄 Checking if user exists:', user.email)

    // Check if user already exists in USERS table
    const { data: existingUser, error: checkError } = await supabase
      .from('users') // ⭐ Changed from 'profiles' to 'users'
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    console.log('🔍 Check result:', { existingUser, checkError })

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError)
      return
    }

    if (existingUser) {
      console.log('✅ User exists, updating last_login')

      const { error: updateError } = await supabase
        .from('users') // ⭐ Changed from 'profiles' to 'users'
        .update({
          last_login: new Date().toISOString(), // ⭐ Changed from 'last_sign_in_at' to 'last_login'
          status: 'active', // ⭐ Set status to active
        })
        .eq('email', user.email)

      if (updateError) {
        console.error('❌ Error updating:', updateError)
      } else {
        console.log('✅ Updated successfully')
      }
      return
    }

    console.log('🆕 Creating new user...')

    const newUser = {
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email.split('@')[0].replace(/\./g, ' '),
      department: user.user_metadata?.department || 'N/A',
      role: user.user_metadata?.role || 'User',
      status: 'active', // ⭐ New field
      last_login: new Date().toISOString(), // ⭐ Changed from 'last_sign_in_at'
    }

    console.log('📝 User to insert:', newUser)

    const { data, error } = await supabase
      .from('users') // ⭐ Changed from 'profiles' to 'users'
      .insert([newUser])
      .select()

    console.log('📤 Insert result:', { data, error })

    if (error) {
      console.error('❌ Insert error:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      return
    }

    console.log('✅ User added successfully:', data[0])
  } catch (err) {
    console.error('❌ Catch error:', err)
  }
}
