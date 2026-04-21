// Notifications Service
// Storage key: 'notifications'
import { isEmailNotificationsEnabled } from './settingsService.js'
import { formatStatus } from '@/utils/statusFormatter.js'
import { ADMIN_EMAILS } from '@/utils/userDisplay.js'

// Note: All role-based access is now database-driven via designation_label and role fields
// See userDisplay.js for centralized admin email checking if needed

let hasLoggedProfileFetchNetworkIssue = false

const isTransientNetworkFetchError = (error) => {
  const message = String(error?.message || '').toLowerCase()
  const details = String(error?.details || '').toLowerCase()

  return (
    message.includes('failed to fetch') ||
    message.includes('err_connection_closed') ||
    details.includes('failed to fetch') ||
    details.includes('err_connection_closed')
  )
}

/**
 * Clean up duplicate notifications from localStorage
 * This removes notifications that are duplicates based on:
 * - Same recipient, project, title, description, and type
 * - Keeps only the most recent one
 * @returns {number} Number of duplicates removed
 */
export const cleanupDuplicateNotifications = () => {
  try {
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]')
    const seen = new Map()
    const uniqueNotifications = []
    let duplicatesRemoved = 0

    // Process notifications from newest to oldest
    allNotifications.forEach((notif) => {
      // Create a unique key based on important fields
      // Include recipientEmail so different recipients are NOT treated as duplicates
      const key = [
        notif.recipientEmail?.toLowerCase().trim() || '',
        notif.recipientUserId || '',
        notif.projectId || '',
        notif.title || '',
        notif.type || '',
        notif.description || '',
      ].join('|||')

      if (!seen.has(key)) {
        seen.set(key, true)
        uniqueNotifications.push(notif)
      } else {
        duplicatesRemoved++
        console.log('🗑️ Removing duplicate notification:', {
          id: notif.id,
          title: notif.title,
          recipient: notif.recipientEmail,
        })
      }
    })

    if (duplicatesRemoved > 0) {
      localStorage.setItem('notifications', JSON.stringify(uniqueNotifications))
      console.log(`✅ Cleaned up ${duplicatesRemoved} duplicate notifications`)
    } else {
      console.log('✅ No duplicate notifications found')
    }

    return duplicatesRemoved
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error)
    return 0
  }
}

/**
 * Get all notifications for the current user
 * @returns {Array} Array of notification objects for current user
 */
