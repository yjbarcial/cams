<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import QuillEditor from '@/components/QuillEditor.vue'
import ProjectHistory from '@/components/ProjectHistory.vue'
import HighlightComments from '@/components/HighlightComments.vue'
import { autoCreateVersionOnEdit } from '@/services/localProjectHistory.js'
import {
  getProjectComments,
  addProjectComment,
  updateProjectComment,
  deleteProjectComment,
  toggleCommentApproval,
} from '@/services/commentsService.js'
import {
  createStatusChangeNotification,
  createCommentNotification,
} from '@/services/notificationsService.js'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

// Determine project type from route or project data
const projectType = ref('magazine') // Default, will be determined from loaded project data

// Project data - will be loaded from localStorage
const project = ref({
  id: projectId,
  title: '',
  status: '',
  dueDate: '',
  lastModified: '',
  mediaUploaded: '',
  sectionHead: '',
  writers: '',
  artists: '',
  type: 'magazine',
  description: '',
  content: '',
})

// Title editing state
const isEditingTitle = ref(false)
const titleInputRef = ref(null)
const tempTitle = ref(project.value.title)

// Rich text editor state - Always in edit mode now
const editorContent = ref('')
const isEditing = ref(true) // Always true now - auto-edit mode
const quillEditorRef = ref(null)

// Auto-save state
const lastSaveTime = ref(null)
const saveTimeout = ref(null)
const autoSaveInterval = ref(null)
const hasUnsavedChanges = ref(false)

// Submit for approval state
const showSubmitDialog = ref(false)
const submitPriority = ref('Medium')
const submitComments = ref('')

// Unsaved changes dialog
const showUnsavedChangesDialog = ref(false)

// History state
const showHistory = ref(true) // Always show by default

// Comments state - start empty for new projects
const comments = ref([])
const newComment = ref('')
const commentSearch = ref('')

// Highlight comments state
const highlightComments = ref([])

// Snackbar for notifications
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Notification card state (for comment deletions - like highlight comments)
const showCommentNotificationCard = ref(false)
const commentNotificationMessage = ref('')
const commentNotificationType = ref('success')

// Show notification (snackbar - for other notifications)
const showNotification = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

// Show notification card (for comment deletions - like highlight comments)
const showCommentNotification = (message, type = 'success') => {
  commentNotificationMessage.value = message
  commentNotificationType.value = type
  showCommentNotificationCard.value = true

  // Auto-hide after 3 seconds
  setTimeout(() => {
    showCommentNotificationCard.value = false
  }, 3000)
}

// Title editing functions
const startEditingTitle = () => {
  tempTitle.value = project.value.title
  isEditingTitle.value = true
  // Focus the input after Vue updates the DOM
  setTimeout(() => {
    if (titleInputRef.value) {
      titleInputRef.value.focus()
      titleInputRef.value.select() // Select all text for easier editing
    }
  }, 50)
}

const saveTitleEdit = () => {
  if (tempTitle.value.trim()) {
    project.value.title = tempTitle.value.trim()
    isEditingTitle.value = false

    // Save to localStorage - use actual storage key
    try {
      // Get the actual storage key where the project exists
      const actualStorage = getActualStorageKey(projectId)
      if (!actualStorage) {
        console.error('Could not find project storage location')
        showNotification('Error: Project storage location not found', 'error')
        return
      }

      const projects = JSON.parse(localStorage.getItem(actualStorage.key) || '[]')
      const projectIndex = projects.findIndex((p) => p.id == projectId)

      if (projectIndex !== -1) {
        projects[projectIndex].title = tempTitle.value.trim()
        projects[projectIndex].lastModified = new Date().toLocaleString()
        // PRESERVE STATUS - don't change it when saving title
        if (project.value.status) {
          projects[projectIndex].status = project.value.status
        }
        localStorage.setItem(actualStorage.key, JSON.stringify(projects))

        // Update projectType - use displayType for UI
        projectType.value = actualStorage.displayType || actualStorage.type
        console.log('Title updated and saved to localStorage:', project.value.title)
        showNotification('Title updated successfully')
        updateLastSaveTime()
      }
    } catch (error) {
      console.error('Error saving title to localStorage:', error)
      showNotification('Error saving title', 'error')
    }
  } else {
    cancelTitleEdit() // Don't save empty titles
  }
}

const cancelTitleEdit = () => {
  tempTitle.value = project.value.title
  isEditingTitle.value = false
}

const handleTitleKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    saveTitleEdit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelTitleEdit()
  }
}

// Track previous content for version history
const previousContent = ref('')

// Enhanced auto-save content function
const saveContent = (showNotif = false) => {
  if (quillEditorRef.value) {
    const content = quillEditorRef.value.getContent()

    // Only save if content actually changed
    if (content === project.value.content) {
      return false // No changes to save
    }

    const oldContent = previousContent.value || project.value.content
    editorContent.value = content
    project.value.content = content

    // Save to localStorage - use actual storage key
    try {
      // Get the actual storage key where the project exists
      const actualStorage = getActualStorageKey(projectId)
      if (!actualStorage) {
        console.error('Could not find project storage location')
        if (showNotif) {
          showNotification('Error: Project storage location not found', 'error')
        }
        return false
      }

      const projects = JSON.parse(localStorage.getItem(actualStorage.key) || '[]')
      const projectIndex = projects.findIndex((p) => p.id == projectId)

      if (projectIndex !== -1) {
        projects[projectIndex].content = content
        projects[projectIndex].lastModified = new Date().toLocaleString()
        // PRESERVE STATUS - don't change it when saving content
        if (project.value.status) {
          projects[projectIndex].status = project.value.status
        }
        localStorage.setItem(actualStorage.key, JSON.stringify(projects))

        // Update projectType - use displayType for UI
        projectType.value = actualStorage.displayType || actualStorage.type

        // Auto-create version history (like Google Docs)
        const projectData = {
          ...project.value,
          content: content,
        }
        const version = autoCreateVersionOnEdit(
          projectType.value,
          projectId,
          projectData,
          oldContent,
        )
        if (version) {
          console.log('Auto-created version:', version.versionNumber)
        }

        // Update previous content for next comparison
        previousContent.value = content

        updateLastSaveTime()
        hasUnsavedChanges.value = false

        if (showNotif) {
          showNotification('Content saved', 'success')
        }

        console.log('Content auto-saved to localStorage')
        return true // Successfully saved
      }
    } catch (error) {
      console.error('Error saving content to localStorage:', error)
      if (showNotif) {
        showNotification('Error saving content', 'error')
      }
      return false
    }
  }
  return false
}

