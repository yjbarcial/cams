<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Start writing...',
  },
  readOnly: {
    type: Boolean,
    default: false,
  },
  height: {
    type: String,
    default: '400px',
  },
  projectId: {
    type: [String, Number],
    default: null,
  },
  projectType: {
    type: String,
    default: 'magazine',
  },
})

const emit = defineEmits([
  'update:modelValue',
  'text-change',
  'selection-change',
  'highlight-comments-updated',
])

const editorRef = ref(null)
const quill = ref(null)
const showHighlightComment = ref(false)
const highlightComment = ref('')
const selectedText = ref('')
const currentSelection = ref(null)
const highlightComments = ref([])

// Quill configuration
const quillOptions = {
  theme: 'snow',
  placeholder: props.placeholder,
  readOnly: props.readOnly,
  modules: {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      [{ font: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ script: 'sub' }, { script: 'super' }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean'],
    ],
    history: {
      delay: 2000,
      maxStack: 500,
      userOnly: true,
    },
  },
}

// Load Quill from CDN
const loadQuill = () => {
  return new Promise((resolve, reject) => {
    // Check if Quill is already loaded
    if (window.Quill) {
      resolve(window.Quill)
      return
    }

    // Load Quill CSS
    const cssLink = document.createElement('link')
    cssLink.rel = 'stylesheet'
    cssLink.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css'
    document.head.appendChild(cssLink)

    // Load Quill JS
    const script = document.createElement('script')
    script.src = 'https://cdn.quilljs.com/1.3.6/quill.min.js'
    script.onload = () => {
      if (window.Quill) {
        resolve(window.Quill)
      } else {
        reject(new Error('Quill failed to load'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load Quill script'))
    document.head.appendChild(script)
  })
}

// Initialize Quill editor
onMounted(async () => {
  try {
    const Quill = await loadQuill()

    await nextTick()

    if (editorRef.value) {
      quill.value = new Quill(editorRef.value, quillOptions)

      // Set initial content
      if (props.modelValue) {
        quill.value.root.innerHTML = props.modelValue
      }

      // Respect readOnly prop at runtime
      quill.value.enable(!props.readOnly)

      // Listen for text changes
      quill.value.on('text-change', (delta, oldDelta, source) => {
        if (source === 'user') {
          const html = quill.value.root.innerHTML
          emit('update:modelValue', html)
          emit('text-change', delta, oldDelta, source)
        }
      })

      // Listen for selection changes
      quill.value.on('selection-change', (range, oldRange, source) => {
        emit('selection-change', range, oldRange, source)

        if (range && range.length > 0) {
          const text = quill.value.getText(range.index, range.length)
          if (text.trim()) {
            selectedText.value = text.trim()
            currentSelection.value = range
          }
        }
      })

      // Add custom highlight comment functionality
      addHighlightCommentHandler()

      // Add custom toolbar handlers (image upload)
      const toolbar = quill.value.getModule('toolbar')
      if (toolbar) {
        toolbar.addHandler('image', () => selectLocalImage())
      }
    }
  } catch (error) {
    console.error('Failed to initialize Quill editor:', error)
    // Fallback to basic textarea
    if (editorRef.value) {
      editorRef.value.innerHTML = `
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
          <p style="color: #ef4444; margin: 0;">Quill editor failed to load. Please check your internet connection.</p>
          <textarea 
            style="width: 100%; min-height: 300px; margin-top: 10px; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px;"
            placeholder="Fallback text editor - ${props.placeholder}"
          >${props.modelValue}</textarea>
        </div>
      `
    }
  }
})

// Watch for external content changes
watch(
  () => props.modelValue,
  (newValue) => {
    if (quill.value && quill.value.root.innerHTML !== newValue) {
      quill.value.root.innerHTML = newValue
    }
  },
)

// Load highlight comments from storage on mount
onMounted(() => {
  loadHighlightCommentsFromStorage()
})

// Add highlight comment handler
const addHighlightCommentHandler = () => {
  if (!quill.value) return

  // Add custom button to toolbar
  const toolbar = quill.value.getModule('toolbar')
  if (!toolbar || !toolbar.container) return

  const container = toolbar.container

  // Create highlight comment button
  const highlightButton = document.createElement('button')
  highlightButton.innerHTML = '💬'
  highlightButton.title = 'Add comment to selected text'
  highlightButton.className = 'ql-comment'
  highlightButton.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    margin: 0 2px;
    border-radius: 3px;
    font-size: 16px;
    line-height: 1;
  `

  highlightButton.addEventListener('click', (e) => {
    e.preventDefault()
    const range = quill.value.getSelection()
    if (range && range.length > 0) {
      const text = quill.value.getText(range.index, range.length)
      if (text.trim()) {
        selectedText.value = text.trim()
        currentSelection.value = range
        showHighlightComment.value = true
      }
    } else {
      // Show message if no text is selected
      alert('Please select some text to add a comment.')
    }
  })

  // Insert button after color controls
  const colorGroup = container.querySelector('.ql-color')
  if (colorGroup && colorGroup.parentNode) {
    colorGroup.parentNode.insertBefore(highlightButton, colorGroup.nextSibling)
  } else {
    // Fallback: add to the end of toolbar
    container.appendChild(highlightButton)
  }
}

// Add highlight comment
const addHighlightComment = () => {
  if (highlightComment.value.trim() && currentSelection.value && quill.value) {
    const range = currentSelection.value

    // Apply highlight formatting
    quill.value.formatText(range.index, range.length, 'background', '#ffeb3b')

    // Store comment
    const comment = {
      id: highlightComments.value.length + 1,
      text: selectedText.value,
      comment: highlightComment.value,
      author: 'Current User',
      timestamp: new Date().toLocaleString(),
      range: {
        index: range.index,
        length: range.length,
      },
    }

    highlightComments.value.push(comment)

    // Save to localStorage
    saveHighlightCommentsToStorage()

    // Emit the updated comments
    emit('highlight-comments-updated', highlightComments.value)

    // Clear form
    highlightComment.value = ''
    showHighlightComment.value = false
    selectedText.value = ''
    currentSelection.value = null

    // Add visual indicator and tooltip
    const span = document.createElement('span')
    span.style.backgroundColor = '#ffeb3b'
    span.style.position = 'relative'
    span.title = `Comment: ${comment.comment}`
    span.setAttribute('data-comment-id', comment.id)

    // Apply the highlight with comment data
    quill.value.formatText(range.index, range.length, 'background', '#ffeb3b')

    // Add a small comment indicator
    const commentIndicator = document.createElement('span')
    commentIndicator.innerHTML = '💬'
    commentIndicator.style.cssText = `
      position: absolute;
      top: -2px;
      right: -2px;
      font-size: 10px;
      background: #3b82f6;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    `
    commentIndicator.title = `Comment: ${comment.comment}`

    // Try to add the indicator to the highlighted text
    try {
      const highlightedElement = quill.value.getLeaf(range.index)[0]
      if (highlightedElement && highlightedElement.domNode) {
        highlightedElement.domNode.style.position = 'relative'
        highlightedElement.domNode.appendChild(commentIndicator)
      }
    } catch (e) {
      console.log('Could not add comment indicator:', e)
    }
  }
}

// Cancel highlight comment
const cancelHighlightComment = () => {
  showHighlightComment.value = false
  highlightComment.value = ''
  selectedText.value = ''
  currentSelection.value = null
}

// Get highlight comments
const getHighlightComments = () => {
  return highlightComments.value
}

// Delete highlight comment
const deleteHighlightComment = (commentId) => {
  const index = highlightComments.value.findIndex((c) => c.id === commentId)
  if (index !== -1) {
    highlightComments.value.splice(index, 1)
    saveHighlightCommentsToStorage()
    emit('highlight-comments-updated', highlightComments.value)
    return true
  }
  return false
}

// Clear all highlight comments
const clearHighlightComments = () => {
  highlightComments.value = []
  saveHighlightCommentsToStorage()
  emit('highlight-comments-updated', highlightComments.value)
}

// localStorage functions for highlight comments
const getHighlightCommentsKey = () => {
  if (!props.projectId) return null
  return `${props.projectType}_highlight_comments_${props.projectId}`
}

const loadHighlightCommentsFromStorage = () => {
  try {
    const key = getHighlightCommentsKey()
    if (!key) return

    const stored = localStorage.getItem(key)
    if (stored) {
      highlightComments.value = JSON.parse(stored)
      console.log('Loaded highlight comments from storage:', highlightComments.value)
    }
  } catch (error) {
    console.error('Error loading highlight comments from storage:', error)
  }
}

const saveHighlightCommentsToStorage = () => {
  try {
    const key = getHighlightCommentsKey()
    if (!key) return

    localStorage.setItem(key, JSON.stringify(highlightComments.value))
    console.log('Saved highlight comments to storage:', highlightComments.value)
  } catch (error) {
    console.error('Error saving highlight comments to storage:', error)
  }
}

// Get editor content
const getContent = () => {
  return quill.value ? quill.value.root.innerHTML : ''
}

// Set editor content
const setContent = (content) => {
  if (quill.value) {
    quill.value.root.innerHTML = content
  }
}

// Focus editor
const focus = () => {
  if (quill.value) {
    quill.value.focus()
  }
}

// React to readOnly prop changes and external v-model updates
watch(
  () => props.readOnly,
  (ro) => {
    if (quill.value) quill.value.enable(!ro)
  },
)

// Local image upload handler
const selectLocalImage = () => {
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', 'image/*')
  input.onchange = () => {
    const file = input.files && input.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const range = quill.value.getSelection(true)
      quill.value.insertEmbed(range ? range.index : 0, 'image', reader.result, 'user')
      if (range) quill.value.setSelection(range.index + 1, 0)
    }
    reader.readAsDataURL(file)
  }
  input.click()
}

// Expose methods
defineExpose({
  getContent,
  setContent,
  focus,
  quill,
  getHighlightComments,
  deleteHighlightComment,
  clearHighlightComments,
})
</script>

<template>
  <div class="quill-editor-container">
    <!-- Quill Editor -->
    <div ref="editorRef" class="quill-editor" :style="{ height: height }"></div>

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
</template>

<style scoped>
.quill-editor-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.quill-editor {
  background: white;
}

/* Custom Quill styles */
:deep(.ql-toolbar) {
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  padding: 12px;
}

:deep(.ql-container) {
  border: none;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.ql-editor) {
  padding: 20px;
  min-height: 300px;
  color: #374151;
}

:deep(.ql-editor.ql-blank::before) {
  color: #9ca3af;
  font-style: normal;
}

/* Toolbar button styles */
:deep(.ql-toolbar .ql-formats) {
  margin-right: 15px;
}

:deep(.ql-toolbar button) {
  padding: 5px;
  margin: 0 2px;
  border-radius: 3px;
  transition: background-color 0.2s ease;
}

:deep(.ql-toolbar button:hover) {
  background-color: #e5e7eb;
}

:deep(.ql-toolbar button.ql-active) {
  background-color: #3b82f6;
  color: white;
}

/* Custom comment button styles */
:deep(.ql-toolbar .ql-comment) {
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  padding: 5px !important;
  margin: 0 2px !important;
  border-radius: 3px !important;
  font-size: 16px !important;
  line-height: 1 !important;
  transition: background-color 0.2s ease !important;
}

:deep(.ql-toolbar .ql-comment:hover) {
  background-color: #e5e7eb !important;
}

/* Highlighted text with comments */
:deep(.ql-editor span[data-comment-id]) {
  position: relative;
  background-color: #ffeb3b !important;
  cursor: pointer;
}

:deep(.ql-editor span[data-comment-id]:hover) {
  background-color: #ffd54f !important;
}

/* Color picker styles */
:deep(.ql-color .ql-picker-options) {
  width: 200px;
  padding: 10px;
}

:deep(.ql-color .ql-picker-item) {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  margin: 2px;
}

/* Responsive design */
@media (max-width: 768px) {
  :deep(.ql-toolbar) {
    padding: 8px;
  }

  :deep(.ql-toolbar .ql-formats) {
    margin-right: 10px;
  }

  :deep(.ql-editor) {
    padding: 15px;
    min-height: 250px;
  }
}
</style>
