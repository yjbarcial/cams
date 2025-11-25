<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import QuillEditor from '@/components/QuillEditor.vue'
import ProjectHistory from '@/components/ProjectHistory.vue'
import HighlightComments from '@/components/HighlightComments.vue'
import {
  getProjectComments,
  addProjectComment,
  deleteProjectComment,
  toggleCommentApproval,
} from '@/services/commentsService.js'
import { createProjectVersion as createProjectVersionSupabase } from '@/services/supabaseProjectHistory.js'
import { createStatusChangeNotification } from '@/services/notificationsService.js'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

// Project type
const projectType = ref('magazine')

// User role - EDITOR-IN-CHIEF ONLY
const currentUserRole = ref('Editor-in-Chief')
const currentUser = ref('Editor-in-Chief User')

// Project data
const project = ref({
  id: projectId,
  title: '',
  status: '',
  dueDate: '',
  lastModified: '',
  sectionHead: '',
  writers: '',
  artists: '',
  type: 'magazine',
  description: '',
  content: '',
  submittedBy: '',
  submittedDate: '',
  priority: 'Medium',
  department: '',
})

// Rich text editor state
const editorContent = ref('')
const quillEditorRef = ref(null)
const isEditorEditable = ref(false)

// Auto-save state
const lastSaveTime = ref(null)
const saveTimeout = ref(null)
const hasUnsavedChanges = ref(false)

// Approval state
const showApprovalDialog = ref(false)
const approvalAction = ref('')
const approvalComments = ref('')
const approvalPriority = ref('Medium')
const publishData = ref({
  publishDate: new Date().toISOString().split('T')[0],
  publishPlatform: 'Website',
})

// History and comments
const showHistory = ref(true)
const comments = ref([])
const newComment = ref('')
const commentSearch = ref('')
const highlightComments = ref([])

// Snackbar
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

const showNotification = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

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

const updateLastSaveTime = () => {
  lastSaveTime.value = new Date().toLocaleString()
  project.value.lastModified = lastSaveTime.value
}

const handleContentChange = () => {
  if (isEditorEditable.value) {
    hasUnsavedChanges.value = true
    debouncedSave()
  }
}

const debouncedSave = () => {
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }

  saveTimeout.value = setTimeout(() => {
    if (hasUnsavedChanges.value && isEditorEditable.value) {
      saveContentChanges()
    }
  }, 1000)
}

// EDITOR-IN-CHIEF - Approval actions (3 buttons always visible)
const approvalActions = computed(() => {
  // Check if project is ready to publish (returned from Chief Adviser with "For Publish" status)
  const isReadyToPublish = project.value.status === 'For Publish'

  return [
    {
      value: 'forward',
      text: 'Forward to Chief Adviser',
      color: 'purple',
      icon: null,
      disabled: isReadyToPublish, // Disable forward if already approved by Chief Adviser
    },
    {
      value: 'approve',
      text: 'Approve',
      color: 'success',
      icon: null,
      disabled: isReadyToPublish, // Disable approve if already approved by Chief Adviser
    },
    {
      value: 'publish',
      text: 'Publish',
      color: 'primary',
      icon: isReadyToPublish ? null : 'mdi-lock', // Show lock icon if not ready
      disabled: !isReadyToPublish, // Only enable when status is "For Publish"
    },
  ]
})

// EDITOR-IN-CHIEF - Status mapping
const getNextStatus = (action) => {
  if (action === 'approve') return 'EIC Approved'
  if (action === 'forward') return 'To Chief Adviser'
  if (action === 'publish') return 'Published'
  return project.value.status
}

// EDITOR-IN-CHIEF - Comment placeholder
const getCommentPlaceholder = () => {
  if (approvalAction.value === 'approve') {
    return 'Add approval notes...'
  }
  if (approvalAction.value === 'forward') {
    return 'Add notes for consultation with Chief Adviser...'
  }
  if (approvalAction.value === 'publish') {
    return 'Add publication notes...'
  }
  return 'Add your comments...'
}

