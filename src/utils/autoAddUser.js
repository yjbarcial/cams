import { supabase } from './supabase.js'

/**
 * Auto-add user to PROFILES table when they login
 * Automatically assigns Admin role to authorized CARSU emails
 */

// ⭐ Admin emails - automatically get Admin role
const ADMIN_EMAILS = [
  'lovellhudson.clavel@carsu.edu.ph',
  'yssahjulianah.barcial@carsu.edu.ph',
  'altheaguila.gorres@carsu.edu.ph',
]

/**
 * Check if email is an admin
 */
function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

export async function addUserToProfiles(user) {
  try {
    if (!user || !user.email) {
      console.warn('❌ No user data provided')
      return
    }

    console.log('🔄 Checking if user exists:', user.email)

    // Check if user already exists in PROFILES table
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    console.log('🔍 Check result:', { existingUser, checkError })

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError)
      return
    }

    // ⭐ Determine user role - try 'contributor' as default (check your Supabase user_role enum)
    // Common values: 'admin', 'editor', 'contributor', 'viewer', 'member', 'user'
    const userRole = isAdminEmail(user.email) ? 'admin' : 'contributor'
    console.log(`👤 Role assigned: ${userRole}`)

    if (existingUser) {
      console.log('✅ User exists, updating last_login and role')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          last_active: new Date().toISOString(),
          status: 'active',
          role: userRole, // Column name is 'role'
        })
        .eq('email', user.email)

      if (updateError) {
        console.error('❌ Error updating:', updateError)
      } else {
        console.log(`✅ Updated successfully with role: ${userRole}`)
      }
      return
    }

    console.log('🆕 Creating new user...')

    const newUser = {
      email: user.email,
      role: userRole, // Column name is 'role', not 'user_role'
      status: 'active',
      last_active: new Date().toISOString(),
    }

    console.log('📝 User to insert:', newUser)

    const { data, error } = await supabase.from('profiles').insert([newUser]).select()

    console.log('📤 Insert result:', { data, error })

    if (error) {
      console.error('❌ Insert error:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      return
    }

    console.log(`✅ User added successfully with role: ${userRole}`, data[0])
  } catch (err) {
    console.error('❌ Catch error:', err)
  }
}
