import { supabase } from './supabase.js'

/**
 * Auto-add user to USERS table when they login
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

    // Check if user already exists in USERS table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    console.log('🔍 Check result:', { existingUser, checkError })

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError)
      return
    }

    // ⭐ Determine user role
    const userRole = isAdminEmail(user.email) ? 'Admin' : 'User'
    console.log(`👤 Role assigned: ${userRole}`)

    if (existingUser) {
      console.log('✅ User exists, updating last_login and role')

      const { error: updateError } = await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          status: 'active',
          role: userRole, // ⭐ Update role in case it changed
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
      full_name:
        user.user_metadata?.full_name ||
        user.email
          .split('@')[0]
          .replace(/\./g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
      department: user.user_metadata?.department || 'N/A',
      role: userRole, // ⭐ Assign Admin or User role
      status: 'active',
      last_login: new Date().toISOString(),
    }

    console.log('📝 User to insert:', newUser)

    const { data, error } = await supabase.from('users').insert([newUser]).select()

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
