import express from 'express';
import * as auditLogsController from '../controllers/auditLogs.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', 
  authenticate, 
  authorize('admin'),
  auditLogsController.getAllAuditLogs
);

router.get('/:id', 
  authenticate, 
  authorize('admin'),
  auditLogsController.getAuditLogById
);

export default router;
