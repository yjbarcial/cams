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
  refreshTrigger: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['version-restored'])

const history = ref([])
const loading = ref(false)
const error = ref('')
const selectedVersion = ref(null)
const showVersionDialog = ref(false)
const expandedChanges = ref(new Set())
const showNotificationCard = ref(false)
const notificationMessage = ref('')
const notificationType = ref('success')
const showConfirmDialog = ref(false)
const confirmMessage = ref('')
const confirmAction = ref(null)

const activeHistory = computed(() =>
  history.value.filter((v) => !v.isDeleted && v.author !== 'Current User'),
)
const currentVersion = computed(() => activeHistory.value.find((v) => v.isActive))

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

const handleRefreshClick = () => {
  history.value = []
  selectedVersion.value = null
  expandedChanges.value.clear()
  loadHistory()
}

const showNotification = (message, type = 'success') => {
  notificationMessage.value = message
  notificationType.value = type
  showNotificationCard.value = true

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
        closeVersionDialog()
      } catch (err) {
        showNotification('Failed to restore version', 'error')
        console.error('Error restoring version:', err)
      } finally {
        loading.value = false
      }
    },
  )
}

const restoreToPreviousVersion = (currentVersion) => {
  const currentIndex = activeHistory.value.findIndex((v) => v.id === currentVersion.id)
  if (currentIndex === -1 || currentIndex === activeHistory.value.length - 1) {
    showNotification('No previous version available', 'error')
    return
  }

  const previousVersion = activeHistory.value[currentIndex + 1]
  showConfirm(
    'Restore to the previous version (before these changes)? This will undo the current changes.',
    async () => {
      try {
        loading.value = true
        const restoredProject = await restoreProjectVersion(
          props.projectType,
          props.projectId,
          previousVersion.id,
        )
        emit('version-restored', restoredProject)
        await loadHistory()
        showNotification('Restored to previous version successfully', 'success')
        closeVersionDialog()
      } catch (err) {
        showNotification('Failed to restore to previous version', 'error')
        console.error('Error restoring to previous version:', err)
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
  expandedChanges.value.clear()
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

  Object.keys(currentData).forEach((key) => {
    if (key === 'metadata') return

    if (!(key in previousData) || previousData[key] === null || previousData[key] === undefined) {
      changes.added.push({ field: key, value: stripHtml(currentData[key]) })
    } else if (JSON.stringify(currentData[key]) !== JSON.stringify(previousData[key])) {
      const oldValue = stripHtml(previousData[key])
      const newValue = stripHtml(currentData[key])
      changes.modified.push({
        field: key,
        oldValue,
        newValue,
        diff: getInlineTextDiff(String(oldValue ?? ''), String(newValue ?? '')),
      })
    }
  })

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

  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n/g, '\n')
    .trim()

  return text || value
}

const getInlineTextDiff = (oldText, newText) => {
  if (oldText === newText) {
    return {
      oldParts: [{ text: oldText, changed: false }],
      newParts: [{ text: newText, changed: false }],
    }
  }

  let prefixLength = 0
  const maxPrefix = Math.min(oldText.length, newText.length)
  while (prefixLength < maxPrefix && oldText[prefixLength] === newText[prefixLength]) {
    prefixLength++
  }

  let suffixLength = 0
  const oldRemaining = oldText.length - prefixLength
  const newRemaining = newText.length - prefixLength
  const maxSuffix = Math.min(oldRemaining, newRemaining)
  while (
    suffixLength < maxSuffix &&
    oldText[oldText.length - 1 - suffixLength] === newText[newText.length - 1 - suffixLength]
  ) {
    suffixLength++
  }

  const oldStart = oldText.slice(0, prefixLength)
  const oldChanged = oldText.slice(prefixLength, oldText.length - suffixLength)
  const oldEnd = oldText.slice(oldText.length - suffixLength)

  const newStart = newText.slice(0, prefixLength)
  const newChanged = newText.slice(prefixLength, newText.length - suffixLength)
  const newEnd = newText.slice(newText.length - suffixLength)

  const oldParts = []
  const newParts = []

  if (oldStart) oldParts.push({ text: oldStart, changed: false })
  if (oldChanged) oldParts.push({ text: oldChanged, changed: true })
  if (oldEnd) oldParts.push({ text: oldEnd, changed: false })

  if (newStart) newParts.push({ text: newStart, changed: false })
  if (newChanged) newParts.push({ text: newChanged, changed: true })
  if (newEnd) newParts.push({ text: newEnd, changed: false })

  if (oldParts.length === 0) oldParts.push({ text: oldText, changed: false })
  if (newParts.length === 0) newParts.push({ text: newText, changed: false })

  return { oldParts, newParts }
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
  if (!name) return '#353535'
  return name.length % 2 === 0 ? '#353535' : '#f5c52b'
}

const getStatusColor = (status) => {
  const colors = {
    'in-progress': 'grey-darken-2',
    planning: 'grey',
    completed: 'grey-darken-3',
    'on-hold': 'warning',
    draft: 'grey',
  }
  return colors[status?.toLowerCase()] || 'grey'
}

const getPriorityColor = (priority) => {
  const colors = {
    high: 'grey-darken-3',
    medium: 'warning',
    low: 'grey',
  }
  return colors[priority?.toLowerCase()] || 'grey'
}

onMounted(() => {
  loadHistory()
})

watch([() => props.projectId, () => props.projectType], () => {
  loadHistory()
})

watch(
  () => props.refreshTrigger,
  () => {
    history.value = []
    selectedVersion.value = null
    expandedChanges.value.clear()
    loadHistory()
  },
)
</script>

<template>
  <div class="project-history">
    <!-- Header Section -->
    <div class="history-header">
      <div class="header-title">
        <v-icon class="mr-2">mdi-history</v-icon>
        <h3>Project History</h3>
      </div>
      <v-btn @click="handleRefreshClick" size="small" variant="text" icon :loading="loading">
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
        <div
          class="version-avatar"
          :class="{ gold: getAvatarColor(version.author) === '#f5c52b' }"
          :style="{ backgroundColor: getAvatarColor(version.author) }"
        >
          {{ getInitials(version.author) }}
        </div>

        <!-- Version Content -->
        <div class="version-content">
          <div class="version-info">
            <div class="version-author">
              {{ version.author }}
              <v-chip v-if="version.isActive" size="x-small" variant="flat" class="current-chip">
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
    <v-dialog v-model="showVersionDialog" max-width="1180px" scrollable>
      <v-card v-if="selectedVersion" class="version-details-dialog">
        <v-card-title class="dialog-header">
          <div class="dialog-title-content">
            <div
              class="dialog-avatar"
              :class="{ gold: getAvatarColor(selectedVersion.author) === '#f5c52b' }"
              :style="{ backgroundColor: getAvatarColor(selectedVersion.author) }"
            >
              {{ getInitials(selectedVersion.author) }}
            </div>
            <div class="dialog-info">
              <div class="dialog-author-row">
                <div class="dialog-author">{{ selectedVersion.author }}</div>
                <v-chip
                  v-if="selectedVersion.isActive"
                  size="small"
                  variant="flat"
                  class="current-chip"
                >
                  Current Version
                </v-chip>
                <v-chip v-else size="small" variant="flat" class="past-chip"> Past Version </v-chip>
              </div>
              <div class="dialog-time">{{ formatDate(selectedVersion.timestamp) }}</div>
              <div class="dialog-summary">{{ selectedVersion.changeDescription }}</div>
            </div>
          </div>
          <v-btn icon variant="text" @click="closeVersionDialog" size="small">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-divider />

        <v-card-text class="dialog-content">
          <div class="preview-grid">
            <div class="preview-panel changes-panel">
              <div class="panel-heading">
                <v-icon size="small" class="mr-2">mdi-file-document-edit</v-icon>
                What Changed
              </div>

              <template v-if="!getVersionChanges(selectedVersion).isFirstVersion">
                <div
                  v-if="getVersionChanges(selectedVersion).added.length > 0"
                  class="change-group"
                >
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
                          <span>
                            <template
                              v-for="(part, index) in change.diff.oldParts"
                              :key="`old-${change.field}-${index}`"
                            >
                              <mark v-if="part.changed" class="diff-changed-old">{{
                                part.text
                              }}</mark>
                              <span v-else>{{ part.text }}</span>
                            </template>
                          </span>
                        </div>
                        <div class="change-arrow">
                          <v-icon size="small" color="grey">mdi-arrow-down</v-icon>
                        </div>
                        <div class="change-value new-value scrollable-content">
                          <v-icon size="small" class="mr-1">mdi-plus</v-icon>
                          <span>
                            <template
                              v-for="(part, index) in change.diff.newParts"
                              :key="`new-${change.field}-${index}`"
                            >
                              <mark v-if="part.changed" class="diff-changed-new">{{
                                part.text
                              }}</mark>
                              <span v-else>{{ part.text }}</span>
                            </template>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

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

              <div v-else class="first-version-notice">
                <v-icon size="large" color="#f5c52b">mdi-file-star</v-icon>
                <p>This is the first version - initial creation</p>
                <p class="text-caption">{{ selectedVersion.changeDescription }}</p>
              </div>
            </div>

            <div class="preview-panel snapshot-panel">
              <div class="panel-heading">
                <v-icon size="small" class="mr-2">mdi-file-document</v-icon>
                Content Snapshot
              </div>

              <div class="snapshot-fields">
                <div v-if="selectedVersion.data.title" class="snapshot-field">
                  <label>Title</label>
                  <div class="snapshot-value">{{ selectedVersion.data.title }}</div>
                </div>

                <div v-if="selectedVersion.data.description" class="snapshot-field">
                  <label>Description</label>
                  <div class="snapshot-value description-content">
                    {{ stripHtml(selectedVersion.data.description) }}
                  </div>
                </div>

                <div v-if="selectedVersion.data.status" class="snapshot-field">
                  <label>Status</label>
                  <v-chip size="small" :color="getStatusColor(selectedVersion.data.status)">
                    {{ selectedVersion.data.status }}
                  </v-chip>
                </div>

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

                <div v-if="selectedVersion.data.priority" class="snapshot-field">
                  <label>Priority</label>
                  <v-chip size="small" :color="getPriorityColor(selectedVersion.data.priority)">
                    {{ selectedVersion.data.priority }}
                  </v-chip>
                </div>
              </div>
            </div>
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="dialog-actions">
          <v-btn variant="text" @click="closeVersionDialog" color="grey-darken-1">Close</v-btn>
          <v-spacer />
          <v-btn
            v-if="
              !selectedVersion.isActive &&
              !getVersionChanges(selectedVersion).isFirstVersion &&
              activeHistory.findIndex((v) => v.id === selectedVersion.id) !==
                activeHistory.length - 1
            "
            color="grey-darken-2"
            variant="elevated"
            @click="restoreToPreviousVersion(selectedVersion)"
            class="restore-primary-btn"
          >
            <v-icon class="mr-1">mdi-restore</v-icon>
            Restore (Before These Changes)
          </v-btn>
          <v-btn
            v-if="!selectedVersion.isActive && !getVersionChanges(selectedVersion).isFirstVersion"
            color="grey-darken-1"
            variant="outlined"
            @click="restoreVersion(selectedVersion.id)"
            class="restore-secondary-btn"
          >
            <v-icon class="mr-1">mdi-redo-variant</v-icon>
            Restore This Version
          </v-btn>
          <v-btn
            v-if="!selectedVersion.isActive && getVersionChanges(selectedVersion).isFirstVersion"
            color="grey-darken-2"
            variant="elevated"
            @click="restoreVersion(selectedVersion.id)"
            class="restore-primary-btn"
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
      <v-card class="confirm-dialog-card">
        <v-card-title class="confirm-dialog-header">
          <v-icon class="mr-2" size="24">mdi-restore</v-icon>
          <span>Confirm Restore</span>
        </v-card-title>

        <v-card-text class="confirm-dialog-content">
          <p class="confirm-message">{{ confirmMessage }}</p>
        </v-card-text>

        <v-divider class="dialog-divider" />

        <v-card-actions class="confirm-dialog-actions">
          <v-btn
            @click="cancelConfirm"
            variant="outlined"
            size="default"
            class="cancel-btn"
            color="grey-darken-1"
          >
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            @click="handleConfirm"
            variant="elevated"
            size="default"
            prepend-icon="mdi-restore"
            color="grey-darken-2"
            class="restore-btn"
            style="background-color: #424242 !important; color: white !important"
          >
            Restore
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.project-history {
  background: #ffffff;
  color: #353535;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid #e5e5e5;
  background: #ffffff;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #353535;
}

.header-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
}

.loading-state,
.empty-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #6b7280;
  background: #ffffff;
}

