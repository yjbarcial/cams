<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  getProjectHistory,
  getProjectVersion,
  restoreProjectVersion,
  addVersionComment,
  compareVersions,
  getProjectStatistics,
  deleteProjectVersion,
  getActiveProjectHistory,
} from '@/services/supabaseProjectHistory.js'

const props = defineProps({
  projectId: {
    type: [String, Number],
    required: true,
  },
  projectType: {
    type: String,
    required: true,
  },
  showComments: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['version-restored', 'version-deleted'])

// State
const history = ref([])
const selectedVersion = ref(null)
const selectedVersions = ref([])
const showComparison = ref(false)
const newComment = ref('')
const loading = ref(false)
const error = ref('')
const statistics = ref({})

// Notification system
const showNotificationCard = ref(false)
const notificationMessage = ref('')
const notificationType = ref('success')

// Confirmation dialog
const showConfirmDialog = ref(false)
const confirmMessage = ref('')
const confirmAction = ref(null)
const pendingVersionId = ref(null)

// Computed
const activeHistory = computed(() => history.value.filter((v) => !v.isDeleted))
const currentVersion = computed(() => activeHistory.value.find((v) => v.isActive))
const hasSelection = computed(() => selectedVersions.value.length > 0)
const canCompare = computed(() => selectedVersions.value.length === 2)

// Methods
const loadHistory = async () => {
  try {
    loading.value = true
    history.value = await getActiveProjectHistory(props.projectType, props.projectId)
    statistics.value = await getProjectStatistics(props.projectType, props.projectId)
  } catch (err) {
    error.value = 'Failed to load project history'
    console.error('Error loading history:', err)
  } finally {
    loading.value = false
  }
}

const selectVersion = (version) => {
  if (selectedVersions.value.includes(version.id)) {
    selectedVersions.value = selectedVersions.value.filter((id) => id !== version.id)
  } else if (selectedVersions.value.length < 2) {
    selectedVersions.value.push(version.id)
  } else {
    selectedVersions.value = [version.id]
  }
}

const compareSelectedVersions = () => {
  if (!canCompare.value) return

  const [version1Id, version2Id] = selectedVersions.value
  const version1 = history.value.find((v) => v.id === version1Id)
  const version2 = history.value.find((v) => v.id === version2Id)

  if (version1 && version2) {
    selectedVersion.value = { version1, version2, comparison: compareVersions(version1, version2) }
    showComparison.value = true
  }
}

const showNotification = (message, type = 'success') => {
  notificationMessage.value = message
  notificationType.value = type
  showNotificationCard.value = true

  // Auto-hide after 3 seconds
  setTimeout(() => {
    showNotificationCard.value = false
  }, 3000)
}

const showConfirm = (message, action) => {
  confirmMessage.value = message
  confirmAction.value = action
  showConfirmDialog.value = true
}

const handleConfirm = () => {
  if (confirmAction.value) {
    confirmAction.value()
  }
  showConfirmDialog.value = false
  confirmAction.value = null
}

const cancelConfirm = () => {
  showConfirmDialog.value = false
  confirmAction.value = null
  pendingVersionId.value = null
}

const restoreVersion = (versionId) => {
  pendingVersionId.value = versionId
  showConfirm(
    'Are you sure you want to restore this version? This will create a new version with the restored content.',
    async () => {
      try {
        loading.value = true
        const restoredProject = await restoreProjectVersion(
          props.projectType,
          props.projectId,
          versionId,
        )
        emit('version-restored', restoredProject)
        await loadHistory() // Reload history
        showNotification('Version restored successfully', 'success')
      } catch (err) {
        showNotification('Failed to restore version', 'error')
        console.error('Error restoring version:', err)
      } finally {
        loading.value = false
        pendingVersionId.value = null
      }
    },
  )
}

const addComment = async (versionId) => {
  if (!newComment.value.trim()) return

  try {
    await addVersionComment(
      props.projectType,
      props.projectId,
      versionId,
      newComment.value,
      'Current User',
    )
    newComment.value = ''
    await loadHistory() // Reload to get updated comments
    showNotification('Comment added successfully', 'success')
  } catch (err) {
    showNotification('Failed to add comment', 'error')
    console.error('Error adding comment:', err)
  }
}

const deleteVersion = (versionId) => {
  pendingVersionId.value = versionId
  showConfirm(
    'Are you sure you want to delete this version? This action cannot be undone.',
    async () => {
      try {
        const success = await deleteProjectVersion(props.projectType, props.projectId, versionId)
        if (success) {
          emit('version-deleted', versionId)
          await loadHistory() // Reload history
          showNotification('Version deleted successfully', 'success')
        } else {
          showNotification('Failed to delete version', 'error')
        }
      } catch (err) {
        showNotification('Failed to delete version', 'error')
        console.error('Error deleting version:', err)
      } finally {
        pendingVersionId.value = null
      }
    },
  )
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  })
}

