import express from 'express';
import * as archivesController from '../controllers/archives.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

// Public routes
router.get('/', archivesController.getAllArchives);
router.get('/:id', archivesController.getArchiveById);

// Protected routes
router.post('/', 
  authenticate, 
  auditLog('CREATE', 'archives'),
  archivesController.createArchive
);

router.put('/:id', 
  authenticate, 
  authorize('admin', 'editor'),
  auditLog('UPDATE', 'archives'),
  archivesController.updateArchive
);

router.delete('/:id', 
  authenticate, 
  authorize('admin'),
  auditLog('DELETE', 'archives'),
  archivesController.deleteArchive
);

export default router;