.loading-state p,
.empty-state p,
.no-changes p,
.first-version-notice p {
  margin: 0;
  font-size: 13px;
}

.history-list {
  max-height: 430px;
  overflow-y: auto;
  background: #ffffff;
}

.history-list::-webkit-scrollbar,
.dialog-content::-webkit-scrollbar,
.scrollable-content::-webkit-scrollbar,
.description-content::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track,
.dialog-content::-webkit-scrollbar-track,
.scrollable-content::-webkit-scrollbar-track,
.description-content::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.history-list::-webkit-scrollbar-thumb,
.dialog-content::-webkit-scrollbar-thumb,
.scrollable-content::-webkit-scrollbar-thumb,
.description-content::-webkit-scrollbar-thumb {
  background: #cfcfcf;
  border-radius: 999px;
}

.version-item {
  display: flex;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid #eeeeee;
  cursor: pointer;
  position: relative;
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
}

.version-item::before {
  content: '';
  position: absolute;
  left: 35px;
  top: 52px;
  bottom: -8px;
  width: 1px;
  background: #e5e5e5;
}

.version-item:last-child::before {
  display: none;
}

.version-item:hover {
  background: #fafafa;
}

.version-item.current {
  background: #fff9df;
  border-left: 4px solid #f5c52b;
}

