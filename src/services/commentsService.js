/**
 * Comments Service
 * Handles project comments using localStorage
 */

// Comments storage key pattern: {projectType}_project_comments_{projectId}
const getCommentsKey = (projectType, projectId) => `${projectType}_project_comments_${projectId}`

/**
 * Get comments for a specific project
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @returns {Array} Array of comment objects
 */
export const getProjectComments = (projectType, projectId) => {
  try {
    const commentsKey = getCommentsKey(projectType, projectId)
    const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]')
    return comments
  } catch (error) {
    console.error('Error loading comments:', error)
    return []
  }
}

/**
 * Add a comment to a project
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} content - Comment content
 * @param {string} author - Comment author
 * @returns {Object} Created comment object
 */
export const addProjectComment = (projectType, projectId, content, author) => {
  try {
    const commentsKey = getCommentsKey(projectType, projectId)
    const existingComments = JSON.parse(localStorage.getItem(commentsKey) || '[]')

    const newComment = {
      id: `c${Date.now()}`,
      author,
      content: content.trim(),
      timestamp: new Date().toISOString(),
      isApproved: false,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=random&color=fff&size=40`,
    }

    existingComments.unshift(newComment) // Add to beginning
    localStorage.setItem(commentsKey, JSON.stringify(existingComments))

    console.log('Comment added successfully:', newComment)
    return newComment
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

/**
 * Update a comment
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} commentId - Comment identifier
 * @param {string} content - New comment content
 * @returns {boolean} Success status
 */
export const updateProjectComment = (projectType, projectId, commentId, content) => {
  try {
    const commentsKey = getCommentsKey(projectType, projectId)
    const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]')

    const commentIndex = comments.findIndex((c) => c.id === commentId)
    if (commentIndex !== -1) {
      comments[commentIndex].content = content.trim()
      comments[commentIndex].timestamp = new Date().toISOString()
      localStorage.setItem(commentsKey, JSON.stringify(comments))
      return true
    }
    return false
  } catch (error) {
    console.error('Error updating comment:', error)
    return false
  }
}

/**
 * Delete a comment
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} commentId - Comment identifier
 * @returns {boolean} Success status
 */
export const deleteProjectComment = (projectType, projectId, commentId) => {
  try {
    const commentsKey = getCommentsKey(projectType, projectId)
    const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]')

    const filteredComments = comments.filter((c) => c.id !== commentId)
    localStorage.setItem(commentsKey, JSON.stringify(filteredComments))
    return true
  } catch (error) {
    console.error('Error deleting comment:', error)
    return false
  }
}

/**
 * Toggle comment approval status
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} commentId - Comment identifier
 * @returns {boolean} Success status
 */
export const toggleCommentApproval = (projectType, projectId, commentId) => {
  try {
    const commentsKey = getCommentsKey(projectType, projectId)
    const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]')

    const commentIndex = comments.findIndex((c) => c.id === commentId)
    if (commentIndex !== -1) {
      comments[commentIndex].isApproved = !comments[commentIndex].isApproved
      localStorage.setItem(commentsKey, JSON.stringify(comments))
      return true
    }
    return false
  } catch (error) {
    console.error('Error toggling comment approval:', error)
    return false
  }
}

/**
 * Get comment statistics for a project
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @returns {Object} Comment statistics
 */
export const getCommentStatistics = (projectType, projectId) => {
  try {
    const comments = getProjectComments(projectType, projectId)
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
