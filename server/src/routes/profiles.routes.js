import express from 'express';
import * as profilesController from '../controllers/profiles.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.get('/', authenticate, profilesController.getAllProfiles);
router.get('/me', authenticate, profilesController.getCurrentProfile);
router.get('/:id', authenticate, profilesController.getProfileById);

router.post('/', 
  authenticate, 
  authorize('admin'),
  auditLog('CREATE', 'profiles'),
  profilesController.createProfile
);

router.put('/:id', 
  authenticate,
  auditLog('UPDATE', 'profiles'),
  profilesController.updateProfile
);

router.delete('/:id', 
  authenticate, 
  authorize('admin'),
  auditLog('DELETE', 'profiles'),
  profilesController.deleteProfile
);

export default router;
