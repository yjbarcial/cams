/**
 * Supabase Project History Service
 * Handles version control, history tracking, and project snapshots using Supabase
 */

import { supabase } from '@/utils/supabase.js'

/**
 * Get current user UUID from Supabase auth session
 * @returns {Promise<string|null>} - Current user's UUID or null if not found
 */
const getCurrentUserId = async () => {
  try {
    // First, try to restore session from localStorage
    console.log('🔄 Attempting to get user session...')

    // Try to get user with a small delay to ensure session is available
    let attempts = 0
    let user = null
    let error = null

    while (attempts < 3) {
      const result = await supabase.auth.getUser()
      user = result.data?.user
      error = result.error

      if (user) {
        console.log('✅ Current authenticated user:', user.id, user.email)
        return user.id
      }

      attempts++
      if (attempts < 3) {
        console.log(`⏳ Attempt ${attempts} failed, retrying in 500ms...`)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // If we get here, no session found
    if (error) {
      console.error('❌ Error getting authenticated user:', error.message)
    } else {
      console.warn('⚠️  No authenticated user found. User must be logged in to create projects.')
      console.log('📝 Check that you are logged in and page has loaded completely.')
    }

    return null
  } catch (error) {
    console.error('❌ Error in getCurrentUserId:', error.message)
    return null
  }
}

/**
 * Transform database version to local format
 * @param {Object} dbVersion - Version from database
 * @returns {Object} Version in local format
 */
const transformVersionFromDB = (dbVersion) => {
  return {
    id: dbVersion.id,
    projectId: dbVersion.project_id,
    projectType: dbVersion.project_type || 'magazine',
    versionNumber: dbVersion.version_number,
    timestamp: dbVersion.created_at,
    author: dbVersion.metadata?.author || dbVersion.author || 'Unknown',
    changeDescription: dbVersion.change_description,
    versionType: dbVersion.metadata?.versionType || dbVersion.version_type || 'draft',
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
    comments: (dbVersion.version_comments || []).map((comment) => ({
      id: comment.id,
      author: comment.author,
      content: comment.content,
      timestamp: comment.created_at,
      isApproved: comment.is_approved,
    })),
    tags: [],
    isActive: dbVersion.is_active || false,
    isDeleted: dbVersion.is_deleted || false,
  }
}

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
  console.log('=== SUPABASE createProjectVersion called ===')
  console.log('Input params:', { projectType, projectId, changeDescription, author, versionType })
  console.log('Project data:', JSON.stringify(projectData, null, 2))

  try {
    let actualProjectId = projectId

    // For new projects (projectId is null), we'll create the project first and get the auto-generated UUID
    // For existing projects, use the provided projectId

    // For new projects (projectId is null), skip the existence check and create the project
    // For existing projects, check if they exist first
    let project = null
    if (actualProjectId) {
      console.log('Checking if existing project exists:', actualProjectId)
      const { data: existingProject, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', actualProjectId)
        .maybeSingle()

      if (projectError) {
        throw projectError
      }
      project = existingProject
      console.log('Existing project found:', project)
    } else {
      console.log('New project - will create it')
    }

    // If project doesn't exist, create it
    if (!project) {
      console.log('Project does not exist, creating new project...')

      // Map project type to match ENUM values
      const mappedProjectType = projectType === 'other' ? 'social_media' : projectType

      // Map priority to lowercase to match ENUM
      const mappedPriority = (projectData.priority || 'medium').toLowerCase()

      // Normalize status to lowercase and replace spaces with underscores to match ENUM values
      const normalizedStatus = (projectData.status || 'draft').toLowerCase().replace(/\s+/g, '_')

      // Get current user ID
      const currentUserId = await getCurrentUserId()
      console.log('Current user ID for insert:', currentUserId)

      if (!currentUserId) {
        throw new Error('Cannot create project: User not authenticated. Please log in first.')
      }

      const insertPayload = {
        title: projectData.title,
        description: projectData.description,
        project_type: mappedProjectType,
        status: normalizedStatus,
        priority: mappedPriority,
        start_date: projectData.startDate
          ? new Date(projectData.startDate).toISOString().split('T')[0]
          : null,
        due_date: projectData.dueDateISO
          ? new Date(projectData.dueDateISO).toISOString().split('T')[0]
          : null,
        completed_at: null, // New projects aren't completed
        section_head_id: null, // TODO: Map from sectionHead name to UUID
        created_by: currentUserId, // Use actual user UUID
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log('Insert payload:', JSON.stringify(insertPayload, null, 2))

      const { data: newProjectArray, error: createError } = await supabase
        .from('projects')
        .insert(insertPayload)
        .select()

      if (createError) {
        console.error('Error creating project in Supabase:', createError)
        console.error('Error code:', createError.code)
        console.error('Error message:', createError.message)
        throw createError
      }

      const newProject = newProjectArray?.[0]
      if (!newProject) {
        throw new Error('Project creation returned no data')
      }

      console.log('Project created successfully in Supabase:', newProject)
      actualProjectId = newProject.id
    } else {
      console.log('Project already exists:', project.id)
    }

    // Get next version number
    const { data: versions } = await supabase
      .from('project_history')
      .select('version_number')
      .eq('project_id', actualProjectId)
      .order('version_number', { ascending: false })
      .limit(1)

    const nextVersionNumber = versions?.length > 0 ? versions[0].version_number + 1 : 1

    // Get current user email
    const currentUserId = await getCurrentUserId()
    if (!currentUserId) {
      console.warn('No user ID found, cannot create version history')
      throw new Error('User not authenticated')
    }

    // Get user email
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const userEmail = user?.email

    // Get profile ID from profiles table using email
    let authorProfileId = null
    if (userEmail) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle()

        if (profile) {
          authorProfileId = profile.id
        }
      } catch (error) {
        console.warn('Could not fetch profile ID:', error)
      }
    }

    // If no profile ID found, we can't create version (author_id is required)
    if (!authorProfileId) {
      console.warn('No profile ID found for user email:', userEmail, '- skipping version creation')
      throw new Error('Profile not found for current user')
    }

    // Create new version
    const versionData = {
      project_id: actualProjectId,
      version_number: nextVersionNumber,
      change_description: changeDescription || 'No description provided',
      author_id: authorProfileId,
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
        author: author, // Store author in metadata instead
        versionType: versionType, // Store version type in metadata instead
      },
      created_at: new Date().toISOString(),
    }

    const { data: version, error } = await supabase
      .from('project_history')
      .insert(versionData)
      .select('*')
      .maybeSingle()

    // Attach empty comments array since it's a new version
    if (version) {
      version.version_comments = []
    }

    if (error) {
      console.error('Error creating version in Supabase:', error)
      throw error
    }

    console.log('Version created successfully in Supabase for project:', actualProjectId)

    // Transform to match the expected format
    return transformVersionFromDB(version)
  } catch (error) {
    console.error('Error creating project version:', error)
    console.error('Error details:', error.message, error.details, error.hint)
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
    // Fetch project history
    const { data: historyData, error: historyError } = await supabase
      .from('project_history')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (historyError) throw historyError

    if (!historyData || historyData.length === 0) return []

    // Attach empty comments array since version_comments table doesn't exist
    const versionsWithComments = historyData.map((version) => ({
      ...version,
      version_comments: [], // No comments table available
    }))

    return versionsWithComments.map(transformVersionFromDB)
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
    const { data: versionData, error } = await supabase
      .from('project_history')
      .select('*')
      .eq('id', versionId)
      .eq('project_id', projectId)
      .maybeSingle()

    if (error) throw error
    if (!versionData) return null

    // Attach empty comments array since version_comments table doesn't exist
    const data = {
      ...versionData,
      version_comments: [], // No comments table available
    }

    if (error) {
      throw error
    }

    if (!data) return null

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
        status: (version.data.status || 'draft').toLowerCase().replace(/\s+/g, '_'),
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
    // version_comments table doesn't exist, so skip comment creation
    console.warn('version_comments table does not exist - comments are not supported')

    // Return the version without adding comment
    const version = await getProjectVersion(projectType, projectId, versionId)
    return version
  } catch (error) {
    console.error('Error adding comment:', error)
    throw error
  }
}