// Debounced auto-save function
const debouncedSave = () => {
  // Clear existing timeout
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }

  // Set new timeout - save after 1 second of no typing
  saveTimeout.value = setTimeout(() => {
    if (hasUnsavedChanges.value) {
      saveContent()
    }
  }, 1000) // 1 second delay after typing stops
}

// Handle content changes (called on every keystroke)
const handleContentChange = () => {
  hasUnsavedChanges.value = true
  debouncedSave()
}

// Update last save time
const updateLastSaveTime = () => {
  lastSaveTime.value = new Date().toLocaleString()
  project.value.lastModified = lastSaveTime.value
}

// Get last save time for display
const getLastSaveDisplay = computed(() => {
  if (!lastSaveTime.value) return 'Never'
  const now = new Date()
  const saveTime = new Date(lastSaveTime.value)
  const diffInSeconds = Math.floor((now - saveTime) / 1000)

  if (diffInSeconds < 5) return 'Just now'
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`

  return lastSaveTime.value
})

// Editor functions - keeping the old toggleEdit function but modifying it
const toggleEdit = () => {
  // Since we're always in edit mode, this now acts as "Submit for Approval"
  submitForApproval()
}

const saveAsDraft = () => {
  saveContent(true) // Show notification for manual save

  // Update status to draft if not already
  if (project.value.status !== 'draft') {
    project.value.status = 'draft'

    try {
      // Get the actual storage key where the project exists
      const actualStorage = getActualStorageKey(projectId)
      if (!actualStorage) {
        console.error('Could not find project storage location')
        return
      }

      const projects = JSON.parse(localStorage.getItem(actualStorage.key) || '[]')
      const projectIndex = projects.findIndex((p) => p.id == projectId)

      if (projectIndex !== -1) {
        projects[projectIndex].status = 'draft'
        projects[projectIndex].lastModified = new Date().toLocaleString()
        localStorage.setItem(actualStorage.key, JSON.stringify(projects))

        // Update projectType - use displayType for UI
        projectType.value = actualStorage.displayType || actualStorage.type
      }
    } catch (error) {
      console.error('Error saving draft status:', error)
    }
  }

  showNotification('Project saved as draft')
  console.log('Project saved as draft')
}

// Submit for approval function
const submitForApproval = () => {
  // First save current content
  saveContent()

  // Show submit dialog
  showSubmitDialog.value = true
}

const confirmSubmitForApproval = async () => {
  try {
    // Get the actual storage key where the project exists
    const actualStorage = getActualStorageKey(projectId)
    if (!actualStorage) {
      console.error('Could not find project storage location')
      showNotification('Error: Project storage location not found', 'error')
      return
    }

    const projects = JSON.parse(localStorage.getItem(actualStorage.key) || '[]')
    const projectIndex = projects.findIndex((p) => p.id == projectId)

    if (projectIndex !== -1) {
      projects[projectIndex].status = 'to_section_head'
      projects[projectIndex].priority = submitPriority.value
      projects[projectIndex].submittedBy = 'Current User'
      projects[projectIndex].submittedDate = new Date().toISOString()
      projects[projectIndex].lastModified = new Date().toLocaleString()
      projects[projectIndex].submissionComments = submitComments.value

      localStorage.setItem(actualStorage.key, JSON.stringify(projects))

      project.value.status = 'to_section_head'
      projectType.value = actualStorage.type
      hasUnsavedChanges.value = false

      // Create notification for Section Head
      createStatusChangeNotification({
        projectId: projectId,
        projectType: actualStorage.type,
        projectTitle: project.value.title,
        oldStatus: 'draft',
        newStatus: 'to_section_head',
        actionBy: 'Current User',
        recipient: 'Section Head',
        comments: submitComments.value,
      })

      showNotification('Project submitted for approval successfully!', 'success')
      showSubmitDialog.value = false

      // Navigate back to project list based on type
      const listRoutes = {
        magazine: '/magazine',
        newsletter: '/newsletter',
        folio: '/folio',
        other: '/other',
        'social-media': '/other',
      }

      setTimeout(() => {
        router.push(listRoutes[actualStorage.type] || '/magazine')
      }, 600)
    }
  } catch (error) {
    console.error('Error submitting project:', error)
    showNotification('Error submitting project for approval', 'error')
  }
}

const cancelSubmitDialog = () => {
  showSubmitDialog.value = false
  submitComments.value = ''
  submitPriority.value = 'Medium'
}

// Helper function to determine department
const getDepartmentFromProject = () => {
  // You can customize this logic based on your needs
  const typeMap = {
    magazine: 'Editorial',
    newsletter: 'News',
    folio: 'Arts',
    other: 'Marketing',
  }
  return typeMap[projectType.value] || 'General'
}

// Version restoration handler (versions are auto-created on edits)
const handleVersionRestored = (restoredProject) => {
  // Update the current project with restored data
  project.value = { ...project.value, ...restoredProject }
  editorContent.value = restoredProject.content || ''
  previousContent.value = restoredProject.content || '' // Initialize for version history

  // Update last modified
  project.value.lastModified = new Date().toLocaleString()

  showNotification('Project restored from version')
  console.log('Project restored from version:', restoredProject)
}

// Navigation functions
const goBack = () => {
  // Check if there are unsaved changes
  if (hasUnsavedChanges.value) {
    showUnsavedChangesDialog.value = true
    return
  }

  performNavigation()
}

const confirmLeaveWithSave = () => {
  saveContent(true)
  showUnsavedChangesDialog.value = false
  // Small delay to ensure save completes
  setTimeout(() => {
    performNavigation()
  }, 100)
}

const confirmLeaveWithoutSave = () => {
  showUnsavedChangesDialog.value = false
  performNavigation()
}

const cancelLeave = () => {
  showUnsavedChangesDialog.value = false
}

const projectTypeMap = {
  magazine: '/magazine',
  newsletter: '/newsletter',
  folio: '/folio',
  other: '/other',
  'social-media': '/other', // social-media projects route to /other
}

const performNavigation = () => {
  // For other/social-media types, route to /other
  const route = projectTypeMap[projectType.value] || '/magazine'
  router.push(route)
}

// Load comments for the current project
const loadProjectComments = () => {
  try {
    comments.value = getProjectComments(projectType.value, projectId)
    console.log('Comments loaded:', comments.value)
  } catch (error) {
    console.error('Error loading comments:', error)
    comments.value = []
  }
}

// Helper function to get the actual storage key where a project exists
const getActualStorageKey = (projectId) => {
  // For other/social-media types, check both storage keys
  // Check other_projects first, then social-media_projects
  const otherProjects = JSON.parse(localStorage.getItem('other_projects') || '[]')
  const socialMediaProjects = JSON.parse(localStorage.getItem('social-media_projects') || '[]')

  const inOther = otherProjects.some((p) => String(p.id) === String(projectId))
  const inSocialMedia = socialMediaProjects.some((p) => String(p.id) === String(projectId))

  // For display purposes, both other and social-media are treated as "other"
  if (inOther) return { key: 'other_projects', type: 'other', displayType: 'other' }
  if (inSocialMedia) return { key: 'social-media_projects', type: 'other', displayType: 'other' }

  // For other types, check their specific storage
  const projectTypes = ['magazine', 'newsletter', 'folio']
  for (const type of projectTypes) {
    const storageKey = `${type}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (projects.some((p) => String(p.id) === String(projectId))) {
      return { key: storageKey, type: type, displayType: type }
    }
  }

  return null
}

