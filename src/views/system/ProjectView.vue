<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import QuillEditor from '@/components/QuillEditor.vue'

const route = useRoute()
const projectId = route.params.id

// Project data
const project = ref({
  id: projectId,
  title: 'Hope Magazine - The Gold Panicles 2020',
  status: 'Submitted for Section Head review',
  dueDate: 'Monday, 7 September 2020',
  lastModified: 'Sunday, 6 September 2020, 9:35 PM',
  mediaUploaded: 'HopeMagazine.png',
  sectionHead: 'Mark Dela Cruz',
  writer: 'John Doe',
  artist: 'Jane Doe',
})

// Title editing state
const isEditingTitle = ref(false)
const titleInputRef = ref(null)
const tempTitle = ref(project.value.title)

// Rich text editor state
const editorContent = ref(`
<p>Give it a try! 😊</p>
<p><span style="color: red;">Red text</span> and <span style="color: blue;">blue text!</span></p>
<ul>
  <li>A simple list</li>
  <li>With two items</li>
</ul>
<p>Just type :) and it will be converted into 😊 as you type.</p>
`)

const isEditing = ref(false)
const quillEditorRef = ref(null)

// Comments state
const comments = ref([
  {
    id: 1,
    author: 'Jane Doe',
    avatar:
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face',
    content: 'Lorem Ipsum',
    timestamp: '12 minutes ago',
    isApproved: true,
  },
  {
    id: 2,
    author: 'Mark Dela Cruz',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
    content: 'Lorem Ipsum',
    timestamp: '30 minutes ago',
    isApproved: false,
  },
  {
    id: 3,
    author: 'John Doe',
    avatar:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
    content: 'Lorem Ipsum',
    timestamp: '1 day ago',
    isApproved: false,
  },
])

const newComment = ref('')
const commentSearch = ref('')

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
    console.log('Title updated:', project.value.title)
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
    console.log('Content saved:', content)
  }
}

// Comment functions
const addComment = () => {
  if (newComment.value.trim()) {
    const comment = {
      id: comments.value.length + 1,
      author: 'Current User',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face',
      content: newComment.value,
      timestamp: 'Just now',
      isApproved: false,
    }
    comments.value.unshift(comment)
    newComment.value = ''
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

// Load project data on mount
onMounted(() => {
  // In a real app, you would fetch project data based on projectId
  console.log('Loading project:', projectId)
})
</script>

<template>
  <v-app class="project-page">
    <MainHeader />

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
                  <span class="value">{{ project.writer }}</span>
                </div>
                <div class="metadata-item">
                  <span class="label">Artist:</span>
                  <span class="value">{{ project.artist }}</span>
                </div>
              </div>
            </div>

            <!-- Rich Text Editor -->
            <div class="editor-section">
              <QuillEditor
                ref="quillEditorRef"
                v-model="editorContent"
                :read-only="!isEditing"
                height="500px"
                placeholder="Start writing your content..."
                @text-change="saveContent"
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
              <v-btn variant="outlined" class="remove-btn"> Remove Submission </v-btn>
            </div>
          </v-col>

          <!-- Right Panel - Comments -->
          <v-col cols="12" lg="4" class="right-panel">
            <div class="comments-section">
              <!-- Comments Header -->
              <div class="comments-header">
                <h3>Comments</h3>
                <div class="header-actions">
                  <v-btn icon size="small" variant="text">
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
                      <span class="comment-time">{{ comment.timestamp }}</span>
                    </div>
                    <div class="comment-text">{{ comment.content }}</div>
                  </div>
                  <div class="comment-actions">
                    <v-icon v-if="comment.isApproved" color="success" size="small">
                      mdi-check-circle
                    </v-icon>
                    <v-btn icon size="small" variant="text">
                      <v-icon>mdi-dots-vertical</v-icon>
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <Footer />
  </v-app>
</template>

<style scoped>
.project-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
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
