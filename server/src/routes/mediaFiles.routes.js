import express from 'express';
import * as mediaFilesController from '../controllers/mediaFiles.controller.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.get('/', authenticate, mediaFilesController.getAllMediaFiles);
router.get('/:id', authenticate, mediaFilesController.getMediaFileById);

router.post('/', 
  authenticate,
  upload.single('file'),
  auditLog('CREATE', 'media_files'),
  mediaFilesController.uploadMediaFile
);

router.delete('/:id', 
  authenticate,
  auditLog('DELETE', 'media_files'),
  mediaFilesController.deleteMediaFile
);

export default router;
