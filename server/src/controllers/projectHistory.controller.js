/**
 * Project History Controller
 * Handles HTTP requests for project version history
 */

import * as ProjectHistory from '../models/projectHistory.model.js'

/**
 * Get all history entries for a project
 * GET /api/projects/:projectId/history
 */
export const getProjectHistory = async (req, res, next) => {
  try {
    const { projectId } = req.params
    const history = await ProjectHistory.getByProjectId(projectId)
    
    res.json({
      success: true,
      data: history
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Create a new history entry
 * POST /api/projects/:projectId/history
 */
export const createHistoryEntry = async (req, res, next) => {
  try {
    const { projectId } = req.params
    const { change_description, project_data, metadata } = req.body
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      })
    }
    
    // Get latest version number and increment
    const latestVersion = await ProjectHistory.getLatestVersion(projectId)
    const newVersionNumber = latestVersion + 1
    
    const historyData = {
      project_id: projectId,
      version_number: newVersionNumber,
      change_description: change_description || 'Project updated',
      author_id: userId,
      project_data,
      metadata,
      is_active: true
    }
    
    const historyEntry = await ProjectHistory.create(historyData)
    
    res.status(201).json({
      success: true,
      data: historyEntry
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get specific version
 * GET /api/projects/:projectId/history/:version
 */
export const getVersion = async (req, res, next) => {
  try {
    const { projectId, version } = req.params
    const historyEntry = await ProjectHistory.getVersion(projectId, parseInt(version))
    
    if (!historyEntry) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      })
    }
    
    res.json({
      success: true,
      data: historyEntry
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Restore project to specific version
 * POST /api/projects/:projectId/history/:version/restore
 */
export const restoreVersion = async (req, res, next) => {
  try {
    const { projectId, version } = req.params
    const restoredProject = await ProjectHistory.restoreVersion(projectId, parseInt(version))
    
    res.json({
      success: true,
      data: restoredProject,
      message: `Project restored to version ${version}`
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get history statistics
 * GET /api/projects/:projectId/history/statistics
 */
export const getStatistics = async (req, res, next) => {
  try {
    const { projectId } = req.params
    const stats = await ProjectHistory.getStatistics(projectId)
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    next(error)
  }
}
