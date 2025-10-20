<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import QuillEditor from '@/components/QuillEditor.vue'
import ProjectHistory from '@/components/ProjectHistory.vue'
import HighlightComments from '@/components/HighlightComments.vue'
import { createProjectVersion } from '@/services/localProjectHistory.js'
import {
  getProjectComments,
  addProjectComment,
  updateProjectComment,
  deleteProjectComment,
  toggleCommentApproval,
} from '@/services/commentsService.js'

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

// Rich text editor state
const editorContent = ref('')

const isEditing = ref(false)
const quillEditorRef = ref(null)

// History and versioning state
const showHistory = ref(true) // Always show by default
const versionDescription = ref('')
const showVersionDialog = ref(false)

// Comments state - start empty for new projects
const comments = ref([])

const newComment = ref('')
const commentSearch = ref('')

// Highlight comments state
const highlightComments = ref([])

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

    // Save to localStorage
    try {
      const storageKey = `${projectType.value}_projects`
      const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const projectIndex = projects.findIndex((p) => p.id == projectId)

      if (projectIndex !== -1) {
        projects[projectIndex].title = tempTitle.value.trim()
        projects[projectIndex].lastModified = new Date().toLocaleString()
        localStorage.setItem(storageKey, JSON.stringify(projects))
        console.log('Title updated and saved to localStorage:', project.value.title)
      }
    } catch (error) {
      console.error('Error saving title to localStorage:', error)
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

// Editor functions
const toggleEdit = () => {
  isEditing.value = !isEditing.value
  if (isEditing.value) {
    // Focus editor on entering edit mode
    if (quillEditorRef.value && quillEditorRef.value.focus) {
      quillEditorRef.value.focus()
    }
  } else {
    // Save on leaving edit mode
    saveContent()
  }
}

const saveAsDraft = () => {
  saveContent()
  console.log('Project saved as draft')
  // Add your save as draft logic here
}

const saveContent = () => {
  if (quillEditorRef.value) {
    const content = quillEditorRef.value.getContent()
    editorContent.value = content
    project.value.content = content

    // Save to localStorage
    try {
      const storageKey = `${projectType.value}_projects`
      const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const projectIndex = projects.findIndex((p) => p.id == projectId)

      if (projectIndex !== -1) {
        projects[projectIndex].content = content
        projects[projectIndex].lastModified = new Date().toLocaleString()
        localStorage.setItem(storageKey, JSON.stringify(projects))
        console.log('Content saved to localStorage:', content)
      }
    } catch (error) {
      console.error('Error saving content to localStorage:', error)
    }
  }
}

// Version control functions
const createVersion = () => {
  if (!versionDescription.value.trim()) {
    alert('Please provide a description for this version')
    return
  }

  try {
    const projectData = {
      ...project.value,
      content: editorContent.value,
    }

    createProjectVersion(
      projectType.value,
      projectId,
      projectData,
      versionDescription.value,
      'Current User', // This should come from auth system
      'draft',
    )

    versionDescription.value = ''
    showVersionDialog.value = false
    console.log('Version created successfully')
  } catch (error) {
    console.error('Error creating version:', error)
    alert('Failed to create version')
  }
}

const handleVersionRestored = (restoredProject) => {
  // Update the current project with restored data
  project.value = { ...project.value, ...restoredProject }
  editorContent.value = restoredProject.content || ''

  // Update last modified
  project.value.lastModified = new Date().toLocaleString()

  console.log('Project restored from version:', restoredProject)
}

// Navigation functions
const goBack = () => {
  // Try to go back to the previous page, fallback to the appropriate project list
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    // Fallback to the appropriate project list based on project type
    const projectTypeMap = {
      magazine: '/magazine',
      newsletter: '/newsletter',
      folio: '/folio',
      other: '/other',
    }
    const fallbackRoute = projectTypeMap[projectType.value] || '/'
    router.push(fallbackRoute)
  }
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
    // Try to find the project in all project types
    const projectTypes = ['magazine', 'newsletter', 'folio', 'other']

    for (const type of projectTypes) {
      const storageKey = `${type}_projects`
      const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
      const foundProject = projects.find((p) => p.id == projectId)

      if (foundProject) {
        // Update project data
        project.value = {
          ...foundProject,
          id: projectId,
          lastModified: foundProject.createdAtISO
            ? new Date(foundProject.createdAtISO).toLocaleString()
            : new Date().toLocaleString(),
          content: foundProject.content || '',
          writers: foundProject.writers || 'Not assigned',
          artists: foundProject.artists || 'Not assigned',
          sectionHead: foundProject.sectionHead || 'Not assigned',
          description: foundProject.description || 'No description provided',
        }

        // Set project type
        projectType.value = type

        // Set editor content
        editorContent.value = foundProject.content || ''

        // Update temp title for editing
        tempTitle.value = foundProject.title

        // Load comments for this project
        loadProjectComments()

        // Load highlight comments from QuillEditor
        if (quillEditorRef.value) {
          const storedComments = quillEditorRef.value.getHighlightComments()
          highlightComments.value = storedComments
        }

        console.log('Project loaded successfully:', {
          id: project.value.id,
          title: project.value.title,
          description: project.value.description,
          writers: project.value.writers,
          artists: project.value.artists,
          sectionHead: project.value.sectionHead,
          status: project.value.status,
          content: project.value.content,
        })

        console.log('Raw found project data:', foundProject)
        console.log('Project value after assignment:', project.value)
        return
      }
    }

    // If project not found, show error
    console.error('Project not found with ID:', projectId)
    alert('Project not found. Please check the project ID.')
  } catch (error) {
    console.error('Error loading project:', error)
    alert('Error loading project data.')
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
      newComment.value = ''
      console.log('Comment added successfully')
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment')
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
        console.log('Comment deleted successfully')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Failed to delete comment')
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
      console.log('Comment approval toggled')
    }
  } catch (error) {
    console.error('Error toggling comment approval:', error)
    alert('Failed to toggle comment approval')
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

// Load project data on mount
onMounted(() => {
  // Load project data from localStorage
  console.log('Loading project:', projectId)
  loadProjectData()
})
</script>

<template>
  <v-app class="project-page">
    <MainHeader />

    <!-- Back Button -->
    <div class="back-button-container">
      <v-btn @click="goBack" variant="outlined" prepend-icon="mdi-arrow-left" class="back-button">
        Back
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
              <h3>Description</h3>
              <p>{{ project.description }}</p>
            </div>

            <!-- Project Metadata -->
            <div class="project-metadata">
              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Submission Status:</span>
                  <span class="value">{{ project.status }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Due Date:</span>
                  <span class="value">{{ project.dueDate }}</span>
                </div>
              </div>
              <div class="metadata-row">
                <div class="metadata-item">
                  <span class="label">Last Modified:</span>
                  <span class="value">{{ project.lastModified }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Media Uploaded:</span>
                  <span class="value">{{ project.mediaUploaded }}</span>
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

            <!-- Rich Text Editor -->
            <div class="editor-section">
              <QuillEditor
                ref="quillEditorRef"
                v-model="editorContent"
                :read-only="!isEditing"
                :project-id="projectId"
                :project-type="projectType"
                height="500px"
                placeholder="Start writing your content..."
                @text-change="saveContent"
                @highlight-comments-updated="handleHighlightCommentsUpdated"
              />
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <v-btn @click="toggleEdit" variant="outlined" class="edit-btn">
                {{ isEditing ? 'Save Changes' : 'Edit Submission' }}
              </v-btn>
              <v-btn @click="saveAsDraft" variant="outlined" class="draft-btn">
                Save as Draft
              </v-btn>
              <v-btn @click="showVersionDialog = true" variant="outlined" class="version-btn">
                Create Version
              </v-btn>
              <v-btn variant="outlined" class="remove-btn"> Remove Submission </v-btn>
            </div>
          </v-col>

          <!-- Right Panel - Comments and History -->
          <v-col cols="12" lg="4" class="right-panel">
            <!-- Project History -->
            <div class="history-section mb-4">
              <v-card class="project-history-card">
                <v-card-title class="d-flex justify-space-between align-center">
                  <span>
                    <v-icon class="mr-2">mdi-history</v-icon>
                    Project History
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
                      @version-restored="handleVersionRestored"
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
                  placeholder="All comments"
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

    <!-- Version Creation Dialog -->
    <v-dialog v-model="showVersionDialog" max-width="500px">
      <v-card>
        <v-card-title>
          <v-icon class="mr-2">mdi-plus-circle</v-icon>
          Create New Version
        </v-card-title>

        <v-card-text>
          <p class="mb-4">Create a snapshot of the current project state for version control.</p>

          <v-textarea
            v-model="versionDescription"
            label="Version Description"
            placeholder="Describe the changes made in this version..."
            rows="3"
            variant="outlined"
            required
            :rules="[(v) => !!v || 'Description is required']"
          />

          <v-select
            :items="['draft', 'published', 'major', 'minor']"
            label="Version Type"
            variant="outlined"
            value="draft"
            readonly
            hint="Version type will be automatically determined"
            persistent-hint
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showVersionDialog = false" color="grey"> Cancel </v-btn>
          <v-btn @click="createVersion" color="primary" :disabled="!versionDescription.trim()">
            Create Version
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
  margin-bottom: 24px;
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

.edit-btn {
  background: #f5c52b !important; /* Yellow/amber background */
  color: #353535 !important; /* Dark text */
  border: 1px solid #f5c52b !important;
  font-weight: bold !important; /* Make text bold */
}

.edit-btn:hover {
  background: #f5c52b !important; /* Darker yellow on hover */
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

.version-btn {
  background: #8b5cf6 !important; /* Purple background */
  color: white !important;
  border: 1px solid #8b5cf6 !important;
  font-weight: bold !important; /* Make text bold */
}

.version-btn:hover {
  background: #7c3aed !important; /* Darker purple on hover */
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

  .title-edit-container {
    flex-direction: column;
    align-items: stretch;
  }

  .title-edit-actions {
    align-self: flex-start;
  }
}

@media (max-width: 768px) {
  .project-container {
    padding: 16px !important;
  }

  .project-title,
  :deep(.title-input .v-field__input) {
    font-size: 24px !important;
  }

  .action-buttons {
    flex-direction: column;
  }

  .comments-section {
    max-height: 500px;
  }

  .editable-title {
    min-width: auto;
  }
}
</style>
