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

    // Get current user's role from localStorage
    const currentUserRole = localStorage.getItem('userRole')

    // Role mapping for notification recipients
    const roleMapping = {
      'Section Head': 'section_head',
      'Technical Editor': 'editor',
      'Editor-in-Chief': 'editor',
      'Chief Adviser': 'admin',
    }

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

    localStorage.setItem('notifications', JSON.stringify(allNotifications))

    // Dispatch custom event to notify MainHeader
    window.dispatchEvent(new CustomEvent('notificationUpdated'))

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

  // Determine notification type and description based on status change
  if (newStatus === 'To Section Head') {
    type = 'Request'
    description = `${actionBy} submitted "${projectTitle}" for Section Head review.`
  } else if (newStatus === 'To Technical Editor') {
    type = 'Approved'
    description = `${actionBy} approved "${projectTitle}" and forwarded to Technical Editor.`
  } else if (newStatus === 'To Editor-in-Chief') {
    type = 'Approved'
    description = `${actionBy} approved "${projectTitle}" and forwarded to Editor-in-Chief.`
  } else if (newStatus === 'To Chief Adviser') {
    type = 'Forwarded'
    description = `${actionBy} forwarded "${projectTitle}" to Chief Adviser for consultation.`
  } else if (newStatus === 'For Publish') {
    type = 'Approved'
    description = `${actionBy} approved "${projectTitle}" and marked it ready for publishing.`
  } else if (newStatus === 'Published') {
    type = 'Published'
    description = `${actionBy} published "${projectTitle}".`
  } else if (
    newStatus === 'Returned by Section Head' ||
    newStatus === 'Returned by Technical Editor' ||
    newStatus === 'Returned by EIC' ||
    newStatus === 'Returned by Chief Adviser'
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
  } else if (newStatus === 'Rejected by Chief Adviser' || newStatus.includes('Rejected')) {
    type = 'Rejected'
    description = `${actionBy} rejected "${projectTitle}".`
    if (comments) {
      description += ` ${comments}`
    }
  } else if (newStatus === 'Draft') {
    type = 'Info'
    description = `${actionBy} saved "${projectTitle}" as draft.`
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
