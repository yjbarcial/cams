import { supabase } from './supabase.js'

/**
 * Auto-add user to PROFILES table when they login
 * Uses database role/designation values as source of truth.
 *
 * Access is controlled by the database role field and admin-managed updates.
 */

/**
 * Map designation_label to accessRole for router guards.
 */
function getAccessRole(userRole, designationLabel) {
  const label = String(designationLabel || '').toLowerCase()

  // Admins can access everything
  if (userRole === 'admin') {
    return 'admin'
  }

  // Section heads
  if (userRole === 'section_head') {
    return 'section_head'
  }

  if (label.includes('technical editor')) {
    return 'technical_editor'
  }
  if (label.includes('creative director')) {
    return 'creative_director'
  }
  if (label.includes('editor-in-chief') || label.includes('editor in chief') || label === 'eic') {
    return 'editor_in_chief'
  }
  if (label.includes('chief adviser')) {
    return 'chief_adviser'
  }
  if (label.includes('archival manager') || label.includes('archive manager')) {
    return 'archival_manager'
  }
  if (label.includes('online accounts manager')) {
    return 'online_accounts_manager'
  }

  // Default accessRole based on userRole
  if (userRole === 'editor') {
    return 'editor' // Generic editor access
  }
  if (userRole === 'member') {
    return 'member'
  }

  return 'member' // Default
}

export async function setProfileStatusByEmail(email, status = 'inactive') {
  try {
    if (!email) return

    const normalizedStatus = String(status || '').toLowerCase() === 'active' ? 'active' : 'inactive'

    const updateData = {
      status: normalizedStatus,
    }

    if (normalizedStatus === 'active') {
      updateData.last_active = new Date().toISOString()
    }

    const { error } = await supabase.from('profiles').update(updateData).eq('email', email)

    if (error) {
      console.warn('⚠️ Could not update profile status:', error.message)
    }
  } catch (err) {
    console.warn('⚠️ setProfileStatusByEmail failed:', err)
  }
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

    if (existingUser) {
      console.log('✅ User exists, marking active and updating last_active')

      const updateData = {
        status: 'active',
        last_active: new Date().toISOString(),
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('email', user.email)

      if (updateError) {
        console.error('❌ Error updating:', updateError)
      } else {
        const resolvedRole = existingUser.role || 'member'
        console.log(`✅ Updated successfully with role: ${resolvedRole}`)
        localStorage.setItem('userRole', resolvedRole)
        localStorage.setItem('userId', existingUser.id)

        const accessRole = getAccessRole(resolvedRole, existingUser.designation_label)
        localStorage.setItem('accessRole', accessRole)
        console.log(
          `🔑 Access role: ${accessRole} (designation: ${existingUser.designation_label || 'none'})`,
        )
      }
      return
    }

    console.log('🆕 Creating new user...')

    const newUser = {
      email: user.email,
      role: 'member',
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

    console.log(`✅ User added successfully with role: ${newUser.role}`, data[0])
    // Store role, accessRole, and userId in localStorage
    localStorage.setItem('userRole', newUser.role)
    if (data && data[0]) {
      if (data[0].id) {
        localStorage.setItem('userId', data[0].id)
      }
      const accessRole = getAccessRole(newUser.role, data[0].designation_label)
      localStorage.setItem('accessRole', accessRole)
      console.log(
        `🔑 Access role: ${accessRole} (designation: ${data[0].designation_label || 'none'})`,
      )
    }
  } catch (err) {
    console.error('❌ Catch error:', err)
  }
}
