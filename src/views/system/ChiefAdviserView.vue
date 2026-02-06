<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import QuillEditor from '@/components/QuillEditor.vue'
import ProjectHistory from '@/components/ProjectHistory.vue'
import HighlightComments from '@/components/HighlightComments.vue'
import { projectsService, profilesService } from '@/services/supabaseService'
import { supabase } from '@/utils/supabase'
import {
  getProjectComments,
  addProjectComment,
  deleteProjectComment,
  toggleCommentApproval,
} from '@/services/commentsService.js'
import { createProjectVersion as createProjectVersionSupabase } from '@/services/supabaseProjectHistory.js'
import { createStatusChangeNotification } from '@/services/notificationsService.js'
import { getDisplayName } from '@/utils/userDisplay.js'

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

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
      }
    }
  } catch (error) {
    console.error('Error loading current user profile:', error)
  }
}

// Project type
const projectType = ref('magazine')

// User role - CHIEF ADVISER ONLY
const currentUserRole = ref('Chief Adviser')
const currentUser = ref('Chief Adviser User')

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

// History and comments
const comments = ref([])
const newComment = ref('')
const commentSearch = ref('')
const highlightComments = ref([])

// Snackbar
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Notification card state (for comment deletions)
const showCommentNotificationCard = ref(false)
const commentNotificationMessage = ref('')
const commentNotificationType = ref('success')

const showNotification = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

