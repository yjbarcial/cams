import express from 'express';
import * as departmentsController from '../controllers/departments.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.get('/', authenticate, departmentsController.getAllDepartments);
router.get('/:id', authenticate, departmentsController.getDepartmentById);

router.post('/', 
  authenticate, 
  authorize('admin'),
  auditLog('CREATE', 'departments'),
  departmentsController.createDepartment
);

router.put('/:id', 
  authenticate, 
  authorize('admin'),
  auditLog('UPDATE', 'departments'),
  departmentsController.updateDepartment
);

router.delete('/:id', 
  authenticate, 
  authorize('admin'),
  auditLog('DELETE', 'departments'),
  departmentsController.deleteDepartment
);

export default router;
