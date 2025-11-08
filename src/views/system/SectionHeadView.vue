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
const getNextStatus = (action) => {
  if (action === 'approve') return 'To Editor-in-Chief'
  if (action === 'return') return 'Returned by Section Head'
  return project.value.status
}

// SECTION HEAD ONLY - Comment placeholder
const getCommentPlaceholder = () => {
  if (approvalAction.value === 'approve') {
    return 'Add any comments or notes for the Editor-in-Chief...'
  }
  if (approvalAction.value === 'return') {
    return 'Explain what needs to be edited or improved...'
  }
  return 'Add your comments...'
}

// ADD THIS NEW COMPUTED PROPERTY HERE
const getBackButtonText = computed(() => {
  const typeNames = {
    magazine: 'Magazine',
    newsletter: 'Newsletter',
    folio: 'Folio',
    other: 'Social Media',
  }
  return `Back to ${typeNames[projectType.value] || 'Magazine'} Projects`
})

const saveContentChanges = async () => {
  try {
    const storageKey = `${projectType.value}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const projectIndex = projects.findIndex((p) => p.id == projectId)

    if (projectIndex !== -1) {
      projects[projectIndex].content = editorContent.value
      projects[projectIndex].lastModified = new Date().toLocaleString()
      localStorage.setItem(storageKey, JSON.stringify(projects))

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
  // Handle "Request to Edit" - make editor editable
  if (action === 'return') {
    isEditorEditable.value = true
    if (quillEditorRef.value) {
      quillEditorRef.value.setReadOnly(false)
    }
    showNotification('Editor is now editable. You can make changes to the content.', 'info')
    return
  }

  // Prevent publish action
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
    if (isEditorEditable.value) {
      await saveContentChanges()
    }

    const storageKey = `${projectType.value}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const projectIndex = projects.findIndex((p) => p.id == projectId)

    if (projectIndex !== -1) {
      projects[projectIndex].status = newStatus
      projects[projectIndex].lastModified = new Date().toLocaleString()

      if (action === 'approve') {
        projects[projectIndex].sectionHeadApprovedBy = currentUser.value
        projects[projectIndex].sectionHeadApprovedDate = new Date().toISOString()
        projects[projectIndex].sectionHeadComments = approvalComments.value
        projects[projectIndex].priority = approvalPriority.value
      }

      localStorage.setItem(storageKey, JSON.stringify(projects))
      project.value.status = newStatus

      // Also save to Supabase
      try {
        await createProjectVersionSupabase(
          projectType.value,
          null, // Let Supabase assign its own ID
          {
            ...projects[projectIndex],
            status: newStatus,
            content: editorContent.value || '',
          },
          action === 'approve' ? 'Approved by Section Head' : 'Returned by Section Head for edits',
          currentUser.value,
          action === 'approve' ? 'approved' : 'returned',
        )
        console.log('Project saved to Supabase successfully')
      } catch (err) {
        console.warn('Failed to save project to Supabase:', err)
        // Don't block the UI flow if Supabase save fails
      }

      // Save to history
      const historyKey = `approval_history_${projectId}`
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')
      existingHistory.push({
        action,
        approver: currentUser.value,
        role: 'Section Head',
        comments: approvalComments.value,
        timestamp: new Date().toISOString(),
        priority: approvalPriority.value,
      })
      localStorage.setItem(historyKey, JSON.stringify(existingHistory))

      showApprovalDialog.value = false
      approvalAction.value = ''
      approvalComments.value = ''
      approvalPriority.value = 'Medium'

      const listRoutes = {
        magazine: '/magazine',
        newsletter: '/newsletter',
        folio: '/folio',
        other: '/other',
      }

      if (action === 'approve') {
        showNotification('Project approved and sent to Editor-in-Chief!', 'success')
        setTimeout(() => {
          router.push(listRoutes[projectType.value] || '/magazine')
        }, 600)
        return
      }

      showNotification('Project updated successfully!', 'success')
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

const goBack = () => {
  if (isEditorEditable.value && hasUnsavedChanges.value) {
    saveContentChanges()
  }

  const listRoutes = {
    magazine: '/magazine',
    newsletter: '/newsletter',
    folio: '/folio',
    other: '/other',
  }

  // Use the projectType to determine where to go back
  router.push(listRoutes[projectType.value] || '/magazine')
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
    const projectTypes = ['magazine', 'newsletter', 'folio', 'other']

    for (const type of projectTypes) {
      const storageKey = `${type}_projects`
      const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const foundProject = projects.find((p) => String(p.id) === String(projectId))

      if (foundProject) {
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
        return
      }
    }

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
    'To Section Head': 'warning',
    'Returned by Section Head': 'warning',
    'To Editor-in-Chief': 'primary',
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
                Approve <strong>"{{ project.title }}"</strong> and forward to Editor-in-Chief for
                final review.
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
              placeholder="Set priority for Editor-in-Chief"
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
              <strong>Next Step:</strong> Project will be forwarded to Editor-in-Chief for final
              review.
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

/* Approval Dialog Styles - COPIED FROM PROJECTVIEW */
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

/* Responsive adjustments for approval dialog */
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
</style>
