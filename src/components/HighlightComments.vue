<template>
  <div class="highlight-comments-panel">
    <div class="panel-header">
      <h3>
        <v-icon class="mr-2">mdi-comment-text</v-icon>
        Highlight Comments
      </h3>
      <v-btn icon size="small" variant="text" @click="togglePanel" class="toggle-btn">
        <v-icon>{{ isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
      </v-btn>
    </div>

    <v-expand-transition>
      <div v-show="isExpanded" class="panel-content">
        <div v-if="comments.length === 0" class="no-comments">
          <v-icon size="48" color="grey-lighten-1">mdi-comment-outline</v-icon>
          <p>No highlight comments yet</p>
          <p class="text-caption">
            Select text in the editor and click the 💬 button to add comments
          </p>
        </div>

        <div v-else class="comments-list">
          <div
            v-for="comment in comments"
            :key="comment.id"
            class="comment-item"
            @click="highlightText(comment)"
          >
            <div class="comment-header">
              <span class="comment-author">{{ comment.author }}</span>
              <span class="comment-time">{{ formatTime(comment.timestamp) }}</span>
            </div>
            <div class="highlighted-text">"{{ comment.text }}"</div>
            <div class="comment-content">
              {{ comment.comment }}
            </div>
            <div class="comment-actions">
              <v-btn
                icon
                size="x-small"
                variant="text"
                @click.stop="deleteComment(comment.id)"
                class="delete-btn"
              >
                <v-icon size="small">mdi-delete</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  comments: {
    type: Array,
    default: () => [],
  },
  quillEditor: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['delete-comment', 'highlight-text', 'load-comments'])

const isExpanded = ref(false)

// Load highlight comments from localStorage on mount
onMounted(() => {
  if (props.projectId && props.projectType) {
    loadHighlightCommentsFromStorage()
  }
})

// Load highlight comments from localStorage
const loadHighlightCommentsFromStorage = () => {
  try {
    const key = `${props.projectType}_highlight_comments_${props.projectId}`
    const stored = localStorage.getItem(key)
    if (stored) {
      const storedComments = JSON.parse(stored)
      // Update the parent component's comments
      emit('load-comments', storedComments)
    }
  } catch (error) {
    console.error('Error loading highlight comments from storage:', error)
  }
}

const togglePanel = () => {
  isExpanded.value = !isExpanded.value
}

const highlightText = (comment) => {
  if (props.quillEditor && comment.range) {
    // Set selection to the highlighted text
    props.quillEditor.setSelection(comment.range.index, comment.range.length)
    // Scroll to the text
    props.quillEditor.scrollIntoView()
    emit('highlight-text', comment)
  }
}

const deleteComment = (commentId) => {
  if (confirm('Are you sure you want to delete this highlight comment?')) {
    emit('delete-comment', commentId)
  }
}

const formatTime = (timestamp) => {
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
</script>

<style scoped>
.highlight-comments-panel {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 24px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
  display: flex;
  align-items: center;
}

.toggle-btn {
  color: #6b7280 !important;
}

.panel-content {
  padding: 16px 20px;
}

.no-comments {
  text-align: center;
  padding: 32px 16px;
  color: #6b7280;
}

.no-comments p {
  margin: 8px 0 0 0;
  font-size: 14px;
}

.comments-list {
  max-height: 400px;
  overflow-y: auto;
}

.comment-item {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.comment-item:hover {
  background: #f8fafc;
  border-color: #d1d5db;
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.comment-time {
  color: #6b7280;
  font-size: 12px;
}

.highlighted-text {
  background: #fef3c7;
  padding: 6px 8px;
  border-radius: 4px;
  font-style: italic;
  color: #92400e;
  font-size: 13px;
  margin-bottom: 8px;
  border-left: 3px solid #f59e0b;
}

.comment-content {
  color: #374151;
  font-size: 14px;
  line-height: 1.5;
}

.comment-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.comment-item:hover .comment-actions {
  opacity: 1;
}

.delete-btn {
  color: #ef4444 !important;
}

.delete-btn:hover {
  background: #fef2f2 !important;
}

/* Scrollbar styling */
.comments-list::-webkit-scrollbar {
  width: 6px;
}

.comments-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.comments-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.comments-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