.version-avatar,
.dialog-avatar {
  border: 2px solid #ffffff;
  box-shadow: 0 0 0 1px #d8d8d8;
}

.version-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  z-index: 1;
}

.version-avatar.gold,
.dialog-avatar.gold {
  color: #353535;
}

.version-content {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.version-info {
  min-width: 0;
}

.version-author,
.dialog-author {
  font-weight: 700;
  color: #353535;
  letter-spacing: 0;
}

.version-author {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
}

.version-time,
.dialog-time {
  color: #777777;
  font-size: 12px;
}

.version-summary-text,
.dialog-summary {
  color: #555555;
  line-height: 1.45;
}

.version-summary-text {
  font-size: 13px;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.current-chip,
.past-chip {
  font-weight: 700 !important;
  letter-spacing: 0 !important;
}

.current-chip {
  background: #f5c52b !important;
  color: #353535 !important;
}

.past-chip {
  background: #eeeeee !important;
  color: #353535 !important;
}

.restore-btn {
  color: #353535 !important;
  border: 1px solid #d8d8d8 !important;
  background: #ffffff !important;
  text-transform: none !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  align-self: center;
}

.version-item:hover .restore-btn,
.restore-btn:hover {
  border-color: #f5c52b !important;
  background: #fff9df !important;
}

.version-details-dialog,
.confirm-dialog-card {
  border: 2px solid #353535 !important;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18) !important;
}

.dialog-header,
.confirm-dialog-header {
  display: flex;
  align-items: center;
  background: #353535 !important;
  color: #ffffff !important;
}

.dialog-header {
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px !important;
}

.dialog-title-content {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.dialog-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  flex-shrink: 0;
}

.dialog-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dialog-author-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.dialog-author,
.dialog-time,
.dialog-summary {
  color: inherit;
}

.dialog-time,
.dialog-summary {
  opacity: 0.82;
}

.dialog-summary {
  font-size: 13px;
}

.dialog-content {
  padding: 20px !important;
  max-height: 64vh;
  overflow-y: auto;
  background: #ffffff;
}

.preview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
  gap: 16px;
}

.preview-panel {
  border: 1px solid #dedede;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.panel-heading {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  color: #353535;
  background: #f7f7f7;
  border-bottom: 1px solid #dedede;
  font-size: 13px;
  font-weight: 800;
}

.change-group {
  padding: 14px;
  border-bottom: 1px solid #eeeeee;
}

.change-group:last-child {
  border-bottom: none;
}

.change-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 10px;
  border-radius: 6px;
  background: #ffffff;
  border: 1px solid #d8d8d8;
  color: #353535;
  font-size: 13px;
  font-weight: 800;
  user-select: none;
}

