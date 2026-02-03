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

const route = useRoute()
const router = useRouter()
const projectId = route.params.id

// Project type
const projectType = ref('magazine')

// User role - SECTION HEAD ONLY
const currentUserRole = ref('Section Head')
const currentUser = ref('Section Head User')

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
const showHistory = ref(true)
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

// SECTION HEAD ONLY - Simple approval actions
const approvalActions = computed(() => {
  return [
    { value: 'return', text: 'Request to Edit', color: 'warning', icon: 'mdi-pencil' },
    { value: 'approve', text: 'Approve', color: 'success', icon: 'mdi-check' },
    {
      value: 'publish',
      text: 'Publish',
      color: 'primary',
      icon: 'mdi-lock',
      disabled: true,
      tooltip: 'Only Editor-in-Chief can publish after approval',
    },
  ]
})

// SECTION HEAD ONLY - Simple status mapping
// SECTION HEAD - Updated status mapping
const getNextStatus = (action) => {
  if (action === 'approve') {
    // Route to Technical Editor for writers, Creative Director for artists only
    const hasWriter =
      project.value?.writers &&
      project.value.writers !== 'Not assigned' &&
      project.value.writers.trim() !== ''
    const hasArtist =
      project.value?.artists &&
      project.value.artists !== 'Not assigned' &&
      project.value.artists.trim() !== ''

    if (hasArtist && !hasWriter) {
      return 'to_creative_director'
    }
    return 'to_technical_editor' // Default for writers
  }
  if (action === 'return') return 'returned_by_section_head'
  return project.value.status
}

