import express from 'express';
import * as positionsController from '../controllers/positions.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { auditLog } from '../middleware/auditLog.js';

const router = express.Router();

router.get('/', authenticate, positionsController.getAllPositions);
router.get('/:id', authenticate, positionsController.getPositionById);
router.get('/department/:departmentId', authenticate, positionsController.getPositionsByDepartment);

router.post('/', 
  authenticate, 
  authorize('admin'),
  auditLog('CREATE', 'positions'),
  positionsController.createPosition
);

router.put('/:id', 
  authenticate, 
  authorize('admin'),
  auditLog('UPDATE', 'positions'),
  positionsController.updatePosition
);

router.delete('/:id', 
  authenticate, 
  authorize('admin'),
  auditLog('DELETE', 'positions'),
  positionsController.deletePosition
);

export default router;
