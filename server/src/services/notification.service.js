import NotificationModel from '../models/notification.model.js';

// Create notification for a single user
export const createNotification = async (userId, title, message, type = 'info', referenceType = null) => {
  try {
    return await NotificationModel.create({
      user_id: userId,
      title,
      message,
      type,
      reference_type: referenceType
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create notifications for multiple users
export const createBulkNotifications = async (userIds, title, message, type = 'info', referenceType = null) => {
  try {
    const promises = userIds.map(userId =>
      NotificationModel.create({
        user_id: userId,
        title,
        message,
        type,
        reference_type: referenceType
      })
    );
    return await Promise.all(promises);
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

// Notification templates
export const notifyProjectAssignment = async (userId, projectTitle) => {
  return createNotification(
    userId,
    'Project Assignment',
    `You have been assigned to project: ${projectTitle}`,
    'info',
    'project'
  );
};

export const notifyTaskAssignment = async (userId, taskTitle, projectTitle) => {
  return createNotification(
    userId,
    'New Task Assigned',
    `You have been assigned task "${taskTitle}" in project "${projectTitle}"`,
    'info',
    'task'
  );
};

export const notifyTaskCompletion = async (userId, taskTitle) => {
  return createNotification(
    userId,
    'Task Completed',
    `Task "${taskTitle}" has been marked as completed`,
    'success',
    'task'
  );
};

export const notifyProjectDeadline = async (userId, projectTitle, daysLeft) => {
  return createNotification(
    userId,
    'Project Deadline Approaching',
    `Project "${projectTitle}" is due in ${daysLeft} days`,
    'warning',
    'project'
  );
};

export const notifyTaskComment = async (userId, taskTitle, commenterName) => {
  return createNotification(
    userId,
    'New Comment',
    `${commenterName} commented on task "${taskTitle}"`,
    'info',
    'task_comment'
  );
};

export const notifyProjectStatusChange = async (userId, projectTitle, newStatus) => {
  return createNotification(
    userId,
    'Project Status Update',
    `Project "${projectTitle}" status changed to: ${newStatus}`,
    'info',
    'project'
  );
};

export default {
  createNotification,
  createBulkNotifications,
  notifyProjectAssignment,
  notifyTaskAssignment,
  notifyTaskCompletion,
  notifyProjectDeadline,
  notifyTaskComment,
  notifyProjectStatusChange
};