// SECTION HEAD - Updated comment placeholder
const getCommentPlaceholder = () => {
  if (approvalAction.value === 'approve') {
    const hasWriter =
      project.value?.writers &&
      project.value.writers !== 'Not assigned' &&
      project.value.writers.trim() !== ''
    const hasArtist =
      project.value?.artists &&
      project.value.artists !== 'Not assigned' &&
      project.value.artists.trim() !== ''
    const recipient = hasArtist && !hasWriter ? 'Creative Director' : 'Technical Editor'
    return `Add any comments or notes for the ${recipient}...`
  }
  if (approvalAction.value === 'return') {
    return 'Explain what needs to be edited or improved...'
  }
  return 'Add your comments...'
}
const getBackButtonText = computed(() => {
  // Get the project type to return to the correct view
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
    console.error('❌ Error saving content:', error)
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

  if (action === 'publish') {
    showNotification('Only Editor-in-Chief can publish projects', 'warning')
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
    // Get current user from Supabase Auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      showNotification('You must be logged in to approve', 'error')
      return
    }

    if (isEditorEditable.value) {
      await saveContentChanges()
    }

    // Update status via Supabase
    await projectsService.update(projectId, {
      status: newStatus,
      updated_at: new Date().toISOString(),
      section_head_approved_by: action === 'approve' ? user.id : undefined,
      section_head_approved_date: action === 'approve' ? new Date().toISOString() : undefined,
      section_head_comments: action === 'approve' ? approvalComments.value : undefined,
      priority_level: action === 'approve' ? approvalPriority.value : undefined,
    })

    console.log('✅ Project status updated via Supabase')

    project.value.status = newStatus

    // Create notification based on action
    if (action === 'approve') {
      const hasWriter =
        project.value?.writers &&
        project.value.writers !== 'Not assigned' &&
        project.value.writers.trim() !== ''
      const hasArtist =
        project.value?.artists &&
        project.value.artists !== 'Not assigned' &&
        project.value.artists.trim() !== ''
      const isCreativeDirector = hasArtist && !hasWriter
      createStatusChangeNotification({
        projectId: projectId,
        projectType: projectType.value,
        projectTitle: project.value.title,
        oldStatus: 'to_section_head',
        newStatus: isCreativeDirector ? 'to_creative_director' : 'to_technical_editor',
        actionBy: currentUser.value,
        recipient: isCreativeDirector ? 'Creative Director' : 'Technical Editor',
        comments: approvalComments.value,
      })
    } else if (action === 'return') {
      createStatusChangeNotification({
        projectId: projectId,
        projectType: projectType.value,
        projectTitle: project.value.title,
        oldStatus: 'to_section_head',
        newStatus: 'returned_by_section_head',
        actionBy: currentUser.value,
        recipient: 'Writer',
        comments: approvalComments.value,
      })
    }

    showApprovalDialog.value = false
    approvalAction.value = ''
    approvalComments.value = ''
    approvalPriority.value = 'Medium'

    if (action === 'approve') {
      showNotification('Project approved and sent to Technical Editor!', 'success')
      setTimeout(() => {
        // Route based on project type
        const routePath =
          projectType.value === 'other' || projectType.value === 'social-media'
            ? '/other'
            : `/${projectType.value}`
        router.push(routePath)
      }, 600)
      return
    }

    showNotification('Project updated successfully!', 'success')
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
  // Route back to the project type view based on loaded project data
  const routePath =
    projectType.value === 'other' || projectType.value === 'social-media'
      ? '/other'
      : `/${projectType.value}`
  router.push(routePath)
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

    // Load from Supabase
    const foundProject = await projectsService.getById(projectId)

    console.log('✅ Project loaded from Supabase:', foundProject)

    // Load project members with their profile info
    const members = await projectsService.getMembers(projectId)
    console.log('✅ Project members loaded:', members)

    // Get section head name from section_head_id
    let sectionHeadName = 'Not assigned'
    if (foundProject.section_head_id) {
      try {
        const sectionHeadProfile = await profilesService.getById(foundProject.section_head_id)
        if (sectionHeadProfile) {
          sectionHeadName =
            `${sectionHeadProfile.first_name || ''} ${sectionHeadProfile.last_name || ''}`.trim() ||
            sectionHeadProfile.email
        }
      } catch (error) {
        console.error('Error loading section head profile:', error)
      }
    }

    // Get writers and artists from project_members
    const writers = members
      .filter((m) => m.role === 'writer')
      .map((m) => {
        const profile = m.profiles
        return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
      })
    const writersText = writers.length > 0 ? writers.join(', ') : 'Not assigned'

    const artists = members
      .filter((m) => m.role === 'artist')
      .map((m) => {
        const profile = m.profiles
        return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
      })
    const artistsText = artists.length > 0 ? artists.join(', ') : 'Not assigned'

    project.value = {
      ...foundProject,
      id: String(projectId),
      title: foundProject.title || 'Untitled Project',
      status: foundProject.status || 'draft',
      lastModified: foundProject.updated_at
        ? new Date(foundProject.updated_at).toLocaleString()
        : new Date().toLocaleString(),
      content: foundProject.content || '',
      writers: writersText,
      artists: artistsText,
      sectionHead: sectionHeadName,
      description: foundProject.description || '',
      dueDate: foundProject.due_date || foundProject.deadline || '',
      department: foundProject.department || '',
      priority: foundProject.priority || 'Medium',
    }

    projectType.value = foundProject.project_type || route.query.type || 'magazine'
    editorContent.value = foundProject.content || ''
    updateLastSaveTime()
    loadProjectComments()

    console.log('✅ Project loaded successfully from Supabase')
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
      const comment = await addProjectComment(
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
    to_section_head: 'warning',
    returned_by_section_head: 'warning',
    to_editor_in_chief: 'primary',
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
  await loadProjectData()
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
                <v-chip color="warning" size="small" class="ml-3"> Section Head Review </v-chip>
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
                <v-tooltip v-if="action.tooltip" location="top">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      @click="startApproval(action.value)"
                      variant="outlined"
                      :class="{
                        'return-btn': action.value === 'return',
                        'approve-btn': action.value === 'approve',
                        'publish-btn': action.value === 'publish',
                        locked: action.disabled,
                      }"
                      :disabled="action.disabled"
                      v-bind="props"
                      :prepend-icon="
                        action.value === 'publish' && action.disabled ? 'mdi-lock' : undefined
                      "
                    >
                      {{ action.text }}
                    </v-btn>
                  </template>
                  <span>{{ action.tooltip }}</span>
                </v-tooltip>
                <v-btn
                  v-else
                  @click="startApproval(action.value)"
                  variant="outlined"
                  :class="{
                    'return-btn': action.value === 'return',
                    'approve-btn': action.value === 'approve',
                    'publish-btn': action.value === 'publish',
                  }"
                >
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
            {{ approvalActions.find((a) => a.value === approvalAction)?.icon }}
          </v-icon>
          <span>{{ approvalActions.find((a) => a.value === approvalAction)?.text }}</span>
        </v-card-title>

        <v-divider class="dialog-divider" />

        <v-card-text class="approval-dialog-content">
          <div class="approval-info-box">
            <p class="approval-message">
              <template v-if="approvalAction === 'approve'">
                Approve <strong>"{{ project.title }}"</strong> and forward to Technical Editor for
                technical review.
              </template>
              <template v-else-if="approvalAction === 'return'">
                Request edits for <strong>"{{ project.title }}"</strong>. The project will be
                returned to the author.
              </template>
            </p>
          </div>

          <div v-if="approvalAction === 'approve'" class="form-field">
            <label class="field-label">Priority Level</label>
            <v-select
              v-model="approvalPriority"
              :items="['High', 'Medium', 'Low']"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-flag"
              hide-details
              placeholder="Set priority for Technical Editor"
            />
          </div>

          <div class="form-field">
            <label class="field-label">
              {{ approvalAction === 'return' ? 'Comments (Required)' : 'Comments (Optional)' }}
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
              <strong>Next Step:</strong> Project will be forwarded to Technical Editor for
              technical review.
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
              <strong>Action:</strong> Project will be returned to the author for editing.
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
            :disabled="approvalAction === 'return' && !approvalComments.trim()"
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

@media (max-width: 768px) {
  .metadata-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .metadata-item-priority {
    justify-content: flex-start;
  }
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

.return-btn,
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
}

.publish-btn {
  background: transparent !important;
  border: 1px solid #9ca3af !important;
  color: #9ca3af !important;
}

.publish-btn.locked {
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

:deep(.v-overlay--active .v-overlay__content) {
  align-self: center !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
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

:deep(.form-field .v-field) {
  background: white !important;
  border-radius: 6px !important;
}

:deep(.form-field .v-field__outline) {
  border-color: #d0d0d0 !important;
  border-width: 1px !important;
}

:deep(.form-field .v-field--focused .v-field__outline) {
  border-color: #353535 !important;
  border-width: 2px !important;
}

:deep(.form-field .v-field__input) {
  padding: 12px 16px !important;
  font-size: 14px !important;
  color: #353535 !important;
}

:deep(.form-field .v-select__selection-text) {
  font-size: 14px !important;
  color: #353535 !important;
}

.next-step-alert {
  border-left: 4px solid #353535 !important;
  border-radius: 6px !important;
  background: #f8f8f8 !important;
  padding: 12px 16px !important;
  margin-top: 16px !important;
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

/* Responsive adjustments */
@media (max-width: 600px) {
  .approval-dialog-header {
    padding: 16px 20px !important;
    font-size: 16px !important;
  }

  .approval-dialog-content {
    padding: 20px !important;
  }

  .approval-info-box {
    padding: 12px;
  }

  .approval-message {
    font-size: 13px;
  }

  .approval-dialog-actions {
    padding: 12px 20px !important;
    flex-direction: column;
    gap: 8px;
  }

  .cancel-btn,
  .confirm-approval-btn {
    width: 100%;
  }

  .approval-dialog-actions .v-spacer {
    display: none;
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
