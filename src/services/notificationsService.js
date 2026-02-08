// Notifications Service
// Storage key: 'notifications'
import { isPushNotificationsEnabled, isEmailNotificationsEnabled } from './settingsService.js'

/**
 * Get all notifications for the current user
 * @returns {Array} Array of notification objects for current user
 */
export const getNotifications = async () => {
  try {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]')
    const currentUserEmail = localStorage.getItem('userEmail')

    if (!currentUserEmail) {
      return []
    }

    // System Admins - can see ALL notifications
    const ADMIN_EMAILS = [
      'yssahjulianah.barcial@carsu.edu.ph',
      'lovellhudson.clavel@carsu.edu.ph',
      'altheaguila.gorres@carsu.edu.ph',
    ]

    // Check if current user is a system admin by email or role
    const currentUserRole = localStorage.getItem('userRole')
    const isAdminByEmail = ADMIN_EMAILS.some(
      (email) => email.toLowerCase() === currentUserEmail.toLowerCase(),
    )
    const isAdminByRole = currentUserRole === 'admin'
    const isAdmin = isAdminByEmail || isAdminByRole

    console.log('👤 Current user:', {
      email: currentUserEmail,
      role: currentUserRole,
      isAdminByEmail,
      isAdminByRole,
      isAdmin,
    })

    // If admin, return ALL notifications without filtering
    if (isAdmin) {
      console.log('👑 Admin access: Showing all', notifications.length, 'notifications')
      return notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    }

    // Get current user's ID from their profile
    const { profilesService } = await import('./supabaseService.js')
    let currentUserId = null
    try {
      const currentProfile = await profilesService.getByEmail(currentUserEmail)
      currentUserId = currentProfile?.id
      console.log('🔑 Current user details:', {
        email: currentUserEmail,
        userId: currentUserId,
      })
    } catch (error) {
      console.error('Error fetching current user profile:', error)
    }

    // Role mapping for notification recipients
    const roleMapping = {
      'Section Head': 'section_head',
      'Technical Editor': 'editor',
      'Editor-in-Chief': 'editor',
      'Chief Adviser': 'admin',
    }

    console.log('🔍 Filtering notifications for non-admin user, role:', currentUserRole)

    // Filter notifications for current user
    const userNotifications = notifications.filter((n) => {
      // 1. User ID-based notifications (most reliable)
      if (n.recipientUserId && currentUserId) {
        const matches = n.recipientUserId === currentUserId
        console.log('🔍 User ID notification filter:', {
          notificationId: n.id,
          recipientUserId: n.recipientUserId,
          currentUserId,
          matches,
        })
        if (matches) return true
      }

      // 2. Email-based notifications (fallback)
      if (n.recipientEmail) {
        // Case-insensitive email comparison
        const matches = n.recipientEmail.toLowerCase() === currentUserEmail.toLowerCase()
        console.log('🔍 Email notification filter:', {
          notificationId: n.id,
          recipientEmail: n.recipientEmail,
          currentUserEmail,
          matches,
        })
        if (matches) return true
      }

      // 3. Role-based notifications (e.g., "Section Head", "Technical Editor")
      if (n.recipient && roleMapping[n.recipient] && currentUserRole) {
        return currentUserRole === roleMapping[n.recipient]
      }

      // 4. Legacy notifications without specific recipient - show to all
      return !n.recipient
    })

    // Sort by timestamp (newest first)
    return userNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  } catch (error) {
    console.error('Error getting notifications:', error)
    return []
  }
}

/**
 * Get unread notifications count
 * @returns {number} Count of unread notifications
 */
export const getUnreadCount = async () => {
  const notifications = await getNotifications()
  return notifications.filter((n) => !n.isRead).length
}

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.type - Type of notification (Request, Comment, Approved, etc.)
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.description - Notification description
 * @param {string} notificationData.projectId - Related project ID (optional)
 * @param {string} notificationData.projectType - Related project type (optional)
 * @param {Array} notificationData.actions - Array of action objects (optional)
 * @param {string} notificationData.recipient - Recipient name (optional)
 * @param {string} notificationData.recipientEmail - Recipient email (for filtering)
 * @param {number} notificationData.recipientUserId - Recipient user ID (for filtering, more reliable)
 * @param {string} notificationData.createdBy - Creator name (optional)
 * @returns {Object} Created notification object
 */