export const getNotifications = async () => {
  try {
    cleanupDuplicateNotifications()
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]')
    const currentUserEmail = localStorage.getItem('userEmail')

    if (!currentUserEmail) {
      return []
    }

    // System Admins can see all notifications.
    // Fallback to accessRole to handle early-login timing before userRole is written.
    const currentAccessRole = localStorage.getItem('accessRole')
    const currentUserRole = localStorage.getItem('userRole') || currentAccessRole
    const isAdmin = currentUserRole === 'admin' || currentAccessRole === 'admin'

    console.log('👤 Current user:', {
      email: currentUserEmail,
      role: currentUserRole,
      isAdmin,
    })

    // Get current user's ID from their profile
    const { profilesService } = await import('./supabaseService.js')
    let currentUserId = null
    try {
      const currentProfile = await profilesService.getByEmail(currentUserEmail)
      currentUserId = currentProfile?.id
      hasLoggedProfileFetchNetworkIssue = false
      console.log('🔑 Current user details:', {
        email: currentUserEmail,
        userId: currentUserId,
      })
    } catch (error) {
      if (isTransientNetworkFetchError(error)) {
        if (!hasLoggedProfileFetchNetworkIssue) {
          console.warn(
            '⚠️ Temporary network issue while fetching user profile for notifications. Using email-based filtering fallback.',
          )
          hasLoggedProfileFetchNetworkIssue = true
        }
      } else {
        console.error('Error fetching current user profile:', error)
      }
    }

    // Role mapping for notification recipients (maps designation label → userRole)
    const roleMapping = {
      'Section Head': 'section_head',
      'Technical Editor': 'editor',
      'Creative Director': 'editor',
      'Editor-in-Chief': 'editor',
      'Chief Adviser': 'editor',
      'Archival Manager': 'editor',
      'Online Accounts Manager': 'editor',
    }

    // Also check accessRole from localStorage for more precise matching

    // Direct email lists for source-based matching
    const EMAIL_BY_SOURCE = {
      technical_editor: ['jonee.elopre@carsu.edu.ph'],
      creative_director: ['levibrian.cejuela@carsu.edu.ph'],
      editor_in_chief: ['melede.ganoy@carsu.edu.ph'],
      chief_adviser: ['julesleo.reserva@carsu.edu.ph'],
      archival_manager: ['eizzielmarie.bacoy@carsu.edu.ph'],
      online_accounts_manager: ['kentadriane.vinatero@carsu.edu.ph'],
    }

    console.log('🔍 Filtering notifications for user:', {
      email: currentUserEmail,
      role: currentUserRole,
      accessRole: currentAccessRole,
      userId: currentUserId,
      isAdmin,
    })

    // Filter notifications for current user
    // IMPORTANT: Only show notifications explicitly addressed to this user
    const userNotifications = notifications.filter((n) => {
      // Admins see ALL notifications (they need full visibility for oversight)
      if (isAdmin) return true

      // 1. User ID-based notifications (most reliable)
      if (n.recipientUserId && currentUserId) {
        // Compare as strings to handle type mismatches
        if (String(n.recipientUserId) === String(currentUserId)) return true
      }

      // 2. Email-based notifications
      if (n.recipientEmail) {
        if (n.recipientEmail.toLowerCase() === currentUserEmail.toLowerCase()) return true
        // Don't return false yet — check source-based matching first
      }

      // 3. Source-based matching — check if user's email is in the source role's email list
      if (n.source && EMAIL_BY_SOURCE[n.source]) {
        if (EMAIL_BY_SOURCE[n.source].includes(currentUserEmail.toLowerCase())) return true
      }

      // If recipientEmail was set but didn't match in steps 2 or 3, skip this notification
      if (n.recipientEmail) return false

      // 4. Role-based notifications (e.g., "Section Head", "Technical Editor")
      if (n.recipient && roleMapping[n.recipient] && currentUserRole) {
        return currentUserRole === roleMapping[n.recipient]
      }

      // 5. Legacy notifications without any recipient info - show to all (backward compat)
      if (!n.recipient && !n.recipientEmail && !n.recipientUserId) {
        return true
      }

      return false
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
 * @param {string} notificationData.workflowLabel - Workflow transition label (for admin visibility, e.g., "Draft → Section Head")
 * @returns {Object} Created notification object
 */
export const createNotification = async (notificationData) => {
  try {
    // Always create notifications regardless of sender's push notification setting.
    // The push notification setting controls whether the RECIPIENT sees notifications,
    // not whether they are created.

    // Get ALL notifications from localStorage (not filtered)
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]')

    // Check for duplicate notifications with two strategies:
    // 1. Exact match within last 30 seconds (for rapid duplicates)
    // 2. Similar notification for same project+recipient (regardless of time)
    const now = Date.now()
    const thirtySecondsAgo = now - 30000
    const normalizedRecipientEmail = notificationData.recipientEmail?.toLowerCase().trim()

    let duplicateReason = null
    const isDuplicate = allNotifications.some((existingNotif) => {
      const existingTimestamp = new Date(existingNotif.timestamp).getTime()
      const existingRecipientEmail = existingNotif.recipientEmail?.toLowerCase().trim()

      // Strategy 1: Check for recent exact duplicates (within 30 seconds)
      const isRecent = existingTimestamp > thirtySecondsAgo
      const sameTitle = existingNotif.title === notificationData.title
      const sameDescription = existingNotif.description === notificationData.description
      const sameProject = existingNotif.projectId === notificationData.projectId
      const sameRecipient = existingRecipientEmail === normalizedRecipientEmail
      const sameType = existingNotif.type === notificationData.type

      const recentExactMatch =
        isRecent && sameTitle && sameDescription && sameProject && sameRecipient && sameType

      if (recentExactMatch) {
        duplicateReason = 'recent_exact_match'
        console.log('🚫 DUPLICATE (recent exact) DETECTED and prevented:', {
          title: notificationData.title,
          recipient: notificationData.recipientEmail,
          projectId: notificationData.projectId,
          existingId: existingNotif.id,
          timeGap: now - existingTimestamp,
        })
        return true
      }

      // Strategy 2: Check for very similar notifications (same project, type, recipient)
      // This catches duplicates even if description varies slightly
      const veryRecentDuplicate =
        existingTimestamp > now - 3000 && // Within 3 seconds
        sameProject &&
        sameRecipient &&
        sameType &&
        sameTitle

      if (veryRecentDuplicate) {
        duplicateReason = 'very_recent_similar'
        console.log('🚫 DUPLICATE (very recent similar) DETECTED and prevented:', {
          title: notificationData.title,
          recipient: notificationData.recipientEmail,
          projectId: notificationData.projectId,
          existingId: existingNotif.id,
          timeGap: now - existingTimestamp,
        })
        return true
      }

      return false
    })

    // If duplicate found, return null without creating
    if (isDuplicate) {
      console.log('🚫 Duplicate notification blocked:', duplicateReason)
      return null
    }

    // Prepare description based on recipient type
    let description = notificationData.description || ''
    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: notificationData.type || 'Info',
      typeColor: getTypeColor(notificationData.type),
      title: notificationData.title || 'Notification',
      description: description,
      timestamp: new Date().toISOString(),
      isRead: false,
      projectId: notificationData.projectId || null,
      projectType: notificationData.projectType || null,
      actions: notificationData.actions || [{ label: 'View', type: 'view', color: '#3b82f6' }],
      recipient: notificationData.recipient || null,
      recipientEmail: notificationData.recipientEmail || null,
      recipientUserId: notificationData.recipientUserId || null, // Add user ID
      createdBy: notificationData.createdBy || 'System',
      workflowLabel: notificationData.workflowLabel || null, // Workflow label for admins
    }

    console.log('✨ Creating NEW notification:', {
      id: notification.id,
      title: notification.title,
      recipient: notification.recipientEmail,
      projectId: notification.projectId,
    })

    allNotifications.unshift(notification)

    // Keep only last 100 notifications to prevent storage bloat
    const trimmedNotifications = allNotifications.slice(0, 100)
    localStorage.setItem('notifications', JSON.stringify(trimmedNotifications))

    console.log(
      '💾 Notification saved to localStorage. Total notifications now:',
      trimmedNotifications.length,
    )

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
    const currentAccessRole = localStorage.getItem('accessRole')
    const currentUserRole = localStorage.getItem('userRole') || currentAccessRole

    // System Admins - can see ALL notifications
    // Check if current user is admin via database role (source of truth)
    const isAdmin = currentUserRole === 'admin' || currentAccessRole === 'admin'

    if (isAdmin) {
      // Admins: Mark only Published notifications as read
      console.log('👑 Admin: Marking published notifications as read')
      allNotifications.forEach((n) => {
        if (n.type === 'Published') {
          n.isRead = true
        }
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
 * Delete all notifications for a specific project
 * @param {string|number} projectId - Project ID
 * @returns {boolean} Success status
 */
export const deleteProjectNotifications = async (projectId) => {
  try {
    // Get ALL notifications from localStorage (not filtered)
    const allNotifications = JSON.parse(localStorage.getItem('notifications') || '[]')
    // Filter out all notifications related to this project
    const filtered = allNotifications.filter((n) => String(n.projectId) !== String(projectId))
    localStorage.setItem('notifications', JSON.stringify(filtered))
    console.log(`🗑️ Deleted notifications for project ${projectId}`)
    return true
  } catch (error) {
    console.error('Error deleting project notifications:', error)
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
export const getStatusDisplayName = (status) => {
  return formatStatus(status)
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
    const emailSources = new Map() // Track where each email came from
    const { supabase } = await import('@/utils/supabase.js')
    const { profilesService } = await import('./supabaseService.js')

    console.log('🔍 Getting involved users for project:', project.id, project.title)

    // Helper function to add email with source tracking
    const addEmail = (email, source) => {
      if (email) {
        involvedEmails.push(email)
        const normalizedEmail = email.toLowerCase().trim()
        if (!emailSources.has(normalizedEmail)) {
          emailSources.set(normalizedEmail, [])
        }
        emailSources.get(normalizedEmail).push(source)
      }
    }

    // 1. Get project creator's email from created_by_profile_id
    if (project.created_by_profile_id) {
      try {
        const creatorProfile = await profilesService.getById(project.created_by_profile_id)
        if (creatorProfile?.email) {
          addEmail(creatorProfile.email, 'project_creator')
          console.log('✅ Added project creator:', creatorProfile.email)
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch creator profile:', error)
      }
    }

    // 2. Get section head
    if (project.section_head_id) {
      try {
        const sectionHeadProfile = await profilesService.getById(project.section_head_id)
        if (sectionHeadProfile?.email) {
          addEmail(sectionHeadProfile.email, 'section_head')
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
        .select('user_id')
        .eq('project_id', project.id)

      if (members && members.length > 0) {
        console.log(`📋 Found ${members.length} project members`)
        for (const member of members) {
          try {
            const memberProfile = await profilesService.getById(member.user_id)
            if (memberProfile?.email) {
              addEmail(memberProfile.email, 'project_member')
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
    const workflowDesignations = getDesignationsByStatus(project.status, project)
    console.log('👥 Workflow roles for status', project.status, ':', workflowRoles)
    console.log('👥 Workflow designations for status', project.status, ':', workflowDesignations)

    // Skip role-based query since most profiles have role='member'
    // Use designation_label instead which is the actual system for role assignment
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
              addEmail(profile.email, `workflow_designation:${designation}`)
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

    // 5. Add all system admins to receive notifications about all project submissions/approvals
    console.log('👑 Adding system admins to notification list')
    ADMIN_EMAILS.forEach((adminEmail) => {
      addEmail(adminEmail, 'system_admin')
      console.log('✅ Added system admin:', adminEmail)
    })

    // Remove duplicates and empty values (case-insensitive for emails)
    const emailMap = new Map()
    involvedEmails
      .filter((email) => email && email.trim())
      .forEach((email) => {
        const normalizedEmail = email.toLowerCase().trim()
        if (!emailMap.has(normalizedEmail)) {
          emailMap.set(normalizedEmail, email) // Keep original casing for display
        }
      })

    const uniqueEmails = Array.from(emailMap.values())

    // Log duplicate detection
    console.log('📧 Before deduplication:', involvedEmails.length, 'emails')
    console.log('📧 After deduplication:', uniqueEmails.length, 'emails')

    // Show which emails appeared multiple times and from where
    emailSources.forEach((sources, email) => {
      if (sources.length > 1) {
        console.log(`🔄 Email ${email} appeared ${sources.length} times from:`, sources)
      }
    })

    console.log('📧 Final unique emails:', uniqueEmails)

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
    to_online_accounts_manager: ['online_accounts_manager'],
    to_editor_in_chief: ['editor_in_chief'],
    to_chief_adviser: ['chief_adviser'],
    for_publish: ['archival_manager', 'online_accounts_manager'],
    published: ['admin', 'archival_manager'],
  }
  return rolesByStatus[status?.toLowerCase()?.replace(/\s+/g, '_')] || []
}

/**
 * Get designation labels that match workflow roles
 * @param {string} status - Project status
 * @param {Object} project - Optional project object for type-specific filtering
 * @returns {Array<string>} Array of designation labels
 */
const getDesignationsByStatus = (status, project = null) => {
  const designationsByStatus = {
    // For to_section_head: Only notify the specific assigned section head (fetched separately via section_head_id)
    // Don't notify all Managing Editors to avoid duplicate notifications
    to_section_head: [],
    to_technical_editor: ['Technical Editor'],
    to_creative_director: ['Creative Director'],
    to_online_accounts_manager: ['Online Accounts Manager'],
    to_editor_in_chief: ['Editor-in-Chief'],
    to_chief_adviser: ['Chief Adviser'],
    to_archival_manager: ['Archival Manager', 'Circulations Manager'],
    for_publish: ['Archival Manager', 'Circulations Manager', 'Online Accounts Manager'],
    published: ['Admin', 'Archival Manager'],
  }

  let designations = designationsByStatus[status?.toLowerCase()?.replace(/\s+/g, '_')] || []

  // For for_publish status, filter based on project type
  if (status?.toLowerCase()?.replace(/\s+/g, '_') === 'for_publish' && project) {
    if (project.project_type === 'other' || project.type === 'other') {
      // For "Other" projects, only notify Online Accounts Manager
      designations = ['Online Accounts Manager']
    } else {
      // For other project types, only notify Archival Managers
      designations = ['Archival Manager', 'Circulations Manager']
    }
  }

  return designations
}

/**
 * Notify all involved users in a project
 * @param {Object} params - Notification parameters
 * @param {Object} params.project - Project object from Supabase
 * @param {string} params.type - Notification type
 * @param {string} params.title - Notification title
 * @param {string} params.description - Notification description
 * @param {string} params.actionBy - User who performed the action
 * @param {string} params.workflowLabel - Workflow transition label for admins (optional)
 * @returns {Promise<Array>} Array of created notifications
 */
export const notifyAllInvolvedUsers = async ({
  project,
  type,
  title,
  description,
  actionBy,
  workflowLabel,
}) => {
  try {
    const involvedEmails = await getProjectInvolvedUsers(project)
    const { profilesService } = await import('./supabaseService.js')
    const currentUserEmail = localStorage.getItem('userEmail')

    console.log('📬 Notifying users for project:', project.id, project.title)
    console.log('📬 Involved emails before processing:', involvedEmails)

    const notifications = []
    const notifiedEmails = new Set() // Track already notified emails

    console.log(
      '📋 Processing',
      involvedEmails.length,
      'unique emails from getProjectInvolvedUsers',
    )
    console.log('👤 Current user email:', currentUserEmail)

    for (const email of involvedEmails) {
      const normalizedEmail = email.toLowerCase().trim()

      console.log('🔄 Processing email:', email, '(normalized:', normalizedEmail, ')')

      // Skip if already notified this email
      if (notifiedEmails.has(normalizedEmail)) {
        console.log('⏭️ Skipping duplicate notification for:', email)
        continue
      }

      // Check if recipient is an admin
      const recipientIsAdmin = ADMIN_EMAILS.some(
        (adminEmail) => adminEmail.toLowerCase() === normalizedEmail,
      )

      // Skip notifying the current user UNLESS they are an admin
      // Admins receive all notifications to track project workflow
      if (normalizedEmail === currentUserEmail?.toLowerCase().trim() && !recipientIsAdmin) {
        console.log('⏭️ Skipping current user (non-admin):', email)
        continue
      }

      if (recipientIsAdmin) {
        console.log('👑 Including admin in notifications:', email)
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
        workflowLabel,
      })

      if (notification) {
        notifications.push(notification)
        notifiedEmails.add(normalizedEmail)
        console.log('✅ Notification created for:', email, 'ID:', notification.id)
      } else {
        console.log('⚠️ Notification was null (possibly duplicate or disabled):', email)
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
/**
 * Generate workflow label for admin visibility
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @returns {string} Workflow label like "Draft → Section Head"
 */
const getWorkflowLabel = (oldStatus, newStatus) => {
  const statusMap = {
    draft: 'Draft',
    to_section_head: 'Section Head Review',
    to_technical_editor: 'Technical Editor Review',
    to_creative_director: 'Creative Director Review',
    to_online_accounts_manager: 'Online Accounts Manager Review',
    to_editor_in_chief: 'Editor-in-Chief Review',
    to_chief_adviser: 'Chief Adviser Review',
    to_archival_manager: 'Archival Manager Review',
    for_publish: 'Ready for Publishing',
    published: 'Published',
    // Returned statuses
    returned_by_section_head: 'Returned by Section Head',
    returned_by_technical_editor: 'Returned by Technical Editor',
    returned_by_creative_director: 'Returned by Creative Director',
    returned_by_editor_in_chief: 'Returned by Editor-in-Chief',
    returned_by_chief_adviser: 'Returned by Chief Adviser',
  }

  // Clean status strings for comparison
  const oldStatusClean = oldStatus?.toLowerCase()?.replace(/\s+/g, '_')
  const newStatusClean = newStatus?.toLowerCase()?.replace(/\s+/g, '_')

  const oldDisplay = statusMap[oldStatusClean] || 'Previous Stage'
  const newDisplay = statusMap[newStatusClean] || 'Next Stage'

  return `${oldDisplay} → ${newDisplay}`
}

/**
 * Get targeted recipient emails for a workflow transition.
 * Only notifies the NEXT person in the chain + admins — NOT everyone involved.
 * For returns/rejects, notifies the writer/creator + admins.
 * @param {Object} project - Project object
 * @param {string} newStatus - New status
 * @param {string} action - Action type (return/edit/approve/forward/publish)
 * @returns {Promise<Array>} Array of { email, source } objects
 */
const getTargetedRecipients = async (project, newStatus, action) => {
  const { supabase } = await import('@/utils/supabase.js')
  const { profilesService } = await import('./supabaseService.js')
  const recipients = []
  const addedEmails = new Set()

  const addRecipient = (email, source) => {
    if (!email) return
    const norm = email.toLowerCase().trim()
    if (!addedEmails.has(norm)) {
      addedEmails.add(norm)
      recipients.push({ email, source })
    }
  }

  // For return/edit/reject actions: notify the writer/creator
  if (action === 'return' || action === 'edit' || action === 'reject') {
    // Notify project creator (writer)
    if (project.created_by_profile_id) {
      try {
        const creatorProfile = await profilesService.getById(project.created_by_profile_id)
        if (creatorProfile?.email) addRecipient(creatorProfile.email, 'writer_creator')
      } catch (err) {
        console.warn('Could not fetch creator:', err)
      }
    }
    // Notify project members (writers/artists)
    try {
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', project.id)
      if (members) {
        for (const member of members) {
          try {
            const memberProfile = await profilesService.getById(member.user_id)
            if (memberProfile?.email) addRecipient(memberProfile.email, 'project_member')
          } catch {
            /* skip */
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch members:', err)
    }
  } else {
    // For forward/approve/submit actions: notify only the NEXT role in the workflow
    const designations = getDesignationsByStatus(newStatus, project)

    // Normalize status for comparisons (handle both 'For Publish' and 'for_publish' formats)
    const normalizedStatus = newStatus?.toLowerCase()?.replace(/\s+/g, '_') || ''

    // If forwarding to section head, notify the specific assigned section head
    if (normalizedStatus === 'to_section_head' && project.section_head_id) {
      try {
        const shProfile = await profilesService.getById(project.section_head_id)
        if (shProfile?.email) addRecipient(shProfile.email, 'section_head')
      } catch (err) {
        console.warn('Could not fetch section head:', err)
      }
    }

    // Query recipients by designation_label (database-driven, source of truth)
    for (const designation of designations) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, designation_label')
          .eq('designation_label', designation)
        if (profiles) {
          profiles.forEach((p) => {
            if (p.email) addRecipient(p.email, `target_role:${designation}`)
          })
        }
      } catch (err) {
        console.warn(`Could not fetch ${designation}:`, err)
      }
    }

    // For published status, also notify the creator so they know their work is live
    if (newStatus === 'published' || newStatus === 'Published') {
      if (project.created_by_profile_id) {
        try {
          const creatorProfile = await profilesService.getById(project.created_by_profile_id)
          if (creatorProfile?.email) addRecipient(creatorProfile.email, 'writer_published')
        } catch {
          /* skip */
        }
      }
    }
  }

  // ALWAYS add system admins so they can track project workflow
  ADMIN_EMAILS.forEach((adminEmail) => addRecipient(adminEmail, 'system_admin'))

  return recipients
}

export const notifyStatusChange = async ({
  project,
  oldStatus,
  newStatus,
  actionBy,
  comments,
  action,
}) => {
  console.log('📬 notifyStatusChange called:', {
    projectId: project?.id,
    projectTitle: project?.title,
    oldStatus,
    newStatus,
    action,
    actionBy,
  })

  let type = 'Info'
  let description = ''

  // Get human-readable status name
  const statusDisplay = getStatusDisplayName(newStatus)

  // Generate workflow label for admins to see the full flow
  const workflowLabel = getWorkflowLabel(oldStatus, newStatus)

  // Determine notification type and description
  if (action === 'return' || action === 'edit') {
    type = 'Returned'
    const actionText = action === 'return' ? 'returned' : 'requested edit on'
    description = `${actionBy} ${actionText} "${project.title}" back to writer/artist.`
    if (comments) description += ` Comment: ${comments}`
  } else if (newStatus?.includes('returned') || newStatus?.includes('Returned')) {
    type = 'Returned'
    description = `${actionBy} returned "${project.title}" for edits.`
    if (comments) description += ` Comment: ${comments}`
  } else if (
    action === 'reject' ||
    newStatus?.includes('rejected') ||
    newStatus?.includes('Rejected')
  ) {
    type = 'Rejected'
    description = `${actionBy} rejected "${project.title}".`
    if (comments) description += ` Reason: ${comments}`
  } else if (newStatus === 'published' || newStatus === 'Published') {
    type = 'Published'
    description = `${actionBy} published "${project.title}".`
  } else if (newStatus === 'to_section_head') {
    type = 'Request'
    description = `${actionBy} submitted "${project.title}" for ${statusDisplay} review.`
    if (comments) description += ` Comments: ${comments}`
  } else if (
    newStatus === 'to_technical_editor' ||
    newStatus === 'to_creative_director' ||
    newStatus === 'to_online_accounts_manager' ||
    newStatus === 'to_editor_in_chief' ||
    newStatus === 'to_chief_adviser' ||
    newStatus === 'to_archival_manager' ||
    newStatus === 'To Chief Adviser'
  ) {
    type = 'Forwarded'
    description = `${actionBy} forwarded "${project.title}" to ${statusDisplay}.`
    if (comments) description += ` Comments: ${comments}`
  } else if (newStatus === 'for_publish' || newStatus === 'For Publish') {
    type = 'Approved'
    description = `${actionBy} approved "${project.title}" for publication.`
    if (comments) description += ` Comments: ${comments}`
  } else if (newStatus?.includes('approved') || newStatus?.includes('Approved')) {
    type = 'Approved'
    description = `${actionBy} approved "${project.title}".`
  } else {
    description = `${actionBy} moved "${project.title}" to ${statusDisplay}.`
    if (comments) description += ` Comments: ${comments}`
  }

  console.log('📬 Notification details:', { type, description, workflowLabel })

  // Get TARGETED recipients — only next person in chain + admins
  const recipients = await getTargetedRecipients(project, newStatus, action)
  const currentUserEmail = localStorage.getItem('userEmail')
  const { profilesService } = await import('./supabaseService.js')

  console.log(
    '📬 Targeted recipients:',
    recipients.map((r) => `${r.email} (${r.source})`),
  )

  const notifications = []
  const notifiedEmails = new Set()

  for (const { email } of recipients) {
    const normalizedEmail = email.toLowerCase().trim()

    // Skip if already notified
    if (notifiedEmails.has(normalizedEmail)) continue

    // Check if recipient is an admin
    const recipientIsAdmin = ADMIN_EMAILS.some(
      (adminEmail) => adminEmail.toLowerCase() === normalizedEmail,
    )

    // Skip the current user UNLESS they are an admin
    if (normalizedEmail === currentUserEmail?.toLowerCase().trim() && !recipientIsAdmin) continue

    // Get user ID for reliable filtering
    let recipientUserId = null
    try {
      const recipientProfile = await profilesService.getByEmail(email)
      recipientUserId = recipientProfile?.id
    } catch {
      /* skip */
    }

    const notification = await createNotification({
      type,
      title: `Status changed: "${project.title}"`,
      description,
      projectId: project.id,
      projectType: project.project_type,
      recipientEmail: email,
      recipientUserId,
      createdBy: actionBy,
      workflowLabel,
    })

    if (notification) {
      notifications.push(notification)
      notifiedEmails.add(normalizedEmail)
      console.log('✅ Notification sent to:', email)
    }
  }

  console.log('📬 Total notifications sent:', notifications.length)
  return notifications
}
