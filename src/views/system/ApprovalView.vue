<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
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

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

// Determine project type from route or project data
const projectType = ref('magazine') // Default, will be determined from loaded project data

// User role - Set to Section Head for temporary access
const currentUserRole = ref('Section Head')
const currentUser = ref('Section Head User')

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
  submittedBy: '',
  submittedDate: '',
  priority: 'Medium',
  department: '',
})

// Rich text editor state
const editorContent = ref('')
const quillEditorRef = ref(null)
const isEditorEditable = ref(false) // Start as read-only

// Auto-save state (like ProjectView)
const lastSaveTime = ref(null)
const saveTimeout = ref(null)
const hasUnsavedChanges = ref(false)

// Approval state
const showApprovalDialog = ref(false)
const approvalAction = ref('') // 'approve', 'reject', 'return'
const approvalComments = ref('')
const approvalPriority = ref('Medium')

// History and versioning state
const showHistory = ref(true) // Always show by default

// Comments state
const comments = ref([])
const newComment = ref('')
const commentSearch = ref('')

// Highlight comments state
const highlightComments = ref([])

// Snackbar for notifications
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Show notification
const showNotification = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

// Get last save time for display (like ProjectView)
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

// Update last save time
const updateLastSaveTime = () => {
  lastSaveTime.value = new Date().toLocaleString()
  project.value.lastModified = lastSaveTime.value
}

// Handle content changes (called on every keystroke when editable)
const handleContentChange = () => {
  if (isEditorEditable.value) {
    hasUnsavedChanges.value = true
    debouncedSave()
  }
}

// Debounced auto-save function
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

// Available approval actions - UPDATED ORDER AND STYLING
const approvalActions = computed(() => {
  const baseActions = [
    { value: 'return', text: 'Request to Edit', color: 'warning', icon: 'mdi-pencil' },
    { value: 'approve', text: 'Approve', color: 'success', icon: 'mdi-check' },
    {
      value: 'publish',
      text: 'Publish',
      color: 'primary',
      icon: 'mdi-lock',
      disabled: true, // Always disabled for Section Head
      tooltip: 'Only Editor-in-Chief can publish after approval',
    },
  ]

  return baseActions
})

// Get next status based on current role and action
const getNextStatus = (action, currentStatus) => {
  const statusMap = {
    'Section Head': {
      approve: 'To Editor-in-Chief', // Route directly to EIC after Section Head approval
      return: 'Returned by Section Head',
      reject: 'Rejected by Section Head',
    },
    Editor: {
      approve: 'To Editor-in-Chief',
      return: 'Returned by Editor',
      reject: 'Rejected by Editor',
    },
    Director: {
      approve: 'To Chief Adviser',
      return: 'Returned by Director',
      reject: 'Rejected by Director',
    },
    'Editor-in-Chief': {
      approve: 'Published',
      return: 'Returned by EIC',
      reject: 'Rejected by EIC',
    },
  }

  return statusMap[currentUserRole.value]?.[action] || currentStatus
}

