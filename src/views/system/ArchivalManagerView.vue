<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import QuillEditor from '@/components/QuillEditor.vue'
import ProjectHistory from '@/components/ProjectHistory.vue'
import HighlightComments from '@/components/HighlightComments.vue'
import MediaUpload from '@/components/MediaUpload.vue'
import { projectsService, archivesService, profilesService } from '@/services/supabaseService'
import { supabase } from '@/utils/supabase'
import {
  getProjectComments,
  addProjectComment,
  deleteProjectComment,
  toggleCommentApproval,
} from '@/services/commentsService.js'
import { createProjectVersion as createProjectVersionSupabase } from '@/services/supabaseProjectHistory.js'
import { notifyStatusChange, notifyProjectUpdate } from '@/services/notificationsService.js'
import { getDisplayName } from '@/utils/userDisplay.js'
import { formatStatus } from '@/utils/statusFormatter.js'

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

// User role - ARCHIVAL MANAGER ONLY
const currentUserRole = ref('Archival Manager')
const currentUser = ref(null)

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

// Member profiles for clickable links
const writerProfiles = ref([])
const artistProfiles = ref([])
const sectionHeadProfile = ref(null)

// Rich text editor state
const editorContent = ref('')
const quillEditorRef = ref(null)
const isEditorEditable = ref(false) // Archival Manager cannot edit content

// Auto-save state
const lastSaveTime = ref(null)
const saveTimeout = ref(null)
const hasUnsavedChanges = ref(false)

// Approval state
const showApprovalDialog = ref(false)
const approvalAction = ref('')
const approvalComments = ref('')
const publishData = ref({
  publishDate: new Date().toISOString().split('T')[0],
  publishPlatform: 'Website',
})

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
  // Archival Manager cannot edit, so this does nothing
  // Keeping method for template compatibility
}

// ARCHIVAL MANAGER - Only publish button available
const approvalActions = computed(() => {
  // Only show publish button if status is "For Publish"
  const isReadyToPublish = project.value.status === 'For Publish'

  return [
    {
      value: 'publish',
      text: 'Publish',
      color: 'primary',
      icon: isReadyToPublish ? null : 'mdi-lock',
      disabled: !isReadyToPublish,
    },
  ]
})

// ARCHIVAL MANAGER - Status mapping
const getNextStatus = (action) => {
  if (action === 'publish') return 'Published'
  return project.value.status
}

// ARCHIVAL MANAGER - Comment placeholder
const getCommentPlaceholder = () => {
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

const startApproval = (action) => {
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
    // Get actual authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      showNotification('Authentication error. Please login again.', 'error')
      return
    }

    // Update via Supabase
    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    if (action === 'publish') {
      updateData.published_by = user.id
      updateData.published_date = publishData.value.publishDate
      updateData.publish_platform = publishData.value.publishPlatform
      updateData.publish_notes = approvalComments.value
    }

    await projectsService.update(projectId, updateData)

    console.log('✅ Project published via Supabase')

    project.value.status = newStatus

    // Create notification for publishing with workflow labels
    try {
      const displayName = getDisplayName(currentUserProfile.value)
      await notifyStatusChange({
        project: project.value,
        oldStatus: 'for_publish',
        newStatus: 'published',
        actionBy: displayName,
        comments: approvalComments.value,
        action: 'publish',
      })
      console.log('✅ Notification created successfully')
    } catch (notifError) {
      console.warn('⚠️ Notification creation failed (non-critical):', notifError)
      // Continue execution even if notification fails
    }

    // Try to save to Supabase
    try {
      if (project.value.supabaseId) {
        await createProjectVersionSupabase(
          projectType.value,
          projectId,
          project.value,
          `Published by Archival Manager`,
          user.id,
          newStatus,
        )
        console.log('Project version saved to Supabase successfully')
      }
    } catch (err) {
      console.warn('Failed to save project version to Supabase (non-critical):', err)
    }

    showApprovalDialog.value = false
    approvalAction.value = ''
    approvalComments.value = ''

    showNotification('Project published successfully!', 'success')

    setTimeout(() => {
      router.push('/admin')
    }, 600)
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
  const actualStorage = getActualStorageKey(projectId)
  if (actualStorage) {
    const routePath =
      actualStorage.type === 'other' || actualStorage.type === 'social-media'
        ? '/other'
        : `/${actualStorage.type}`
    router.push(routePath)
  } else {
    const routePath =
      projectType.value === 'other' || projectType.value === 'social-media'
        ? '/other'
        : `/${projectType.value}`
    router.push(routePath)
  }
}