export const createNotification = async (notificationData) => {
  try {
    // Check if push notifications are enabled
    if (!isPushNotificationsEnabled()) {
      console.log('Push notifications are disabled, skipping notification creation')
      // Still return the notification object for email notifications if enabled
      // but don't add it to the in-app notifications list
      if (isEmailNotificationsEnabled()) {
        // In a real app, you would send an email here
        console.log('Email notification would be sent:', notificationData.title)
      }
      return null
    }

    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: notificationData.type || 'Info',
      typeColor: getTypeColor(notificationData.type),
      title: notificationData.title || 'Notification',
      description: notificationData.description || '',
      timestamp: new Date().toISOString(),
      isRead: false,
      projectId: notificationData.projectId || null,
      projectType: notificationData.projectType || null,
      actions: notificationData.actions || [{ label: 'View', type: 'view', color: '#3b82f6' }],
      recipient: notificationData.recipient || null,
      recipientEmail: notificationData.recipientEmail || null,
      recipientUserId: notificationData.recipientUserId || null, // Add user ID
      createdBy: notificationData.createdBy || 'System',
    }

    // Get ALL notifications from localStorage (not filtered)
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]')
    allNotifications.unshift(notification)

    // Keep only last 100 notifications to prevent storage bloat
    const trimmedNotifications = allNotifications.slice(0, 100)
    localStorage.setItem('notifications', JSON.stringify(trimmedNotifications))

    // Dispatch custom event to notify MainHeader of new notification
    window.dispatchEvent(new CustomEvent('notificationUpdated'))

    // If email notifications are enabled, log that email would be sent
    // In a real app, you would send an email here
    if (isEmailNotificationsEnabled()) {
      console.log('Email notification would be sent:', notification.title)
      // Example: sendEmailNotification(notification)
    }

    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {boolean} Success status
 */
