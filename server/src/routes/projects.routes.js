import express from 'express';
import * as projectsController from '../controllers/projects.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.get('/', authenticate, projectsController.getAllProjects);
router.get('/:id', authenticate, projectsController.getProjectById);

router.post('/', 
  authenticate,
  auditLog('CREATE', 'projects'),
  projectsController.createProject
);

router.put('/:id', 
  authenticate,
  auditLog('UPDATE', 'projects'),
  projectsController.updateProject
);

router.delete('/:id', 
  authenticate, 
  authorize('admin', 'section_head'),
  auditLog('DELETE', 'projects'),
  projectsController.deleteProject
);

router.post('/:id/members', 
  authenticate,
  auditLog('CREATE', 'project_members'),
  projectsController.addProjectMember
);

router.delete('/:id/members/:userId', 
  authenticate,
  auditLog('DELETE', 'project_members'),
  projectsController.removeProjectMember
);

export default router;