// Save content changes to localStorage
const saveContentChanges = () => {
  try {
    const storageKey = `${projectType.value}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const projectIndex = projects.findIndex((p) => p.id == projectId)

    if (projectIndex !== -1) {
      projects[projectIndex].content = editorContent.value
      projects[projectIndex].lastModified = new Date().toLocaleString()
      localStorage.setItem(storageKey, JSON.stringify(projects))

      // Update local project state
      project.value.content = editorContent.value
      project.value.lastModified = new Date().toLocaleString()

      updateLastSaveTime()
      hasUnsavedChanges.value = false

      console.log('Content auto-saved to localStorage')
    }
  } catch (error) {
    console.error('Error saving content:', error)
    showNotification('Error saving content', 'error')
  }
}

// Approval functions
const startApproval = (action) => {
  // Handle "Request to Edit" - make editor editable
  if (action === 'return') {
    isEditorEditable.value = true
    // Update QuillEditor to be editable
    if (quillEditorRef.value) {
      quillEditorRef.value.setReadOnly(false)
    }
    showNotification('Editor is now editable. You can make changes to the content.', 'info')
    return
  }

  // Prevent publish action for Section Head
  if (action === 'publish' && currentUserRole.value === 'Section Head') {
    showNotification('Only Editor-in-Chief can publish projects', 'warning')
    return
  }

  approvalAction.value = action
  approvalComments.value = ''
  showApprovalDialog.value = true
}

const submitApproval = () => {
  if (!approvalAction.value) return

  const newStatus = getNextStatus(approvalAction.value, project.value.status)

  try {
    // Save any content changes before approval
    if (isEditorEditable.value) {
      saveContentChanges()
    }

    // Update project status in localStorage
    const storageKey = `${projectType.value}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const projectIndex = projects.findIndex((p) => p.id == projectId)

    if (projectIndex !== -1) {
      projects[projectIndex].status = newStatus
      projects[projectIndex].lastModified = new Date().toLocaleString()

      // Add approval fields if approving
      if (approvalAction.value === 'approve') {
        projects[projectIndex].approvedBy = currentUser.value
        projects[projectIndex].approvedDate = new Date().toISOString()
        projects[projectIndex].priority = approvalPriority.value

        // Add Section Head specific approval fields
        if (currentUserRole.value === 'Section Head') {
          projects[projectIndex].sectionHeadApprovedBy = currentUser.value
          projects[projectIndex].sectionHeadApprovedDate = new Date().toISOString()
          projects[projectIndex].sectionHeadComments = approvalComments.value
        }
      }

      localStorage.setItem(storageKey, JSON.stringify(projects))

      // Update local project state
      project.value.status = newStatus
      project.value.lastModified = new Date().toLocaleString()

      // Add approval history entry
      const approvalEntry = {
        action: approvalAction.value,
        approver: currentUser.value,
        role: currentUserRole.value,
        comments: approvalComments.value,
        timestamp: new Date().toISOString(),
        priority: approvalPriority.value,
      }

      // Save approval history to localStorage
      const historyKey = `approval_history_${projectId}`
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')
      existingHistory.push(approvalEntry)
      localStorage.setItem(historyKey, JSON.stringify(existingHistory))

      // Close dialog and reset
      showApprovalDialog.value = false
      approvalAction.value = ''
      approvalComments.value = ''

      const actionText =
        approvalActions.value.find((a) => a.value === approvalAction.value)?.text || 'processed'

      // Show success message with next step info
      if (approvalAction.value === 'approve' && currentUserRole.value === 'Section Head') {
        showNotification(
          `Project approved! It will now go to Editor-in-Chief for review.`,
          'success',
        )
      } else {
        showNotification(`Project ${actionText.toLowerCase()} successfully!`, 'success')
      }

      // Navigate back after action with custom message
      setTimeout(() => {
        let navigationMessage = `Project ${actionText.toLowerCase()}!`
        if (approvalAction.value === 'approve' && currentUserRole.value === 'Section Head') {
          navigationMessage = `Project approved and sent to Editor-in-Chief!`
        }

        const confirmNavigation = confirm(
          `${navigationMessage} Would you like to go back to the approval dashboard?`,
        )
        if (confirmNavigation) {
          router.push('/approval')
        }
      }, 1500)
    }
  } catch (error) {
    console.error('Error processing approval:', error)
    showNotification('Error processing approval', 'error')
  }
}

const cancelApproval = () => {
  showApprovalDialog.value = false
  approvalAction.value = ''
  approvalComments.value = ''
}

// Helper function to determine department
const getDepartmentFromProject = () => {
  const typeMap = {
    magazine: 'Editorial',
    newsletter: 'News',
    folio: 'Arts',
    other: 'Marketing',
  }
  return typeMap[projectType.value] || 'General'
}