.change-group-header.clickable {
  cursor: pointer;
}

.change-group-header.clickable:hover {
  border-color: #f5c52b;
  background: #fff9df;
}

.change-group-header .ml-auto {
  margin-left: auto;
}

.change-group-header.added,
.change-group-header.modified,
.change-group-header.removed {
  border-left: 4px solid #f5c52b;
}

.change-item {
  padding: 12px 0 0;
}

.change-field {
  margin: 0 0 8px;
  color: #353535;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.change-value {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #dedede;
  background: #fafafa;
  color: #353535;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.change-value.scrollable-content {
  max-height: 280px;
  overflow-y: auto;
}

.old-value {
  background: #f7f7f7;
}

.new-value {
  background: #fffdf2;
  border-color: #ead98a;
}

.change-comparison {
  display: grid;
  gap: 8px;
}

.change-arrow {
  display: flex;
  justify-content: center;
  color: #777777;
}

.diff-changed-old,
.diff-changed-new {
  padding: 0 3px;
  border-radius: 3px;
  color: #353535;
}

.diff-changed-old {
  background: #e8e8e8;
}

.diff-changed-new {
  background: #f5e7a1;
}

.no-changes,
.first-version-notice {
  min-height: 220px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #666666;
  text-align: center;
}

.first-version-notice {
  color: #353535;
}

