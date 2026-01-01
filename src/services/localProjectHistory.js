import { createProjectVersion as createProjectVersionRemote } from '@/services/supabaseProjectHistory.js'

/**
 * Local Project History Service
 * Handles version control, history tracking, and project snapshots using localStorage
 */

// History storage key pattern: {projectType}_project_history_{projectId}
const getHistoryKey = (projectType, projectId) => `${projectType}_project_history_${projectId}`

/**
 * Create a new project version snapshot
 * @param {string} projectType - Type of project (magazine, newsletter, folio, other)
 * @param {string} projectId - Unique project identifier
 * @param {Object} projectData - Current project data
 * @param {string} changeDescription - Description of changes made
 * @param {string} author - User who made the changes
 * @param {string} versionType - Type of version (draft, published, major, minor)
 * @returns {Object} Created version object
 */
export const createProjectVersion = (
  projectType,
  projectId,
  projectData,
  changeDescription,
  author,
  versionType = 'draft',
) => {
  try {
    const version = {
      id: `v${Date.now()}`,
      projectId,
      projectType,
      versionNumber: getNextVersionNumber(projectType, projectId),
      timestamp: new Date().toISOString(),
      author,
      changeDescription: changeDescription || 'No description provided',
      versionType, // draft, published, major, minor
      data: {
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
        metadata: {
          wordCount: projectData.content ? countWords(projectData.content) : 0,
          characterCount: projectData.content ? projectData.content.length : 0,
          lastModified: new Date().toISOString(),
        },
      },
      comments: [],
      tags: [],
      isActive: false,
    }

    // Save version to history
    const historyKey = getHistoryKey(projectType, projectId)
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')

    // Mark all previous versions as inactive
    existingHistory.forEach((v) => (v.isActive = false))

    // Add new version as active
    version.isActive = true
    existingHistory.unshift(version)

    // Keep only last 50 versions to prevent storage bloat
    const trimmedHistory = existingHistory.slice(0, 50)
    localStorage.setItem(historyKey, JSON.stringify(trimmedHistory))

    console.log('Version created successfully:', version)

    // Fire-and-forget sync to Supabase project history so UI-created projects also persist server-side.
    // Don't block the local save; log any sync errors.
    ;(async () => {
      console.log('Starting Supabase sync for project:', projectId, 'type:', projectType)
      console.log('Project data being sent:', JSON.stringify(projectData, null, 2))
      try {
        // Pass null as projectId so Supabase assigns its own serial id (avoid collisions with local timestamps)
        const result = await createProjectVersionRemote(
          projectType,
          null,
          projectData,
          changeDescription,
          author,
          versionType,
        )
        console.log(
          'Supabase sync: project version saved to Supabase for project',
          projectId,
          'Result:',
          result,
        )
      } catch (err) {
        console.error('Supabase sync failed for project', projectId, 'Error:', err)
        console.error('Error details:', err.message, err.details, err.hint)
      }
    })()

    return version
  } catch (error) {
    console.error('Error creating project version:', error)
    throw error
  }
}

/**
 * Get project history for a specific project
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @returns {Array} Array of version objects
 */
export const getProjectHistory = (projectType, projectId) => {
  try {
    const historyKey = getHistoryKey(projectType, projectId)
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]')
    return history
  } catch (error) {
    console.error('Error fetching project history:', error)
    return []
  }
}

/**
 * Get active (non-deleted) versions only
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @returns {Array} Array of active versions
 */
export const getActiveProjectHistory = (projectType, projectId) => {
  return getProjectHistory(projectType, projectId)
}

/**
 * Get a specific version by ID
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} versionId - Version identifier
 * @returns {Object|null} Version object or null if not found
 */
export const getProjectVersion = (projectType, projectId, versionId) => {
  try {
    const history = getProjectHistory(projectType, projectId)
    return history.find((v) => v.id === versionId) || null
  } catch (error) {
    console.error('Error fetching project version:', error)
    return null
  }
}

/**
 * Restore a project to a specific version
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} versionId - Version to restore to
 * @returns {Object} Restored project data
 */
