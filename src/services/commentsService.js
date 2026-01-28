/**
 * Comments Service
 * Handles project comments using backend API
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
 * Get comments for a specific project
 * @param {string} projectType - Type of project (not used in API but kept for compatibility)
 * @param {string} projectId - Project identifier
 * @returns {Promise<Array>} Array of comment objects
 */
export const getProjectComments = async (projectType, projectId) => {
  try {
    const client = createAuthClient()
    const response = await client.get(`/projects/${projectId}/comments`)
    
    // Map API response to match expected frontend format
    return response.data.data.map(comment => ({
      id: comment.id.toString(),
      author: comment.author,
      content: comment.content,
      timestamp: comment.created_at,
      isApproved: comment.is_approved,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author)}&background=random&color=fff&size=40`
    }))
  } catch (error) {
    console.error('Error loading comments:', error)
    return []
  }
}

/**
 * Add a comment to a project
 * @param {string} projectType - Type of project (not used in API but kept for compatibility)
 * @param {string} projectId - Project identifier
 * @param {string} content - Comment content
 * @param {string} author - Comment author
 * @returns {Promise<Object>} Created comment object
 */
export const addProjectComment = async (projectType, projectId, content, author) => {
  try {
    const client = createAuthClient()
    const response = await client.post(`/projects/${projectId}/comments`, {
      content: content.trim(),
      author
    })
    
    const comment = response.data.data
    return {
      id: comment.id.toString(),
      author: comment.author,
      content: comment.content,
      timestamp: comment.created_at,
      isApproved: comment.is_approved,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author)}&background=random&color=fff&size=40`
    }
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

/**
 * Update a comment
 * @param {string} projectType - Type of project (not used in API but kept for compatibility)
 * @param {string} projectId - Project identifier
 * @param {string} commentId - Comment identifier
 * @param {string} content - New comment content
 * @returns {Promise<boolean>} Success status
 */
export const updateProjectComment = async (projectType, projectId, commentId, content) => {
  try {
    const client = createAuthClient()
    await client.put(`/projects/${projectId}/comments/${commentId}`, {
      content: content.trim()
    })
    return true
  } catch (error) {
    console.error('Error updating comment:', error)
    return false
  }
}

/**
 * Delete a comment
 * @param {string} projectType - Type of project (not used in API but kept for compatibility)
 * @param {string} projectId - Project identifier
 * @param {string} commentId - Comment identifier
 * @returns {Promise<boolean>} Success status
 */
export const deleteProjectComment = async (projectType, projectId, commentId) => {
  try {
    const client = createAuthClient()
    await client.delete(`/projects/${projectId}/comments/${commentId}`)
    return true
  } catch (error) {
    console.error('Error deleting comment:', error)
    return false
  }
}

/**
 * Toggle comment approval status
 * @param {string} projectType - Type of project (not used in API but kept for compatibility)
 * @param {string} projectId - Project identifier
 * @param {string} commentId - Comment identifier
 * @returns {Promise<boolean>} Success status
 */
export const toggleCommentApproval = async (projectType, projectId, commentId) => {
  try {
    // First get current comments to find the comment
    const comments = await getProjectComments(projectType, projectId)
    const comment = comments.find(c => c.id === commentId)
    
    if (!comment) {
      return false
    }
    
    const client = createAuthClient()
    await client.put(`/projects/${projectId}/comments/${commentId}`, {
      is_approved: !comment.isApproved
    })
    return true
  } catch (error) {
    console.error('Error toggling comment approval:', error)
    return false
  }
}

/**
 * Get comment statistics for a project
 * @param {string} projectType - Type of project (not used in API but kept for compatibility)
 * @param {string} projectId - Project identifier
 * @returns {Promise<Object>} Comment statistics
 */
export const getCommentStatistics = async (projectType, projectId) => {
  try {
    const comments = await getProjectComments(projectType, projectId)
    const approvedCount = comments.filter((c) => c.isApproved).length
    const pendingCount = comments.length - approvedCount

    return {
      totalComments: comments.length,
      approvedComments: approvedCount,
      pendingComments: pendingCount,
      latestComment: comments.length > 0 ? comments[0] : null,
    }
  } catch (error) {
    console.error('Error getting comment statistics:', error)
    return {
      totalComments: 0,
      approvedComments: 0,
      pendingComments: 0,
      latestComment: null,
    }
  }
}