// Navigation functions
const goBack = () => {
  // Save any changes before going back
  if (isEditorEditable.value && hasUnsavedChanges.value) {
    saveContentChanges()
  }
  router.push('/approval')
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

// Load project data from localStorage
const loadProjectData = () => {
  try {
    console.log('Searching for project ID:', projectId)

    // Try to find the project in all project types
    const projectTypes = ['magazine', 'newsletter', 'folio', 'other']

    for (const type of projectTypes) {
      const storageKey = `${type}_projects`
      const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
      console.log(`Checking ${type} projects:`, projects.length)

      const foundProject = projects.find((p) => String(p.id) === String(projectId))

      if (foundProject) {
        console.log('Found project:', foundProject)

        // Update project data
        project.value = {
          ...foundProject,
          id: String(projectId),
          title: foundProject.title || 'Untitled Project',
          status: foundProject.status || 'Draft',
          lastModified: foundProject.lastModified || new Date().toLocaleString(),
          content: foundProject.content || '',
          writers: foundProject.writers || 'Not assigned',
          artists: foundProject.artists || 'Not assigned',
          sectionHead: foundProject.sectionHead || 'Not assigned',
          description: foundProject.description || 'No description provided',
          submittedBy: foundProject.submittedBy || foundProject.createdBy || 'Unknown',
          submittedDate:
            foundProject.submittedDate ||
            foundProject.created_at ||
            foundProject.createdAtISO ||
            new Date().toISOString(),
          priority: foundProject.priority || 'Medium',
          department: foundProject.department || getDepartmentFromProject(),
          dueDate: foundProject.dueDate || 'Not set',
        }

        // Set project type
        projectType.value = type

        // Set editor content
        editorContent.value = foundProject.content || ''

        // Initialize last save time
        updateLastSaveTime()

        // Load comments for this project
        loadProjectComments()

        console.log('Project loaded successfully:', project.value.title)
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
        currentUser.value, // Current approver
      )
      comments.value.unshift(comment)
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
  if (confirm('Are you sure you want to delete this comment?')) {
    try {
      const success = deleteProjectComment(projectType.value, projectId, commentId)
      if (success) {
        comments.value = comments.value.filter((c) => c.id !== commentId)
        showNotification('Comment deleted successfully')
        console.log('Comment deleted successfully')
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

// Get status color for display
const getStatusColor = (status) => {
  const statusColors = {
    Draft: 'grey',
    'To Section Head': 'warning',
    'To Technical Editor': 'info',
    'To Editor-in-Chief': 'primary',
    'To Chief Adviser': 'purple',
    Published: 'success',
    Rejected: 'error',
    'Returned by Section Head': 'warning',
    'Returned by Editor': 'warning',
    'Returned by Director': 'warning',
    'Returned by EIC': 'warning',
  }
  return statusColors[status] || 'default'
}

// Format date for display
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Check if current user can approve this project - UPDATED FOR SECTION HEAD ACCESS
const canApproveProject = computed(() => {
  // Always allow Section Head to approve (for temporary access)
  if (currentUserRole.value === 'Section Head') {
    return true
  }

  // Normal approval flow mapping
  const statusRoleMap = {
    'To Section Head': 'Section Head',
    'To Technical Editor': 'Editor',
    'To Editor-in-Chief': 'Editor-in-Chief',
  }
  return statusRoleMap[project.value.status] === currentUserRole.value
})

// Get comment placeholder based on action
const getCommentPlaceholder = () => {
  const placeholders = {
    approve: 'Add any comments or notes for the next reviewer...',
    return: 'Explain what needs to be revised and provide specific feedback...',
    reject: 'Provide detailed reasons for rejection...',
  }
  return placeholders[approvalAction.value] || 'Add your comments...'
}

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

// Clean up intervals and timeouts
onUnmounted(() => {
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }
})

// Load project data on mount
onMounted(() => {
  console.log('Loading project for approval:', projectId)
  loadProjectData()

  // Determine user role from route query or default to Section Head
  if (route.query.role) {
    currentUserRole.value = route.query.role
  } else {
    // Default to Section Head for access
    currentUserRole.value = 'Section Head'
  }

  console.log('Current user role for approval:', currentUserRole.value)
})
</script>

<template>
  <v-app class="approval-page">
    <MainHeader />

    <!-- Back Button -->
    <div class="back-button-container">
      <v-btn @click="goBack" variant="outlined" prepend-icon="mdi-arrow-left" class="back-button">
        Back to Approval Dashboard
      </v-btn>
    </div>

    <v-main class="main-content">
      <v-container fluid class="project-container pa-5">
        <v-row>
          <!-- Left Panel - Project Details and Editor -->
          <v-col cols="12" lg="8" class="left-panel">
            <!-- Project Title -->
            <div class="title-section">
              <h1 class="project-title">
                {{ project.title }}
                <v-chip color="info" size="small" class="ml-3">
                  {{ currentUserRole }} Review
                </v-chip>
              </h1>
            </div>

            <!-- Project Description -->
            <div v-if="project.description" class="project-description">
              <h3>Description</h3>
              <p>{{ project.description }}</p>
            </div>

            <!-- Project Metadata -->
            <div class="project-metadata">
              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Submission Status:</span>
                  <v-chip :color="getStatusColor(project.status)" size="small" class="status-chip">
                    {{ project.status }}
                  </v-chip>
                </div>
                <div class="metadata-item">
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
              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Submitted By:</span>
                  <span class="value">{{ project.submittedBy }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Submitted Date:</span>
                  <span class="value">{{ formatDate(project.submittedDate) }}</span>
                </div>
              </div>
              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Due Date:</span>
                  <span class="value">{{ project.dueDate }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Department:</span>
                  <span class="value">{{ project.department }}</span>
                </div>
              </div>
              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Section Head:</span>
                  <span class="value">{{ project.sectionHead }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Writer:</span>
                  <span class="value">{{ project.writers || 'Not assigned' }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Artist:</span>
                  <span class="value">{{ project.artists || 'Not assigned' }}</span>
                </div>
              </div>
            </div>

            <!-- Auto-save Notice (like ProjectView) -->
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

            <!-- Rich Text Editor - READ-ONLY by default -->
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

            <!-- Section Head Action Buttons - NO ICONS, ALL CAPS -->
            <div class="action-buttons" v-if="canApproveProject">
              <!-- Request to Edit Button -->
              <v-btn @click="startApproval('return')" variant="outlined" class="return-btn">
                REQUEST TO EDIT
              </v-btn>

              <!-- Approve Button -->
              <v-btn @click="startApproval('approve')" variant="outlined" class="approve-btn">
                APPROVE & SEND TO EIC
              </v-btn>

              <!-- Publish Button (Locked for Section Head) -->
              <v-tooltip location="top">
                <template v-slot:activator="{ props }">
                  <v-btn
                    @click="startApproval('publish')"
                    variant="outlined"
                    class="publish-btn locked"
                    :disabled="true"
                    v-bind="props"
                    prepend-icon="mdi-lock"
                  >
                    PUBLISH
                  </v-btn>
                </template>
                <span>Only Editor-in-Chief can publish after approval</span>
              </v-tooltip>
            </div>

            <!-- Not Authorized Message -->
            <div v-else class="not-authorized">
              <v-alert type="warning" variant="outlined">
                <strong>Access Restricted:</strong> You are not authorized to approve this project
                at its current status. Current status requires approval from:
                {{ project.status.replace('To ', '') }}
              </v-alert>
            </div>
          </v-col>

          <!-- Right Panel - Comments and History -->
          <v-col cols="12" lg="4" class="right-panel">
            <!-- Approval History -->
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

            <!-- Highlight Comments -->
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

            <!-- Comments Section -->
            <div class="comments-section">
              <!-- Comments Header -->
              <div class="comments-header">
                <h3>Approval Comments</h3>
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
                  placeholder="Search approval comments"
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
                  placeholder="Add approval comment..."
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

    <!-- Approval Dialog -->
    <v-dialog v-model="showApprovalDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title class="approval-dialog-title">
          <v-icon
            class="mr-2"
            :color="approvalActions.find((a) => a.value === approvalAction)?.color"
          >
            {{ approvalActions.find((a) => a.value === approvalAction)?.icon }}
          </v-icon>
          {{ approvalActions.find((a) => a.value === approvalAction)?.text }}
          <span v-if="approvalAction === 'approve' && currentUserRole === 'Section Head'">
            & Send to EIC
          </span>
        </v-card-title>

        <v-card-text class="approval-dialog-content">
          <div class="project-summary mb-4">
            <h4>{{ project.title }}</h4>
            <p class="text-grey">
              Submitted by {{ project.submittedBy }} • {{ formatDate(project.submittedDate) }}
            </p>
          </div>

          <v-form @submit.prevent="submitApproval">
            <v-select
              v-if="approvalAction === 'approve'"
              v-model="approvalPriority"
              label="Set Priority for Next Stage"
              :items="['High', 'Medium', 'Low']"
              variant="outlined"
              class="mb-4"
              hint="Priority level for the Editor-in-Chief review"
              persistent-hint
            />

            <v-textarea
              v-model="approvalComments"
              :label="
                approvalAction === 'return'
                  ? 'Comments for Author (Required)'
                  : 'Comments (Optional)'
              "
              :placeholder="getCommentPlaceholder()"
              variant="outlined"
              rows="4"
              :rules="
                approvalAction === 'reject' || approvalAction === 'return'
                  ? [(v) => !!v || 'Comments are required for this action']
                  : []
              "
            />

            <v-alert
              v-if="approvalAction === 'approve'"
              type="success"
              variant="outlined"
              class="mt-4"
            >
              <strong>Next Step:</strong>
              Project will be forwarded to Editor-in-Chief for final review and potential
              publication.
            </v-alert>

            <v-alert
              v-else-if="approvalAction === 'return'"
              type="warning"
              variant="outlined"
              class="mt-4"
            >
              <strong>Action:</strong> Project will be returned to the author for editing and
              resubmission.
            </v-alert>

            <v-alert
              v-else-if="approvalAction === 'reject'"
              type="error"
              variant="outlined"
              class="mt-4"
            >
              <strong>Action:</strong> Project will be permanently rejected and removed from
              workflow.
            </v-alert>
          </v-form>
        </v-card-text>

        <v-card-actions class="approval-dialog-actions">
          <v-btn @click="cancelApproval" variant="outlined"> Cancel </v-btn>
          <v-spacer />
          <v-btn
            @click="submitApproval"
            :color="approvalActions.find((a) => a.value === approvalAction)?.color"
            :disabled="
              (approvalAction === 'reject' || approvalAction === 'return') &&
              !approvalComments.trim()
            "
          >
            Confirm {{ approvalActions.find((a) => a.value === approvalAction)?.text }}
            <span v-if="approvalAction === 'approve' && currentUserRole === 'Section Head'">
              & Send to EIC
            </span>
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
.approval-page {
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
  display: flex;
  align-items: center;
}

.project-description {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.project-description h3 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 16px;
  font-weight: 600;
}

.project-description p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
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
  padding: 20px;
  margin-bottom: 16px;
}

.metadata-row {
  display: flex;
  gap: 40px;
  margin-bottom: 12px;
}

.metadata-row:last-child {
  margin-bottom: 0;
}

.metadata-item {
  flex: 1;
}

.metadata-item .label {
  font-weight: 600;
  color: #374151;
  margin-right: 8px;
}

.metadata-item .value {
  color: #6b7280;
}

.status-chip {
  margin-left: 8px;
}

/* Enhanced Auto-save Notice (like ProjectView) */
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

/* Match ProjectView Button Styling EXACTLY - Same Size */
.return-btn,
.approve-btn,
.publish-btn {
  background: #353535 !important;
  color: white !important;
  border: 1px solid #353535 !important;
  font-weight: bold !important;
  text-transform: uppercase !important;
  font-size: 14px !important;
  padding: 8px 16px !important; /* Match ProjectView padding */
  height: 36px !important; /* Match ProjectView height */
  min-height: 36px !important; /* Match ProjectView min-height */
  line-height: 1.2 !important; /* Match ProjectView line-height */
}

.approve-btn {
  background: #f5c52b !important; /* Yellow like ProjectView Submit button */
  color: #353535 !important; /* Dark text like ProjectView */
  border: 1px solid #f5c52b !important;
}

.publish-btn {
  background: #8b5cf6 !important; /* Purple like ProjectView version button */
  color: white !important;
  border: 1px solid #8b5cf6 !important;
}

.publish-btn.locked {
  background: #9ca3af !important;
  color: #6b7280 !important;
  border-color: #9ca3af !important;
  opacity: 0.6;
  cursor: not-allowed;
}

/* Hover effects */
.return-btn:hover {
  background: #1f2937 !important;
  border-color: #1f2937 !important;
}

.approve-btn:hover {
  background: #f5c52b !important;
  border-color: #f5c52b !important;
}

.publish-btn:hover:not(.locked) {
  background: #7c3aed !important;
  border-color: #7c3aed !important;
}

/* Allow the lock icon to show on publish button only */
.return-btn .v-icon,
.approve-btn .v-icon {
  display: none !important;
}

.publish-btn .v-icon {
  display: inline-flex !important;
  margin-right: 4px !important; /* Smaller margin to match size */
  font-size: 16px !important; /* Smaller icon size */
}

.publish-btn.locked .v-icon {
  color: #6b7280 !important;
}

.not-authorized {
  margin-bottom: 24px;
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
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.comments-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.header-actions {
  display: flex;
  gap: 4px;
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
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.comment-item {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.comment-author {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
}

.comment-time {
  font-size: 12px;
  color: #6b7280;
}

.comment-text {
  color: #374151;
  font-size: 14px;
  line-height: 1.4;
}

.comment-actions {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.approval-dialog-title {
  background-color: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
}

.approval-dialog-content {
  padding: 24px;
}

.project-summary h4 {
  color: #1f2937;
  margin-bottom: 8px;
}

.approval-dialog-actions {
  padding: 16px 24px;
  background-color: #f8fafc;
  border-top: 1px solid #e5e7eb;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .left-panel,
  .right-panel {
    padding: 0;
  }

  .right-panel {
    margin-top: 24px;
  }

  .metadata-row {
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .project-container {
    padding: 16px !important;
  }

  .project-title {
    font-size: 24px !important;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .comments-section {
    max-height: 500px;
  }
}
</style>
