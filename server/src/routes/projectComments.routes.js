/**
 * Project Comments Routes
 * Routes for managing project comments
 */

import express from 'express'
import * as projectCommentsController from '../controllers/projectComments.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// All comment routes require authentication
router.use(authenticate)

// Get all comments for a project
router.get('/:projectId/comments', projectCommentsController.getProjectComments)

// Create a new comment
router.post('/:projectId/comments', projectCommentsController.createComment)

// Update a comment
router.put('/:projectId/comments/:id', projectCommentsController.updateComment)

// Delete a comment
router.delete('/:projectId/comments/:id', projectCommentsController.deleteComment)

export default router