export const restoreProjectVersion = (projectType, projectId, versionId) => {
  try {
    // Get the version to restore
    const version = getProjectVersion(projectType, projectId, versionId)
    if (!version) {
      throw new Error('Version not found')
    }

    // Update the main project in localStorage
    const storageKey = `${projectType}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const projectIndex = projects.findIndex((p) => p.id == projectId)

    if (projectIndex !== -1) {
      // Update project with restored data
      projects[projectIndex] = {
        ...projects[projectIndex],
        ...version.data,
        id: projectId,
        lastModified: new Date().toLocaleString(),
      }
      localStorage.setItem(storageKey, JSON.stringify(projects))
    }

    // Create a new version entry for the restoration
    const restoredProject = {
      ...version.data,
      id: projectId,
      type: projectType,
      lastModified: new Date().toLocaleString(),
      lastModifiedISO: new Date().toISOString(),
    }

    const restorationVersion = createProjectVersion(
      projectType,
      projectId,
      restoredProject,
      `Restored from version ${version.versionNumber}`,
      'Current User', // This should come from auth system
      'restoration',
    )

    return restoredProject
  } catch (error) {
    console.error('Error restoring version:', error)
    throw error
  }
}

/**
 * Add a comment to a specific version
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} versionId - Version identifier
 * @param {string} comment - Comment text
 * @param {string} author - Comment author
 * @returns {Object} Updated version
 */
export const addVersionComment = (projectType, projectId, versionId, comment, author) => {
  try {
    const historyKey = getHistoryKey(projectType, projectId)
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]')
    const versionIndex = history.findIndex((v) => v.id === versionId)

    if (versionIndex !== -1) {
      const newComment = {
        id: `c${Date.now()}`,
        author,
        content: comment,
        timestamp: new Date().toISOString(),
        isApproved: false,
      }

      history[versionIndex].comments.push(newComment)
      localStorage.setItem(historyKey, JSON.stringify(history))

      return history[versionIndex]
    }
    return null
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

/**
 * Delete a specific version (soft delete)
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} versionId - Version identifier
 * @returns {boolean} Success status
 */
export const deleteProjectVersion = (projectType, projectId, versionId) => {
  try {
    const historyKey = getHistoryKey(projectType, projectId)
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]')
    const versionIndex = history.findIndex((v) => v.id === versionId)

    if (versionIndex !== -1) {
      history[versionIndex].isDeleted = true
      history[versionIndex].deletedAt = new Date().toISOString()
      localStorage.setItem(historyKey, JSON.stringify(history))
      return true
    }
    return false
  } catch (error) {
    console.error('Error deleting version:', error)
    return false
  }
}

/**
 * Get project statistics
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @returns {Object} Project statistics
 */
export const getProjectStatistics = (projectType, projectId) => {
  try {
    const versions = getProjectHistory(projectType, projectId)
    const activeVersions = versions.filter((v) => !v.isDeleted)

    if (activeVersions.length === 0) {
      return {
        totalVersions: 0,
        totalComments: 0,
        firstVersion: null,
        lastVersion: null,
        averageWordsPerVersion: 0,
        versionTypes: {},
      }
    }

    const totalComments = activeVersions.reduce((sum, v) => sum + (v.comments?.length || 0), 0)
    const totalWords = activeVersions.reduce(
      (sum, v) => sum + (v.data?.metadata?.wordCount || 0),
      0,
    )
    const versionTypes = activeVersions.reduce((acc, v) => {
      acc[v.versionType] = (acc[v.versionType] || 0) + 1
      return acc
    }, {})

    return {
      totalVersions: activeVersions.length,
      totalComments,
      firstVersion: activeVersions[activeVersions.length - 1],
      lastVersion: activeVersions[0],
      averageWordsPerVersion: Math.round(totalWords / activeVersions.length),
      versionTypes,
    }
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return {
      totalVersions: 0,
      totalComments: 0,
      firstVersion: null,
      lastVersion: null,
      averageWordsPerVersion: 0,
      versionTypes: {},
    }
  }
}

/**
 * Compare two versions and return differences
 * @param {Object} version1 - First version
 * @param {Object} version2 - Second version
 * @returns {Object} Comparison result
 */
export const compareVersions = (version1, version2) => {
  const differences = {
    title: version1.data.title !== version2.data.title,
    description: version1.data.description !== version2.data.description,
    content: version1.data.content !== version2.data.content,
    status: version1.data.status !== version2.data.status,
    sectionHead: version1.data.sectionHead !== version2.data.sectionHead,
    writers: version1.data.writers !== version2.data.writers,
    artists: version1.data.artists !== version2.data.artists,
    dueDate: version1.data.dueDate !== version2.data.dueDate,
  }

  const changedFields = Object.keys(differences).filter((key) => differences[key])

  return {
    hasChanges: changedFields.length > 0,
    changedFields,
    differences,
    version1: {
      id: version1.id,
      versionNumber: version1.versionNumber,
      timestamp: version1.timestamp,
      author: version1.author,
    },
    version2: {
      id: version2.id,
      versionNumber: version2.versionNumber,
      timestamp: version2.timestamp,
      author: version2.author,
    },
  }
}

/**
 * Get next version number for a project
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @returns {number} Next version number
 */
const getNextVersionNumber = (projectType, projectId) => {
  try {
    const history = getProjectHistory(projectType, projectId)
    if (history.length === 0) return 1
    return Math.max(...history.map((v) => v.versionNumber)) + 1
  } catch (error) {
    console.error('Error getting next version number:', error)
    return 1
  }
}

/**
 * Count words in content (basic implementation)
 * @param {string} content - HTML content
 * @returns {number} Word count
 */
const countWords = (content) => {
  const textContent = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return textContent.split(' ').filter((word) => word.length > 0).length
}

/**
 * Get current user name from localStorage or default
 * @returns {string} Current user name
 */
const getCurrentUser = () => {
  try {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}')
    return user.name || user.email || 'Current User'
  } catch {
    return 'Current User'
  }
}

/**
 * Calculate content diff between old and new content
 * @param {string} oldContent - Old HTML content
 * @param {string} newContent - New HTML content
 * @returns {string} Description of changes
 */
const calculateContentDiff = (oldContent, newContent) => {
  if (!oldContent) return 'Initial version'

  const oldText = oldContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const newText = newContent
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const oldWords = oldText.split(' ').filter((w) => w.length > 0)
  const newWords = newText.split(' ').filter((w) => w.length > 0)

  const wordDiff = newWords.length - oldWords.length

  if (wordDiff > 0) {
    return `Added ${wordDiff} word${wordDiff !== 1 ? 's' : ''}`
  } else if (wordDiff < 0) {
    return `Removed ${Math.abs(wordDiff)} word${Math.abs(wordDiff) !== 1 ? 's' : ''}`
  } else if (oldText !== newText) {
    return 'Content modified'
  }

  return 'No content changes'
}

/**
 * Auto-create version on content edit (like Google Docs)
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {Object} projectData - Current project data
 * @param {string} oldContent - Previous content for comparison
 * @returns {Object|null} Created version or null if no significant changes
 */
export const autoCreateVersionOnEdit = (projectType, projectId, projectData, oldContent) => {
  try {
    const newContent = projectData.content || ''
    const changeDescription = calculateContentDiff(oldContent, newContent)

    // Only create version if there are meaningful changes
    if (changeDescription === 'No content changes' || changeDescription === 'Initial version') {
      return null
    }

    // Get last version to avoid creating too many versions
    const history = getProjectHistory(projectType, projectId)
    const lastVersion = history[0]

    // Don't create version if last version was created less than 30 seconds ago
    // and has similar content (to prevent spam)
    if (lastVersion) {
      const lastVersionTime = new Date(lastVersion.timestamp).getTime()
      const now = Date.now()
      const timeDiff = now - lastVersionTime

      if (timeDiff < 30000) {
        // 30 seconds
        const lastContent = lastVersion.data?.content || ''
        const lastText = lastContent
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        const newText = newContent
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()

        // If content is very similar, skip version creation
        if (lastText === newText) {
          return null
        }
      }
    }

    const author = getCurrentUser()
    return createProjectVersion(
      projectType,
      projectId,
      projectData,
      changeDescription,
      author,
      'draft',
    )
  } catch (error) {
    console.error('Error auto-creating version:', error)
    return null
  }
}
