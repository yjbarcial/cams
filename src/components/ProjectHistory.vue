<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  restoreProjectVersion,
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
})

const emit = defineEmits(['version-restored'])

// State
const history = ref([])
const loading = ref(false)
const error = ref('')
const selectedVersion = ref(null)
const showVersionDialog = ref(false)
const expandedChanges = ref(new Set()) // Track which change groups are expanded

// Notification system
const showNotificationCard = ref(false)
const notificationMessage = ref('')
const notificationType = ref('success')

// Confirmation dialog
const showConfirmDialog = ref(false)
const confirmMessage = ref('')
const confirmAction = ref(null)

// Computed
const activeHistory = computed(() => history.value.filter((v) => !v.isDeleted))
const currentVersion = computed(() => activeHistory.value.find((v) => v.isActive))

// Methods
const loadHistory = async () => {
  try {
    loading.value = true
    history.value = await getActiveProjectHistory(props.projectType, props.projectId)
  } catch (err) {
    error.value = 'Failed to load version history'
    console.error('Error loading history:', err)
  } finally {
    loading.value = false
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
}

const restoreVersion = (versionId) => {
  showConfirm(
    'Restore this version? This will create a new version with the restored content.',
    async () => {
      try {
        loading.value = true
        const restoredProject = await restoreProjectVersion(
          props.projectType,
          props.projectId,
          versionId,
        )
        emit('version-restored', restoredProject)
        await loadHistory()
        showNotification('Version restored successfully', 'success')
      } catch (err) {
        showNotification('Failed to restore version', 'error')
        console.error('Error restoring version:', err)
      } finally {
        loading.value = false
      }
    },
  )
}

const viewVersion = (version) => {
  selectedVersion.value = version
  showVersionDialog.value = true
}

const closeVersionDialog = () => {
  showVersionDialog.value = false
  selectedVersion.value = null
  expandedChanges.value.clear() // Clear expanded state when closing
}

const toggleChangeGroup = (groupKey) => {
  if (expandedChanges.value.has(groupKey)) {
    expandedChanges.value.delete(groupKey)
  } else {
    expandedChanges.value.add(groupKey)
  }
}

const isChangeExpanded = (groupKey) => {
  return expandedChanges.value.has(groupKey)
}

// Get changes made in this version compared to previous
const getVersionChanges = (version) => {
  const currentIndex = activeHistory.value.findIndex((v) => v.id === version.id)
  if (currentIndex === -1 || currentIndex === activeHistory.value.length - 1) {
    return { added: [], modified: [], removed: [], isFirstVersion: true }
  }

  const previousVersion = activeHistory.value[currentIndex + 1]
  const currentData = version.data || {}
  const previousData = previousVersion.data || {}

  const changes = {
    added: [],
    modified: [],
    removed: [],
    isFirstVersion: false,
  }

  // Check all fields in current version
  Object.keys(currentData).forEach((key) => {
    if (key === 'metadata') return // Skip metadata for now

    if (!(key in previousData) || previousData[key] === null || previousData[key] === undefined) {
      // Field was added
      changes.added.push({ field: key, value: stripHtml(currentData[key]) })
    } else if (JSON.stringify(currentData[key]) !== JSON.stringify(previousData[key])) {
      // Field was modified
      changes.modified.push({
        field: key,
        oldValue: stripHtml(previousData[key]),
        newValue: stripHtml(currentData[key]),
      })
    }
  })

  // Check for removed fields
  Object.keys(previousData).forEach((key) => {
    if (key === 'metadata') return
    if (!(key in currentData) || currentData[key] === null || currentData[key] === undefined) {
      changes.removed.push({ field: key, value: stripHtml(previousData[key]) })
    }
  })

  return changes
}

const stripHtml = (value) => {
  if (typeof value !== 'string') return value

  // Remove HTML tags and decode entities
  const text = value
    .replace(/<br\s*\/?>/gi, '\n') // Convert <br> to newlines
    .replace(/<\/p>/gi, '\n') // Convert closing </p> to newlines
    .replace(/<p>/gi, '') // Remove opening <p> tags
    .replace(/<[^>]*>/g, '') // Remove all other HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
    .trim()

  return text || value
}

const formatFieldName = (field) => {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const versionDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  if (versionDate.getTime() === today.getTime()) {
    return `Today ${timeStr}`
  } else if (versionDate.getTime() === yesterday.getTime()) {
    return `Yesterday ${timeStr}`
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }
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

const getStatusColor = (status) => {
  const colors = {
    'in-progress': 'primary',
    planning: 'info',
    completed: 'success',
    'on-hold': 'warning',
    draft: 'grey',
  }
  return colors[status?.toLowerCase()] || 'grey'
}

const getPriorityColor = (priority) => {
  const colors = {
    high: 'error',
    medium: 'warning',
    low: 'success',
  }
  return colors[priority?.toLowerCase()] || 'grey'
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
        <v-icon class="mr-2">mdi-history</v-icon>
        <h3>Project History</h3>
      </div>
      <v-btn @click="loadHistory" size="small" variant="text" icon :loading="loading">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <!-- Loading State -->
    <div v-if="loading && history.length === 0" class="loading-state">
      <v-progress-circular indeterminate color="primary" size="32" />
      <p>Loading project history...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="history.length === 0" class="empty-state">
      <v-icon size="48" color="grey-lighten-1">mdi-history</v-icon>
      <p>No project history available</p>
    </div>

    <!-- History List - Google Docs Style -->
    <div v-else class="history-list">
      <div
        v-for="version in activeHistory"
        :key="version.id"
        class="version-item"
        :class="{ current: version.id === currentVersion?.id }"
        @click="viewVersion(version)"
      >
        <!-- Version Avatar -->
        <div class="version-avatar" :style="{ backgroundColor: getAvatarColor(version.author) }">
          {{ getInitials(version.author) }}
        </div>

        <!-- Version Content -->
        <div class="version-content">
          <div class="version-info">
            <div class="version-author">
              {{ version.author }}
              <v-chip
                v-if="version.isActive"
                size="x-small"
                color="success"
                variant="flat"
                class="ml-2"
              >
                Current
              </v-chip>
            </div>
            <div class="version-time">{{ formatDate(version.timestamp) }}</div>
            <div class="version-summary-text">
              {{ version.changeDescription }}
            </div>
          </div>

          <!-- Restore Button -->
          <v-btn
            v-if="!version.isActive"
            @click.stop="restoreVersion(version.id)"
            size="small"
            color="primary"
            variant="text"
            class="restore-btn"
          >
            Restore
          </v-btn>
        </div>
      </div>
    </div>

    <!-- Version Details Dialog -->
    <v-dialog v-model="showVersionDialog" max-width="900px" scrollable>
      <v-card v-if="selectedVersion" class="version-details-dialog">
        <v-card-title class="dialog-header">
          <div class="dialog-title-content">
            <div
              class="dialog-avatar"
              :style="{ backgroundColor: getAvatarColor(selectedVersion.author) }"
            >
              {{ getInitials(selectedVersion.author) }}
            </div>
            <div class="dialog-info">
              <div class="dialog-author">{{ selectedVersion.author }}</div>
              <div class="dialog-time">{{ formatDate(selectedVersion.timestamp) }}</div>
            </div>
          </div>
          <v-btn icon variant="text" @click="closeVersionDialog" size="small">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="dialog-content">
          <!-- Editor Information -->
          <div class="editor-info">
            <v-icon size="small" color="primary" class="mr-2">mdi-account-edit</v-icon>
            <span class="editor-label">Edited by:</span>
            <span class="editor-name">{{ selectedVersion.author }}</span>
            <span class="editor-time">• {{ formatDate(selectedVersion.timestamp) }}</span>
          </div>

          <v-divider class="my-4"></v-divider>

          <!-- Changes Made -->
          <div class="changes-section">
            <h4 class="section-title">
              <v-icon size="small" class="mr-2">mdi-file-document-edit</v-icon>
              What Changed
            </h4>

            <template v-if="!getVersionChanges(selectedVersion).isFirstVersion">
              <!-- Added Fields -->
              <div v-if="getVersionChanges(selectedVersion).added.length > 0" class="change-group">
                <div
                  class="change-group-header added clickable"
                  @click="toggleChangeGroup(`added-${selectedVersion.id}`)"
                >
                  <v-icon size="small" class="mr-1">mdi-plus-circle</v-icon>
                  Added ({{ getVersionChanges(selectedVersion).added.length }})
                  <v-icon size="small" class="ml-auto">
                    {{
                      isChangeExpanded(`added-${selectedVersion.id}`)
                        ? 'mdi-chevron-up'
                        : 'mdi-chevron-down'
                    }}
                  </v-icon>
                </div>
                <div v-show="isChangeExpanded(`added-${selectedVersion.id}`)">
                  <div
                    v-for="change in getVersionChanges(selectedVersion).added"
                    :key="change.field"
                    class="change-item added-item"
                  >
                    <div class="change-field">{{ formatFieldName(change.field) }}</div>
                    <div class="change-value new-value scrollable-content">
                      <v-icon size="small" class="mr-1">mdi-plus</v-icon>
                      <span>{{ stripHtml(String(change.value)) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Modified Fields -->
              <div
                v-if="getVersionChanges(selectedVersion).modified.length > 0"
                class="change-group"
              >
                <div
                  class="change-group-header modified clickable"
                  @click="toggleChangeGroup(`modified-${selectedVersion.id}`)"
                >
                  <v-icon size="small" class="mr-1">mdi-pencil-circle</v-icon>
                  Modified ({{ getVersionChanges(selectedVersion).modified.length }})
                  <v-icon size="small" class="ml-auto">
                    {{
                      isChangeExpanded(`modified-${selectedVersion.id}`)
                        ? 'mdi-chevron-up'
                        : 'mdi-chevron-down'
                    }}
                  </v-icon>
                </div>
                <div v-show="isChangeExpanded(`modified-${selectedVersion.id}`)">
                  <div
                    v-for="change in getVersionChanges(selectedVersion).modified"
                    :key="change.field"
                    class="change-item modified-item"
                  >
                    <div class="change-field">{{ formatFieldName(change.field) }}</div>
                    <div class="change-comparison">
                      <div class="change-value old-value scrollable-content">
                        <v-icon size="small" class="mr-1">mdi-minus</v-icon>
                        <span>{{ stripHtml(String(change.oldValue)) }}</span>
                      </div>
                      <div class="change-arrow">
                        <v-icon size="small" color="grey">mdi-arrow-down</v-icon>
                      </div>
                      <div class="change-value new-value scrollable-content">
                        <v-icon size="small" class="mr-1">mdi-plus</v-icon>
                        <span>{{ stripHtml(String(change.newValue)) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Removed Fields -->
              <div
                v-if="getVersionChanges(selectedVersion).removed.length > 0"
                class="change-group"
              >
                <div
                  class="change-group-header removed clickable"
                  @click="toggleChangeGroup(`removed-${selectedVersion.id}`)"
                >
                  <v-icon size="small" class="mr-1">mdi-minus-circle</v-icon>
                  Removed ({{ getVersionChanges(selectedVersion).removed.length }})
                  <v-icon size="small" class="ml-auto">
                    {{
                      isChangeExpanded(`removed-${selectedVersion.id}`)
                        ? 'mdi-chevron-up'
                        : 'mdi-chevron-down'
                    }}
                  </v-icon>
                </div>
                <div v-show="isChangeExpanded(`removed-${selectedVersion.id}`)">
                  <div
                    v-for="change in getVersionChanges(selectedVersion).removed"
                    :key="change.field"
                    class="change-item removed-item"
                  >
                    <div class="change-field">{{ formatFieldName(change.field) }}</div>
                    <div class="change-value old-value scrollable-content">
                      <v-icon size="small" class="mr-1">mdi-minus</v-icon>
                      <span>{{ stripHtml(String(change.value)) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No Changes -->
              <div
                v-if="
                  getVersionChanges(selectedVersion).added.length === 0 &&
                  getVersionChanges(selectedVersion).modified.length === 0 &&
                  getVersionChanges(selectedVersion).removed.length === 0
                "
                class="no-changes"
              >
                <v-icon size="large" color="grey-lighten-1">mdi-information-outline</v-icon>
                <p>No detectable changes in this version</p>
              </div>
            </template>

            <!-- First Version -->
            <div v-else class="first-version-notice">
              <v-icon size="large" color="primary">mdi-file-star</v-icon>
              <p>This is the first version - initial creation</p>
              <p class="text-caption">{{ selectedVersion.changeDescription }}</p>
            </div>
          </div>

          <v-divider class="my-4"></v-divider>

          <!-- Current Content Snapshot -->
          <div class="content-snapshot">
            <h4 class="section-title">
              <v-icon size="small" class="mr-2">mdi-file-document</v-icon>
              Content Snapshot
            </h4>

            <div class="snapshot-fields">
              <!-- Title -->
              <div v-if="selectedVersion.data.title" class="snapshot-field">
                <label>Title</label>
                <div class="snapshot-value">{{ selectedVersion.data.title }}</div>
              </div>

              <!-- Description -->
              <div v-if="selectedVersion.data.description" class="snapshot-field">
                <label>Description</label>
                <div class="snapshot-value description-content">
                  {{ stripHtml(selectedVersion.data.description) }}
                </div>
              </div>

              <!-- Status -->
              <div v-if="selectedVersion.data.status" class="snapshot-field">
                <label>Status</label>
                <v-chip size="small" :color="getStatusColor(selectedVersion.data.status)">
                  {{ selectedVersion.data.status }}
                </v-chip>
              </div>

              <!-- Timeline -->
              <div
                v-if="selectedVersion.data.startDate || selectedVersion.data.endDate"
                class="snapshot-field"
              >
                <label>Timeline</label>
                <div class="snapshot-value">
                  {{
                    selectedVersion.data.startDate
                      ? new Date(selectedVersion.data.startDate).toLocaleDateString()
                      : 'Not set'
                  }}
                  →
                  {{
                    selectedVersion.data.endDate
                      ? new Date(selectedVersion.data.endDate).toLocaleDateString()
                      : 'Not set'
                  }}
                </div>
              </div>

              <!-- Priority -->
              <div v-if="selectedVersion.data.priority" class="snapshot-field">
                <label>Priority</label>
                <v-chip size="small" :color="getPriorityColor(selectedVersion.data.priority)">
                  {{ selectedVersion.data.priority }}
                </v-chip>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn variant="text" @click="closeVersionDialog">Close</v-btn>
          <v-btn
            v-if="!selectedVersion.isActive"
            color="primary"
            variant="flat"
            @click="
              () => {
                restoreVersion(selectedVersion.id)
                closeVersionDialog()
              }
            "
          >
            <v-icon class="mr-1">mdi-restore</v-icon>
            Restore This Version
          </v-btn>
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
            :color="notificationType === 'success' ? 'success' : 'error'"
            size="20"
            class="notification-icon"
          >
            {{ notificationType === 'success' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
          </v-icon>
          <span class="notification-message">{{ notificationMessage }}</span>
          <v-btn
            icon
            size="small"
            variant="text"
            @click="showNotificationCard = false"
            class="notification-close"
          >
            <v-icon size="18">mdi-close</v-icon>
          </v-btn>
        </div>
      </v-card>
    </transition>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="showConfirmDialog" max-width="400px" persistent>
      <v-card>
        <v-card-title class="text-h6">Confirm Restore</v-card-title>
        <v-card-text>
          <p>{{ confirmMessage }}</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="cancelConfirm">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="handleConfirm">Restore</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.project-history {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 430px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: #6b7280;
  gap: 12px;
}

.loading-state p,
.empty-state p {
  margin: 0;
  font-size: 13px;
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
  background: white;
}

.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: #f9fafb;
}

.history-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.version-item {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s ease;
  position: relative;
  cursor: pointer;
}

.version-item:hover {
  background-color: #f8fafc;
}

.version-item.current {
  background-color: #f0fdf4;
}

.version-item:last-child {
  border-bottom: none;
}

.version-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.version-content {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.version-info {
  flex: 1;
  min-width: 0;
}

.version-author {
  font-weight: 600;
  color: #1f2937;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.version-time {
  color: #6b7280;
  font-size: 11px;
  display: block;
}

.version-summary-text {
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.restore-btn {
  opacity: 0;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.version-item:hover .restore-btn {
  opacity: 1;
}

/* Version Details Dialog */
.version-details-dialog {
  border-radius: 12px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: #fafafa;
}

.dialog-title-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dialog-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dialog-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dialog-author {
  font-weight: 600;
  font-size: 16px;
  color: #1f2937;
}

.dialog-time {
  font-size: 13px;
  color: #6b7280;
}

.dialog-content {
  padding: 24px;
  max-height: 500px;
}

/* Editor Information */
.editor-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
  color: #6b7280;
}

.editor-label {
  font-weight: 500;
}

.editor-name {
  font-weight: 600;
  color: #1f2937;
}

.editor-time {
  color: #9ca3af;
}

/* Section Titles */
.section-title {
  margin: 0 0 16px 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
}

/* Changes Section */
.changes-section {
  margin-bottom: 24px;
}

.change-group {
  margin-bottom: 20px;
}

.change-group:last-child {
  margin-bottom: 0;
}

.change-group-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  user-select: none;
}

.change-group-header.clickable {
  cursor: pointer;
  transition: all 0.2s ease;
}

.change-group-header.clickable:hover {
  opacity: 0.8;
  transform: translateY(-1px);
}

.change-group-header .ml-auto {
  margin-left: auto;
}

.change-group-header.added {
  background: #d1fae5;
  color: #065f46;
}

.change-group-header.modified {
  background: #dbeafe;
  color: #1e40af;
}

.change-group-header.removed {
  background: #fee2e2;
  color: #991b1b;
}

.change-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.change-item:last-child {
  margin-bottom: 0;
}

.added-item {
  background: #f0fdf4;
  border-color: #86efac;
}

.modified-item {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.removed-item {
  background: #fef2f2;
  border-color: #fecaca;
}

.change-field {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.change-value {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.change-value.scrollable-content {
  max-height: 300px;
  overflow-y: auto;
}

.change-value::-webkit-scrollbar {
  width: 4px;
}

.change-value::-webkit-scrollbar-track {
  background: transparent;
}

.change-value::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.old-value {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.new-value {
  background: #f0fdf4;
  color: #065f46;
  border: 1px solid #86efac;
}

.change-comparison {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.change-arrow {
  display: flex;
  justify-content: center;
  padding: 4px 0;
}

.no-changes,
.first-version-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  color: #6b7280;
  text-align: center;
  gap: 8px;
}

.first-version-notice {
  color: #3b82f6;
}

.first-version-notice p {
  margin: 0;
  font-size: 14px;
}

.first-version-notice .text-caption {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

/* Content Snapshot */
.content-snapshot {
  margin-top: 24px;
}

.snapshot-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.snapshot-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.snapshot-field label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.snapshot-value {
  font-size: 14px;
  color: #1f2937;
  line-height: 1.6;
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.description-content {
  max-height: 200px;
  overflow-y: auto;
}

.description-content::-webkit-scrollbar {
  width: 6px;
}

.description-content::-webkit-scrollbar-track {
  background: #e5e7eb;
  border-radius: 3px;
}

.description-content::-webkit-scrollbar-thumb {
  background: #9ca3af;
  border-radius: 3px;
}

.dialog-actions {
  padding: 16px 24px;
  background: #fafafa;
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
}

.notification-success {
  background: #f0fdf4 !important;
  border-left: 4px solid #10b981 !important;
}

.notification-error {
  background: #fef2f2 !important;
  border-left: 4px solid #ef4444 !important;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.notification-icon {
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  line-height: 1.4;
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
  .project-history {
    max-width: 100%;
  }

  .version-item {
    padding: 12px 16px;
    gap: 10px;
  }

  .version-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .restore-btn {
    opacity: 1;
    align-self: flex-start;
  }

  .dialog-content {
    padding: 16px;
  }

  .change-comparison {
    gap: 4px;
  }

  .change-value {
    font-size: 12px;
    padding: 6px 10px;
  }

  .snapshot-value {
    padding: 10px;
    font-size: 13px;
  }
}
</style>
