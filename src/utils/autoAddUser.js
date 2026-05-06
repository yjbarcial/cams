import { supabase } from './supabase.js'

export async function isUserRegistered(email) {
  try {
    if (!email) return false

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking user registration:', error)
      return false
    }

    return !!data
  } catch (err) {
    console.error('Error in isUserRegistered:', err)
    return false
  }
}

export async function getUserProfileByEmail(email) {
  try {
    if (!email) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading user profile:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Error in getUserProfileByEmail:', err)
    return null
  }
}

function getAccessRole(userRole, designationLabel) {
  const label = String(designationLabel || '').toLowerCase()

  if (userRole === 'admin') {
    return 'admin'
  }

  if (userRole === 'section_head' || label.includes('section head')) {
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

  if (userRole === 'editor') {
    return 'editor'
  }
  if (userRole === 'member') {
    return 'member'
  }

  return 'member'
}

export async function setProfileStatusByEmail(email, status = 'inactive') {
  try {
    if (!email) return

    const allowedStatuses = ['active', 'inactive', 'pending', 'suspended']
    const requestedStatus = String(status || '').toLowerCase()
    const normalizedStatus = allowedStatuses.includes(requestedStatus) ? requestedStatus : 'inactive'

    const updateData = {
      status: normalizedStatus,
    }

    if (normalizedStatus === 'active') {
      updateData.last_active = new Date().toISOString()
    }

    const { error } = await supabase.from('profiles').update(updateData).eq('email', email)

    if (error) {
      console.warn('Could not update profile status:', error.message)
    }
  } catch (err) {
    console.warn('setProfileStatusByEmail failed:', err)
  }
}

export async function addUserToProfiles(user, profileData = {}) {
  try {
    if (!user || !user.email) {
      console.warn('No user data provided')
      return false
    }

    const userMetadata = user.user_metadata || {}
    const requestedDesignation =
      profileData.designation_label || userMetadata.designation_label || null
    const requestedPosition = profileData.positions_label || userMetadata.positions_label || null

    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError)
      return false
    }

    if (existingUser) {
      const currentStatus = existingUser.status || 'pending'

      if (currentStatus === 'pending' || currentStatus === 'suspended') {
        return false
      }

      const updateData = {
        status: 'active',
        last_active: new Date().toISOString(),
      }

      if (!existingUser.designation_label && requestedDesignation) {
        updateData.designation_label = requestedDesignation
      }
      if (!existingUser.positions_label && requestedPosition) {
        updateData.positions_label = requestedPosition
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('email', user.email)

      if (updateError) {
        console.error('Error updating:', updateError)
        return false
      } else {
        const resolvedRole = existingUser.role || 'member'
        localStorage.setItem('userRole', resolvedRole)
        localStorage.setItem('userId', existingUser.id)

        const accessRole = getAccessRole(resolvedRole, existingUser.designation_label)
        localStorage.setItem('accessRole', accessRole)
        return true
      }
    }

    return false
  } catch (err) {
    console.error('Catch error:', err)
    return false
  }
}

export async function createUserProfile(user, profileData = {}) {
  try {
    if (!user || !user.email) {
      console.warn('No user data provided')
      return false
    }

    const userMetadata = user.user_metadata || {}
    const requestedDesignation =
      profileData.designation_label || userMetadata.designation_label || null
    const requestedPosition = profileData.positions_label || userMetadata.positions_label || null

    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError)
      throw new Error('Failed to check existing user')
    }

    if (existingUser) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'member',
          status: 'pending',
          designation_label: requestedDesignation,
          positions_label: requestedPosition,
        })
        .eq('email', user.email)

      if (updateError) {
        console.warn('Could not reset existing profile to pending:', updateError.message)
      }

      return true
    }

    const newUser = {
      email: user.email,
      role: 'member',
      status: 'pending',
      designation_label: requestedDesignation,
      positions_label: requestedPosition,
    }

    const { data, error } = await supabase.from('profiles').insert([newUser]).select()

    if (error) {
      console.error('Insert error:', error)
      throw error
    }

    void data
    return true
  } catch (err) {
    console.error('Error in createUserProfile:', err)
    throw err
  }
}
