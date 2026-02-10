/**
 * Format status codes to human-readable display names
 * Removes underscores and capitalizes properly
 */

/**
 * Convert status code to human-readable display name
 * @param {string} status - Status code (e.g., 'to_technical_editor')
 * @returns {string} Human-readable status name (e.g., 'To Technical Editor')
 */
export const formatStatus = (status) => {
  if (!status) return ''

  const statusMap = {
    draft: 'Draft',
    to_section_head: 'To Section Head',
    to_technical_editor: 'To Technical Editor',
    to_creative_director: 'To Creative Director',
    to_online_accounts_manager: 'To Online Accounts Manager',
    to_editor_in_chief: 'To Editor-in-Chief',
    to_chief_adviser: 'To Chief Adviser',
    to_archival_manager: 'To Archival Manager',
    for_publish: 'For Publication',
    published: 'Published',
    returned_by_section_head: 'Returned by Section Head',
    returned_by_technical_editor: 'Returned by Technical Editor',
    returned_by_creative_director: 'Returned by Creative Director',
    returned_by_editor_in_chief: 'Returned by Editor-in-Chief',
    returned_by_chief_adviser: 'Returned by Chief Adviser',
    approved: 'Approved',
    rejected: 'Rejected',
    'Returned by Chief Adviser': 'Returned by Chief Adviser',
    'To Chief Adviser': 'To Chief Adviser',
    'To Archival Manager': 'To Archival Manager',
    'To Online Accounts Manager': 'To Online Accounts Manager',
    'For Publish': 'For Publication',
    'To Section Head': 'To Section Head',
    'To Technical Editor': 'To Technical Editor',
    'To Creative Director': 'To Creative Director',
    'To Editor-in-Chief': 'To Editor-in-Chief',
    Published: 'Published',
    Approved: 'Approved',
    Rejected: 'Rejected',
  }

  // If exact match in map, return formatted version
  if (statusMap[status]) {
    return statusMap[status]
  }

  // Otherwise, format by converting underscores to spaces and capitalizing
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Format designation labels (roles) to proper format
 * @param {string} designation - Designation label (e.g., 'section_head')
 * @returns {string} Formatted designation (e.g., 'Section Head')
 */
export const formatDesignation = (designation) => {
  if (!designation) return ''

  const designationMap = {
    section_head: 'Section Head',
    managing_editor: 'Managing Editor',
    associate_managing_editor: 'Associate Managing Editor',
    technical_editor: 'Technical Editor',
    creative_director: 'Creative Director',
    editor_in_chief: 'Editor-in-Chief',
    chief_adviser: 'Chief Adviser',
    archival_manager: 'Archival Manager',
    circulations_manager: 'Circulations Manager',
    admin: 'Admin',
    member: 'Member',
    'Section Head': 'Section Head',
    'Managing Editor': 'Managing Editor',
    'Associate Managing Editor': 'Associate Managing Editor',
    'Technical Editor': 'Technical Editor',
    'Creative Director': 'Creative Director',
    'Editor-in-Chief': 'Editor-in-Chief',
    'Chief Adviser': 'Chief Adviser',
    'Archival Manager': 'Archival Manager',
    'Circulations Manager': 'Circulations Manager',
    Admin: 'Admin',
    Member: 'Member',
  }

  // If exact match in map, return formatted version
  if (designationMap[designation]) {
    return designationMap[designation]
  }

  // Otherwise, format by converting underscores to spaces and capitalizing
  return designation
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Format project type to proper case
 * @param {string} projectType - Project type (e.g., 'social_media')
 * @returns {string} Formatted project type (e.g., 'Social Media')
 */
export const formatProjectType = (projectType) => {
  if (!projectType) return 'Magazine'

  const typeMap = {
    magazine: 'Magazine',
    newsletter: 'Newsletter',
    folio: 'Folio',
    'social-media': 'Social Media',
    social_media: 'Social Media',
    other: 'Other',
    Magazine: 'Magazine',
    Newsletter: 'Newsletter',
    Folio: 'Folio',
    'Social Media': 'Social Media',
    Other: 'Other',
  }

  // If exact match in map, return formatted version
  if (typeMap[projectType]) {
    return typeMap[projectType]
  }

  // Otherwise, format by converting underscores/hyphens to spaces and capitalizing
  return projectType
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
