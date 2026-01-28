import express from 'express';
import * as notificationsController from '../controllers/notifications.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, notificationsController.getAllNotifications);
router.get('/unread-count', authenticate, notificationsController.getUnreadCount);

router.post('/', 
  authenticate, 
  authorize('admin'),
  notificationsController.createNotification
);

router.put('/:id/read', authenticate, notificationsController.markAsRead);
router.put('/read-all', authenticate, notificationsController.markAllAsRead);

router.delete('/:id', authenticate, notificationsController.deleteNotification);

export default router;
