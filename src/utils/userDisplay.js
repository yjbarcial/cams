// Utility functions for displaying user information

// Admin email list
export const ADMIN_EMAILS = [
  'yssahjulianah.barcial@carsu.edu.ph',
  'lovellhudson.clavel@carsu.edu.ph',
  'altheaguila.gorres@carsu.edu.ph',
]

/**
 * Check if an email is an admin email
 * @param {string} email - The email to check
 * @returns {boolean}
 */
export function isAdmin(email) {
  return email && ADMIN_EMAILS.includes(email.toLowerCase().trim())
}

/**
 * Get role-based display suffix
 * @param {object} profile - Profile object with role information
 * @returns {string}
 */
export function getRoleSuffix(profile) {
  if (!profile) return ''

  const role = profile.role?.toLowerCase() || profile.designation_label?.toLowerCase() || ''

  if (
    role.includes('editor-in-chief') ||
    role.includes('editor in chief') ||
    role.includes('eic')
  ) {
    return ' (Editor-in-Chief)'
  }
  if (role.includes('chief adviser') || role.includes('chief advisor')) {
    return ' (Chief Adviser)'
  }
  if (role.includes('creative director')) {
    return ' (Creative Director)'
  }
  if (role.includes('technical editor')) {
    return ' (Technical Editor)'
  }
  if (role.includes('section head') || role.includes('section_head')) {
    return ' (Section Head)'
  }
  if (role.includes('archival manager') || role.includes('archivist')) {
    return ' (Archival Manager)'
  }
  if (role.includes('managing editor')) {
    return ' (Managing Editor)'
  }

  return ''
}

/**
 * Get display name for user - shows "Admin" for admin emails or name with role
 * @param {string} emailOrName - Email address or name
 * @param {object} profile - Optional profile object with full_name, role, designation_label
 * @param {boolean} showRole - Whether to append role suffix
 * @returns {string}
 */
export function getDisplayName(emailOrName, profile = null, showRole = false) {
  if (!emailOrName) return 'Unknown'

  // If it's an admin email, return "Admin"
  if (isAdmin(emailOrName)) {
    return 'Admin'
  }

  let displayName = ''

  // If we have a profile with a name, use that
  if (profile?.full_name) {
    displayName = profile.full_name
  } else if (emailOrName.includes('@')) {
    // If it looks like an email, extract the name part
    const namePart = emailOrName.split('@')[0]
    // Convert dot notation to readable name (e.g., "john.doe" -> "John Doe")
    displayName = namePart
      .split('.')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  } else {
    displayName = emailOrName
  }

  // Append role suffix if requested
  if (showRole && profile) {
    displayName += getRoleSuffix(profile)
  }

  return displayName
}

/**
 * Get short display name (first name only or "Admin")
 * @param {string} emailOrName - Email address or name
 * @returns {string}
 */
export function getShortDisplayName(emailOrName) {
  if (!emailOrName) return 'Unknown'

  if (isAdmin(emailOrName)) {
    return 'Admin'
  }

  if (emailOrName.includes('@')) {
    const namePart = emailOrName.split('@')[0]
    const firstName = namePart.split('.')[0]
    return firstName.charAt(0).toUpperCase() + firstName.slice(1)
  }

  return emailOrName.split(' ')[0]
}
