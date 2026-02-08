/**
 * Get approval history from project metadata
 * @param {Object} project - Project object with approval data
 * @returns {Array} Array of approval records sorted by timestamp
 */
export const getApprovalHistory = (project) => {
  if (!project) return []

  const approvals = []

  // Section Head Approval
  if (project.section_head_approved_by) {
    approvals.push({
      stage: 'Section Head',
      approvedBy: project.section_head_approved_by,
      timestamp: project.section_head_approved_date,
      comments: project.section_head_comments,
      type: 'approval',
    })
  }

  // Technical Editor Approval
  if (project.technical_editor_approved_by) {
    approvals.push({
      stage: 'Technical Editor',
      approvedBy: project.technical_editor_approved_by,
      timestamp: project.technical_editor_approved_date,
      comments: project.technical_editor_comments,
      type: 'approval',
    })
  }

  // Creative Director Approval
  if (project.creative_director_approved_by) {
    approvals.push({
      stage: 'Creative Director',
      approvedBy: project.creative_director_approved_by,
      timestamp: project.creative_director_approved_date,
      comments: project.creative_director_comments,
      type: 'approval',
    })
  }

  // Editor-in-Chief Approval
  if (project.eic_approved_by) {
    approvals.push({
      stage: 'Editor-in-Chief',
      approvedBy: project.eic_approved_by,
      timestamp: project.eic_approved_date,
      comments: project.eic_comments,
      type: 'approval',
    })
  }

  // Forward to Chief Adviser
  if (project.forwarded_to_adviser_by) {
    approvals.push({
      stage: 'Forwarded to Chief Adviser',
      approvedBy: project.forwarded_to_adviser_by,
      timestamp: project.forwarded_to_adviser_date,
      comments: project.forward_notes,
      type: 'forward',
    })
  }

  // Chief Adviser Approval
  if (project.adviser_approved_by) {
    approvals.push({
      stage: 'Chief Adviser',
      approvedBy: project.adviser_approved_by,
      timestamp: project.adviser_approved_date,
      comments: project.adviser_comments,
      type: 'approval',
    })
  }

  // Published
  if (project.published_by) {
    approvals.push({
      stage: 'Archival Manager',
      approvedBy: project.published_by,
      timestamp: project.published_date,
      comments: project.publish_notes,
      type: 'publish',
    })
  }

  // Sort by timestamp (oldest first)
  return approvals.sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0
    return new Date(a.timestamp) - new Date(b.timestamp)
  })
}

/**
 * Get user display name from user ID (for future profile lookup)
 * Currently returns the ID, can be enhanced to fetch profile data
 * @param {string} userId - User ID from Supabase auth
 * @returns {string} User display name or ID
 */
export const formatUserId = (userId) => {
  if (!userId) return 'Unknown'
  // In future, could fetch profile data to show actual name
  // For now, return truncated ID for display
  return userId.substring(0, 8)
}

/**
 * Format approval timestamp
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted date and time
 */
export const formatApprovalTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A'
  try {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (error) {
    return timestamp
  }
}