const formatFullDate = (dateString) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

const getAvatarColor = (name) => {
  if (!name) return '#6b7280'
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#f97316',
    '#6366f1',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const getVersionTypeColor = (type) => {
  const colors = {
    draft: 'grey',
    published: 'green',
    major: 'blue',
    minor: 'orange',
    restoration: 'purple',
  }
  return colors[type] || 'grey'
}

const getVersionTypeIcon = (type) => {
  const icons = {
    draft: 'mdi-file-document-outline',
    published: 'mdi-check-circle',
    major: 'mdi-star',
    minor: 'mdi-circle-small',
    restoration: 'mdi-backup-restore',
  }
  return icons[type] || 'mdi-file-document-outline'
}

// Lifecycle
onMounted(() => {
  loadHistory()
})

// Watch for prop changes
watch([() => props.projectId, () => props.projectType], () => {
  loadHistory()
})
</script>

<template>
  <div class="project-history">
    <!-- Header Section -->
    <div class="history-header">
      <div class="header-title">
        <h3>Project History</h3>
      </div>
      <div class="header-actions">
        <v-btn
          v-if="canCompare"
          @click="compareSelectedVersions"
          size="small"
          color="primary"
          variant="flat"
          prepend-icon="mdi-compare"
        >
          Compare
        </v-btn>
        <v-btn @click="loadHistory" size="small" variant="text" icon :loading="loading">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Statistics Bar -->
    <div v-if="statistics.totalVersions > 0" class="history-stats">
      <div class="stat-item">
        <v-icon size="small" color="primary">mdi-file-document-multiple</v-icon>
        <span>{{ statistics.totalVersions }} versions</span>
      </div>
      <div class="stat-item">
        <v-icon size="small" color="secondary">mdi-comment-text-multiple</v-icon>
        <span>{{ statistics.totalComments }} comments</span>
      </div>
      <div class="stat-item">
        <v-icon size="small" color="info">mdi-text</v-icon>
        <span>{{ statistics.averageWordsPerVersion }} avg words</span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && history.length === 0" class="loading-state">
      <v-progress-circular indeterminate color="primary" />
      <p>Loading project history...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="history.length === 0" class="empty-state">
      <v-icon size="48" color="grey">mdi-history</v-icon>
      <p>No project history available</p>
    </div>

    <!-- History List - Google Docs Style -->
    <div v-else class="history-list">
      <div
        v-for="version in activeHistory"
        :key="version.id"
        class="version-item"
        :class="{
          selected: selectedVersions.includes(version.id),
          active: version.isActive,
          current: version.id === currentVersion?.id,
        }"
        @click="selectVersion(version)"
      >
        <!-- Version Timeline (Google Docs style) -->
        <div class="version-timeline">
          <div class="timeline-line" v-if="!version.isActive"></div>
          <div class="version-avatar" :style="{ backgroundColor: getAvatarColor(version.author) }">
            {{ getInitials(version.author) }}
          </div>
        </div>

        <!-- Version Content -->
        <div class="version-content">
          <!-- Version Header -->
          <div class="version-header">
            <div class="version-main-info">
              <div class="version-author-row">
                <span class="version-author-name">{{ version.author }}</span>
                <v-chip
                  v-if="version.isActive"
                  size="x-small"
                  color="success"
                  variant="flat"
                  class="current-badge"
                >
                  Current
                </v-chip>
              </div>
              <div class="version-description">
                <v-icon size="small" :color="getVersionTypeColor(version.versionType)" class="mr-1">
                  {{ getVersionTypeIcon(version.versionType) }}
                </v-icon>
                <span>{{ version.changeDescription }}</span>
              </div>
            </div>
            <div class="version-meta-actions">
              <div class="version-time-info">
                <v-icon size="x-small" class="mr-1">mdi-clock-outline</v-icon>
                <span class="version-time">{{ formatDate(version.timestamp) }}</span>
              </div>
              <div class="version-actions">
                <v-btn
                  v-if="!version.isActive"
                  @click.stop="restoreVersion(version.id)"
                  size="x-small"
                  color="primary"
                  variant="text"
                  class="action-btn"
                  icon
                >
                  <v-icon size="small">mdi-restore</v-icon>
                </v-btn>
                <v-btn
                  @click.stop="deleteVersion(version.id)"
                  size="x-small"
                  color="error"
                  variant="text"
                  class="action-btn"
                  icon
                >
                  <v-icon size="small">mdi-delete-outline</v-icon>
                </v-btn>
              </div>
            </div>
          </div>

          <!-- Version Metadata -->
          <div class="version-metadata">
            <div class="metadata-badge">
              <v-icon size="x-small" class="mr-1">mdi-text</v-icon>
              <span>{{ version.data.metadata?.wordCount || 0 }} words</span>
            </div>
            <div class="metadata-badge">
              <v-icon size="x-small" class="mr-1">mdi-file-document-outline</v-icon>
              <span>{{ version.data.status || 'Draft' }}</span>
            </div>
            <div v-if="version.comments.length > 0" class="metadata-badge">
              <v-icon size="x-small" class="mr-1">mdi-comment-text-outline</v-icon>
              <span>{{ version.comments.length }}</span>
            </div>
          </div>

          <!-- Comments Section -->
          <div v-if="showComments && version.comments.length > 0" class="version-comments">
            <div class="comments-header">
              <v-icon size="small" class="mr-1">mdi-comment-text-outline</v-icon>
              <span>Comments ({{ version.comments.length }})</span>
            </div>
            <div v-for="comment in version.comments" :key="comment.id" class="comment-item">
              <div class="comment-header">
                <span class="comment-author">{{ comment.author }}</span>
                <span class="comment-time">{{ formatDate(comment.timestamp) }}</span>
              </div>
              <div class="comment-content">{{ comment.content }}</div>
            </div>
          </div>

          <!-- Add Comment -->
          <div v-if="showComments" class="add-comment">
            <v-textarea
              v-model="newComment"
              placeholder="Add a comment..."
              rows="2"
              variant="outlined"
              density="compact"
              hide-details
              class="comment-input"
              @keydown.enter.ctrl="addComment(version.id)"
            />
            <v-btn
              @click="addComment(version.id)"
              size="small"
              color="primary"
              variant="flat"
              :disabled="!newComment.trim()"
              class="comment-submit-btn"
            >
              Add
            </v-btn>
          </div>
        </div>
        <!-- End version-content -->
      </div>
      <!-- End version-item -->
    </div>
    <!-- End history-list -->

    <!-- Version Comparison Dialog -->
    <v-dialog v-model="showComparison" max-width="1200px">
      <v-card v-if="selectedVersion">
        <v-card-title>
          <v-icon class="mr-2">mdi-compare</v-icon>
          Version Comparison
        </v-card-title>

        <v-card-text>
          <div class="comparison-header">
            <div class="version-info">
              <h4>Version {{ selectedVersion.version1.versionNumber }}</h4>
              <p>
                {{ selectedVersion.version1.author }} -
                {{ formatDate(selectedVersion.version1.timestamp) }}
              </p>
            </div>
            <div class="vs-divider">
              <v-icon>mdi-arrow-left-right</v-icon>
            </div>
            <div class="version-info">
              <h4>Version {{ selectedVersion.version2.versionNumber }}</h4>
              <p>
                {{ selectedVersion.version2.author }} -
                {{ formatDate(selectedVersion.version2.timestamp) }}
              </p>
            </div>
          </div>

          <div v-if="selectedVersion.comparison.hasChanges" class="changes-list">
            <h5>Changes Detected:</h5>
            <ul>
              <li v-for="field in selectedVersion.comparison.changedFields" :key="field">
                {{ field.charAt(0).toUpperCase() + field.slice(1) }}
              </li>
            </ul>
          </div>

          <div v-else class="no-changes">
            <v-icon color="success">mdi-check-circle</v-icon>
            <p>No differences found between these versions</p>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn @click="showComparison = false" color="primary"> Close </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Notification Card -->
    <transition name="slide-down">
      <v-card
        v-if="showNotificationCard"
        class="notification-card"
        :class="`notification-${notificationType}`"
        elevation="4"
      >
        <div class="notification-content">
          <v-icon
            :color="
              notificationType === 'success'
                ? 'success'
                : notificationType === 'error'
                  ? 'error'
                  : 'warning'
            "
            size="24"
            class="notification-icon"
          >
            {{
              notificationType === 'success'
                ? 'mdi-check-circle'
                : notificationType === 'error'
                  ? 'mdi-alert-circle'
                  : 'mdi-alert'
            }}
          </v-icon>
          <span class="notification-message">{{ notificationMessage }}</span>
          <v-btn
            icon
            size="small"
            variant="text"
            @click="showNotificationCard = false"
            class="notification-close"
          >
            <v-icon size="20">mdi-close</v-icon>
          </v-btn>
        </div>
      </v-card>
    </transition>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="500px" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="warning" class="mr-2">mdi-alert</v-icon>
          <span>Confirm Action</span>
        </v-card-title>
        <v-card-text>
          <p class="text-body-1">{{ confirmMessage }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelConfirm">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="handleConfirm">Confirm</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.project-history {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-bottom: 1px solid #e5e7eb;
}