export const markAsRead = async (notificationId) => {
  try {
    // Get ALL notifications from localStorage (not filtered)
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]')
    const notification = allNotifications.find((n) => n.id === notificationId)
    if (notification) {
      notification.isRead = true
      localStorage.setItem('notifications', JSON.stringify(allNotifications))

      // Dispatch custom event to notify MainHeader
      window.dispatchEvent(new CustomEvent('notificationUpdated'))

      return true
    }
    return false
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

/**
 * Mark all notifications as read
 * @returns {boolean} Success status
 */
export const markAllAsRead = async () => {
  try {
    // Get ALL notifications from localStorage (not filtered)
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]')
    const currentUserEmail = localStorage.getItem('userEmail')
    const currentUserRole = localStorage.getItem('userRole')

    // System Admins - can see ALL notifications
    const ADMIN_EMAILS = [
      'yssahjulianah.barcial@carsu.edu.ph',
      'lovellhudson.clavel@carsu.edu.ph',
      'altheaguila.gorres@carsu.edu.ph',
    ]

    // Check if current user is admin
    const isAdminByEmail = ADMIN_EMAILS.some(
      (email) => email.toLowerCase() === currentUserEmail?.toLowerCase(),
    )
    const isAdminByRole = currentUserRole === 'admin'
    const isAdmin = isAdminByEmail || isAdminByRole

    if (isAdmin) {
      // Admins: Mark ALL notifications as read
      console.log('👑 Admin: Marking all', allNotifications.length, 'notifications as read')
      allNotifications.forEach((n) => {
        n.isRead = true
      })
    } else {
      // Regular users: Mark only their notifications as read
      console.log('👤 User: Marking only user notifications as read')

      // Get current user's ID
      const { profilesService } = await import('./supabaseService.js')
      let currentUserId = null
      try {
        const currentProfile = await profilesService.getByEmail(currentUserEmail)
        currentUserId = currentProfile?.id
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }

      // Mark only current user's notifications as read
      allNotifications.forEach((n) => {
        // Check if notification belongs to current user
        const belongsToUser =
          (n.recipientUserId && currentUserId && n.recipientUserId === currentUserId) ||
          (n.recipientEmail &&
            currentUserEmail &&
            n.recipientEmail.toLowerCase() === currentUserEmail.toLowerCase())

        if (belongsToUser) {
          n.isRead = true
        }
      })
    }

    localStorage.setItem('notifications', JSON.stringify(allNotifications))

    // Dispatch custom event to notify MainHeader
    window.dispatchEvent(new CustomEvent('notificationUpdated'))

    console.log('✅ Successfully marked notifications as read')
    return true
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @returns {boolean} Success status
 */
export const deleteNotification = async (notificationId) => {
  try {
    // Get ALL notifications from localStorage (not filtered)
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]')
    const filtered = allNotifications.filter((n) => n.id !== notificationId)
    localStorage.setItem('notifications', JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Error deleting notification:', error)
    return false
  }
}

/**
 * Get type color based on notification type
 * @param {string} type - Notification type
 * @returns {string} Color hex code
 */
const getTypeColor = (type) => {
  const colorMap = {
    Request: '#3b82f6', // blue
    Comment: '#ec4899', // magenta
    Approved: '#10b981', // green
    Rejected: '#ef4444', // red
    Returned: '#f59e0b', // amber
    Published: '#10b981', // green
    Forwarded: '#8b5cf6', // purple
    Info: '#6b7280', // gray
  }
  return colorMap[type] || '#6b7280'
}

/**
 * Convert status code to human-readable display name
 * @param {string} status - Status code
 * @returns {string} Human-readable status name
 */
const getStatusDisplayName = (status) => {
  const statusMap = {
    draft: 'Draft',
    to_section_head: 'Section Head',
    to_technical_editor: 'Technical Editor',
    to_creative_director: 'Creative Director',
    to_editor_in_chief: 'Editor-in-Chief',
    to_chief_adviser: 'Chief Adviser',
    for_publish: 'Archival Manager',
    published: 'Published',
    returned_by_section_head: 'Section Head (returned)',
    returned_by_technical_editor: 'Technical Editor (returned)',
    returned_by_creative_director: 'Creative Director (returned)',
    returned_by_editor_in_chief: 'Editor-in-Chief (returned)',
    returned_by_chief_adviser: 'Chief Adviser (returned)',
    approved: 'Approved',
    rejected: 'Rejected',
    'Returned by Chief Adviser': 'Chief Adviser (returned)',
    'To Chief Adviser': 'Chief Adviser',
    'For Publish': 'Archival Manager',
    Published: 'Published',
    Approved: 'Approved',
    Rejected: 'Rejected',
  }
  return statusMap[status] || status
}

/**
 * Create notification for project status change
 * @param {Object} params - Notification parameters
 * @param {string} params.projectId - Project ID
 * @param {string} params.projectType - Project type
 * @param {string} params.projectTitle - Project title
 * @param {string} params.oldStatus - Previous status
 * @param {string} params.newStatus - New status
 * @param {string} params.actionBy - User who performed the action
 * @param {string} params.recipient - Recipient role/user
 * @param {string} params.recipientEmail - Recipient email address
 * @param {string} params.comments - Additional comments (optional)
 */
export const createStatusChangeNotification = ({
  projectId,
  projectType,
  projectTitle,
  oldStatus,
  newStatus,
  actionBy,
  recipient,
  recipientEmail,
  comments,
}) => {
  let type = 'Info'
  let description = ''
  let actions = [{ label: 'View', type: 'view', color: '#3b82f6' }]

  // Get human-readable status name
  const statusDisplay = getStatusDisplayName(newStatus)

  // Determine notification type and description based on status change
  if (newStatus === 'To Section Head' || newStatus === 'to_section_head') {
    type = 'Request'
    description = `${actionBy} submitted "${projectTitle}" for ${statusDisplay} review.`
  } else if (
    newStatus === 'To Technical Editor' ||
    newStatus === 'to_technical_editor' ||
    newStatus === 'to_creative_director' ||
    newStatus === 'To Editor-in-Chief' ||
    newStatus === 'to_editor_in_chief' ||
    newStatus === 'To Chief Adviser' ||
    newStatus === 'to_chief_adviser'
  ) {
    type = 'Forwarded'
    description = `${actionBy} moved "${projectTitle}" to ${statusDisplay}.`
  } else if (newStatus === 'For Publish' || newStatus === 'for_publish') {
    type = 'Approved'
    description = `${actionBy} approved "${projectTitle}" for publication.`
  } else if (newStatus === 'Published' || newStatus === 'published') {
    type = 'Published'
    description = `${actionBy} published "${projectTitle}".`
  } else if (
    newStatus === 'Returned by Section Head' ||
    newStatus === 'returned_by_section_head' ||
    newStatus === 'Returned by Technical Editor' ||
    newStatus === 'returned_by_technical_editor' ||
    newStatus === 'Returned by Creative Director' ||
    newStatus === 'returned_by_creative_director' ||
    newStatus === 'Returned by EIC' ||
    newStatus === 'returned_by_editor_in_chief' ||
    newStatus === 'Returned by Chief Adviser' ||
    newStatus === 'returned_by_chief_adviser'
  ) {
    type = 'Returned'
    description = `${actionBy} returned "${projectTitle}" for edits.`
    if (comments) {
      description += ` ${comments}`
    }
  } else if (newStatus === 'returned_by_section_head' && oldStatus === 'To Chief Adviser') {
    // Special case: Rejection by Chief Adviser sends it back to artist/writer
    type = 'Rejected'
    description = `${actionBy} rejected "${projectTitle}" and sent it back for major revisions.`
    if (comments) {
      description += ` ${comments}`
    }
  } else if (
    newStatus === 'Rejected by Chief Adviser' ||
    newStatus.includes('Rejected') ||
    newStatus.includes('rejected')
  ) {
    type = 'Rejected'
    description = `${actionBy} rejected "${projectTitle}".`
    if (comments) {
      description += ` ${comments}`
    }
  } else if (newStatus === 'Draft' || newStatus === 'draft') {
    type = 'Info'
    description = `${actionBy} saved "${projectTitle}" as draft.`
  } else {
    // Default fallback with clean status display
    type = 'Forwarded'
    description = `${actionBy} moved "${projectTitle}" to ${statusDisplay}.`
    if (comments) {
      description += ` ${comments}`
    }
  }

  return createNotification({
    type,
    title: `Project: "${projectTitle}"`,
    description,
    projectId,
    projectType,
    actions,
    recipient,
    recipientEmail,
    createdBy: actionBy,
  })
}

/**
 * Create notification for comment
 * @param {Object} params - Notification parameters
 * @param {string} params.projectId - Project ID
 * @param {string} params.projectType - Project type
 * @param {string} params.projectTitle - Project title
 * @param {string} params.commentAuthor - Comment author
 * @param {string} params.commentText - Comment text
 * @param {string} params.recipient - Recipient role/user
 * @param {string} params.recipientEmail - Recipient email address
 */
export const createCommentNotification = ({
  projectId,
  projectType,
  projectTitle,
  commentAuthor,
  commentText,
  recipient,
  recipientEmail,
}) => {
  return createNotification({
    type: 'Comment',
    title: `Comment on "${projectTitle}"`,
    description: `${commentAuthor} posted a comment: "${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
    projectId,
    projectType,
    actions: [{ label: 'View', type: 'view', color: '#3b82f6' }],
    recipient,
    recipientEmail,
    createdBy: commentAuthor,
  })
}

/**
 * Get all involved users in a project from Supabase
 * @param {Object} project - Project object
 * @returns {Promise<Array>} Array of user email addresses
 */
export const getProjectInvolvedUsers = async (project) => {
  try {
    const involvedEmails = []
    const { supabase } = await import('@/utils/supabase.js')
    const { profilesService } = await import('./supabaseService.js')

    console.log('🔍 Getting involved users for project:', project.id, project.title)

    // 1. Get project creator's email from created_by (UUID)
    // Note: profiles.id is BIGSERIAL, not UUID, so we can't directly join
    // The creator is usually the person submitting, so they'll be filtered out anyway
    if (project.created_by) {
      try {
        // Try to get the user's email from auth
        const { data: userData } = await supabase.auth.admin.getUserById(project.created_by)
        if (userData?.user?.email) {
          involvedEmails.push(userData.user.email)
          console.log('✅ Added project creator:', userData.user.email)
        }
      } catch (error) {
        // Admin API not available in client, skip creator
        console.log('⚠️ Could not fetch creator (admin API not available), skipping')
      }
    }

    // 2. Get section head
    if (project.section_head_id) {
      try {
        const sectionHeadProfile = await profilesService.getById(project.section_head_id)
        if (sectionHeadProfile?.email) {
          involvedEmails.push(sectionHeadProfile.email)
          console.log('✅ Added section head:', sectionHeadProfile.email)
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch section head profile:', error)
      }
    }

    // 3. Get project members (artists and writers from project_members table)
    try {
      const { data: members } = await supabase
        .from('project_members')
        .select('profile_id')
        .eq('project_id', project.id)

      if (members && members.length > 0) {
        console.log(`📋 Found ${members.length} project members`)
        for (const member of members) {
          try {
            const memberProfile = await profilesService.getById(member.profile_id)
            if (memberProfile?.email) {
              involvedEmails.push(memberProfile.email)
              console.log('✅ Added project member:', memberProfile.email)
            }
          } catch (error) {
            console.warn('⚠️ Could not fetch member profile:', error)
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error fetching project members:', error)
    }

    // 4. Get all workflow role users based on project status
    const workflowRoles = getWorkflowRolesByStatus(project.status)
    const workflowDesignations = getDesignationsByStatus(project.status)
    console.log('👥 Workflow roles for status', project.status, ':', workflowRoles)
    console.log('👥 Workflow designations for status', project.status, ':', workflowDesignations)

    // Query by role
    for (const role of workflowRoles) {
      try {
        const { data: roleProfiles } = await supabase
          .from('profiles')
          .select('email, first_name, last_name, role')
          .eq('role', role)

        if (roleProfiles && roleProfiles.length > 0) {
          console.log(`✅ Found ${roleProfiles.length} users with role '${role}'`)
          roleProfiles.forEach((profile) => {
            if (profile.email) {
              involvedEmails.push(profile.email)
              console.log(`  ➡️ Added ${role}:`, profile.email)
            }
          })
        } else {
          console.warn(`⚠️ No users found with role '${role}'`)
        }
      } catch (error) {
        console.warn(`⚠️ Error fetching users with role '${role}':`, error)
      }
    }

    // Query by designation_label (fallback since most profiles have role='member')
    for (const designation of workflowDesignations) {
      try {
        const { data: designationProfiles } = await supabase
          .from('profiles')
          .select('email, first_name, last_name, designation_label')
          .eq('designation_label', designation)

        if (designationProfiles && designationProfiles.length > 0) {
          console.log(
            `✅ Found ${designationProfiles.length} users with designation '${designation}'`,
          )
          designationProfiles.forEach((profile) => {
            if (profile.email) {
              involvedEmails.push(profile.email)
              console.log(`  ➡️ Added ${designation}:`, profile.email)
            }
          })
        } else {
          console.warn(`⚠️ No users found with designation '${designation}'`)
        }
      } catch (error) {
        console.warn(`⚠️ Error fetching users with designation '${designation}':`, error)
      }
    }

    // Remove duplicates and empty values
    const uniqueEmails = [...new Set(involvedEmails.filter((email) => email))]
    console.log('📧 Total unique involved users:', uniqueEmails.length, uniqueEmails)

    return uniqueEmails
  } catch (error) {
    console.error('❌ Error getting project involved users:', error)
    return []
  }
}

/**
 * Get workflow roles based on project status
 * @param {string} status - Project status
 * @returns {Array<string>} Array of role names
 */
const getWorkflowRolesByStatus = (status) => {
  const rolesByStatus = {
    to_section_head: ['section_head'],
    to_technical_editor: ['technical_editor'],
    to_creative_director: ['creative_director'],
    to_editor_in_chief: ['editor_in_chief'],
    to_chief_adviser: ['chief_adviser'],
    for_publish: ['archival_manager'],
    published: ['admin', 'archival_manager'],
  }
  return rolesByStatus[status?.toLowerCase()?.replace(/\s+/g, '_')] || []
}

/**
 * Get designation labels that match workflow roles
 * @param {string} status - Project status
 * @returns {Array<string>} Array of designation labels
 */
const getDesignationsByStatus = (status) => {
  const designationsByStatus = {
    to_section_head: ['Section Head', 'Managing Editor', 'Associate Managing Editor'],
    to_technical_editor: ['Technical Editor'],
    to_creative_director: ['Creative Director'],
    to_editor_in_chief: ['Editor-in-Chief'],
    to_chief_adviser: ['Chief Adviser'],
    for_publish: ['Archival Manager', 'Circulations Manager'],
    published: ['Admin', 'Archival Manager'],
  }
  return designationsByStatus[status?.toLowerCase()?.replace(/\s+/g, '_')] || []
}

/**
 * Notify all involved users in a project
 * @param {Object} params - Notification parameters
 * @param {Object} params.project - Project object from Supabase
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.description - Notification description
 * @param {string} params.actionBy - User who performed the action
 * @returns {Promise<Array>} Array of created notifications
 */
export const notifyAllInvolvedUsers = async ({ project, type, title, description, actionBy }) => {
  try {
    const involvedEmails = await getProjectInvolvedUsers(project)
    const { profilesService } = await import('./supabaseService.js')
    const currentUserEmail = localStorage.getItem('userEmail')

    const notifications = []

    for (const email of involvedEmails) {
      // Skip notifying the current user (person who performed the action)
      if (email.toLowerCase() === currentUserEmail?.toLowerCase()) {
        continue
      }

      // Get user ID for better notification filtering
      let recipientUserId = null
      try {
        const recipientProfile = await profilesService.getByEmail(email)
        recipientUserId = recipientProfile?.id
      } catch (error) {
        console.warn('Could not fetch recipient profile ID:', error)
      }

      const notification = await createNotification({
        type,
        title,
        description,
        projectId: project.id,
        projectType: project.project_type,
        recipientEmail: email,
        recipientUserId,
        createdBy: actionBy,
      })

      if (notification) {
        notifications.push(notification)
      }
    }

    console.log(`✅ Sent ${notifications.length} notifications to involved users`)
    return notifications
  } catch (error) {
    console.error('Error notifying involved users:', error)
    return []
  }
}

/**
 * Create notification for file upload (media)
 * @param {Object} params - Notification parameters
 * @param {Object} params.project - Project object
 * @param {string} params.fileName - Uploaded file name
 * @param {string} params.uploadedBy - User who uploaded the file
 */
export const notifyFileUpload = async ({ project, fileName, uploadedBy }) => {
  return notifyAllInvolvedUsers({
    project,
    type: 'Info',
    title: `File uploaded to "${project.title}"`,
    description: `${uploadedBy} uploaded "${fileName}" to the project.`,
    actionBy: uploadedBy,
  })
}

/**
 * Create notification for project update/edit
 * @param {Object} params - Notification parameters
 * @param {Object} params.project - Project object
 * @param {string} params.updatedBy - User who updated the project
 * @param {string} params.changes - Description of changes (optional)
 */
export const notifyProjectUpdate = async ({ project, updatedBy, changes }) => {
  const description = changes
    ? `${updatedBy} updated "${project.title}": ${changes}`
    : `${updatedBy} made changes to "${project.title}".`

  return notifyAllInvolvedUsers({
    project,
    type: 'Info',
    title: `Project updated: "${project.title}"`,
    description,
    actionBy: updatedBy,
  })
}

/**
 * Create notification when comment is added
 * @param {Object} params - Notification parameters
 * @param {Object} params.project - Project object
 * @param {string} params.commentAuthor - Comment author
 * @param {string} params.commentText - Comment text
 */
export const notifyNewComment = async ({ project, commentAuthor, commentText }) => {
  return notifyAllInvolvedUsers({
    project,
    type: 'Comment',
    title: `New comment on "${project.title}"`,
    description: `${commentAuthor} commented: "${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
    actionBy: commentAuthor,
  })
}

/**
 * Create notification when project status changes (workflow transition)
 * @param {Object} params - Notification parameters
 * @param {Object} params.project - Project object
 * @param {string} params.oldStatus - Previous status
 * @param {string} params.newStatus - New status
 * @param {string} params.actionBy - User who changed status
 * @param {string} params.comments - Additional comments (optional)
 */
export const notifyStatusChange = async ({ project, oldStatus, newStatus, actionBy, comments }) => {
  console.log('📬 notifyStatusChange called:', {
    projectId: project?.id,
    projectTitle: project?.title,
    oldStatus,
    newStatus,
    actionBy,
    comments,
  })

  let type = 'Info'
  let description = ''

  // Get human-readable status name
  const statusDisplay = getStatusDisplayName(newStatus)

  // Determine notification type and description
  if (newStatus?.includes('returned') || newStatus?.includes('Returned')) {
    type = 'Returned'
    description = `${actionBy} returned "${project.title}" for edits.`
    if (comments) {
      description += ` Comment: ${comments}`
    }
  } else if (newStatus?.includes('approved') || newStatus?.includes('Approved')) {
    type = 'Approved'
    description = `${actionBy} approved "${project.title}".`
  } else if (newStatus?.includes('rejected') || newStatus?.includes('Rejected')) {
    type = 'Rejected'
    description = `${actionBy} rejected "${project.title}".`
    if (comments) {
      description += ` Reason: ${comments}`
    }
  } else if (newStatus === 'published' || newStatus === 'Published') {
    type = 'Published'
    description = `${actionBy} published "${project.title}".`
  } else if (newStatus === 'to_section_head') {
    type = 'Request'
    description = `${actionBy} submitted "${project.title}" for ${statusDisplay} review.`
    if (comments) {
      description += ` Comments: ${comments}`
    }
  } else if (
    newStatus === 'to_technical_editor' ||
    newStatus === 'to_creative_director' ||
    newStatus === 'to_editor_in_chief' ||
    newStatus === 'to_chief_adviser' ||
    newStatus === 'To Chief Adviser'
  ) {
    type = 'Forwarded'
    description = `${actionBy} moved "${project.title}" to ${statusDisplay}.`
    if (comments) {
      description += ` Comments: ${comments}`
    }
  } else if (newStatus === 'for_publish' || newStatus === 'For Publish') {
    type = 'Approved'
    description = `${actionBy} approved "${project.title}" for publication.`
    if (comments) {
      description += ` Comments: ${comments}`
    }
  } else {
    // Default fallback with clean status display
    description = `${actionBy} moved "${project.title}" to ${statusDisplay}.`
    if (comments) {
      description += ` Comments: ${comments}`
    }
  }

  console.log('📬 Notification details:', { type, description })

  const result = await notifyAllInvolvedUsers({
    project,
    type,
    title: `Status changed: "${project.title}"`,
    description,
    actionBy,
  })

  console.log('📬 Notifications sent:', result?.length || 0)
  return result
}
