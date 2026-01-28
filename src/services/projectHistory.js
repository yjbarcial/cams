/**
 * Project History Service
 * Handles version control, history tracking, and project snapshots using backend API
 */

import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000/api'

// Get auth token
const getAuthToken = () => localStorage.getItem('authToken')

// Create axios instance with auth
const createAuthClient = () => {
  const token = getAuthToken()
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Count words in text (helper function)
 */
const countWords = (text) => {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Create a new project version snapshot
 * @param {string} projectType - Type of project (magazine, newsletter, folio, other) - kept for compatibility
 * @param {string} projectId - Unique project identifier
 * @param {Object} projectData - Current project data
 * @param {string} changeDescription - Description of changes made
 * @param {string} author - User who made the changes (not used, taken from auth)
 * @param {string} versionType - Type of version (draft, published, major, minor)
 * @returns {Promise<Object>} Created version object
 */
export const createProjectVersion = async (
  projectType,
  projectId,
  projectData,
  changeDescription,
  author,
  versionType = 'draft',
) => {
  try {
    const client = createAuthClient()
    
    const historyData = {
      change_description: changeDescription || 'No description provided',
      project_data: {
        title: projectData.title,
        description: projectData.description,
        content: projectData.content || '',
        status: projectData.status,
        sectionHead: projectData.sectionHead,
        writers: projectData.writers,
        artists: projectData.artists,
        dueDate: projectData.dueDate,
        dueDateISO: projectData.dueDateISO,
        mediaUploaded: projectData.mediaUploaded,
      },
      metadata: {
        projectType,
        versionType,
        wordCount: projectData.content ? countWords(projectData.content) : 0,
        characterCount: projectData.content ? projectData.content.length : 0,
        lastModified: new Date().toISOString(),
      }
    }
    
    const response = await client.post(`/projects/${projectId}/history`, historyData)
    return response.data.data
  } catch (error) {
    console.error('Error creating project version:', error)
    throw error
  }
}

/**
 * Get project history for a specific project
 * @param {string} projectType - Type of project (not used in API but kept for compatibility)
 * @param {string} projectId - Project identifier
 * @returns {Promise<Array>} Array of version objects
 */
export const getProjectHistory = async (projectType, projectId) => {
  try {
    const client = createAuthClient()
    const response = await client.get(`/projects/${projectId}/history`)
    return response.data.data
  } catch (error) {
    console.error('Error getting project history:', error)
    return []
  }
}

/**
 * Get a specific version by version number
 * @param {string} projectType - Type of project (not used in API but kept for compatibility)
 * @param {string} projectId - Project identifier
 * @param {number} versionNumber - Version number
 * @returns {Promise<Object|null>} Version object or null if not found
 */
export const getProjectVersion = async (projectType, projectId, versionNumber) => {
  try {
    const client = createAuthClient()
    const response = await client.get(`/projects/${projectId}/history/${versionNumber}`)
    return response.data.data
  } catch (error) {
    console.error('Error getting project version:', error)
    return null
  }
}

/**
 * Restore a project to a specific version
 * @param {string} projectType - Type of project (not used in API but kept for compatibility)
 * @param {string} projectId - Project identifier
 * @param {number} versionNumber - Version number to restore
 * @returns {Promise<Object>} Restored project object
 */
export const restoreProjectVersion = async (projectType, projectId, versionNumber) => {
  try {
    const client = createAuthClient()
    const response = await client.post(`/projects/${projectId}/history/${versionNumber}/restore`)
    return response.data.data
  } catch (error) {
    console.error('Error restoring project version:', error)
    throw error
  }
}
/**
 * Get project history statistics
 * @param {string} projectType - Type of project (not used in API but kept for compatibility)
 * @param {string} projectId - Project identifier
 * @returns {Promise<Object>} Project statistics
 */
export const getProjectStatistics = async (projectType, projectId) => {
  try {
    const client = createAuthClient()
    const response = await client.get(`/projects/${projectId}/history/statistics`)
    return response.data.data
  } catch (error) {
    console.error('Error getting project statistics:', error)
    return {
      total_versions: 0,
      latest_version: 0,
      first_change: null,
      last_change: null,
      unique_contributors: 0
    }
  }
}

/**
 * Compare two versions
 * @param {Object} version1 - First version
 * @param {Object} version2 - Second version
 * @returns {Object} Comparison result
 */
export const compareVersions = (version1, version2) => {
  const data1 = version1.project_data || {}
  const data2 = version2.project_data || {}
  
  const differences = {
    title: data1.title !== data2.title,
    description: data1.description !== data2.description,
    content: data1.content !== data2.content,
    status: data1.status !== data2.status,
    sectionHead: data1.sectionHead !== data2.sectionHead,
    writers: data1.writers !== data2.writers,
    artists: data1.artists !== data2.artists,
    dueDate: data1.dueDate !== data2.dueDate,
  }

  const changedFields = Object.keys(differences).filter((key) => differences[key])

  return {
    hasChanges: changedFields.length > 0,
    changedFields,
    differences,
    version1: {
      id: version1.id,
      versionNumber: version1.version_number,
      timestamp: version1.created_at,
      author: version1.author_email || 'Unknown',
    },
    version2: {
      id: version2.id,
      versionNumber: version2.version_number,
      timestamp: version2.created_at,
      author: version2.author_email || 'Unknown',
    },
  }
}

/**
 * Delete a specific version (soft delete by marking as deleted)
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} versionId - Version identifier
 * @returns {boolean} Success status
 */
export const deleteProjectVersion = (projectType, projectId, versionId) => {
  const history = getProjectHistory(projectType, projectId)
  const versionIndex = history.findIndex((v) => v.id === versionId)

  if (versionIndex === -1) return false

  // Mark as deleted instead of removing
  history[versionIndex].isDeleted = true
  history[versionIndex].deletedAt = new Date().toISOString()

  const historyKey = getHistoryKey(projectType, projectId)
  localStorage.setItem(historyKey, JSON.stringify(history))

  return true
}

/**
 * Get active (non-deleted) versions only
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @returns {Array} Array of active versions
 */
export const getActiveProjectHistory = (projectType, projectId) => {
  const history = getProjectHistory(projectType, projectId)
  return history.filter((v) => !v.isDeleted)
}