.first-version-notice .text-caption {
  color: #777777;
  font-size: 12px;
}

.snapshot-fields {
  display: grid;
  gap: 14px;
  padding: 14px;
}

.snapshot-field {
  display: grid;
  gap: 7px;
}

.snapshot-field label {
  color: #666666;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0;
}

.snapshot-value {
  padding: 11px 12px;
  border: 1px solid #dedede;
  border-radius: 6px;
  background: #fafafa;
  color: #353535;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.description-content {
  max-height: 220px;
  overflow-y: auto;
}

.dialog-actions,
.confirm-dialog-actions {
  padding: 14px 20px !important;
  background: #fafafa !important;
  border-top: 1px solid #dedede !important;
}

.restore-primary-btn,
.confirm-dialog-actions .restore-btn {
  background: #353535 !important;
  color: #ffffff !important;
  border-radius: 6px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.restore-primary-btn:hover,
.confirm-dialog-actions .restore-btn:hover {
  background: #1f1f1f !important;
}

.restore-secondary-btn,
.confirm-dialog-actions .cancel-btn {
  color: #353535 !important;
  border: 1px solid #777777 !important;
  border-radius: 6px !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.restore-secondary-btn:hover,
.confirm-dialog-actions .cancel-btn:hover {
  background: #fff9df !important;
  border-color: #f5c52b !important;
}

.notification-card {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  min-width: 300px;
  max-width: 420px;
  border: 2px solid #353535;
  border-radius: 8px;
  background: #ffffff !important;
}

.notification-success {
  border-left: 6px solid #f5c52b !important;
}

.notification-error {
  border-left: 6px solid #777777 !important;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}

.notification-message {
  flex: 1;
  color: #353535;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.4;
}

.notification-close {
  color: #555555 !important;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.24s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-16px);
}

.confirm-dialog-header {
  padding: 18px 22px !important;
  font-size: 17px !important;
  font-weight: 800 !important;
}

.confirm-dialog-content {
  padding: 22px !important;
  background: #ffffff !important;
}

.confirm-message {
  margin: 0;
  color: #353535;
  font-size: 14px;
  line-height: 1.6;
}

.dialog-divider {
  border-color: #dedede !important;
  opacity: 1 !important;
}

:deep(.v-btn) {
  letter-spacing: 0 !important;
}

@media (max-width: 860px) {
  .preview-grid {
    grid-template-columns: 1fr;
  }

  .dialog-header {
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .history-header,
  .version-item,
  .dialog-header,
  .dialog-content,
  .dialog-actions,
  .confirm-dialog-actions {
    padding-left: 14px !important;
    padding-right: 14px !important;
  }

  .version-content {
    flex-direction: column;
    gap: 10px;
  }

  .restore-btn {
    align-self: flex-start;
  }

  .dialog-title-content {
    align-items: flex-start;
  }

  .dialog-actions,
  .confirm-dialog-actions {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 8px;
  }
}
</style>