.header-title {
  display: flex;
  align-items: center;
}

.header-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.history-stats {
  display: flex;
  gap: 24px;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #6b7280;
}

.loading-state p,
.empty-state p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

.history-list {
  max-height: 500px; /* Adjust this value as needed */
  overflow-y: auto;
  padding: 16px;
  background: #fafbfc;
}

.history-list::-webkit-scrollbar {
  width: 8px;
}

.history-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.history-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.version-item {
  display: flex;
  padding: 0;
  margin-bottom: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  background: #ffffff;
  overflow: hidden;
}

.version-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.version-item.selected {
  border-color: #3b82f6;
  border-left: 4px solid #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.version-item.active {
  border-color: #10b981;
}

.version-item.current {
  border-left: 4px solid #10b981;
  border-color: #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.version-timeline {
  position: relative;
  width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  background: #fafbfc;
  border-right: 1px solid #f3f4f6;
  flex-shrink: 0;
}

.timeline-line {
  width: 2px;
  height: calc(100% - 20px);
  background: #e5e7eb;
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 0;
}

.version-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 16px;
  position: relative;
  z-index: 1;
  border: 3px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.version-content {
  flex: 1;
  min-width: 0;
  padding: 20px 24px;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 16px;
}

.version-main-info {
  flex: 1;
  min-width: 0;
}

