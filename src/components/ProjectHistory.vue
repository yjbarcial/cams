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
} from '@/services/localProjectHistory.js'

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

// Computed
const activeHistory = computed(() => history.value.filter((v) => !v.isDeleted))
const currentVersion = computed(() => activeHistory.value.find((v) => v.isActive))
const hasSelection = computed(() => selectedVersions.value.length > 0)
const canCompare = computed(() => selectedVersions.value.length === 2)

// Methods
const loadHistory = () => {
  try {
    loading.value = true
    history.value = getActiveProjectHistory(props.projectType, props.projectId)
    statistics.value = getProjectStatistics(props.projectType, props.projectId)
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

const restoreVersion = (versionId) => {
  if (
    !confirm(
      'Are you sure you want to restore this version? This will create a new version with the restored content.',
    )
  ) {
    return
  }

  try {
    loading.value = true
    const restoredProject = restoreProjectVersion(props.projectType, props.projectId, versionId)
    emit('version-restored', restoredProject)
    loadHistory() // Reload history
  } catch (err) {
    error.value = 'Failed to restore version'
    console.error('Error restoring version:', err)
  } finally {
    loading.value = false
  }
}

const addComment = (versionId) => {
  if (!newComment.value.trim()) return

  try {
    addVersionComment(
      props.projectType,
      props.projectId,
      versionId,
      newComment.value,
      'Current User',
    )
    newComment.value = ''
    loadHistory() // Reload to get updated comments
  } catch (err) {
    error.value = 'Failed to add comment'
    console.error('Error adding comment:', err)
  }
}

const deleteVersion = (versionId) => {
  if (!confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
    return
  }

  try {
    const success = deleteProjectVersion(props.projectType, props.projectId, versionId)
    if (success) {
      emit('version-deleted', versionId)
      loadHistory() // Reload history
    }
  } catch (err) {
    error.value = 'Failed to delete version'
    console.error('Error deleting version:', err)
  }
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
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
    <!-- Header Actions -->
    <div class="history-actions mb-3">
      <v-btn
        v-if="canCompare"
        @click="compareSelectedVersions"
        size="small"
        color="primary"
        variant="outlined"
      >
        Compare Selected
      </v-btn>
      <v-btn @click="loadHistory" size="small" variant="text" icon :loading="loading">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
    </div>

    <!-- Statistics -->
    <div v-if="statistics.totalVersions > 0" class="history-stats">
      <v-chip size="small" color="primary" variant="outlined">
        {{ statistics.totalVersions }} versions
      </v-chip>
      <v-chip size="small" color="secondary" variant="outlined">
        {{ statistics.totalComments }} comments
      </v-chip>
      <v-chip size="small" color="info" variant="outlined">
        {{ statistics.averageWordsPerVersion }} avg words
      </v-chip>
    </div>

    <!-- Error Message -->
    <v-alert v-if="error" type="error" closable @click:close="error = ''">
      {{ error }}
    </v-alert>

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

    <!-- History List -->
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
        <!-- Version Header -->
        <div class="version-header">
          <div class="version-info">
            <div class="version-number">
              <v-icon :color="getVersionTypeColor(version.versionType)" size="small">
                {{ getVersionTypeIcon(version.versionType) }}
              </v-icon>
              <span class="version-text">v{{ version.versionNumber }}</span>
              <v-chip v-if="version.isActive" size="x-small" color="success" variant="flat">
                Current
              </v-chip>
            </div>
            <div class="version-meta">
              <span class="author">{{ version.author }}</span>
              <span class="timestamp">{{ formatDate(version.timestamp) }}</span>
            </div>
          </div>
          <div class="version-actions">
            <v-btn
              v-if="!version.isActive"
              @click.stop="restoreVersion(version.id)"
              size="small"
              color="primary"
              variant="text"
            >
              Restore
            </v-btn>
            <v-btn
              @click.stop="deleteVersion(version.id)"
              size="small"
              color="error"
              variant="text"
            >
              Delete
            </v-btn>
          </div>
        </div>

        <!-- Version Description -->
        <div class="version-description">
          {{ version.changeDescription }}
        </div>

        <!-- Version Metadata -->
        <div class="version-metadata">
          <v-chip size="x-small" variant="outlined">
            {{ version.data.metadata?.wordCount || 0 }} words
          </v-chip>
          <v-chip size="x-small" variant="outlined">
            {{ version.data.status }}
          </v-chip>
          <v-chip v-if="version.comments.length > 0" size="x-small" variant="outlined">
            {{ version.comments.length }} comments
          </v-chip>
        </div>

        <!-- Comments Section -->
        <div v-if="showComments && version.comments.length > 0" class="version-comments">
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
            placeholder="Add a comment to this version..."
            rows="2"
            variant="outlined"
            density="compact"
            hide-details
            @keydown.enter.ctrl="addComment(version.id)"
          />
          <v-btn
            @click="addComment(version.id)"
            size="small"
            color="primary"
            variant="text"
            :disabled="!newComment.trim()"
          >
            Add Comment
          </v-btn>
        </div>
      </div>
    </div>

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
  </div>
</template>

<style scoped>
.project-history {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.history-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

.history-stats {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
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
  max-height: 600px;
  overflow-y: auto;
}

.version-item {
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: all 0.2s ease;
}

.version-item:hover {
  background: #f8fafc;
}

.version-item.selected {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
}

.version-item.active {
  background: #f0fdf4;
  border-left: 4px solid #10b981;
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.version-info {
  flex: 1;
}

.version-number {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.version-text {
  font-weight: 600;
  color: #1f2937;
  font-size: 16px;
}

.version-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

.author {
  font-weight: 500;
}

.version-actions {
  display: flex;
  gap: 4px;
}

.version-description {
  color: #374151;
  font-size: 14px;
  margin-bottom: 8px;
  line-height: 1.4;
}

.version-metadata {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.version-comments {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.comment-item {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.comment-item:last-child {
  margin-bottom: 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.comment-author {
  font-weight: 500;
  font-size: 12px;
  color: #1f2937;
}

.comment-time {
  font-size: 11px;
  color: #6b7280;
}

.comment-content {
  font-size: 13px;
  color: #374151;
  line-height: 1.4;
}

.add-comment {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
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