/**
 * Delete a specific version
 * @param {string} projectType - Type of project
 * @param {string} projectId - Project identifier
 * @param {string} versionId - Version identifier
 * @returns {boolean} Success status
 */
export const deleteProjectVersion = async (projectType, projectId, versionId) => {
  try {
    // Delete the version from database
    const { error } = await supabase.from('project_history').delete().eq('id', versionId)

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
    // Fetch project history
    const { data: versions, error } = await supabase
      .from('project_history')
      .select('*')
      .eq('project_id', projectId)

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

    // Attach empty comments array since version_comments table doesn't exist
    const versionsWithComments = versions.map((version) => ({
      ...version,
      version_comments: [], // No comments table available
    }))

    const totalComments = versionsWithComments.reduce(
      (sum, v) => sum + (v.version_comments?.length || 0),
      0,
    )
    const totalWords = versionsWithComments.reduce(
      (sum, v) => sum + (v.metadata?.wordCount || 0),
      0,
    )
    const versionTypes = versionsWithComments.reduce((acc, v) => {
      acc[v.version_type] = (acc[v.version_type] || 0) + 1
      return acc
    }, {})

    return {
      totalVersions: versionsWithComments.length,
      totalComments,
      firstVersion: transformVersionFromDB(versionsWithComments[versionsWithComments.length - 1]),
      lastVersion: transformVersionFromDB(versionsWithComments[0]),
      averageWordsPerVersion: Math.round(totalWords / versionsWithComments.length),
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