// Show notification card (for comment deletions)
const showCommentNotification = (message, type = 'success') => {
  commentNotificationMessage.value = message
  commentNotificationType.value = type
  showCommentNotificationCard.value = true

  // Auto-hide after 3 seconds
  setTimeout(() => {
    showCommentNotificationCard.value = false
  }, 3000)
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

// CHIEF ADVISER - Approval actions (3 buttons: Request to Edit, Approve, Reject)
const approvalActions = computed(() => {
  return [
    {
      value: 'return',
      text: 'Request to Edit',
      color: 'warning',
      icon: null,
    },
    {
      value: 'approve',
      text: 'Approve',
      color: 'success',
      icon: null,
    },
    {
      value: 'reject',
      text: 'Reject',
      color: 'error',
      icon: null,
    },
  ]
})

// CHIEF ADVISER - Status mapping
const getNextStatus = (action) => {
  if (action === 'approve') return 'For Publish' // Changed from 'EIC Approved' to 'For Publish'
  if (action === 'return') return 'Returned by Chief Adviser'
  if (action === 'reject') return 'draft' // Send back to artist and writer (draft status)
  return project.value.status
}

// CHIEF ADVISER - Comment placeholder
const getCommentPlaceholder = () => {
  if (approvalAction.value === 'approve') {
    return 'Add consultation notes for Archival Manager...'
  }
  if (approvalAction.value === 'return') {
    return 'Explain what needs to be improved or reconsidered...'
  }
  if (approvalAction.value === 'reject') {
    return 'Explain what major revisions are needed for the Artist and Writer...'
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

const saveContentChanges = async () => {
  try {
    // Save to Supabase
    await projectsService.update(projectId, {
      content: editorContent.value,
      updated_at: new Date().toISOString(),
    })

    console.log('✅ Content saved to Supabase')

    project.value.content = editorContent.value
    project.value.lastModified = new Date().toLocaleString()
    updateLastSaveTime()
    hasUnsavedChanges.value = false
  } catch (error) {
    console.error('Error saving content:', error)
    showNotification('Error saving content', 'error')
  }
}

const startApproval = (action) => {
  if (action === 'return') {
    isEditorEditable.value = true
    if (quillEditorRef.value) {
      quillEditorRef.value.setReadOnly(false)
    }
    showNotification('Editor is now editable. You can make changes to the content.', 'info')
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

    // Get actual user UUID from Supabase Auth
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      showNotification('User not authenticated', 'error')
      return
    }

    // Update via Supabase
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (action === 'approve') {
      updateData.adviser_approved_by = user.id
      updateData.adviser_approved_date = new Date().toISOString()
      updateData.adviser_comments = approvalComments.value
    } else if (action === 'return') {
      updateData.adviser_returned_by = user.id
      updateData.adviser_returned_date = new Date().toISOString()
      updateData.adviser_return_comments = approvalComments.value
    } else if (action === 'reject') {
      updateData.adviser_rejected_by = user.id
      updateData.adviser_rejected_date = new Date().toISOString()
      updateData.adviser_reject_comments = approvalComments.value
    }

    await projectsService.update(projectId, updateData)

    console.log('✅ Project status updated via Supabase')

    project.value.status = newStatus

    // Create notification based on action
    if (action === 'approve') {
      createStatusChangeNotification({
        projectId: projectId,
        projectType: project.value.type,
        projectTitle: project.value.title,
        oldStatus: 'To Chief Adviser',
        newStatus: 'For Publish',
        actionBy: currentUser.value,
        recipient: 'Archival Manager',
        comments: approvalComments.value,
      })
    } else if (action === 'return') {
      createStatusChangeNotification({
        projectId: projectId,
        projectType: project.value.type,
        projectTitle: project.value.title,
        oldStatus: 'To Chief Adviser',
        newStatus: 'Returned by Chief Adviser',
        actionBy: currentUser.value,
        recipient: 'Editor-in-Chief',
        comments: approvalComments.value,
      })
    } else if (action === 'reject') {
      createStatusChangeNotification({
        projectId: projectId,
        projectType: project.value.type,
        projectTitle: project.value.title,
        oldStatus: 'To Chief Adviser',
        newStatus: 'returned_by_section_head',
        actionBy: currentUser.value,
        recipient: 'Artist and Writer',
        comments: approvalComments.value,
      })
    }

    // Try to save to Supabase (non-blocking)
    try {
      // Only call Supabase if project has a valid id
      if (projectId) {
        await createProjectVersionSupabase(
          projectId,
          editorContent.value || '',
          action === 'approve'
            ? 'Approved by Chief Adviser - Ready for Publishing'
            : action === 'return'
              ? 'Returned by Chief Adviser for reconsideration'
              : 'Rejected by Chief Adviser - Returned to Artist and Writer',
          currentUser.value,
        )
        console.log('Project version saved to Supabase successfully')
      } else {
        console.log('Project does not have valid ID, skipping sync')
      }
    } catch (err) {
      console.warn('Failed to save project version to Supabase (non-critical):', err)
      // Don't block the workflow if Supabase fails
    }

    showApprovalDialog.value = false
    approvalAction.value = ''
    approvalComments.value = ''

    if (action === 'approve') {
      showNotification('Project approved and ready for publishing by Archival Manager!', 'success')
    } else if (action === 'return') {
      showNotification('Project returned for reconsideration', 'warning')
    } else if (action === 'reject') {
      showNotification('Project rejected and sent back to Artist and Writer', 'error')
    }

    setTimeout(() => {
      // For other/social-media types, route to /other
      const routePath =
        projectType.value === 'other' || projectType.value === 'social-media'
          ? '/other'
          : `/${projectType.value}`
      router.push(routePath)
    }, 600)
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

const loadProjectComments = async () => {
  try {
    comments.value = await getProjectComments(projectType.value, projectId)
  } catch (error) {
    console.error('Error loading comments:', error)
    comments.value = []
  }
}

const loadProjectData = async () => {
  try {
    console.log('🔍 Loading project from Supabase:', projectId)

    const foundProject = await projectsService.getById(projectId)

    console.log('✅ Project loaded from Supabase:', foundProject)

    // Load project members to get names
    const members = await projectsService.getMembers(projectId)
    console.log('✅ Project members loaded:', members)

    // Load section head profile
    let sectionHeadName = 'Not assigned'
    if (foundProject.section_head_id) {
      const sectionHeadProfile = await profilesService.getById(foundProject.section_head_id)
      if (sectionHeadProfile) {
        sectionHeadName =
          `${sectionHeadProfile.first_name || ''} ${sectionHeadProfile.last_name || ''}`.trim() ||
          sectionHeadProfile.email ||
          'Not assigned'
      }
    }

    // Get writers and artists from members
    const writers =
      members
        .filter((m) => m.role === 'writer')
        .map((m) => {
          const profile = m.profiles
          if (profile) {
            const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            return name || profile.email || 'Unknown'
          }
          return 'Unknown'
        })
        .join(', ') || 'Not assigned'

    const artists =
      members
        .filter((m) => m.role === 'artist')
        .map((m) => {
          const profile = m.profiles
          if (profile) {
            const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
            return name || profile.email || 'Unknown'
          }
          return 'Unknown'
        })
        .join(', ') || 'Not assigned'

    project.value = {
      ...foundProject,
      id: String(projectId),
      title: foundProject.title || 'Untitled Project',
      status: foundProject.status || 'draft',
      lastModified: foundProject.updated_at
        ? new Date(foundProject.updated_at).toLocaleString()
        : new Date().toLocaleString(),
      content: foundProject.content || '',
      writers: writers,
      artists: artists,
      sectionHead: sectionHeadName,
      description: foundProject.description || '',
    }

    projectType.value = foundProject.project_type || route.query.type || 'magazine'
    editorContent.value = foundProject.content || ''
    updateLastSaveTime()
    loadProjectComments()

    console.log('✅ Project loaded from Supabase with member names')
  } catch (error) {
    console.error('❌ Error loading project:', error)
    showNotification('Project not found. Redirecting...', 'error')

    setTimeout(() => {
      router.push('/other')
    }, 2000)
  }
}

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

      const comment = await addProjectComment(
        projectType.value,
        projectId,
        newComment.value.trim(),
        displayName,
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

const deleteComment = async (commentId) => {
  // Delete immediately - no alerts, just delete and show notification card
  try {
    const success = await deleteProjectComment(projectType.value, projectId, commentId)
    if (success) {
      comments.value = comments.value.filter((c) => c.id !== commentId)
      showCommentNotification('Comment deleted successfully', 'success')
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
    'To Chief Adviser': 'purple',
    'Returned by Chief Adviser': 'warning',
    'For Publish': 'success', // Added new status color
    'EIC Approved': 'success',
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

const formatStatus = (status) => {
  if (!status) return 'Draft'
  let formatted = status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  formatted = formatted.replace(/Editor In Chief/g, 'Editor-in-Chief')
  formatted = formatted.replace(/Chief Adviser/gi, 'Chief Adviser')
  formatted = formatted.replace(/For Publish/gi, 'For Publish')
  return formatted
}

onUnmounted(() => {
  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value)
  }
})

onMounted(async () => {
  await loadCurrentUserProfile()
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
                <v-chip color="purple" size="small" class="ml-3"> Chief Adviser Review </v-chip>
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
                    {{ formatStatus(project.status) }}
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
                  :class="{
                    'approve-btn': action.value === 'approve',
                    'return-btn': action.value === 'return',
                    'reject-btn': action.value === 'reject',
                  }"
                >
                  {{ action.text }}
                </v-btn>
              </template>
            </div>
          </v-col>

          <v-col cols="12" lg="4" class="right-panel">
            <div class="history-section mb-4">
              <ProjectHistory
                :project-id="projectId"
                :project-type="projectType"
              />
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
                        <v-list-item
                          v-if="isEditorEditable"
                          @click="deleteComment(comment.id)"
                          class="text-error"
                        >
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
            {{ approvalAction === 'approve' ? 'mdi-check-circle' : 'mdi-pencil' }}
          </v-icon>
          <span>{{ approvalActions.find((a) => a.value === approvalAction)?.text }}</span>
        </v-card-title>

        <v-divider class="dialog-divider" />

        <v-card-text class="approval-dialog-content">
          <div class="approval-info-box">
            <p class="approval-message">
              <template v-if="approvalAction === 'approve'">
                Approve <strong>"{{ project.title }}"</strong> and send to Archival Manager for
                final publishing.
              </template>
              <template v-else-if="approvalAction === 'return'">
                Request edits for <strong>"{{ project.title }}"</strong>. The project will be
                returned for reconsideration.
              </template>
              <template v-else-if="approvalAction === 'reject'">
                Reject <strong>"{{ project.title }}"</strong> and send it back to the Artist and
                Writer for major revisions.
              </template>
            </p>
          </div>

          <div class="form-field">
            <label class="field-label">
              {{
                approvalAction === 'return' || approvalAction === 'reject'
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
              <strong>Next Step:</strong> Project will be sent to Archival Manager with approval.
              Archival Manager can now publish the project.
            </div>
          </v-alert>

          <v-alert
            v-else-if="approvalAction === 'return'"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="next-step-alert"
          >
            <template v-slot:prepend>
              <v-icon size="20">mdi-alert-outline</v-icon>
            </template>
            <div class="alert-text">
              <strong>Action:</strong> Project will be returned for reconsideration.
            </div>
          </v-alert>

          <v-alert
            v-else-if="approvalAction === 'reject'"
            type="error"
            variant="tonal"
            density="comfortable"
            class="next-step-alert"
          >
            <template v-slot:prepend>
              <v-icon size="20">mdi-close-circle-outline</v-icon>
            </template>
            <div class="alert-text">
              <strong>Action:</strong> Project will be sent back to Artist and Writer for major
              revisions.
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
            :disabled="
              (approvalAction === 'return' || approvalAction === 'reject') &&
              !approvalComments.trim()
            "
          >
            Confirm {{ approvalActions.find((a) => a.value === approvalAction)?.text }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Comment Notification Card -->
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

    <v-snackbar v-model="showSnackbar" :color="snackbarColor" timeout="3000">
      {{ snackbarMessage }}
    </v-snackbar>
  </v-app>
</template>

<style scoped>
/* Same styles as SectionHeadView.vue and EditorInChiefView.vue */
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
  text-transform: none !important;
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

.approve-btn,
.return-btn,
.reject-btn {
  text-transform: uppercase !important;
  font-weight: bold !important;
  height: 36px !important;
  padding: 8px 16px !important;
  box-shadow: none !important;
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

.return-btn {
  background: #353535 !important;
  color: white !important;
  border: 2px solid #353535 !important;
}

.return-btn:hover {
  background: #1f1f1f !important;
  border: 2px solid #1f1f1f !important;
}

.reject-btn {
  background: #ef4444 !important;
  color: white !important;
  border: 2px solid #353535 !important;
}

.reject-btn:hover {
  background: #dc2626 !important;
  border: 2px solid #353535 !important;
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

  .approve-btn,
  .return-btn,
  .reject-btn {
    width: 100%;
  }
}

/* Comment Notification Card Styles */
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
