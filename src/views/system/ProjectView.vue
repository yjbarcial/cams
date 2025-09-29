<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

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
const showFullScreen = ref(false)
const selectedText = ref('')
const showHighlightComment = ref(false)
const highlightComment = ref('')
const highlightComments = ref([])
const currentSelection = ref(null)
const editorRef = ref(null)

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

// Editor functions
const toggleEdit = () => {
  isEditing.value = !isEditing.value
}

const toggleFullScreen = () => {
  showFullScreen.value = !showFullScreen.value
}

const formatText = (command, value = null) => {
  if (value) {
    document.execCommand(command, false, value)
  } else {
    document.execCommand(command, false, null)
  }
}

const setFontFamily = (fontFamily) => {
  formatText('fontName', fontFamily)
}

const setFontSize = (fontSize) => {
  formatText('fontSize', fontSize)
}

const setTextColor = (color) => {
  formatText('foreColor', color)
}

const setHighlightColor = (color) => {
  formatText('backColor', color)
}

const insertElement = (element) => {
  if (element === 'image') {
    const url = prompt('Enter image URL:')
    if (url) {
      const img = document.createElement('img')
      img.src = url
      img.style.maxWidth = '100%'
      img.style.height = 'auto'
      document.execCommand('insertHTML', false, img.outerHTML)
    }
  } else if (element === 'link') {
    const url = prompt('Enter link URL:')
    if (url) {
      document.execCommand('createLink', false, url)
    }
  } else if (element === 'video') {
    const url = prompt('Enter video URL:')
    if (url) {
      const video = document.createElement('video')
      video.src = url
      video.controls = true
      video.style.maxWidth = '100%'
      video.style.height = 'auto'
      document.execCommand('insertHTML', false, video.outerHTML)
    }
  } else if (element === 'table') {
    const rows = prompt('Number of rows:', '3')
    const cols = prompt('Number of columns:', '3')
    if (rows && cols) {
      let tableHTML = '<table border="1" style="border-collapse: collapse; width: 100%;">'
      for (let i = 0; i < parseInt(rows); i++) {
        tableHTML += '<tr>'
        for (let j = 0; j < parseInt(cols); j++) {
          tableHTML += '<td style="padding: 8px;">Cell ' + (i + 1) + ',' + (j + 1) + '</td>'
        }
        tableHTML += '</tr>'
      }
      tableHTML += '</table>'
      document.execCommand('insertHTML', false, tableHTML)
    }
  } else {
    document.execCommand('insert' + element.charAt(0).toUpperCase() + element.slice(1), false, null)
  }
}

// Text selection and highlighting functions
const handleTextSelection = () => {
  const selection = window.getSelection()
  if (selection.toString().trim()) {
    selectedText.value = selection.toString()
    currentSelection.value = selection.getRangeAt(0)
    showHighlightComment.value = true
  }
}

const addHighlightComment = () => {
  if (highlightComment.value.trim() && currentSelection.value) {
    const comment = {
      id: highlightComments.value.length + 1,
      text: selectedText.value,
      comment: highlightComment.value,
      author: 'Current User',
      timestamp: new Date().toLocaleString(),
      range: currentSelection.value.cloneRange(),
    }

    // Wrap selected text with highlight and comment
    const span = document.createElement('span')
    span.style.backgroundColor = '#ffeb3b'
    span.style.position = 'relative'
    span.setAttribute('data-comment-id', comment.id)
    span.title = `Comment: ${highlightComment.value}`

    try {
      currentSelection.value.surroundContents(span)
      highlightComments.value.push(comment)
      highlightComment.value = ''
      showHighlightComment.value = false
      selectedText.value = ''
    } catch (e) {
      console.error('Error adding highlight comment:', e)
    }
  }
}

const cancelHighlightComment = () => {
  showHighlightComment.value = false
  highlightComment.value = ''
  selectedText.value = ''
  currentSelection.value = null
}