// Function to navigate to a user's profile
const viewUserProfile = (userId) => {
  router.push(`/profile/${userId}`)
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

    // Load project members with their profile info
    const members = await projectsService.getMembers(projectId)
    console.log('✅ Project members loaded:', members)

    // Get section head name from section_head_id
    let sectionHeadName = 'Not assigned'
    sectionHeadProfile.value = null
    if (foundProject.section_head_id) {
      try {
        const sectionHeadProfileData = await profilesService.getById(foundProject.section_head_id)
        if (sectionHeadProfileData && sectionHeadProfileData.id) {
          sectionHeadName =
            `${sectionHeadProfileData.first_name || ''} ${sectionHeadProfileData.last_name || ''}`.trim() ||
            sectionHeadProfileData.email
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
        const displayName =
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
        return { id: profile?.id || null, displayName }
      })
      .filter((w) => w.id)
    const writersText =
      writersArray.length > 0 ? writersArray.map((w) => w.displayName).join(', ') : 'Not assigned'
    writerProfiles.value = writersArray

    const artistsArray = members
      .filter((m) => m.role === 'artist')
      .map((m) => {
        const profile = m.profiles
        const displayName =
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
        return { id: profile?.id || null, displayName }
      })
      .filter((a) => a.id)
    const artistsText =
      artistsArray.length > 0 ? artistsArray.map((a) => a.displayName).join(', ') : 'Not assigned'
    artistProfiles.value = artistsArray

    project.value = {
      ...foundProject,
      id: String(projectId),
      title: foundProject.title || 'Untitled Project',
      status: foundProject.status || 'archived',
      lastModified: foundProject.updated_at
        ? new Date(foundProject.updated_at).toLocaleString()
        : new Date().toLocaleString(),
      content: foundProject.content || '',
      writers: writersText,
      artists: artistsText,
      sectionHead: sectionHeadName,
    }

    projectType.value = foundProject.project_type || route.query.type || 'other'
    editorContent.value = foundProject.content || ''
    updateLastSaveTime()
    loadProjectComments()

    console.log('✅ Project loaded from Supabase')
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
    'For Publish': 'success',
    published: 'success',
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
                <v-chip color="primary" size="small" class="ml-3"> Archival Manager Review </v-chip>
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
                  <span class="value">{{ formatDate(project.dueDate) }}</span>
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
                    <template v-else>{{
                      project.writers || project.submittedBy || 'Not assigned'
                    }}</template>
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

            <!-- Media Upload Section -->
            <div class="media-upload-wrapper">
              <MediaUpload
                :project-id="projectId"
                :uploaded-by="currentUserProfile?.id || null"
                @upload-success="showNotification('Media uploaded successfully!')"
                @upload-error="showNotification($event, 'error')"
              />
            </div>

            <div class="action-buttons">
              <template v-for="action in approvalActions" :key="action.value">
                <v-btn
                  @click="startApproval(action.value)"
                  variant="flat"
                  :disabled="action.disabled"
                  :class="{
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
              <ProjectHistory :project-id="projectId" :project-type="projectType" />
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
          <span v-if="approvalAction === 'publish'">Publish Project</span>
        </v-card-title>

        <v-divider class="dialog-divider" />

        <v-card-text class="approval-dialog-content">
          <div class="approval-info-box">
            <p class="approval-message">
              <strong v-if="approvalAction === 'publish'">Publish Project:</strong>
              <span v-if="approvalAction === 'publish'">
                This will publish the project and make it available in the archive.
              </span>
            </p>
          </div>

          <div v-if="approvalAction === 'publish'" class="form-field">
            <label class="field-label">Publish Date</label>
            <v-text-field
              v-model="publishData.publishDate"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
            />
          </div>

          <div v-if="approvalAction === 'publish'" class="form-field">
            <label class="field-label">Publish Platform</label>
            <v-select
              v-model="publishData.publishPlatform"
              :items="['Website', 'Print', 'Both']"
              variant="outlined"
              density="compact"
              hide-details
            />
          </div>

          <div class="form-field">
            <label class="field-label">Comments (Optional)</label>
            <v-textarea
              v-model="approvalComments"
              :placeholder="getCommentPlaceholder()"
              variant="outlined"
              density="compact"
              rows="3"
              hide-details
            />
          </div>

          <v-alert
            v-if="approvalAction === 'publish'"
            type="info"
            variant="tonal"
            density="compact"
            class="next-step-alert"
          >
            <div class="alert-text">
              <strong>Final Step:</strong>
              This project will be published and marked as complete.
            </div>
          </v-alert>
        </v-card-text>

        <v-divider class="dialog-divider" />

        <v-card-actions class="approval-dialog-actions">
          <v-btn variant="outlined" class="cancel-btn" @click="cancelApproval"> Cancel </v-btn>
          <v-spacer />
          <v-btn class="confirm-approval-btn" @click="submitApproval">
            <span v-if="approvalAction === 'publish'">Publish</span>
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
/* Same styles as EditorInChiefView */
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

.publish-btn {
  background: #fbbf24 !important;
  color: #353535 !important;
  text-transform: uppercase !important;
  font-weight: bold !important;
  height: 36px !important;
  padding: 8px 16px !important;
  border: 2px solid #353535 !important;
}

.publish-btn:hover {
  background: #f59e0b !important;
}

.publish-btn-locked {
  background: #9ca3af !important;
  color: white !important;
  border: 2px solid #9ca3af !important;
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

.profile-link {
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.profile-link:hover {
  opacity: 0.7;
}

.media-upload-wrapper {
  margin-top: 0;
  margin-bottom: 24px;
  width: 100%;
  display: block;
}

@media (max-width: 768px) {
  .metadata-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .publish-btn {
    width: 100%;
  }
}
</style>
