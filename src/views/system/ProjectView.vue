<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import QuillEditor from '@/components/QuillEditor.vue'
import ProjectHistory from '@/components/ProjectHistory.vue'
import HighlightComments from '@/components/HighlightComments.vue'
import MediaUpload from '@/components/MediaUpload.vue'
import { projectsService, profilesService } from '@/services/supabaseService'
import { supabase } from '@/utils/supabase'
import { createProjectVersion as createProjectVersionSupabase } from '@/services/supabaseProjectHistory.js'
import {
  getProjectComments,
  addProjectComment,
  deleteProjectComment,
  toggleCommentApproval,
} from '@/services/commentsService.js'
import {
  notifyStatusChange,
  notifyProjectUpdate,
  notifyNewComment,
} from '@/services/notificationsService.js'
import { getDisplayName } from '@/utils/userDisplay.js'
import { formatStatus } from '@/utils/statusFormatter.js'
import { getApprovalHistory, formatApprovalTimestamp } from '@/utils/approvalHistory.js'

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

// Current user profile for display names
const currentUserProfile = ref(null)

// Load current user's profile
const loadCurrentUserProfile = async () => {
  try {
    const userEmail = localStorage.getItem('userEmail')
    if (userEmail) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', userEmail)
        .single()

      if (profiles) {
        currentUserProfile.value = profiles
        // Store userId in localStorage if not already set
        if (!localStorage.getItem('userId') && profiles.id) {
          localStorage.setItem('userId', profiles.id)
          console.log('🔑 UserId stored in localStorage:', profiles.id)
        }
      }
    }
  } catch (error) {
    console.error('Error loading current user profile:', error)
  }
}

// Title editing state
const isEditingTitle = ref(false)
const titleInputRef = ref(null)
const tempTitle = ref(project.value.title)

// Rich text editor state - Always in edit mode now
const editorContent = ref('')
const isEditing = ref(true) // Always true now - auto-edit mode
const quillEditorRef = ref(null)

// Project members for permission checking
const projectMemberIds = ref([])

// Member profiles for clickable links
const writerProfiles = ref([]) // Array of { id, displayName }
const artistProfiles = ref([]) // Array of { id, displayName }
const sectionHeadProfile = ref(null) // { id, displayName }

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
// const showHistory = ref(true) // Always show by default

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