const uploadImage = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = document.createElement('img')
        img.src = e.target.result
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        img.style.margin = '10px 0'
        document.execCommand('insertHTML', false, img.outerHTML)
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
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
            <!-- Project Title -->
            <h1 class="project-title">{{ project.title }}</h1>

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
              <div class="editor-toolbar" v-if="isEditing">
                <!-- Text Formatting -->
                <div class="toolbar-group">
                  <v-btn @click="formatText('bold')" icon size="small" variant="text" title="Bold">
                    <v-icon>mdi-format-bold</v-icon>
                  </v-btn>
                  <v-btn
                    @click="formatText('italic')"
                    icon
                    size="small"
                    variant="text"
                    title="Italic"
                  >
                    <v-icon>mdi-format-italic</v-icon>
                  </v-btn>
                  <v-btn
                    @click="formatText('underline')"
                    icon
                    size="small"
                    variant="text"
                    title="Underline"
                  >
                    <v-icon>mdi-format-underline</v-icon>
                  </v-btn>
                  <v-btn
                    @click="formatText('strikeThrough')"
                    icon
                    size="small"
                    variant="text"
                    title="Strikethrough"
                  >
                    <v-icon>mdi-format-strikethrough</v-icon>
                  </v-btn>
                </div>

                <div class="toolbar-group">
                  <v-btn
                    @click="formatText('superscript')"
                    icon
                    size="small"
                    variant="text"
                    title="Superscript"
                  >
                    <v-icon>mdi-format-superscript</v-icon>
                  </v-btn>
                  <v-btn
                    @click="formatText('subscript')"
                    icon
                    size="small"
                    variant="text"
                    title="Subscript"
                  >
                    <v-icon>mdi-format-subscript</v-icon>
                  </v-btn>
                </div>

                <!-- Font Family -->
                <div class="toolbar-group">
                  <v-select
                    :items="[
                      'Arial',
                      'Times New Roman',
                      'Helvetica',
                      'Georgia',
                      'Verdana',
                      'Courier New',
                      'Comic Sans MS',
                    ]"
                    density="compact"
                    variant="outlined"
                    hide-details
                    placeholder="Font"
                    style="width: 120px"
                    @update:model-value="setFontFamily"
                  />
                </div>

                <!-- Font Size -->
                <div class="toolbar-group">
                  <v-select
                    :items="['1', '2', '3', '4', '5', '6', '7']"
                    density="compact"
                    variant="outlined"
                    hide-details
                    placeholder="Size"
                    style="width: 80px"
                    @update:model-value="setFontSize"
                  />
                </div>

                <!-- Text Color -->
                <div class="toolbar-group">
                  <v-menu>
                    <template v-slot:activator="{ props }">
                      <v-btn v-bind="props" icon size="small" variant="text" title="Text Color">
                        <v-icon>mdi-format-color-text</v-icon>
                      </v-btn>
                    </template>
                    <v-card class="color-picker">
                      <div class="color-grid">
                        <div
                          v-for="color in [
                            '#000000',
                            '#FF0000',
                            '#00FF00',
                            '#0000FF',
                            '#FFFF00',
                            '#FF00FF',
                            '#00FFFF',
                            '#FFA500',
                            '#800080',
                            '#008000',
                          ]"
                          :key="color"
                          class="color-option"
                          :style="{ backgroundColor: color }"
                          @click="setTextColor(color)"
                        ></div>
                      </div>
                    </v-card>
                  </v-menu>
                </div>

                <!-- Highlight Color -->
                <div class="toolbar-group">
                  <v-menu>
                    <template v-slot:activator="{ props }">
                      <v-btn
                        v-bind="props"
                        icon
                        size="small"
                        variant="text"
                        title="Highlight Color"
                      >
                        <v-icon>mdi-format-color-highlight</v-icon>
                      </v-btn>
                    </template>
                    <v-card class="color-picker">
                      <div class="color-grid">
                        <div
                          v-for="color in [
                            '#FFFF00',
                            '#FFE0B2',
                            '#C8E6C9',
                            '#BBDEFB',
                            '#F8BBD9',
                            '#D1C4E9',
                            '#FFCDD2',
                            '#F0F4C3',
                            '#E1F5FE',
                            '#FFF3E0',
                          ]"
                          :key="color"
                          class="color-option"
                          :style="{ backgroundColor: color }"
                          @click="setHighlightColor(color)"
                        ></div>
                      </div>
                    </v-card>
                  </v-menu>
                </div>

                <!-- Alignment -->
                <div class="toolbar-group">
                  <v-btn
                    @click="formatText('justifyLeft')"
                    icon
                    size="small"
                    variant="text"
                    title="Align Left"
                  >
                    <v-icon>mdi-format-align-left</v-icon>
                  </v-btn>
                  <v-btn
                    @click="formatText('justifyCenter')"
                    icon
                    size="small"
                    variant="text"
                    title="Align Center"
                  >
                    <v-icon>mdi-format-align-center</v-icon>
                  </v-btn>
                  <v-btn
                    @click="formatText('justifyRight')"
                    icon
                    size="small"
                    variant="text"
                    title="Align Right"
                  >
                    <v-icon>mdi-format-align-right</v-icon>
                  </v-btn>
                  <v-btn
                    @click="formatText('justifyFull')"
                    icon
                    size="small"
                    variant="text"
                    title="Justify"
                  >
                    <v-icon>mdi-format-align-justify</v-icon>
                  </v-btn>
                </div>

                <!-- Lists -->
                <div class="toolbar-group">
                  <v-btn
                    @click="formatText('insertUnorderedList')"
                    icon
                    size="small"
                    variant="text"
                    title="Bullet List"
                  >
                    <v-icon>mdi-format-list-bulleted</v-icon>
                  </v-btn>
                  <v-btn
                    @click="formatText('insertOrderedList')"
                    icon
                    size="small"
                    variant="text"
                    title="Numbered List"
                  >
                    <v-icon>mdi-format-list-numbered</v-icon>
                  </v-btn>
                </div>

                <!-- Links and Media -->
                <div class="toolbar-group">
                  <v-btn
                    @click="insertElement('link')"
                    icon
                    size="small"
                    variant="text"
                    title="Insert Link"
                  >
                    <v-icon>mdi-link</v-icon>
                  </v-btn>
                  <v-btn @click="uploadImage" icon size="small" variant="text" title="Upload Image">
                    <v-icon>mdi-upload</v-icon>
                  </v-btn>
                  <v-btn
                    @click="insertElement('image')"
                    icon
                    size="small"
                    variant="text"
                    title="Insert Image URL"
                  >
                    <v-icon>mdi-image</v-icon>
                  </v-btn>
                  <v-btn
                    @click="insertElement('video')"
                    icon
                    size="small"
                    variant="text"
                    title="Insert Video"
                  >
                    <v-icon>mdi-video</v-icon>
                  </v-btn>
                  <v-btn
                    @click="insertElement('table')"
                    icon
                    size="small"
                    variant="text"
                    title="Insert Table"
                  >
                    <v-icon>mdi-table</v-icon>
                  </v-btn>
                </div>

                <!-- Special Elements -->
                <div class="toolbar-group">
                  <v-btn
                    @click="formatText('insertHorizontalRule')"
                    icon
                    size="small"
                    variant="text"
                    title="Horizontal Line"
                  >
                    <v-icon>mdi-minus</v-icon>
                  </v-btn>
                  <v-btn
                    @click="formatText('insertUnorderedList')"
                    icon
                    size="small"
                    variant="text"
                    title="Emoji"
                  >
                    <v-icon>mdi-emoticon-happy</v-icon>
                  </v-btn>
                </div>

                <!-- Actions -->
                <div class="toolbar-group">
                  <v-btn @click="formatText('undo')" icon size="small" variant="text" title="Undo">
                    <v-icon>mdi-undo</v-icon>
                  </v-btn>
                  <v-btn @click="formatText('redo')" icon size="small" variant="text" title="Redo">
                    <v-icon>mdi-redo</v-icon>
                  </v-btn>
                  <v-btn
                    @click="toggleFullScreen"
                    icon
                    size="small"
                    variant="text"
                    title="Fullscreen"
                  >
                    <v-icon>mdi-fullscreen</v-icon>
                  </v-btn>
                </div>
              </div>

              <!-- Editor Content -->
              <div
                ref="editorRef"
                class="editor-content"
                :class="{ fullscreen: showFullScreen }"
                contenteditable="true"
                v-html="editorContent"
                @input="editorContent = $event.target.innerHTML"
                @mouseup="handleTextSelection"
                @keyup="handleTextSelection"
              ></div>

              <!-- Highlight Comment Dialog -->
              <v-dialog v-model="showHighlightComment" max-width="500px">
                <v-card>
                  <v-card-title>Add Comment to Highlighted Text</v-card-title>
                  <v-card-text>
                    <p><strong>Selected text:</strong> "{{ selectedText }}"</p>
                    <v-textarea
                      v-model="highlightComment"
                      placeholder="Add your comment about this highlighted text..."
                      rows="3"
                      variant="outlined"
                      hide-details
                    />
                  </v-card-text>
                  <v-card-actions>
                    <v-btn @click="cancelHighlightComment" variant="outlined">Cancel</v-btn>
                    <v-btn @click="addHighlightComment" color="primary">Add Comment</v-btn>
                  </v-card-actions>
                </v-card>
              </v-dialog>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons">
              <v-btn @click="toggleEdit" variant="outlined" class="edit-btn">
                {{ isEditing ? 'Save Changes' : 'Edit Submission' }}
              </v-btn>
              <v-btn variant="outlined" color="error" class="remove-btn"> Remove Submission </v-btn>
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

.project-title {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 24px;
  line-height: 1.2;
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

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
  min-height: 60px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 12px;
  border-right: 1px solid #e5e7eb;
  min-height: 36px;
}

.toolbar-group:last-child {
  border-right: none;
}

.color-picker {
  padding: 12px;
  min-width: 200px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.color-option {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.color-option:hover {
  border-color: #3b82f6;
  transform: scale(1.1);
}

.editor-content {
  min-height: 400px;
  padding: 20px;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  outline: none;
}

.editor-content.fullscreen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background: white;
  min-height: 100vh;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.edit-btn {
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
}

.remove-btn {
  background: #6b7280;
  color: white;
  border: 1px solid #6b7280;
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

  .editor-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-group {
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 8px;
    margin-bottom: 8px;
  }

  .toolbar-group:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
}

@media (max-width: 768px) {
  .project-container {
    padding: 16px !important;
  }

  .project-title {
    font-size: 24px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .comments-section {
    max-height: 500px;
  }
}
</style>
