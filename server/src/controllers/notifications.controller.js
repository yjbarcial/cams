import NotificationModel from '../models/notification.model.js';

export const getAllNotifications = async (req, res, next) => {
  try {
    const { is_read, type, limit } = req.query;
    const notifications = await NotificationModel.findAll(req.user.id, { 
      is_read: is_read === 'true' ? true : is_read === 'false' ? false : undefined, 
      type, 
      limit 
    });
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await NotificationModel.getUnreadCount(req.user.id);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await NotificationModel.markAsRead(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: { message: 'Notification not found' } });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const notifications = await NotificationModel.markAllAsRead(req.user.id);
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
};

export const createNotification = async (req, res, next) => {
  try {
    const notification = await NotificationModel.create(req.body);
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await NotificationModel.delete(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: { message: 'Notification not found' } });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};
