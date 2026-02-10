/**
 * Project Comments Controller
 * Handles HTTP requests for project comments
 */

import * as ProjectComment from '../models/projectComment.model.js'

/**
 * Get all comments for a project
 * GET /api/projects/:projectId/comments
 */
export const getProjectComments = async (req, res, next) => {
  try {
    const { projectId } = req.params
    const comments = await ProjectComment.getByProjectId(projectId)
    
    res.json({
      success: true,
      data: comments
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create a new comment
 * POST /api/projects/:projectId/comments
 */
export const createComment = async (req, res, next) => {
  try {
    const { projectId } = req.params
    const { content, author } = req.body
    const userId = req.user?.id || null
    
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      })
    }
    
    if (!author) {
      return res.status(400).json({
        success: false,
        message: 'Comment author is required'
      })
    }
    
    const commentData = {
      project_id: projectId,
      user_id: userId,
      author,
      content: content.trim(),
      is_approved: false
    }
    
    const comment = await ProjectComment.create(commentData)
    
    res.status(201).json({
      success: true,
      data: comment
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Update a comment
 * PUT /api/projects/:projectId/comments/:id
 */
export const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params
    const { content, is_approved } = req.body
    
    const existingComment = await ProjectComment.getById(id)
    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      })
    }
    
    const commentData = {
      content: content?.trim(),
      is_approved
    }
    
    const updatedComment = await ProjectComment.update(id, commentData)
    
    res.json({
      success: true,
      data: updatedComment
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete a comment
 * DELETE /api/projects/:projectId/comments/:id
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params
    
    const existingComment = await ProjectComment.getById(id)
    if (!existingComment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      })
    }
    
    await ProjectComment.deleteComment(id)
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    })
  } catch (error) {
    next(error)
  }
}