.version-author-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.version-author-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 15px;
}

.current-badge {
  font-size: 11px;
  height: 20px;
  padding: 0 8px;
}

.version-description {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 6px;
}

.version-meta-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.version-time-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.version-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.version-item:hover .version-actions,
.version-item.selected .version-actions,
.version-item.current .version-actions {
  opacity: 1;
}

.action-btn {
  min-width: auto;
}

.version-metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
  align-items: center;
}

.metadata-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f3f4f6;
  border-radius: 12px;
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.version-comments {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.comments-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}

.comment-item {
  margin-bottom: 10px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 3px solid #e5e7eb;
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.comment-author {
  font-weight: 600;
  font-size: 12px;
  color: #1f2937;
}

.comment-time {
  font-size: 11px;
  color: #9ca3af;
}

.comment-content {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
}

.add-comment {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.comment-input {
  flex: 1;
}

.comment-submit-btn {
  margin-top: 4px;
  min-width: 80px;
}

.comparison-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.version-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #1f2937;
}

.version-info p {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
}

.vs-divider {
  padding: 0 20px;
  color: #6b7280;
}

.changes-list {
  margin-top: 16px;
}

.changes-list h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #1f2937;
}

.changes-list ul {
  margin: 0;
  padding-left: 20px;
}

.changes-list li {
  font-size: 13px;
  color: #374151;
  margin-bottom: 4px;
}

.no-changes {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  color: #10b981;
}

.no-changes p {
  margin: 8px 0 0 0;
  font-size: 14px;
}

/* Notification Card Styles */
.notification-card {
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

/* Slide down animation */
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

/* Responsive Design */
@media (max-width: 768px) {
  .version-header {
    flex-direction: column;
    gap: 8px;
  }

  .version-actions {
    align-self: flex-start;
  }

  .comparison-header {
    flex-direction: column;
    gap: 16px;
  }

  .vs-divider {
    transform: rotate(90deg);
  }
}
</style>