// Load project data from localStorage
const loadProjectData = () => {
  try {
    console.log('Loading project data for ID:', projectId)

    // First, try to get type from query parameter
    const queryType = route.query.type

    if (queryType) {
      console.log('Trying to load project from query type:', queryType)

      // For other/social-media types, check both storage keys to find where project actually exists
      if (queryType === 'other' || queryType === 'social-media') {
        const actualStorage = getActualStorageKey(projectId)

        if (actualStorage) {
          const projects = JSON.parse(localStorage.getItem(actualStorage.key) || '[]')
          const foundProject = projects.find((p) => String(p.id) === String(projectId))

          if (foundProject) {
            console.log('Found project in', actualStorage.type, ':', foundProject)

            // Update project data - PRESERVE STATUS
            // Normalize status: if it's "To Technical Editor", fix it to Draft (ProjectView is for draft projects)
            let normalizedStatus = foundProject.status || 'draft'
            // If status is "To Technical Editor", it should be Draft in ProjectView
            if (normalizedStatus === 'to_technical_editor') {
              normalizedStatus = 'draft'
              // Also update it in the storage to fix the corrupted status
              const projects = JSON.parse(localStorage.getItem(actualStorage.key) || '[]')
              const projectIndex = projects.findIndex((p) => String(p.id) === String(projectId))
              if (projectIndex !== -1) {
                projects[projectIndex].status = 'draft'
                localStorage.setItem(actualStorage.key, JSON.stringify(projects))
                console.log('Fixed corrupted status from "to_technical_editor" to "draft"')
              }
            }

            project.value = {
              ...foundProject,
              id: projectId,
              status: normalizedStatus, // Use normalized status
              lastModified: foundProject.createdAtISO
                ? new Date(foundProject.createdAtISO).toLocaleString()
                : foundProject.lastModified || new Date().toLocaleString(),
              content: foundProject.content || '',
              writers: foundProject.writers || 'Not assigned',
              artists: foundProject.artists || 'Not assigned',
              sectionHead: foundProject.sectionHead || 'Not assigned',
              description: foundProject.description || 'No description provided',
            }

            // Set project type - use displayType for UI, but keep actual type for storage
            // For other/social-media, both display as "other"
            projectType.value = actualStorage.displayType || actualStorage.type

            // Set editor content
            editorContent.value = foundProject.content || ''
            previousContent.value = foundProject.content || '' // Initialize for version history

            // Update temp title for editing
            tempTitle.value = foundProject.title

            // Initialize last save time
            updateLastSaveTime()

            // Load comments for this project
            loadProjectComments()

            // Load highlight comments from QuillEditor
            if (quillEditorRef.value) {
              const storedComments = quillEditorRef.value.getHighlightComments()
              highlightComments.value = storedComments
            }

            console.log('Project loaded successfully from', actualStorage.type)
            return
          }
        }
        console.log('Project not found in other or social-media storage')
      } else {
        // For other types (magazine, newsletter, folio), use the query type directly
        const storageKey = `${queryType}_projects`
        const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
        const foundProject = projects.find((p) => String(p.id) === String(projectId))

        if (foundProject) {
          console.log('Found project:', foundProject)

          // Update project data - PRESERVE STATUS
          // Normalize status: if it's "to_technical_editor", fix it to draft (ProjectView is for draft projects)
          let normalizedStatus = foundProject.status || 'draft'
          // If status is "to_technical_editor", it should be draft in ProjectView
          if (normalizedStatus === 'to_technical_editor') {
            normalizedStatus = 'draft'
            // Also update it in the storage to fix the corrupted status
            const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
            const projectIndex = projects.findIndex((p) => String(p.id) === String(projectId))
            if (projectIndex !== -1) {
              projects[projectIndex].status = 'draft'
              localStorage.setItem(storageKey, JSON.stringify(projects))
              console.log('Fixed corrupted status from "to_technical_editor" to "draft"')
            }
          }

          project.value = {
            ...foundProject,
            id: projectId,
            status: normalizedStatus, // Use normalized status
            lastModified: foundProject.createdAtISO
              ? new Date(foundProject.createdAtISO).toLocaleString()
              : foundProject.lastModified || new Date().toLocaleString(),
            content: foundProject.content || '',
            writers: foundProject.writers || 'Not assigned',
            artists: foundProject.artists || 'Not assigned',
            sectionHead: foundProject.sectionHead || 'Not assigned',
            description: foundProject.description || 'No description provided',
          }

          // Set project type
          projectType.value = queryType

          // Set editor content
          editorContent.value = foundProject.content || ''
          previousContent.value = foundProject.content || '' // Initialize for version history

          // Update temp title for editing
          tempTitle.value = foundProject.title

          // Initialize last save time
          updateLastSaveTime()

          // Load comments for this project
          loadProjectComments()

          // Load highlight comments from QuillEditor
          if (quillEditorRef.value) {
            const storedComments = quillEditorRef.value.getHighlightComments()
            highlightComments.value = storedComments
          }

          console.log('Project loaded successfully')
          return
        }
      }
    }

    // If not found with query type, search all project types
    console.log('Searching all project types...')
    const projectTypes = [
      { type: 'magazine', storageKey: 'magazine_projects' },
      { type: 'newsletter', storageKey: 'newsletter_projects' },
      { type: 'folio', storageKey: 'folio_projects' },
      { type: 'other', storageKey: 'other_projects' },
      { type: 'social-media', storageKey: 'social-media_projects' },
    ]

    for (const { type, storageKey } of projectTypes) {
      const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
      console.log(`Checking ${type} projects (${storageKey}):`, projects.length, 'projects found')

      const foundProject = projects.find((p) => String(p.id) === String(projectId))

      if (foundProject) {
        console.log('Found project:', foundProject)

        // Update project data - PRESERVE STATUS
        // Normalize status: if it's "To Technical Editor", fix it to Draft (ProjectView is for draft projects)
        let normalizedStatus = foundProject.status || 'draft'
        // If status is "To Technical Editor", it should be Draft in ProjectView
        if (normalizedStatus === 'to_technical_editor') {
          normalizedStatus = 'draft'
          // Also update it in the storage to fix the corrupted status
          const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
          const projectIndex = projects.findIndex((p) => String(p.id) === String(projectId))
          if (projectIndex !== -1) {
            projects[projectIndex].status = 'draft'
            localStorage.setItem(storageKey, JSON.stringify(projects))
            console.log('Fixed corrupted status from "to_technical_editor" to "draft"')
          }
        }

        project.value = {
          ...foundProject,
          id: projectId,
          status: normalizedStatus, // Use normalized status
          lastModified: foundProject.createdAtISO
            ? new Date(foundProject.createdAtISO).toLocaleString()
            : foundProject.lastModified || new Date().toLocaleString(),
          content: foundProject.content || '',
          writers: foundProject.writers || 'Not assigned',
          artists: foundProject.artists || 'Not assigned',
          sectionHead: foundProject.sectionHead || 'Not assigned',
          description: foundProject.description || 'No description provided',
        }

        // Set project type - normalize social-media to other for display
        projectType.value = type === 'social-media' ? 'other' : type

        // Set editor content
        editorContent.value = foundProject.content || ''
        previousContent.value = foundProject.content || '' // Initialize for version history

        // Update temp title for editing
        tempTitle.value = foundProject.title

        // Initialize last save time
        updateLastSaveTime()

        // Load comments for this project
        loadProjectComments()

        // Load highlight comments from QuillEditor
        if (quillEditorRef.value) {
          const storedComments = quillEditorRef.value.getHighlightComments()
          highlightComments.value = storedComments
        }

        console.log('Project loaded successfully')
        return
      }
    }

    // If project not found, show error
    console.error('Project not found with ID:', projectId)
    showNotification('Project not found. Please check the project ID.', 'error')
  } catch (error) {
    console.error('Error loading project:', error)
    showNotification('Error loading project data.', 'error')
  }
}

