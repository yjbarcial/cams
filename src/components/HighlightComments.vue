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
        <div v-if="unresolvedComments.length === 0" class="no-comments">
          <v-icon size="48" color="grey-lighten-1">mdi-comment-outline</v-icon>
          <p>{{ comments.length === 0 ? 'No highlight comments yet' : 'All comments resolved' }}</p>
          <p class="text-caption">
            {{
              comments.length === 0
                ? 'Select text in the editor and click the 💬 button to add comments'
                : 'All comments have been marked as done'
            }}
          </p>
        </div>

        <div v-else class="comments-list">
          <div
            v-for="comment in unresolvedComments"
            :key="comment.id"
            class="comment-item"
            @click="highlightText(comment)"
          >
            <!-- Resolve checkbox (Google Docs style) -->
            <div class="comment-resolve-section">
              <v-btn
                icon
                size="small"
                variant="text"
                @click.stop="toggleResolve(comment.id)"
                class="resolve-btn"
                :class="{ resolved: comment.resolved }"
                :title="comment.resolved ? 'Mark as unresolved' : 'Mark as resolved'"
              >
                <v-icon :color="comment.resolved ? 'success' : 'grey'" size="20">
                  {{ comment.resolved ? 'mdi-check-circle' : 'mdi-check-circle-outline' }}
                </v-icon>
              </v-btn>
            </div>

            <div class="comment-body">
              <div class="comment-header">
                <span class="comment-author">{{ comment.author }}</span>
                <span class="comment-time">{{ formatTime(comment.timestamp) }}</span>
              </div>
              <div class="highlighted-text">"{{ comment.text }}"</div>
              <div class="comment-content" :class="{ 'resolved-text': comment.resolved }">
                {{ comment.comment }}
              </div>
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

const emit = defineEmits(['delete-comment', 'highlight-text', 'load-comments', 'resolve-comment'])

const isExpanded = ref(false)

// Filter out resolved comments (they are "done" and should be hidden)
const unresolvedComments = computed(() => {
  return props.comments.filter((comment) => !comment.resolved)
})

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

const toggleResolve = (commentId) => {
  emit('resolve-comment', commentId)
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(to bottom, #ffffff, #f8fafc);
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1f2937;
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
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.comment-item:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transform: translateY(-1px);
}

.comment-item.comment-resolved {
  opacity: 0.75;
  background: #f0fdf4;
  border-color: #86efac;
  border-left: 3px solid #10b981;
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-resolve-section {
  flex-shrink: 0;
  margin-top: 2px;
  padding-top: 2px;
}

.resolve-btn {
  color: #6b7280 !important;
  transition: all 0.2s ease;
  border-radius: 50%;
  width: 32px;
  height: 32px;
}

.resolve-btn:hover {
  background: #f3f4f6 !important;
  transform: scale(1.1);
}

.resolve-btn.resolved {
  color: #10b981 !important;
}

.resolve-btn.resolved:hover {
  background: #d1fae5 !important;
  color: #059669 !important;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.comment-author {
  font-weight: 600;
  color: #1f2937;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.comment-author::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
  display: inline-block;
}

.comment-time {
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
}

.highlighted-text {
  background: linear-gradient(to right, #fef3c7, #fde68a);
  padding: 8px 10px;
  border-radius: 6px;
  font-style: italic;
  color: #78350f;
  font-size: 13px;
  margin-bottom: 10px;
  border-left: 3px solid #f59e0b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-weight: 500;
}

.comment-content {
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  padding: 8px 0;
  word-wrap: break-word;
}

.comment-content.resolved-text {
  text-decoration: line-through;
  color: #9ca3af;
  opacity: 0.7;
}

.comment-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  opacity: 0;
  transition: opacity 0.2s ease;
  display: flex;
  gap: 4px;
}

.comment-item:hover .comment-actions {
  opacity: 1;
}

.delete-btn {
  color: #ef4444 !important;
  width: 28px;
  height: 28px;
}

.delete-btn:hover {
  background: #fef2f2 !important;
  transform: scale(1.1);
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
