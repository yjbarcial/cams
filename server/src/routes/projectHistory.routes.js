/**
 * Project History Routes
 * Routes for managing project version history
 */

import express from 'express'
import * as projectHistoryController from '../controllers/projectHistory.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// All history routes require authentication
router.use(authenticate)

// Get all history for a project
router.get('/:projectId/history', projectHistoryController.getProjectHistory)

// Create new history entry
router.post('/:projectId/history', projectHistoryController.createHistoryEntry)

// Get history statistics (must be before /:version to avoid route conflict)
router.get('/:projectId/history/statistics', projectHistoryController.getStatistics)

// Get specific version
router.get('/:projectId/history/:version', projectHistoryController.getVersion)

// Restore specific version
router.post('/:projectId/history/:version/restore', projectHistoryController.restoreVersion)

export default router