// Comment functions
const addComment = () => {
  if (newComment.value.trim()) {
    try {
      const comment = addProjectComment(
        projectType.value,
        projectId,
        newComment.value.trim(),
        'Current User', // This should come from auth system
      )
      comments.value.unshift(comment)

      // Create notification for comment
      createCommentNotification({
        projectId: projectId,
        projectType: projectType.value,
        projectTitle: project.value.title,
        commentAuthor: 'Current User',
        commentText: newComment.value.trim(),
        recipient: null, // Can be set to specific recipient if needed
      })

      newComment.value = ''
      showNotification('Comment added successfully')
      console.log('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
      showNotification('Failed to add comment', 'error')
    }
  }
}

const filteredComments = computed(() => {
  if (!commentSearch.value) return comments.value
  return comments.value.filter(
    (comment) =>
      comment.content.toLowerCase().includes(commentSearch.value.toLowerCase()) ||
      comment.author.toLowerCase().includes(commentSearch.value.toLowerCase()),
  )
})

// Comment action functions
const deleteComment = (commentId) => {
  // Delete immediately - no alerts, just delete and show notification card
  try {
    const success = deleteProjectComment(projectType.value, projectId, commentId)
    if (success) {
      comments.value = comments.value.filter((c) => c.id !== commentId)
      showCommentNotification('Comment deleted successfully', 'success')
      console.log('Comment deleted successfully')
    } else {
      showCommentNotification('Failed to delete comment', 'error')
    }
  } catch (error) {
    console.error('Error deleting comment:', error)
    showCommentNotification('Failed to delete comment', 'error')
  }
}

const toggleCommentApprovalStatus = (commentId) => {
  try {
    const success = toggleCommentApproval(projectType.value, projectId, commentId)
    if (success) {
      const comment = comments.value.find((c) => c.id === commentId)
      if (comment) {
        comment.isApproved = !comment.isApproved
      }
      showNotification('Comment approval toggled')
      console.log('Comment approval toggled')
    }
  } catch (error) {
    console.error('Error toggling comment approval:', error)
    showNotification('Failed to toggle comment approval', 'error')
  }
}

// Highlight comments functions
const handleHighlightCommentsUpdated = (comments) => {
  highlightComments.value = comments
  console.log('Highlight comments updated:', comments)
}

const handleHighlightText = (comment) => {
  console.log('Highlighting text:', comment)
  // The QuillEditor will handle the highlighting
}

const handleDeleteHighlightComment = (commentId) => {
  if (quillEditorRef.value) {
    const success = quillEditorRef.value.deleteHighlightComment(commentId)
    if (success) {
      showNotification('Highlight comment deleted')
      console.log('Highlight comment deleted')
    }
  }
}

const handleLoadHighlightComments = (comments) => {
  highlightComments.value = comments
  console.log('Loaded highlight comments:', comments)
}

const handleResolveHighlightComment = (commentId) => {
  if (quillEditorRef.value) {
    const success = quillEditorRef.value.toggleCommentResolved(commentId)
    if (success) {
      // Update the local comments array
      const comment = highlightComments.value.find((c) => c.id === commentId)
      if (comment) {
        comment.resolved = !comment.resolved
      }
      showNotification('Comment resolved', 'success')
    }
  }
}

const handleEditorNotification = (message, color = 'warning') => {
  showNotification(message, color)
}

// Format timestamp for display
const formatCommentTime = (timestamp) => {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`

    return date.toLocaleDateString()
  } catch (error) {
    return timestamp
  }
}

// Check if project can be submitted (has content and title)
const canSubmitProject = computed(() => {
  return project.value.title.trim() && editorContent.value.trim()
})

// Get status color for display
const getStatusColor = (status) => {
  const statusColors = {
    draft: 'grey',
    to_section_head: 'warning',
    to_technical_editor: 'info',
    to_editor_in_chief: 'primary',
    'To Chief Adviser': 'purple',
    published: 'success',
    rejected: 'error',
  }
  return statusColors[status] || 'default'
}

// Get status text for display
const getStatusDisplay = (status) => {
  const statusLabels = {
    draft: 'Draft',
    to_section_head: 'To Section Head',
    to_technical_editor: 'To Technical Editor',
    to_editor_in_chief: 'To Editor-in-Chief',
    'To Chief Adviser': 'To Chief Adviser',
    published: 'Published',
    rejected: 'Rejected',
  }
  return statusLabels[status] || status
}

// Watch for editor content changes to keep QuillEditor in sync
watch(editorContent, (newContent) => {
  if (quillEditorRef.value && quillEditorRef.value.getContent() !== newContent) {
    quillEditorRef.value.setContent(newContent)
  }
})

// Watch for QuillEditor to be ready and load highlight comments
watch(
  () => quillEditorRef.value,
  (newEditor) => {
    if (newEditor && newEditor.getHighlightComments) {
      const storedComments = newEditor.getHighlightComments()
      highlightComments.value = storedComments
    }
  },
)

// Setup auto-save system
onMounted(() => {
  // Load project data from localStorage
  console.log('Loading project:', projectId)
  loadProjectData()

  // Set up real-time auto-save interval (every 1 second)
  autoSaveInterval.value = setInterval(() => {
    if (isEditing.value && hasUnsavedChanges.value && quillEditorRef.value) {
      const saved = saveContent()
      if (saved) {
        console.log('Real-time auto-save completed')
      }
    }
  }, 1000) // Auto-save every 1 second if there are unsaved changes
})

// Clean up intervals and timeouts
onUnmounted(() => {
  if (autoSaveInterval.value) {
    clearInterval(autoSaveInterval.value)
  }
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }
})

// Add this computed property after the other computed properties
const getBackButtonText = computed(() => {
  const typeNames = {
    magazine: 'Magazine',
    newsletter: 'Newsletter',
    folio: 'Folio',
    other: 'Other',
    'social-media': 'Other', // social-media projects show as "Other"
  }
  return `Back to ${typeNames[projectType.value] || 'Magazine'} Projects`
})
</script>

<template>
  <v-app class="project-page">
    <MainHeader />

    <!-- Back Button -->
    <div class="back-button-container">
      <v-btn @click="goBack" variant="outlined" prepend-icon="mdi-arrow-left" class="back-button">
        {{ getBackButtonText }}
      </v-btn>
    </div>

    <v-main class="main-content">
      <v-container fluid class="project-container pa-5">
        <v-row>
          <!-- Left Panel - Project Details and Editor -->
          <v-col cols="12" lg="8" class="left-panel">
            <!-- Editable Project Title -->
            <div class="title-section">
              <h1
                v-if="!isEditingTitle"
                class="project-title editable-title"
                @click="startEditingTitle"
                title="Click to edit title"
              >
                {{ project.title }}
                <v-icon class="edit-icon" size="20">mdi-pencil</v-icon>
              </h1>
              <div v-else class="title-edit-container">
                <v-text-field
                  ref="titleInputRef"
                  v-model="tempTitle"
                  class="title-input"
                  variant="outlined"
                  hide-details
                  @blur="saveTitleEdit"
                  @keydown="handleTitleKeydown"
                  density="compact"
                />
                <div class="title-edit-actions">
                  <v-btn @click="saveTitleEdit" size="small" color="primary" variant="text" icon>
                    <v-icon>mdi-check</v-icon>
                  </v-btn>
                  <v-btn @click="cancelTitleEdit" size="small" color="error" variant="text" icon>
                    <v-icon>mdi-close</v-icon>
                  </v-btn>
                </div>
              </div>
            </div>

            <!-- Project Description -->
            <div v-if="project.description" class="project-description">
              <div class="description-label">Description</div>
              <div class="description-text">{{ project.description }}</div>
            </div>

            <!-- Project Metadata -->
            <div class="project-metadata">
              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Submission Status:</span>
                  <v-chip :color="getStatusColor(project.status)" size="small" class="status-chip">
                    {{ getStatusDisplay(project.status) }}
                  </v-chip>
                </div>
                <div class="metadata-item">
                  <span class="label">Section Head:</span>
                  <span class="value">{{ project.sectionHead }}</span>
                </div>
              </div>

              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Due Date:</span>
                  <span class="value">{{ project.dueDate }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Writer:</span>
                  <span class="value">{{ project.writers || 'Not assigned' }}</span>
                </div>
              </div>

              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Last Modified:</span>
                  <span class="value">{{ project.lastModified }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Artist:</span>
                  <span class="value">{{ project.artists || 'Not assigned' }}</span>
                </div>
              </div>

              <div class="metadata-row metadata-row-last">
                <div class="metadata-item">
                  <span class="label">Media Uploaded:</span>
                  <span class="value">{{ project.mediaUploaded }}</span>
                </div>
              </div>
            </div>

            <!-- Enhanced Auto-save Notice -->
            <div class="auto-save-notice">
              <div class="save-status">
                <v-icon size="16" :color="hasUnsavedChanges ? 'warning' : 'success'">
                  {{ hasUnsavedChanges ? 'mdi-content-save-edit' : 'mdi-content-save-check' }}
                </v-icon>
                <span class="save-text">
                  {{ hasUnsavedChanges ? 'Saving...' : 'All changes saved' }}
                </span>
              </div>
              <div class="last-save">
                <span class="last-save-text">Last saved: {{ getLastSaveDisplay }}</span>
              </div>
            </div>

            <!-- Rich Text Editor - Always in Edit Mode -->
            <div class="editor-section">
              <QuillEditor
                ref="quillEditorRef"
                v-model="editorContent"
                :read-only="false"
                :project-id="projectId"
                :project-type="projectType"
                height="500px"
                placeholder="Start writing your content..."
                @text-change="handleContentChange"
                @highlight-comments-updated="handleHighlightCommentsUpdated"
                @notification="handleEditorNotification"
              />
            </div>

            <!-- Action Buttons - Keeping Original Style -->
            <div class="action-buttons">
              <v-btn
                @click="toggleEdit"
                variant="outlined"
                class="edit-btn"
                :disabled="!canSubmitProject"
              >
                Submit for Approval
              </v-btn>
              <v-btn @click="saveAsDraft" variant="outlined" class="draft-btn">
                Save as Draft
              </v-btn>
              <v-btn variant="outlined" class="remove-btn"> Remove Submission </v-btn>
            </div>
          </v-col>

          <!-- Right Panel - Comments and History -->
          <v-col cols="12" lg="4" class="right-panel">
            <!-- Project History -->
            <div class="history-section mb-4">
              <ProjectHistory
                :project-id="projectId"
                :project-type="projectType"
                @version-restored="handleVersionRestored"
              />
            </div>

            <!-- Highlight Comments -->
            <HighlightComments
              :comments="highlightComments"
              :quill-editor="quillEditorRef?.quill"
              :project-id="projectId"
              :project-type="projectType"
              @delete-comment="handleDeleteHighlightComment"
              @highlight-text="handleHighlightText"
              @load-comments="handleLoadHighlightComments"
              @resolve-comment="handleResolveHighlightComment"
            />

            <!-- Comments Section -->
            <div class="comments-section">
              <!-- Comments Header -->
              <div class="comments-header">
                <h3>Comments</h3>
                <div class="header-actions">
                  <v-btn icon size="small" variant="text" @click="loadProjectComments">
                    <v-icon>mdi-refresh</v-icon>
                  </v-btn>
                  <v-btn icon size="small" variant="text">
                    <v-icon>mdi-comment-multiple</v-icon>
                  </v-btn>
                </div>
              </div>

              <!-- Search Comments -->
              <div class="comment-search">
                <v-text-field
                  v-model="commentSearch"
                  placeholder="Search comments"
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </div>

              <!-- Add Comment -->
              <div class="add-comment">
                <v-textarea
                  v-model="newComment"
                  placeholder="Add comment..."
                  variant="outlined"
                  rows="3"
                  hide-details
                  append-inner-icon="mdi-send"
                  @click:append-inner="addComment"
                  @keydown.enter.ctrl="addComment"
                />
              </div>

              <!-- Comments List -->
              <div class="comments-list">
                <div v-for="comment in filteredComments" :key="comment.id" class="comment-item">
                  <div class="comment-avatar">
                    <img :src="comment.avatar" :alt="comment.author" />
                  </div>
                  <div class="comment-content">
                    <div class="comment-header">
                      <span class="comment-author">{{ comment.author }}</span>
                      <span class="comment-time">{{ formatCommentTime(comment.timestamp) }}</span>
                    </div>
                    <div class="comment-text">{{ comment.content }}</div>
                  </div>
                  <div class="comment-actions">
                    <v-icon v-if="comment.isApproved" color="success" size="small">
                      mdi-check-circle
                    </v-icon>
                    <v-menu>
                      <template v-slot:activator="{ props }">
                        <v-btn icon size="small" variant="text" v-bind="props">
                          <v-icon>mdi-dots-vertical</v-icon>
                        </v-btn>
                      </template>
                      <v-list>
                        <v-list-item @click="toggleCommentApprovalStatus(comment.id)">
                          <v-list-item-title>
                            {{ comment.isApproved ? 'Unapprove' : 'Approve' }}
                          </v-list-item-title>
                        </v-list-item>
                        <v-list-item @click="deleteComment(comment.id)" class="text-error">
                          <v-list-item-title>Delete</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </div>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <Footer />

    <!-- Submit for Approval Dialog - UPDATED -->
    <v-dialog v-model="showSubmitDialog" max-width="600px" persistent>
      <v-card class="submit-dialog-card">
        <v-card-title class="submit-dialog-header">
          <v-icon class="mr-2" size="24" color="#FFFFFF">mdi-send-check</v-icon>
          <span>Submit for Approval</span>
        </v-card-title>

        <v-divider class="dialog-divider" />

        <v-card-text class="submit-dialog-content">
          <div class="submit-info-box">
            <p class="submit-message">
              Submit <strong>"{{ project.title }}"</strong> for approval. This will send your
              project to the Section Head for review.
            </p>
          </div>

          <v-select
            v-model="submitPriority"
            label="Priority Level"
            :items="['High', 'Medium', 'Low']"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-flag"
            hint="Select the priority level for this submission"
            persistent-hint
            class="priority-field"
          />

          <v-textarea
            v-model="submitComments"
            label="Submission Comments (Optional)"
            placeholder="Add any comments or notes for the reviewers..."
            variant="outlined"
            rows="4"
            hint="These comments will be visible to all reviewers"
            persistent-hint
            class="comments-field"
          />

          <v-alert type="info" variant="tonal" class="next-step-alert" density="comfortable">
            <template v-slot:prepend>
              <v-icon size="20">mdi-information-outline</v-icon>
            </template>
            <div class="alert-text">
              <strong>Next Step:</strong> Your project will be forwarded to the Section Head for
              initial review.
            </div>
          </v-alert>
        </v-card-text>

        <v-divider class="dialog-divider" />

        <v-card-actions class="submit-dialog-actions">
          <v-btn @click="cancelSubmitDialog" variant="outlined" size="default" class="cancel-btn">
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            @click="confirmSubmitForApproval"
            variant="flat"
            size="default"
            class="confirm-submit-btn"
            prepend-icon="mdi-send"
          >
            Submit for Approval
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Unsaved Changes Dialog -->
    <v-dialog v-model="showUnsavedChangesDialog" max-width="500px" persistent>
      <v-card class="unsaved-dialog-card">
        <v-card-title class="unsaved-dialog-header">
          <v-icon class="mr-2" size="24">mdi-content-save-alert</v-icon>
          <span>Unsaved Changes</span>
        </v-card-title>

        <v-divider class="dialog-divider" />

        <v-card-text class="unsaved-dialog-content">
          <div class="unsaved-info-box">
            <p class="unsaved-message">
              You have unsaved changes. Do you want to save before leaving?
            </p>
          </div>
        </v-card-text>

        <v-divider class="dialog-divider" />

        <v-card-actions class="unsaved-dialog-actions">
          <v-btn
            @click="confirmLeaveWithoutSave"
            variant="outlined"
            size="default"
            class="leave-btn"
          >
            Leave Without Saving
          </v-btn>
          <v-spacer />
          <v-btn @click="cancelLeave" variant="outlined" size="default" class="cancel-btn">
            Cancel
          </v-btn>
          <v-btn
            @click="confirmLeaveWithSave"
            variant="flat"
            size="default"
            prepend-icon="mdi-content-save"
            class="save-btn"
          >
            Save and Leave
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Comment Notification Card (like highlight comments) -->
    <transition name="slide-down">
      <v-card
        v-if="showCommentNotificationCard"
        class="comment-notification-card"
        :class="`notification-${commentNotificationType}`"
        elevation="4"
      >
        <div class="notification-content">
          <v-icon
            :color="
              commentNotificationType === 'success'
                ? 'success'
                : commentNotificationType === 'error'
                  ? 'error'
                  : 'warning'
            "
            size="24"
            class="notification-icon"
          >
            {{
              commentNotificationType === 'success'
                ? 'mdi-check-circle'
                : commentNotificationType === 'error'
                  ? 'mdi-alert-circle'
                  : 'mdi-alert'
            }}
          </v-icon>
          <span class="notification-message">{{ commentNotificationMessage }}</span>
          <v-btn
            icon
            size="small"
            variant="text"
            @click="showCommentNotificationCard = false"
            class="notification-close"
          >
            <v-icon size="20">mdi-close</v-icon>
          </v-btn>
        </div>
      </v-card>
    </transition>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      timeout="3000"
      location="bottom right"
    >
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn variant="text" @click="showSnackbar = false"> Close </v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<style scoped>
.project-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
}

.back-button-container {
  padding: 16px 24px 0;
  background-color: #f8fafc;
}

.back-button {
  background: white !important;
  border: 1px solid #d1d5db !important;
  color: #374151 !important;
  font-weight: 500 !important;
  text-transform: none !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05) !important;
}

.back-button:hover {
  background: #f9fafb !important;
  border-color: #9ca3af !important;
}

.main-content {
  flex: 1;
  padding: 0 !important;
}

.project-container {
  max-width: 1400px;
  margin: 0 auto;
}

.left-panel {
  padding-right: 24px;
}

.right-panel {
  padding-left: 24px;
}

.title-section {
  margin-bottom: 24px;
}

.project-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  line-height: 1.2;
}

.editable-title {
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
}

.editable-title:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.edit-icon {
  opacity: 0;
  transition: opacity 0.2s ease;
  color: #6b7280;
}

.editable-title:hover .edit-icon {
  opacity: 1;
}

.title-edit-container {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.title-input {
  flex: 1;
  max-width: 600px;
}

:deep(.title-input .v-field__input) {
  font-size: 28px !important;
  font-weight: 700 !important;
  color: #1f2937 !important;
  line-height: 1.2 !important;
  padding: 8px 12px !important;
}

:deep(.title-input .v-field__outline) {
  --v-field-border-width: 2px;
}

:deep(.title-input.v-field--focused .v-field__outline) {
  --v-theme-primary: #3b82f6;
}

.title-edit-actions {
  display: flex;
  gap: 4px;
}

.project-description {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.description-label {
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  margin-bottom: 8px;
}

.description-text {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
}

.project-history-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: none;
}

.history-content {
  padding-top: 0;
  padding-bottom: 0;
}

.project-metadata {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.metadata-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f3f4f6;
}

.metadata-row-last {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.metadata-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metadata-item .label {
  font-weight: 600;
  color: #374151;
  font-size: 13px;
  white-space: nowrap;
  min-width: fit-content;
}

.metadata-item .value {
  color: #6b7280;
  font-size: 13px;
}

.status-chip {
  margin-left: 0;
}

@media (max-width: 768px) {
  .metadata-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .metadata-item-priority {
    justify-content: flex-start;
  }
}

/* Enhanced Auto-save Notice */
.auto-save-notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-text {
  color: #0369a1;
  font-weight: 500;
}

.last-save {
  display: flex;
  align-items: center;
}

.last-save-text {
  color: #0369a1;
  font-size: 12px;
  opacity: 0.8;
}

.editor-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 24px;
  overflow: hidden;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

/* Keep Original Button Styling */
.edit-btn {
  background: #f5c52b !important; /* Yellow/amber background */
  color: #353535 !important; /* Dark text */
  border: 1px solid #f5c52b !important;
  font-weight: bold !important; /* Make text bold */
}

.edit-btn:hover {
  background: #f5c52b !important; /* Darker yellow on hover */
}

.edit-btn:disabled {
  background: #d1d5db !important;
  color: #9ca3af !important;
  border-color: #d1d5db !important;
  cursor: not-allowed !important;
}

.draft-btn {
  background: #353535 !important; /* Dark gray background */
  color: white !important;
  border: 1px solid #353535 !important;
  font-weight: bold !important; /* Make text bold */
}

.draft-btn:hover {
  background: #1f2937 !important; /* Even darker on hover */
}

.remove-btn {
  background: white !important; /* White background */
  color: #374151 !important; /* Dark text */
  border: 1px solid #d1d5db !important; /* Light gray border */
  font-weight: bold !important; /* Make text bold */
}

.remove-btn:hover {
  background: #f3f4f6 !important; /* Light gray on hover */
}

.history-btn {
  background: #06b6d4 !important; /* Cyan background */
  color: white !important;
  border: 1px solid #06b6d4 !important;
  font-weight: bold !important; /* Make text bold */
}

.history-btn:hover {
  background: #0891b2 !important; /* Darker cyan on hover */
}

.comments-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  height: fit-content;
  max-height: calc(100vh - 200px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(to bottom, #ffffff, #f8fafc);
}

.comments-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-actions .v-btn {
  color: #6b7280 !important;
  transition: all 0.2s ease;
}

.header-actions .v-btn:hover {
  color: #3b82f6 !important;
  background: rgba(59, 130, 246, 0.1) !important;
}

.comment-search {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

:deep(.comment-search .v-field) {
  background: #f9fafb !important;
  border-radius: 6px !important;
}

:deep(.comment-search .v-field:focus-within) {
  background: white !important;
  border-color: #3b82f6 !important;
}

.add-comment {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

:deep(.add-comment .v-field) {
  background: #f9fafb !important;
  border-radius: 6px !important;
}

:deep(.add-comment .v-field:focus-within) {
  background: white !important;
  border-color: #3b82f6 !important;
}

.comments-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  background: #fafbfc;
  max-height: 400px;
}

.comment-item {
  display: flex;
  gap: 14px;
  margin-bottom: 12px;
  padding: 14px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  align-items: flex-start;
}

.comment-item:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-avatar {
  flex-shrink: 0;
}

.comment-avatar img {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.comment-author::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  display: inline-block;
}

.comment-time {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.comment-text {
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  margin-top: 4px;
  word-wrap: break-word;
}

.comment-actions {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  flex-shrink: 0;
}

.comment-actions .v-btn {
  color: #6b7280 !important;
  transition: all 0.2s ease;
}

.comment-actions .v-btn:hover {
  color: #3b82f6 !important;
  background: rgba(59, 130, 246, 0.1) !important;
}

.comment-actions .v-icon {
  transition: all 0.2s ease;
}

/* Scrollbar styling for comments list */
.comments-list::-webkit-scrollbar {
  width: 6px;
}

.comments-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.comments-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.comments-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Submit for Approval Dialog - UPDATED */
.submit-dialog-card {
  border: 2px solid #353535 !important;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.submit-dialog-header {
  display: flex;
  align-items: center;
  padding: 20px 24px !important;
  background: #353535 !important;
  color: white !important;
  font-size: 18px !important;
  font-weight: 600 !important;
}

.dialog-divider {
  border-color: #e0e0e0 !important;
  opacity: 1 !important;
}

.submit-dialog-content {
  padding: 24px !important;
  background: white !important;
}

.submit-info_box {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #353535;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.submit-message {
  font-size: 14px;
  line-height: 1.6;
  color: #555;
  margin: 0;
}

.submit-message strong {
  color: #353535;
  font-weight: 600;
}

.priority-field {
  margin-bottom: 16px !important;
}

:deep(.priority-field .v-field) {
  background: white !important;
  border-radius: 6px !important;
}

:deep(.priority-field .v-field__outline) {
  border-color: #d0d0d0 !important;
  border-width: 1px !important;
}

:deep(.priority-field .v-field--focused .v-field__outline) {
  border-color: #353535 !important;
  border-width: 2px !important;
}

.comments-field {
  margin-bottom: 16px !important;
}

:deep(.comments-field .v-field) {
  background: white !important;
  border-radius: 6px !important;
}

:deep(.comments-field .v-field__outline) {
  border-color: #d0d0d0 !important;
  border-width: 1px !important;
}

:deep(.comments-field .v-field--focused .v-field__outline) {
  border-color: #353535 !important;
  border-width: 2px !important;
}

.next-step-alert {
  border-left: 4px solid #353535 !important;
  border-radius: 6px !important;
  background: #f8f8f8 !important;
  padding: 12px 16px !important;
}

:deep(.next-step-alert .v-alert__prepend) {
  margin-right: 12px !important;
  color: #353535 !important;
}

.alert-text {
  font-size: 13px;
  line-height: 1.5;
  color: #555;
}

.alert-text strong {
  display: block;
  margin-bottom: 4px;
  color: #353535;
  font-size: 14px;
  font-weight: 600;
}

.submit-dialog-actions {
  padding: 16px 24px !important;
  background: #fafafa !important;
  border-top: 1px solid #e0e0e0 !important;
}

.cancel-btn {
  border: 2px solid #353535 !important;
  color: #353535 !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 24px !important;
}

.cancel-btn:hover {
  background: #f5f5f5 !important;
}

.confirm-submit-btn {
  background: #353535 !important;
  color: white !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 28px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.confirm-submit-btn:hover {
  background: #1f1f1f !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

/* Responsive adjustments for dialog */
@media (max-width: 600px) {
  .submit-dialog-header {
    padding: 16px 20px !important;
    font-size: 16px !important;
  }

  .submit-dialog-content {
    padding: 20px !important;
  }

  .submit-info-box {
    padding: 12px;
  }

  .submit-message {
    font-size: 13px;
  }

  .submit-dialog-actions {
    padding: 12px 20px !important;
    flex-direction: column;
    gap: 8px;
  }

  .cancel-btn,
  .confirm-submit-btn {
    width: 100%;
  }

  .submit-dialog-actions .v-spacer {
    display: none;
  }
}

/* Delete Comment Dialog Styles */
.delete-dialog-card {
  border: 2px solid #353535 !important;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.delete-dialog-header {
  display: flex;
  align-items: center;
  padding: 20px 24px !important;
  background: #353535 !important;
  color: white !important;
  font-size: 18px !important;
  font-weight: 600 !important;
}

.delete-dialog-content {
  padding: 24px !important;
  background: white !important;
}

.delete-info-box {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #353535;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.delete-message {
  font-size: 14px;
  line-height: 1.6;
  color: #555;
  margin: 0;
}

.warning-alert {
  border-left: 4px solid #353535 !important;
  background: #f8f8f8 !important;
  border-radius: 6px !important;
  padding: 12px 16px !important;
}

:deep(.warning-alert .v-alert__prepend) {
  margin-right: 12px !important;
  color: #353535 !important;
}

.alert-text {
  font-size: 13px;
  line-height: 1.5;
  color: #555;
}

.alert-text strong {
  display: inline;
  font-weight: 600;
  color: #353535;
}

.delete-dialog-actions {
  padding: 16px 24px !important;
  background: #fafafa !important;
  border-top: 1px solid #e0e0e0 !important;
}

.delete-dialog-actions .cancel-btn {
  border: 2px solid #353535 !important;
  color: #353535 !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 24px !important;
}

.delete-dialog-actions .cancel-btn:hover {
  background: #f5f5f5 !important;
}

.confirm-delete-btn {
  background: #353535 !important;
  color: white !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 28px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.confirm-delete-btn:hover {
  background: #1f1f1f !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

/* Unsaved Changes Dialog Styles */
.unsaved-dialog-card {
  border: 2px solid #353535 !important;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.unsaved-dialog-header {
  display: flex;
  align-items: center;
  padding: 20px 24px !important;
  background: #353535 !important;
  color: white !important;
  font-size: 18px !important;
  font-weight: 600 !important;
}

.unsaved-dialog-content {
  padding: 24px !important;
  background: white !important;
}

.unsaved-info-box {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #353535;
  border-radius: 6px;
  padding: 16px;
}

.unsaved-message {
  font-size: 14px;
  line-height: 1.6;
  color: #555;
  margin: 0;
}

.unsaved-dialog-actions {
  padding: 16px 24px !important;
  background: #fafafa !important;
  border-top: 1px solid #e0e0e0 !important;
}

.unsaved-dialog-actions .leave-btn {
  border: 2px solid #ef4444 !important;
  color: #ef4444 !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 24px !important;
}

.unsaved-dialog-actions .leave-btn:hover {
  background: #fef2f2 !important;
}

.unsaved-dialog-actions .cancel-btn {
  border: 2px solid #353535 !important;
  color: #353535 !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 24px !important;
}

.unsaved-dialog-actions .cancel-btn:hover {
  background: #f5f5f5 !important;
}

.unsaved-dialog-actions .save-btn {
  background: #353535 !important;
  color: white !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 28px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.unsaved-dialog-actions .save-btn:hover {
  background: #1f1f1f !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

/* Comment Notification Card Styles (like highlight comments) */
.comment-notification-card {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  min-width: 300px;
  max-width: 400px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  border: 2px solid #353535 !important;
}

.notification-success {
  background: #f0fdf4 !important;
  border-color: #10b981 !important;
}

.notification-error {
  background: #fef2f2 !important;
  border-color: #ef4444 !important;
}

.notification-warning {
  background: #fff7ed !important;
  border-color: #f59e0b !important;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.notification-icon {
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.5;
}

.notification-close {
  flex-shrink: 0;
  color: #6b7280 !important;
}

.notification-close:hover {
  color: #374151 !important;
  background: rgba(0, 0, 0, 0.05) !important;
}

/* Slide down animation for notification card */
.slide-down-enter-active {
  transition: all 0.3s ease-out;
}

.slide-down-leave-active {
  transition: all 0.3s ease-in;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