const getBackButtonText = computed(() => {
  const typeNames = {
    magazine: 'Magazine',
    newsletter: 'Newsletter',
    folio: 'Folio',
    other: 'Other',
    'social-media': 'Other',
  }
  return `Back to ${typeNames[projectType.value] || 'Projects'}`
})

// Helper function to get the actual storage key where a project exists
const getActualStorageKey = (projectId) => {
  // For other/social-media types, check both storage keys
  const otherProjects = JSON.parse(localStorage.getItem('other_projects') || '[]')
  const socialMediaProjects = JSON.parse(localStorage.getItem('social-media_projects') || '[]')

  const inOther = otherProjects.some((p) => String(p.id) === String(projectId))
  const inSocialMedia = socialMediaProjects.some((p) => String(p.id) === String(projectId))

  if (inOther) return { key: 'other_projects', type: 'other' }
  if (inSocialMedia) return { key: 'social-media_projects', type: 'social-media' }

  // For other types, check their specific storage
  const projectTypes = ['magazine', 'newsletter', 'folio']
  for (const type of projectTypes) {
    const storageKey = `${type}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    if (projects.some((p) => String(p.id) === String(projectId))) {
      return { key: storageKey, type: type }
    }
  }

  return null
}

const saveContentChanges = async () => {
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
      projects[projectIndex].content = editorContent.value
      projects[projectIndex].lastModified = new Date().toLocaleString()
      // Preserve status when saving content
      if (project.value.status) {
        projects[projectIndex].status = project.value.status
      }
      localStorage.setItem(actualStorage.key, JSON.stringify(projects))

      // Update projectType to match actual storage
      projectType.value = actualStorage.type

      project.value.content = editorContent.value
      project.value.lastModified = new Date().toLocaleString()

      updateLastSaveTime()
      hasUnsavedChanges.value = false
    }
  } catch (error) {
    console.error('Error saving content:', error)
    showNotification('Error saving content', 'error')
  }
}

const startApproval = (action) => {
  // Check if publish is locked
  if (action === 'publish' && project.value.status !== 'For Publish') {
    showNotification('Project must be approved by Chief Adviser before publishing', 'warning')
    return
  }

  approvalAction.value = action
  approvalComments.value = ''
  showApprovalDialog.value = true
}

const submitApproval = async () => {
  if (!approvalAction.value) return

  const action = approvalAction.value
  const newStatus = getNextStatus(action)

  try {
    if (isEditorEditable.value) {
      await saveContentChanges()
    }

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
      projects[projectIndex].status = newStatus
      projects[projectIndex].lastModified = new Date().toLocaleString()

      if (action === 'approve') {
        projects[projectIndex].eicApprovedBy = currentUser.value
        projects[projectIndex].eicApprovedDate = new Date().toISOString()
        projects[projectIndex].eicComments = approvalComments.value
        projects[projectIndex].priority = approvalPriority.value
      } else if (action === 'forward') {
        projects[projectIndex].forwardedToAdviserBy = currentUser.value
        projects[projectIndex].forwardedToAdviserDate = new Date().toISOString()
        projects[projectIndex].forwardNotes = approvalComments.value
        projects[projectIndex].priority = approvalPriority.value
      } else if (action === 'publish') {
        projects[projectIndex].publishedBy = currentUser.value
        projects[projectIndex].publishedDate = publishData.value.publishDate
        projects[projectIndex].publishPlatform = publishData.value.publishPlatform
        projects[projectIndex].publishNotes = approvalComments.value
      }

      localStorage.setItem(actualStorage.key, JSON.stringify(projects))
      project.value.status = newStatus

      // Update projectType to match actual storage
      projectType.value = actualStorage.type

      // Create notification based on action
      if (action === 'approve') {
        createStatusChangeNotification({
          projectId: projectId,
          projectType: actualStorage.type,
          projectTitle: project.value.title,
          oldStatus: 'To Editor-in-Chief',
          newStatus: 'EIC Approved',
          actionBy: currentUser.value,
          recipient: 'All',
          comments: approvalComments.value,
        })
      } else if (action === 'forward') {
        createStatusChangeNotification({
          projectId: projectId,
          projectType: actualStorage.type,
          projectTitle: project.value.title,
          oldStatus: 'To Editor-in-Chief',
          newStatus: 'To Chief Adviser',
          actionBy: currentUser.value,
          recipient: 'Chief Adviser',
          comments: approvalComments.value,
        })
      } else if (action === 'publish') {
        createStatusChangeNotification({
          projectId: projectId,
          projectType: actualStorage.type,
          projectTitle: project.value.title,
          oldStatus: 'For Publish',
          newStatus: 'Published',
          actionBy: currentUser.value,
          recipient: 'All',
          comments: approvalComments.value,
        })
      }

      // Try to save to Supabase (non-blocking) - FIXED
      try {
        // Only call Supabase if project has a valid supabaseId
        if (project.value.supabaseId) {
          await createProjectVersionSupabase(
            project.value.supabaseId, // Use the actual Supabase ID
            editorContent.value || '',
            action === 'approve'
              ? 'Approved by Editor-in-Chief'
              : action === 'forward'
                ? 'Forwarded to Chief Adviser'
                : action === 'publish'
                  ? 'Published'
                  : 'Returned by EIC for edits',
            currentUser.value,
          )
          console.log('Project version saved to Supabase successfully')
        } else {
          console.log('Project does not have Supabase ID, skipping sync')
        }
      } catch (err) {
        console.warn('Failed to save project version to Supabase (non-critical):', err)
        // Don't block the workflow if Supabase fails
      }

      const historyKey = `approval_history_${projectId}`
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')
      existingHistory.push({
        action,
        approver: currentUser.value,
        role: 'Editor-in-Chief',
        comments: approvalComments.value,
        timestamp: new Date().toISOString(),
        priority: approvalPriority.value,
      })
      localStorage.setItem(historyKey, JSON.stringify(existingHistory))

      showApprovalDialog.value = false
      approvalAction.value = ''
      approvalComments.value = ''
      approvalPriority.value = 'Medium'

      if (action === 'approve') {
        showNotification('Project approved successfully!', 'success')
      } else if (action === 'forward') {
        showNotification('Project forwarded to Chief Adviser!', 'success')
      } else if (action === 'publish') {
        showNotification('Project published successfully!', 'success')
      }

      setTimeout(() => {
        // For other/social-media types, route to /other
        const routePath =
          actualStorage.type === 'other' || actualStorage.type === 'social-media'
            ? '/other'
            : `/${actualStorage.type}`
        router.push(routePath)
      }, 600)
      return
    }
  } catch (error) {
    console.error('Error processing approval:', error)
    showNotification('Error processing approval. Changes saved locally.', 'warning')
  }
}

const cancelApproval = () => {
  showApprovalDialog.value = false
  approvalAction.value = ''
  approvalComments.value = ''
}

const goBack = () => {
  if (isEditorEditable.value && hasUnsavedChanges.value) {
    saveContentChanges()
  }
  // Get actual storage to determine correct route
  const actualStorage = getActualStorageKey(projectId)
  if (actualStorage) {
    // For other/social-media types, route to /other
    const routePath =
      actualStorage.type === 'other' || actualStorage.type === 'social-media'
        ? '/other'
        : `/${actualStorage.type}`
    router.push(routePath)
  } else {
    // Fallback to projectType.value if we can't find actual storage
    const routePath =
      projectType.value === 'other' || projectType.value === 'social-media'
        ? '/other'
        : `/${projectType.value}`
    router.push(routePath)
  }
}

const loadProjectComments = () => {
  try {
    comments.value = getProjectComments(projectType.value, projectId)
  } catch (error) {
    console.error('Error loading comments:', error)
    comments.value = []
  }
}

const loadProjectData = () => {
  try {
    // First, try to get type from query parameter
    const queryType = route.query.type

    if (queryType) {
      console.log('Trying to load project from query type:', queryType)

      // For other/social-media types, check both storage keys to find where project actually exists
      if (queryType === 'other' || queryType === 'social-media') {
        // Check both storage keys
        const otherProjects = JSON.parse(localStorage.getItem('other_projects') || '[]')
        const socialMediaProjects = JSON.parse(
          localStorage.getItem('social-media_projects') || '[]',
        )

        let foundProject = otherProjects.find((p) => String(p.id) === String(projectId))
        let actualType = 'other'

        if (!foundProject) {
          foundProject = socialMediaProjects.find((p) => String(p.id) === String(projectId))
          actualType = 'social-media'
        }

        if (foundProject) {
          console.log('✅ Project found in', actualType, ':', foundProject)
          project.value = {
            ...foundProject,
            id: String(projectId),
            title: foundProject.title || 'Untitled Project',
            status: foundProject.status || 'Draft',
            lastModified: foundProject.lastModified || new Date().toLocaleString(),
            content: foundProject.content || '',
          }

          projectType.value = actualType
          editorContent.value = foundProject.content || ''
          updateLastSaveTime()
          loadProjectComments()
          console.log('✅ Project loaded successfully from', actualType)
          return
        }
        console.log('❌ Project not found with ID:', projectId, 'in other or social-media storage')
      } else {
        // For other types (magazine, newsletter, folio), use the query type directly
        const storageKey = `${queryType}_projects`
        const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
        const foundProject = projects.find((p) => String(p.id) === String(projectId))

        if (foundProject) {
          console.log('✅ Project found:', foundProject)
          project.value = {
            ...foundProject,
            id: String(projectId),
            title: foundProject.title || 'Untitled Project',
            status: foundProject.status || 'Draft',
            lastModified: foundProject.lastModified || new Date().toLocaleString(),
            content: foundProject.content || '',
          }

          projectType.value = queryType
          editorContent.value = foundProject.content || ''
          updateLastSaveTime()
          loadProjectComments()
          console.log('✅ Project loaded successfully')
          return
        }
      }
    }

    // If not found with query type, search all project types
    console.log('Searching all project types...')
    const projectTypes = ['magazine', 'newsletter', 'folio', 'other', 'social-media']

    for (const type of projectTypes) {
      const storageKey = `${type}_projects`
      const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const foundProject = projects.find((p) => String(p.id) === String(projectId))

      if (foundProject) {
        console.log('✅ Project found in', type, ':', foundProject)
        project.value = {
          ...foundProject,
          id: String(projectId),
          title: foundProject.title || 'Untitled Project',
          status: foundProject.status || 'Draft',
          lastModified: foundProject.lastModified || new Date().toLocaleString(),
          content: foundProject.content || '',
        }

        projectType.value = type
        editorContent.value = foundProject.content || ''
        updateLastSaveTime()
        loadProjectComments()
        console.log('✅ Project loaded successfully from', type)
        return
      }
    }

    console.error('❌ Project not found with ID:', projectId)
    showNotification('Project not found.', 'error')
  } catch (error) {
    console.error('Error loading project:', error)
    showNotification('Error loading project data.', 'error')
  }
}

const addComment = () => {
  if (newComment.value.trim()) {
    try {
      const comment = addProjectComment(
        projectType.value,
        projectId,
        newComment.value.trim(),
        currentUser.value,
      )
      comments.value.unshift(comment)
      newComment.value = ''
      showNotification('Comment added successfully')
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

const deleteComment = (commentId) => {
  if (confirm('Are you sure you want to delete this comment?')) {
    try {
      const success = deleteProjectComment(projectType.value, projectId, commentId)
      if (success) {
        comments.value = comments.value.filter((c) => c.id !== commentId)
        showNotification('Comment deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      showNotification('Failed to delete comment', 'error')
    }
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
    }
  } catch (error) {
    console.error('Error toggling comment approval:', error)
    showNotification('Failed to toggle comment approval', 'error')
  }
}

const handleHighlightCommentsUpdated = (comments) => {
  highlightComments.value = comments
}

const handleHighlightText = (comment) => {
  console.log('Highlighting text:', comment)
}

const handleDeleteHighlightComment = (commentId) => {
  if (quillEditorRef.value) {
    const success = quillEditorRef.value.deleteHighlightComment(commentId)
    if (success) {
      showNotification('Highlight comment deleted')
    }
  }
}

const handleLoadHighlightComments = (comments) => {
  highlightComments.value = comments
}

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

const getStatusColor = (status) => {
  const statusColors = {
    'To Editor-in-Chief': 'primary',
    'Returned by EIC': 'warning',
    'EIC Approved': 'success',
    'To Chief Adviser': 'purple',
    'For Publish': 'success', // Added new status
    Published: 'success',
  }
  return statusColors[status] || 'default'
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

onUnmounted(() => {
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }
})

onMounted(() => {
  loadProjectData()
})
</script>

<template>
  <v-app class="approval-page">
    <MainHeader />

    <div class="back-button-container">
      <v-btn @click="goBack" variant="outlined" prepend-icon="mdi-arrow-left" class="back-button">
        {{ getBackButtonText }}
      </v-btn>
    </div>

    <v-main class="main-content">
      <v-container fluid class="project-container pa-5">
        <v-row>
          <v-col cols="12" lg="8" class="left-panel">
            <div class="title-section">
              <h1 class="project-title">
                {{ project.title }}
                <v-chip color="primary" size="small" class="ml-3"> EIC Review </v-chip>
              </h1>
            </div>

            <div v-if="project.description" class="project-description">
              <div class="description-label">Description</div>
              <div class="description-text">{{ project.description }}</div>
            </div>

            <div class="project-metadata">
              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Submission Status:</span>
                  <v-chip :color="getStatusColor(project.status)" size="small">
                    {{ project.status }}
                  </v-chip>
                </div>
                <div class="metadata-item">
                  <span class="label">Section Head:</span>
                  <span class="value">{{ project.sectionHead || 'Not assigned' }}</span>
                </div>
              </div>

              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Due Date:</span>
                  <span class="value">{{ formatDate(project.dueDate) }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Writer:</span>
                  <span class="value">{{
                    project.writers || project.submittedBy || 'Not assigned'
                  }}</span>
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
                  <span class="value">{{
                    project.mediaFiles?.length > 0
                      ? `${project.mediaFiles.length} file(s)`
                      : 'No media'
                  }}</span>
                </div>
                <div class="metadata-item metadata-item-priority">
                  <span class="label">Priority:</span>
                  <v-chip
                    :color="
                      project.priority === 'High'
                        ? 'error'
                        : project.priority === 'Medium'
                          ? 'warning'
                          : 'success'
                    "
                    size="small"
                  >
                    {{ project.priority }}
                  </v-chip>
                </div>
              </div>
            </div>

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

            <div class="editor-section">
              <QuillEditor
                ref="quillEditorRef"
                v-model="editorContent"
                :read-only="!isEditorEditable"
                :project-id="projectId"
                :project-type="projectType"
                height="500px"
                placeholder="Project content..."
                @text-change="handleContentChange"
                @highlight-comments-updated="handleHighlightCommentsUpdated"
              />
            </div>

            <div class="action-buttons">
              <template v-for="action in approvalActions" :key="action.value">
                <v-btn
                  @click="startApproval(action.value)"
                  variant="flat"
                  :disabled="action.disabled"
                  :class="{
                    'forward-btn': action.value === 'forward',
                    'approve-btn': action.value === 'approve',
                    'publish-btn': action.value === 'publish',
                    'publish-btn-locked': action.value === 'publish' && action.disabled,
                  }"
                >
                  <v-icon v-if="action.icon" left>{{ action.icon }}</v-icon>
                  {{ action.text }}
                </v-btn>
              </template>
            </div>
          </v-col>

          <v-col cols="12" lg="4" class="right-panel">
            <div class="history-section mb-4">
              <v-card class="project-history-card">
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>
                    <v-icon class="mr-2">mdi-history</v-icon>
                    Approval History
                  </span>
                  <v-btn icon variant="text" size="small" @click="showHistory = !showHistory">
                    <v-icon>{{ showHistory ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                  </v-btn>
                </v-card-title>

                <v-expand-transition>
                  <v-card-text v-if="showHistory" class="history-content">
                    <ProjectHistory
                      :project-id="projectId"
                      :project-type="projectType"
                      mode="approval"
                    />
                  </v-card-text>
                </v-expand-transition>
              </v-card>
            </div>

            <HighlightComments
              :comments="highlightComments"
              :quill-editor="quillEditorRef?.quill"
              :project-id="projectId"
              :project-type="projectType"
              @delete-comment="handleDeleteHighlightComment"
              @highlight-text="handleHighlightText"
              @load-comments="handleLoadHighlightComments"
              :read-only="!isEditorEditable"
            />

            <div class="comments-section">
              <div class="comments-header">
                <h3>Comments</h3>
                <div class="header-actions">
                  <v-btn icon size="small" variant="text" @click="loadProjectComments">
                    <v-icon>mdi-refresh</v-icon>
                  </v-btn>
                </div>
              </div>

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

              <div class="add-comment">
                <v-textarea
                  v-model="newComment"
                  placeholder="Add comment..."
                  variant="outlined"
                  rows="3"
                  hide-details
                  append-inner-icon="mdi-send"
                  @click:append-inner="addComment"
                />
              </div>

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

    <v-dialog v-model="showApprovalDialog" max-width="600px" persistent>
      <v-card class="approval-dialog-card">
        <v-card-title class="approval-dialog-header">
          <v-icon class="mr-2" size="24" color="#FFFFFF">
            {{ approvalActions.find((a) => a.value === approvalAction)?.icon }}
          </v-icon>
          <span>{{ approvalActions.find((a) => a.value === approvalAction)?.text }}</span>
        </v-card-title>

        <v-divider class="dialog-divider" />

        <v-card-text class="approval-dialog-content">
          <div class="approval-info-box">
            <p class="approval-message">
              <template v-if="approvalAction === 'approve'">
                Approve <strong>"{{ project.title }}"</strong> as Editor-in-Chief.
              </template>
              <template v-else-if="approvalAction === 'forward'">
                Forward <strong>"{{ project.title }}"</strong> to Chief Adviser for consultation.
              </template>
              <template v-else-if="approvalAction === 'publish'">
                Publish <strong>"{{ project.title }}"</strong> and make it available to the public.
              </template>
            </p>
          </div>

          <div
            v-if="approvalAction === 'approve' || approvalAction === 'forward'"
            class="form-field"
          >
            <label class="field-label">Priority Level</label>
            <v-select
              v-model="approvalPriority"
              :items="['High', 'Medium', 'Low']"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-flag"
              hide-details
              placeholder="Set priority level"
            />
          </div>

          <div v-if="approvalAction === 'publish'" class="form-field">
            <label class="field-label">Publish Date</label>
            <v-text-field
              type="date"
              v-model="publishData.publishDate"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>

          <div v-if="approvalAction === 'publish'" class="form-field">
            <label class="field-label">Publish Platform</label>
            <v-select
              v-model="publishData.publishPlatform"
              :items="['Website', 'Print', 'Digital Magazine', 'Social Media', 'All Platforms']"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </div>

          <div class="form-field">
            <label class="field-label">
              {{
                approvalAction === 'return' || approvalAction === 'forward'
                  ? 'Comments (Required)'
                  : 'Comments (Optional)'
              }}
            </label>
            <v-textarea
              v-model="approvalComments"
              :placeholder="getCommentPlaceholder()"
              variant="outlined"
              rows="4"
              hide-details
            />
          </div>

          <v-alert
            v-if="approvalAction === 'approve'"
            type="info"
            variant="tonal"
            density="comfortable"
            class="next-step-alert"
          >
            <template v-slot:prepend>
              <v-icon size="20">mdi-information-outline</v-icon>
            </template>
            <div class="alert-text">
              <strong>Next Step:</strong> Project will be approved. You can then forward it to Chief
              Adviser for consultation or publish directly.
            </div>
          </v-alert>

          <v-alert
            v-else-if="approvalAction === 'forward'"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="next-step-alert"
          >
            <template v-slot:prepend>
              <v-icon size="20">mdi-account-supervisor</v-icon>
            </template>
            <div class="alert-text">
              <strong>Consultation Step:</strong> Project will be sent to Chief Adviser for review
              and consultation. After approval, it will return to you for publishing.
            </div>
          </v-alert>

          <v-alert
            v-else-if="approvalAction === 'publish'"
            type="success"
            variant="tonal"
            density="comfortable"
            class="next-step-alert"
          >
            <template v-slot:prepend>
              <v-icon size="20">mdi-check-circle</v-icon>
            </template>
            <div class="alert-text">
              <strong>Final Step:</strong> Project has been approved by Chief Adviser and will now
              be published and made available to readers.
            </div>
          </v-alert>
        </v-card-text>

        <v-divider class="dialog-divider" />

        <v-card-actions class="approval-dialog-actions">
          <v-btn @click="cancelApproval" variant="outlined" size="default" class="cancel-btn">
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            @click="submitApproval"
            variant="flat"
            size="default"
            class="confirm-approval-btn"
            :prepend-icon="approvalActions.find((a) => a.value === approvalAction)?.icon"
            :disabled="approvalAction === 'forward' && !approvalComments.trim()"
          >
            Confirm {{ approvalActions.find((a) => a.value === approvalAction)?.text }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="showSnackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-app>
</template>

<style scoped>
/* Same styles as SectionHeadView.vue */
.approval-page {
  min-height: 100vh;
  background-color: #f8fafc;
}

.back-button-container {
  padding: 16px 24px 0;
}

.back-button {
  background: white !important;
  border: 1px solid #d1d5db !important;
}

.back-button:hover {
  background: #f9fafb !important;
}

.main-content {
  flex: 1;
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
  display: flex;
  align-items: center;
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

.metadata-item-priority {
  justify-content: flex-start;
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

.auto-save-notice {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  margin-bottom: 16px;
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

.last-save-text {
  color: #0369a1;
  font-size: 12px;
}

.editor-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 24px;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.forward-btn,
.approve-btn,
.publish-btn {
  background: #353535 !important;
  color: white !important;
  text-transform: uppercase !important;
  font-weight: bold !important;
  height: 36px !important;
  padding: 8px 16px !important;
}

.approve-btn {
  background: #f5c52b !important;
  color: #353535 !important;
  border: 2px solid #353535 !important;
}

.approve-btn:hover {
  background: #d4a825 !important;
  border: 2px solid #353535 !important;
}

.publish-btn {
  background: #9ca3af !important; /* Gray when locked */
  color: white !important;
  border: 2px solid #9ca3af !important;
}

.publish-btn:not(.publish-btn-locked) {
  background: #fbbf24 !important; /* Yellow when unlocked */
  color: #353535 !important;
  border: 2px solid #353535 !important;
}

.publish-btn:not(.publish-btn-locked):hover {
  background: #f59e0b !important;
}

.publish-btn-locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.comments-section {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.comments-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.comment-search {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.add-comment {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.comments-list {
  padding: 16px 20px;
  max-height: 400px;
  overflow-y: auto;
}

.comment-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.comment-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.comment-author {
  font-weight: 600;
  font-size: 14px;
}

.comment-time {
  font-size: 12px;
  color: #6b7280;
}

.comment-text {
  font-size: 14px;
  color: #374151;
}

/* Approval Dialog Styles */
.approval-dialog-card {
  border: 2px solid #353535 !important;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.approval-dialog-header {
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

.approval-dialog-content {
  padding: 24px !important;
  background: white !important;
}

.approval-info-box {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #353535;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.approval-message {
  font-size: 14px;
  line-height: 1.6;
  color: #555;
  margin: 0;
}

.approval-message strong {
  color: #353535;
  font-weight: 600;
}

.form-field {
  margin-bottom: 20px;
}

.form-field:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #353535;
  margin-bottom: 8px;
}

.next-step-alert {
  border-left: 4px solid #353535 !important;
  border-radius: 6px !important;
  background: #f8f8f8 !important;
  padding: 12px 16px !important;
  margin-top: 16px !important;
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

.approval-dialog-actions {
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

.confirm-approval-btn {
  background: #353535 !important;
  color: white !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 28px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.confirm-approval-btn:hover {
  background: #1f1f1f !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.confirm-approval-btn:disabled {
  background: #9ca3af !important;
  color: #d1d5db !important;
  box-shadow: none !important;
  cursor: not-allowed !important;
}

@media (max-width: 768px) {
  .metadata-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .forward-btn,
  .approve-btn,
  .publish-btn {
    width: 100%;
  }
}
</style>
