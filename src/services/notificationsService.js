// Notifications Service
// Storage key: 'notifications'
import { isPushNotificationsEnabled, isEmailNotificationsEnabled } from './settingsService.js'

/**
 * Get all notifications
 * @returns {Array} Array of notification objects
 */
export const getNotifications = () => {
  try {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]')
    // Sort by timestamp (newest first)
    return notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  } catch (error) {
    console.error('Error getting notifications:', error)
    return []
  }
}

/**
 * Get unread notifications count
 * @returns {number} Count of unread notifications
 */
export const getUnreadCount = () => {
  const notifications = getNotifications()
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
 * @param {string} notificationData.recipient - Recipient user/role (optional)
 * @returns {Object} Created notification object
 */
export const createNotification = (notificationData) => {
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
      createdBy: notificationData.createdBy || 'System',
    }

    const notifications = getNotifications()
    notifications.unshift(notification)

    // Keep only last 100 notifications to prevent storage bloat
    const trimmedNotifications = notifications.slice(0, 100)
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
export const markAsRead = (notificationId) => {
  try {
    const notifications = getNotifications()
    const notification = notifications.find((n) => n.id === notificationId)
    if (notification) {
      notification.isRead = true
      localStorage.setItem('notifications', JSON.stringify(notifications))

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
export const markAllAsRead = () => {
  try {
    const notifications = getNotifications()
    notifications.forEach((n) => (n.isRead = true))
    localStorage.setItem('notifications', JSON.stringify(notifications))

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
export const deleteNotification = (notificationId) => {
  try {
    const notifications = getNotifications()
    const filtered = notifications.filter((n) => n.id !== notificationId)
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
 */
export const createCommentNotification = ({
  projectId,
  projectType,
  projectTitle,
  commentAuthor,
  commentText,
  recipient,
}) => {
  return createNotification({
    type: 'Comment',
    title: `Comment on "${projectTitle}"`,
    description: `${commentAuthor} posted a comment: "${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}"`,
    projectId,
    projectType,
    actions: [{ label: 'View', type: 'view', color: '#3b82f6' }],
    recipient,
    createdBy: commentAuthor,
  })
}