const saveTitleEdit = async () => {
  // Check permission before saving
  if (!canEditProject.value) {
    showNotification('You do not have permission to edit this project', 'error')
    cancelTitleEdit()
    return
  }

  if (tempTitle.value.trim()) {
    project.value.title = tempTitle.value.trim()
    isEditingTitle.value = false

    // Save to Supabase
    try {
      await projectsService.update(projectId, {
        title: tempTitle.value.trim(),
        updated_at: new Date().toISOString(),
      })

      console.log('✅ Title updated via Supabase:', project.value.title)

      // Create version history in Supabase
      try {
        const userEmail = localStorage.getItem('userEmail') || 'Unknown User'
        await createProjectVersionSupabase(
          projectType.value,
          projectId,
          project.value,
          'Title updated',
          userEmail,
          'draft',
        )
        console.log('✅ Version history created for title change')
      } catch (versionError) {
        console.error('Error creating version history:', versionError)
        // Don't fail the save if version history fails
      }

      showNotification('Title updated successfully')
      updateLastSaveTime()
    } catch (error) {
      console.error('❌ Error saving title:', error)
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

// Enhanced auto-save content function with API
const saveContent = async (showNotif = false) => {
  // Check permission before saving
  if (!canEditProject.value) {
    if (showNotif) {
      showNotification('You do not have permission to edit this project', 'error')
    }
    return false
  }

  if (quillEditorRef.value) {
    const content = quillEditorRef.value.getContent()

    // Only save if content actually changed
    if (content === project.value.content) {
      return false // No changes to save
    }

    // const oldContent = previousContent.value || project.value.content
    editorContent.value = content
    project.value.content = content

    // Save to Supabase
    try {
      await projectsService.update(projectId, {
        content: content,
        updated_at: new Date().toISOString(),
      })

      console.log('✅ Content saved to Supabase')

      // Create version history in Supabase
      try {
        const userEmail = localStorage.getItem('userEmail') || 'Unknown User'
        const fullName = currentUserProfile.value
          ? `${currentUserProfile.value.first_name || ''} ${currentUserProfile.value.last_name || ''}`.trim()
          : ''
        const profile = currentUserProfile.value
          ? { ...currentUserProfile.value, full_name: fullName }
          : { full_name: fullName }
        const displayName = getDisplayName(userEmail, profile, true)
        await createProjectVersionSupabase(
          projectType.value,
          projectId,
          project.value,
          'Content updated',
          displayName,
          'draft',
        )
        console.log('✅ Version history created in Supabase')
      } catch (versionError) {
        console.error('Error creating version history:', versionError)
        // Don't fail the save if version history fails
      }

      // Notify all involved users about the update (only on manual save, not auto-save)
      if (showNotif) {
        try {
          const userEmail = localStorage.getItem('userEmail') || 'Unknown User'
          const fullName = currentUserProfile.value
            ? `${currentUserProfile.value.first_name || ''} ${currentUserProfile.value.last_name || ''}`.trim()
            : ''
          const profile = currentUserProfile.value
            ? { ...currentUserProfile.value, full_name: fullName }
            : { full_name: fullName }
          const displayName = getDisplayName(userEmail, profile, true)

          await notifyProjectUpdate({
            project: project.value,
            updatedBy: displayName,
            changes: 'Content updated',
          })
          console.log('✅ Notified all involved users about content update')
        } catch (notifError) {
          console.error('Error sending notifications:', notifError)
          // Don't fail the save if notifications fail
        }
      }

      // Update previous content for next comparison
      previousContent.value = content

      updateLastSaveTime()
      hasUnsavedChanges.value = false

      if (showNotif) {
        showNotification('Content saved', 'success')
      }

      console.log('Content auto-saved to Supabase')
      return true // Successfully saved
    } catch (error) {
      console.error('Error saving content to Supabase:', error)
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
  // Check permission before saving
  if (!canEditProject.value) {
    showNotification('You do not have permission to edit this project', 'error')
    return
  }

  saveContent(true) // Show notification for manual save

  // Update status to draft if not already
  if (project.value.status !== 'draft') {
    project.value.status = 'draft'
    // Status will be updated by saveContent function via API
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
    // Get current user from Supabase Auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      showNotification('You must be logged in to submit a project', 'error')
      return
    }

    const oldStatus = project.value.status

    // Update via Supabase
    await projectsService.update(projectId, {
      status: 'to_section_head',
      priority_level: submitPriority.value,
      submitted_by: user.id,
      submitted_date: new Date().toISOString(),
      submission_comments: submitComments.value,
      updated_at: new Date().toISOString(),
    })

    console.log('✅ Project submitted via Supabase')

    project.value.status = 'to_section_head'
    hasUnsavedChanges.value = false

    // Get updated project with all relationships for notification
    const updatedProject = await projectsService.getById(projectId)

    // Get user display name for notification
    const userEmail = user.email || localStorage.getItem('userEmail') || 'Current User'
    const fullName = currentUserProfile.value
      ? `${currentUserProfile.value.first_name || ''} ${currentUserProfile.value.last_name || ''}`.trim()
      : ''
    const profile = currentUserProfile.value
      ? { ...currentUserProfile.value, full_name: fullName }
      : { full_name: fullName }
    const displayName = getDisplayName(userEmail, profile, true)

    // Notify all involved users about status change
    await notifyStatusChange({
      project: updatedProject,
      oldStatus: oldStatus,
      newStatus: 'to_section_head',
      actionBy: displayName,
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
      router.push(listRoutes[projectType.value] || '/magazine')
    }, 600)
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
/* const getDepartmentFromProject = () => {
  // You can customize this logic based on your needs
  const typeMap = {
    magazine: 'Editorial',
    newsletter: 'News',
    folio: 'Arts',
    other: 'Marketing',
  }
  return typeMap[projectType.value] || 'General'
} */

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

// Function to navigate to a user's profile
const viewUserProfile = (userId) => {
  router.push(`/profile/${userId}`)
}

const projectTypeMap = {
  magazine: '/magazine',
  newsletter: '/newsletter',
  folio: '/folio',
  other: '/other',
  'social-media': '/other', // social-media projects route to /other
}

// View permission - allow admin, all editors, section heads, and assigned members
const canViewProject = computed(() => {
  const userRole = localStorage.getItem('userRole')
  const accessRole = localStorage.getItem('accessRole')
  const userId = localStorage.getItem('userId')
  const effectiveUserId = userId || currentUserProfile.value?.id

  // All higher ranks can VIEW projects (but not necessarily EDIT)
  if (
    userRole === 'admin' ||
    userRole === 'editor' ||
    userRole === 'section_head' ||
    accessRole === 'section_head' ||
    accessRole === 'technical_editor' ||
    accessRole === 'creative_director' ||
    accessRole === 'editor_in_chief' ||
    accessRole === 'chief_adviser' ||
    accessRole === 'archival_manager' ||
    accessRole === 'online_accounts_manager'
  ) {
    return true
  }

  const normalizedUserId = effectiveUserId ? parseInt(effectiveUserId, 10) : null
  if (!normalizedUserId) {
    return false
  }

  if (projectMemberIds.value.includes(normalizedUserId)) {
    return true
  }

  const sectionHeadId = project.value?.section_head_id
    ? parseInt(project.value.section_head_id, 10)
    : null
  return sectionHeadId === normalizedUserId
})

// Permission checking - determine if current user can edit this project
const canEditProject = computed(() => {
  const userId = localStorage.getItem('userId')
  const userEmail = localStorage.getItem('userEmail')
  const effectiveUserId = userId || currentUserProfile.value?.id

  // Admin emails - full access to all projects
  const adminEmails = [
    'yssahjulianah.barcial@carsu.edu.ph',
    'lovellhudson.clavel@carsu.edu.ph',
    'altheaguila.gorres@carsu.edu.ph',
  ]

  // Check if user is admin
  if (userEmail && adminEmails.includes(userEmail)) {
    console.log('✅ Admin access granted:', userEmail)
    return true
  }

  console.log('🔐 Permission Check:', {
    userId: effectiveUserId,
    projectMemberIds: projectMemberIds.value,
    currentUserProfile: currentUserProfile.value?.id,
  })

  // Only assigned writers/artists can edit
  const normalizedUserId = effectiveUserId ? parseInt(effectiveUserId, 10) : null
  if (projectMemberIds.value.length > 0 && normalizedUserId) {
    const hasAccess = projectMemberIds.value.includes(normalizedUserId)
    console.log('🔍 Member edit check:', {
      effectiveUserId: normalizedUserId,
      memberIds: projectMemberIds.value,
      hasAccess,
    })
    return hasAccess
  }

  console.log('❌ Permission denied: No userId or no project members')
  return false
})

const performNavigation = () => {
  // For other/social-media types, route to /other
  const route = projectTypeMap[projectType.value] || '/magazine'
  router.push(route)
}

// Load comments for the current project
const loadProjectComments = async () => {
  try {
    comments.value = await getProjectComments(projectType.value, projectId)
    console.log('Comments loaded:', comments.value)
  } catch (error) {
    console.error('Error loading comments:', error)
    comments.value = []
    console.log('📋 Project member IDs:', projectMemberIds.value)
  }
}

// Load project data from Supabase
const loadProjectData = async () => {
  try {
    console.log('🔍 Loading project from Supabase:', projectId)

    // Load from Supabase
    const foundProject = await projectsService.getById(projectId)

    console.log('✅ Project loaded from Supabase:', foundProject)

    // Load project members with their profile info
    const members = await projectsService.getMembers(projectId)
    console.log('✅ Project members loaded:', members)

    // Store member user IDs for permission checking
    projectMemberIds.value = members.map((m) => m.user_id)

    // Get section head name from section_head_id
    let sectionHeadName = 'Not assigned'
    sectionHeadProfile.value = null
    if (foundProject.section_head_id) {
      try {
        const sectionHeadProfileData = await profilesService.getById(foundProject.section_head_id)
        if (sectionHeadProfileData && sectionHeadProfileData.id) {
          const fullName =
            `${sectionHeadProfileData.first_name || ''} ${sectionHeadProfileData.last_name || ''}`.trim()
          const profile = { ...sectionHeadProfileData, full_name: fullName }
          sectionHeadName = getDisplayName(sectionHeadProfileData.email, profile, true)
          sectionHeadProfile.value = {
            id: sectionHeadProfileData.id,
            displayName: sectionHeadName,
          }
        }
      } catch (error) {
        console.error('Error loading section head profile:', error)
      }
    }

    // Get writers and artists from project_members
    const writersArray = members
      .filter((m) => m.role === 'writer')
      .map((m) => {
        const profile = m.profiles
        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        const fullProfile = { ...profile, full_name: fullName }
        const displayName = getDisplayName(profile.email, fullProfile, false)
        return { id: profile?.id || null, displayName, fullProfile }
      })
      .filter((w) => w.id)
    const writersText =
      writersArray.length > 0 ? writersArray.map((w) => w.displayName).join(', ') : 'Not assigned'
    writerProfiles.value = writersArray

    const artistsArray = members
      .filter((m) => m.role === 'artist')
      .map((m) => {
        const profile = m.profiles
        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        const fullProfile = { ...profile, full_name: fullName }
        const displayName = getDisplayName(profile.email, fullProfile, false)
        return { id: profile?.id || null, displayName, fullProfile }
      })
      .filter((a) => a.id)
    const artistsText =
      artistsArray.length > 0 ? artistsArray.map((a) => a.displayName).join(', ') : 'Not assigned'
    artistProfiles.value = artistsArray

    // Normalize status for draft projects
    let normalizedStatus = foundProject.status || 'draft'
    if (normalizedStatus === 'to_technical_editor') {
      normalizedStatus = 'draft'
    }

    project.value = {
      ...foundProject,
      id: String(projectId),
      title: foundProject.title || 'Untitled Project',
      status: normalizedStatus,
      lastModified: foundProject.updated_at
        ? new Date(foundProject.updated_at).toLocaleString()
        : new Date().toLocaleString(),
      content: foundProject.content || '',
      writers: writersText,
      artists: artistsText,
      sectionHead: sectionHeadName,
      description: foundProject.description || 'No description provided',
      dueDate: foundProject.due_date || foundProject.deadline || '',
      department: foundProject.department || '',
      priority: foundProject.priority || 'Medium',
    }

    if (!canViewProject.value) {
      showNotification('Access denied. You are not assigned to this project.', 'error')
      setTimeout(() => {
        router.push('/dashboard')
      }, 1500)
      return
    }

    // Set project type
    projectType.value = foundProject.project_type || route.query.type || 'magazine'

    // Set editor content
    editorContent.value = foundProject.content || ''
    previousContent.value = foundProject.content || ''

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

    console.log('✅ Project loaded successfully from Supabase')
  } catch (error) {
    console.error('❌ Error loading project:', error)
    showNotification('Project not found. Please check the project ID.', 'error')

    // Redirect to project list after a delay
    setTimeout(() => {
      router.push('/magazine')
    }, 2000)
  }
}

// Comment functions
const addComment = async () => {
  if (newComment.value.trim()) {
    try {
      const userEmail = localStorage.getItem('userEmail') || 'Unknown User'
      const fullName = currentUserProfile.value
        ? `${currentUserProfile.value.first_name || ''} ${currentUserProfile.value.last_name || ''}`.trim()
        : ''
      const profile = currentUserProfile.value
        ? { ...currentUserProfile.value, full_name: fullName }
        : { full_name: fullName }
      const displayName = getDisplayName(userEmail, profile, true)

      const comment = addProjectComment(
        projectType.value,
        projectId,
        newComment.value.trim(),
        displayName,
      )
      comments.value.unshift(comment)

      // Notify all involved users about the new comment
      try {
        await notifyNewComment({
          project: project.value,
          commentAuthor: displayName,
          commentText: newComment.value.trim(),
        })
        console.log('✅ Notified all involved users about new comment')
      } catch (notifError) {
        console.error('Error sending comment notifications:', notifError)
        // Don't fail the comment addition if notifications fail
      }

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
  } catch {
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
  return formatStatus(status)
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
onMounted(async () => {
  // Load current user profile first
  await loadCurrentUserProfile()

  // Load project data from backend API
  console.log('Loading project:', projectId)
  await loadProjectData()

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
const approvalHistory = computed(() => {
  return getApprovalHistory(project.value)
})

const getBackButtonText = computed(() => {
  const typeNames = {
    magazine: 'Magazine',
    newsletter: 'Newsletter',
    folio: 'Folio',
    other: 'Other',
    'social-media': 'Other',
  }
  return `Back to ${typeNames[projectType.value] || 'Magazine'}`
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
        <!-- Read-Only Banner for users without edit permission -->
        <v-alert
          v-if="!canEditProject"
          type="info"
          variant="tonal"
          class="mb-4"
          density="compact"
          icon="mdi-eye"
        >
          You are viewing this project in read-only mode. Only assigned writers/artists can edit.
        </v-alert>

        <v-row>
          <!-- Left Panel - Project Details and Editor -->
          <v-col cols="12" lg="8" class="left-panel">
            <!-- Editable Project Title -->
            <div class="title-section">
              <h1
                v-if="!isEditingTitle"
                class="project-title"
                :class="{ 'editable-title': canEditProject }"
                @click="canEditProject && startEditingTitle()"
                :title="
                  canEditProject
                    ? 'Click to edit title'
                    : 'You do not have permission to edit this project'
                "
              >
                {{ project.title }}
                <v-icon v-if="canEditProject" class="edit-icon" size="20">mdi-pencil</v-icon>
                <v-icon v-else class="lock-icon" size="18" color="#9ca3af">mdi-lock</v-icon>
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
                  <span class="value">
                    <template v-if="sectionHeadProfile">
                      <span @click="viewUserProfile(sectionHeadProfile.id)" class="profile-link">
                        {{ sectionHeadProfile.displayName }}
                      </span>
                    </template>
                    <template v-else>{{ project.sectionHead }}</template>
                  </span>
                </div>
              </div>

              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Due Date:</span>
                  <span class="value">{{ project.dueDate }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Writer:</span>
                  <span class="value">
                    <template v-if="writerProfiles.length > 0">
                      <span
                        v-for="(writer, index) in writerProfiles"
                        :key="writer.id"
                        @click="viewUserProfile(writer.id)"
                        class="profile-link"
                      >
                        {{ writer.displayName
                        }}<span v-if="index < writerProfiles.length - 1">, </span>
                      </span>
                    </template>
                    <template v-else>{{ project.writers || 'Not assigned' }}</template>
                  </span>
                </div>
              </div>

              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Last Modified:</span>
                  <span class="value">{{ project.lastModified }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Artist:</span>
                  <span class="value">
                    <template v-if="artistProfiles.length > 0">
                      <span
                        v-for="(artist, index) in artistProfiles"
                        :key="artist.id"
                        @click="viewUserProfile(artist.id)"
                        class="profile-link"
                      >
                        {{ artist.displayName
                        }}<span v-if="index < artistProfiles.length - 1">, </span>
                      </span>
                    </template>
                    <template v-else>{{ project.artists || 'Not assigned' }}</template>
                  </span>
                </div>
              </div>

              <div class="metadata-row metadata-row-last">
                <div class="metadata-item">
                  <span class="label">Media Uploaded:</span>
                  <span class="value">{{ project.mediaUploaded }}</span>
                </div>
              </div>
            </div>

            <!-- Approval History Section -->
            <div v-if="approvalHistory.length > 0" class="approval-history-section">
              <h3 class="approval-history-title">Approval History</h3>
              <div class="approval-timeline">
                <div
                  v-for="(approval, index) in approvalHistory"
                  :key="index"
                  class="approval-item"
                >
                  <div class="approval-marker">
                    <v-icon size="20" :color="approval.type === 'publish' ? 'success' : 'primary'">
                      {{
                        approval.type === 'publish'
                          ? 'mdi-check-circle'
                          : approval.type === 'forward'
                            ? 'mdi-arrow-right-circle'
                            : 'mdi-checkmark-circle'
                      }}
                    </v-icon>
                  </div>
                  <div class="approval-content">
                    <div class="approval-header">
                      <span class="stage-name">{{ approval.stage }}</span>
                      <span class="timestamp">{{
                        formatApprovalTimestamp(approval.timestamp)
                      }}</span>
                    </div>
                    <div class="approval-meta">
                      <span class="user-id">By: {{ approval.approvedBy.substring(0, 8) }}</span>
                    </div>
                    <div v-if="approval.comments" class="approval-comments">
                      <span class="comments-label">Notes:</span>
                      <span class="comments-text">{{ approval.comments }}</span>
                    </div>
                  </div>
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
                :read-only="!canEditProject"
                :project-id="projectId"
                :project-type="projectType"
                height="500px"
                placeholder="Start writing your content..."
                @text-change="handleContentChange"
                @highlight-comments-updated="handleHighlightCommentsUpdated"
                @notification="handleEditorNotification"
              />
            </div>

            <!-- Media Upload Section for Images/Videos -->
            <div class="media-upload-wrapper">
              <MediaUpload
                :project-id="projectId"
                :uploaded-by="currentUserProfile?.id || null"
                @upload-success="showNotification('Media uploaded successfully!')"
                @upload-error="showNotification($event, 'error')"
              />
            </div>

            <!-- Action Buttons - Keeping Original Style -->
            <div class="action-buttons">
              <v-btn
                @click="toggleEdit"
                variant="outlined"
                class="edit-btn"
                :disabled="!canSubmitProject || !canEditProject"
              >
                Submit for Approval
              </v-btn>
              <v-btn
                @click="saveAsDraft"
                variant="outlined"
                class="draft-btn"
                :disabled="!canEditProject"
              >
                Save as Draft
              </v-btn>
              <v-btn variant="outlined" class="remove-btn" :disabled="!canEditProject">
                Remove Submission
              </v-btn>
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

.project-title:not(.editable-title) {
  cursor: default;
  padding: 8px 12px;
}

.edit-icon {
  opacity: 0;
  transition: opacity 0.2s ease;
  color: #6b7280;
}

.lock-icon {
  opacity: 0.5;
  margin-left: 8px;
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

.media-upload-wrapper {
  margin-top: 0;
  margin-bottom: 24px;
  width: 100%;
  display: block;
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

/* Approval History Styles */
.approval-history-section {
  margin-top: 30px;
  padding: 20px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.approval-history-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

.approval-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.approval-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: white;
  border-left: 3px solid #0ea5e9;
  border-radius: 4px;
}

.approval-marker {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  padding-top: 2px;
}

.approval-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.approval-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stage-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.timestamp {
  font-size: 12px;
  color: #6b7280;
}

.approval-meta {
  font-size: 12px;
  color: #6b7280;
}

.user-id {
  font-family: monospace;
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
}

.approval-comments {
  margin-top: 4px;
  font-size: 13px;
}

.comments-label {
  font-weight: 500;
  color: #4b5563;
}

.comments-text {
  color: #6b7280;
  margin-left: 6px;
}

.profile-link {
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.profile-link:hover {
  opacity: 0.7;
}
</style>
