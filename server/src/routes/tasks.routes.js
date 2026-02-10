import express from 'express';
import * as tasksController from '../controllers/tasks.controller.js';
import { authenticate } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.get('/', authenticate, tasksController.getAllTasks);
router.get('/:id', authenticate, tasksController.getTaskById);

router.post('/', 
  authenticate,
  auditLog('CREATE', 'tasks'),
  tasksController.createTask
);

router.put('/:id', 
  authenticate,
  auditLog('UPDATE', 'tasks'),
  tasksController.updateTask
);

router.delete('/:id', 
  authenticate,
  auditLog('DELETE', 'tasks'),
  tasksController.deleteTask
);

router.post('/:id/comments', 
  authenticate,
  auditLog('CREATE', 'task_comments'),
  tasksController.addTaskComment
);

export default router;
