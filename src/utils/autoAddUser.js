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
  const role = normalizeText(userRole)
  const label = String(designationLabel || '').toLowerCase()

  if (role === 'admin') {
    return 'admin'
  }

  if (role === 'section_head' || label.includes('section head')) {
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

  if (role === 'editor') {
    return 'editor'
  }
  if (role === 'member') {
    return 'member'
  }

  return 'member'
}

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()

export function getProfileAccessState(profile) {
  const status = normalizeText(profile?.status || 'pending')
  const role = normalizeText(profile?.role)
  const designation = normalizeText(profile?.designation_label)
  const position = normalizeText(profile?.positions_label)

  if (!profile) {
    return {
      allowed: false,
      reason: 'missing_profile',
      message:
        'Your account is waiting for administrator approval and role assignment. Please check back after an admin approves your access.',
    }
  }

  if (status === 'pending') {
    return {
      allowed: false,
      reason: 'pending',
      message:
        'Your account is pending approval. Please check back after a system administrator approves your access.',
    }
  }

  if (status === 'suspended') {
    return {
      allowed: false,
      reason: 'suspended',
      message: 'Your account has been suspended. Please contact the organization administrator.',
    }
  }

  if (status !== 'active') {
    return {
      allowed: false,
      reason: 'not_active',
      message:
        'Your account is not active yet. Please wait for administrator approval and role assignment.',
    }
  }

  if (!role) {
    return {
      allowed: false,
      reason: 'missing_role',
      message:
        'Your account has been approved, but no role has been assigned yet. Please contact a system administrator.',
    }
  }

  if (role === 'admin') {
    return { allowed: true, reason: 'approved' }
  }

  if (role === 'member' && !designation && !position) {
    return {
      allowed: false,
      reason: 'missing_assignment',
      message:
        'Your account has been approved, but your role assignment is incomplete. Please contact a system administrator.',
    }
  }

  if ((role === 'editor' || role === 'section_head') && !designation) {
    return {
      allowed: false,
      reason: 'missing_designation',
      message:
        'Your account has been approved, but your designation has not been assigned yet. Please contact a system administrator.',
    }
  }

  return { allowed: true, reason: 'approved' }
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
      const accessState = getProfileAccessState(existingUser)

      if (!accessState.allowed) {
        return false
      }

      const updateData = {
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
        const resolvedRole = normalizeText(existingUser.role)
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
