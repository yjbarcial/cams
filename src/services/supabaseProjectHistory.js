/**
 * Supabase Project History Service
 * Handles version control, history tracking, and project snapshots using Supabase
 */

import { supabase } from '@/utils/supabase.js'

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
export const createProjectVersion = async (
  projectType,
  projectId,
  projectData,
  changeDescription,
  author,
  versionType = 'draft',
) => {
  try {
    // First, ensure the project exists in Supabase
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single()

    if (projectError && projectError.code !== 'PGRST116') {
      throw projectError
    }

    // If project doesn't exist, create it
    if (!project) {
      // Only set the explicit id when projectId is a valid positive integer.
      // The projects.id column is BIGSERIAL; inserting a non-numeric id will cause errors.
      const parsedId = Number(projectId)
      const shouldIncludeId = Number.isInteger(parsedId) && parsedId > 0

      const insertPayload = {
        title: projectData.title,
        description: projectData.description,
        content: projectData.content || '',
        status: projectData.status,
        section_head: projectData.sectionHead,
        writers: projectData.writers,
        artists: projectData.artists,
        due_date: projectData.dueDateISO
          ? new Date(projectData.dueDateISO).toISOString().split('T')[0]
          : null,
        due_date_iso: projectData.dueDateISO,
        media_uploaded: projectData.mediaUploaded,
        project_type: projectType,
        is_starred: projectData.isStarred || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      if (shouldIncludeId) {
        insertPayload.id = parsedId
      }

      const { data: newProject, error: createError } = await supabase
        .from('projects')
        .insert(insertPayload)
        .select()
        .single()

      if (createError) throw createError
    }

    // Get next version number
    const { data: versions } = await supabase
      .from('project_history')
      .select('version_number')
      .eq('project_id', projectId)
      .order('version_number', { ascending: false })
      .limit(1)

    const nextVersionNumber = versions?.length > 0 ? versions[0].version_number + 1 : 1

    // Mark all previous versions as inactive
    await supabase.from('project_history').update({ is_active: false }).eq('project_id', projectId)

    // Create new version
    const versionData = {
      project_id: projectId,
      version_number: nextVersionNumber,
      version_type: versionType,
      change_description: changeDescription || 'No description provided',
      author,
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
        wordCount: projectData.content ? countWords(projectData.content) : 0,
        characterCount: projectData.content ? projectData.content.length : 0,
        lastModified: new Date().toISOString(),
      },
      is_active: true,
      created_at: new Date().toISOString(),
    }

    const { data: version, error } = await supabase
      .from('project_history')
      .insert(versionData)
      .select(
        `
        *,
        project_history_comments (*)
      `,
      )
      .single()

    if (error) throw error

    // Transform to match the expected format
    return transformVersionFromDB(version)
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
export const getProjectHistory = async (projectType, projectId) => {
  try {
    const { data, error } = await supabase
      .from('project_history')
      .select(
        `
        *,
        project_history_comments (*)
      `,
      )
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(transformVersionFromDB)
  } catch (error) {
    console.error('Error fetching project history:', error)
    throw error
  }
}

/**
 * Get active (non-deleted) versions only
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @returns {Array} Array of active versions
 */
export const getActiveProjectHistory = async (projectType, projectId) => {
  return await getProjectHistory(projectType, projectId)
}

/**
 * Get a specific version by ID
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} versionId - Version identifier
 * @returns {Object|null} Version object or null if not found
 */
export const getProjectVersion = async (projectType, projectId, versionId) => {
  try {
    const { data, error } = await supabase
      .from('project_history')
      .select(
        `
        *,
        project_history_comments (*)
      `,
      )
      .eq('id', versionId)
      .eq('project_id', projectId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return transformVersionFromDB(data)
  } catch (error) {
    console.error('Error fetching project version:', error)
    throw error
  }
}

/**
 * Restore a project to a specific version
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} versionId - Version to restore to
 * @returns {Object} Restored project data
 */
export const restoreProjectVersion = async (projectType, projectId, versionId) => {
  try {
    // Get the version to restore
    const version = await getProjectVersion(projectType, projectId, versionId)
    if (!version) {
      throw new Error('Version not found')
    }

    // Update the main project
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        title: version.data.title,
        description: version.data.description,
        content: version.data.content,
        status: version.data.status,
        section_head: version.data.sectionHead,
        writers: version.data.writers,
        artists: version.data.artists,
        due_date: version.data.dueDateISO
          ? new Date(version.data.dueDateISO).toISOString().split('T')[0]
          : null,
        due_date_iso: version.data.dueDateISO,
        media_uploaded: version.data.mediaUploaded,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)

    if (updateError) throw updateError

    // Create a new version entry for the restoration
    const restoredProject = {
      ...version.data,
      id: projectId,
      type: projectType,
      lastModified: new Date().toLocaleString(),
      lastModifiedISO: new Date().toISOString(),
    }

    const restorationVersion = await createProjectVersion(
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
export const addVersionComment = async (projectType, projectId, versionId, comment, author) => {
  try {
    const { data, error } = await supabase
      .from('project_history_comments')
      .insert({
        project_history_id: versionId,
        author,
        content: comment,
        is_approved: false,
      })
      .select()
      .single()

    if (error) throw error

    // Return the updated version with comments
    const version = await getProjectVersion(projectType, projectId, versionId)
    return version
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
export const deleteProjectVersion = async (projectType, projectId, versionId) => {
  try {
    const { error } = await supabase
      .from('project_history')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', versionId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting version:', error)
    throw error
  }
}

/**
 * Get project statistics
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @returns {Object} Project statistics
 */
export const getProjectStatistics = async (projectType, projectId) => {
  try {
    const { data: versions, error } = await supabase
      .from('project_history')
      .select(
        `
        *,
        project_history_comments (*)
      `,
      )
      .eq('project_id', projectId)
      .eq('is_deleted', false)

    if (error) throw error

    if (!versions || versions.length === 0) {
      return {
        totalVersions: 0,
        totalComments: 0,
        firstVersion: null,
        lastVersion: null,
        averageWordsPerVersion: 0,
        versionTypes: {},
      }
    }

    const totalComments = versions.reduce(
      (sum, v) => sum + (v.project_history_comments?.length || 0),
      0,
    )
    const totalWords = versions.reduce((sum, v) => sum + (v.metadata?.wordCount || 0), 0)
    const versionTypes = versions.reduce((acc, v) => {
      acc[v.version_type] = (acc[v.version_type] || 0) + 1
      return acc
    }, {})

    return {
      totalVersions: versions.length,
      totalComments,
      firstVersion: transformVersionFromDB(versions[versions.length - 1]),
      lastVersion: transformVersionFromDB(versions[0]),
      averageWordsPerVersion: Math.round(totalWords / versions.length),
      versionTypes,
    }
  } catch (error) {
    console.error('Error fetching statistics:', error)
    throw error
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
 * Transform database version to expected format
 * @param {Object} dbVersion - Version from database
 * @returns {Object} Transformed version
 */
const transformVersionFromDB = (dbVersion) => {
  return {
    id: dbVersion.id,
    projectId: dbVersion.project_id,
    projectType: dbVersion.project_type || 'magazine',
    versionNumber: dbVersion.version_number,
    timestamp: dbVersion.created_at,
    author: dbVersion.author,
    changeDescription: dbVersion.change_description,
    versionType: dbVersion.version_type,
    data: {
      title: dbVersion.project_data?.title || '',
      description: dbVersion.project_data?.description || '',
      content: dbVersion.project_data?.content || '',
      status: dbVersion.project_data?.status || '',
      sectionHead: dbVersion.project_data?.sectionHead || '',
      writers: dbVersion.project_data?.writers || '',
      artists: dbVersion.project_data?.artists || '',
      dueDate: dbVersion.project_data?.dueDate || '',
      dueDateISO: dbVersion.project_data?.dueDateISO || '',
      mediaUploaded: dbVersion.project_data?.mediaUploaded || '',
      metadata: dbVersion.metadata || {},
    },
    comments: (dbVersion.project_history_comments || []).map((comment) => ({
      id: comment.id,
      author: comment.author,
      content: comment.content,
      timestamp: comment.created_at,
      isApproved: comment.is_approved,
    })),
    tags: [],
    isActive: dbVersion.is_active,
    isDeleted: dbVersion.is_deleted,
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
