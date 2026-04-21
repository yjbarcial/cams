import { notificationsAPI } from './apiService'
import { isPushNotificationsEnabled, isEmailNotificationsEnabled } from './settingsService.js'

/**
 * Get all notifications
 * @returns {Promise<Array>} Array of notification objects
 */
export const getNotifications = async () => {
  try {
    const response = await notificationsAPI.getAll()
    return response.data || []
  } catch (error) {
    console.error('Error getting notifications:', error)
    return []
  }
}

/**
 * Get unread notifications count
 * @returns {Promise<number>} Count of unread notifications
 */
export const getUnreadCount = async () => {
  try {
    const response = await notificationsAPI.getUnreadCount()
    return response.data?.count || 0
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

/**
 * Create a new notification
 * @param {Object} notificationData - Notification data
 * @returns {Promise<Object|null>} Created notification object
 */
export const createNotification = async (notificationData) => {
  try {
    // Check if push notifications are enabled
    if (!isPushNotificationsEnabled()) {
      console.log('Push notifications are disabled')
      if (isEmailNotificationsEnabled()) {
        console.log('Email notification would be sent:', notificationData.title)
      }
      return null
    }

    const notification = {
      type: notificationData.type || 'info',
      title: notificationData.title || 'Notification',
      message: notificationData.description || notificationData.message || '',
      reference_type: notificationData.projectType || null,
      actions: notificationData.actions || [],
    }

    // Create via API - this will handle server-side logic
    window.dispatchEvent(new CustomEvent('notificationUpdated'))
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

/**
 * Mark a notification as read
 * @param {string|number} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
export const markAsRead = async (notificationId) => {
  try {
    await notificationsAPI.markAsRead(notificationId)
    window.dispatchEvent(new CustomEvent('notificationUpdated'))
    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

/**
 * Mark all notifications as read
 * @returns {Promise<boolean>} Success status
 */
export const markAllAsRead = async () => {
  try {
    await notificationsAPI.markAllAsRead()
    window.dispatchEvent(new CustomEvent('notificationUpdated'))
    return true
  } catch (error) {
    console.error('Error marking all as read:', error)
    return false
  }
}

/**
 * Delete a notification
 * @param {string|number} notificationId - Notification ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteNotification = async (notificationId) => {
  try {
    await notificationsAPI.delete(notificationId)
    window.dispatchEvent(new CustomEvent('notificationUpdated'))
    return true
  } catch (error) {
    console.error('Error deleting notification:', error)
    return false
  }
}

/**
 * Clear all notifications
 * @returns {Promise<boolean>} Success status
 */
export const clearAllNotifications = async () => {
  try {
    // Get all notifications and delete them
    const notifications = await getNotifications()
    for (const notif of notifications) {
      await notificationsAPI.delete(notif.id)
    }
    window.dispatchEvent(new CustomEvent('notificationUpdated'))
    return true
  } catch (error) {
    console.error('Error clearing notifications:', error)
    return false
  }
}

// Notification templates
export const NotificationTemplates = {
  taskAssigned: (taskTitle) => ({
    type: 'Info',
    title: 'New Task Assigned',
    description: `You have been assigned to task: ${taskTitle}`,
  }),

  taskCompleted: (taskTitle) => ({
    type: 'Success',
    title: 'Task Completed',
    description: `Task "${taskTitle}" has been marked as completed`,
  }),

  projectUpdated: (projectTitle) => ({
    type: 'Info',
    title: 'Project Updated',
    description: `Project "${projectTitle}" has been updated`,
  }),

  deadlineApproaching: (itemTitle, daysLeft) => ({
    type: 'Warning',
    title: 'Deadline Approaching',
    description: `"${itemTitle}" is due in ${daysLeft} days`,
  }),

  commentAdded: (itemTitle, commenterName) => ({
    type: 'Comment',
    title: 'New Comment',
    description: `${commenterName} commented on "${itemTitle}"`,
  }),
}

export default {
  getNotifications,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  NotificationTemplates,
}
