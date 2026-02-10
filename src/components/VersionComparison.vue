<script setup>
import { ref, computed, watch } from 'vue'
import { compareVersions } from '@/services/projectHistory.js'

const props = defineProps({
  version1: {
    type: Object,
    required: true,
  },
  version2: {
    type: Object,
    required: true,
  },
  show: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

// State
const activeTab = ref('content')
const showUnchanged = ref(false)

// Computed
const comparison = computed(() => {
  return compareVersions(props.version1, props.version2)
})

const contentDiff = computed(() => {
  if (!props.version1?.data?.content || !props.version2?.data?.content) {
    return { hasChanges: false, diff: '' }
  }

  const content1 = props.version1.data.content
  const content2 = props.version2.data.content

  if (content1 === content2) {
    return { hasChanges: false, diff: content1 }
  }

  // Simple diff implementation - in a real app, you'd use a proper diff library
  const lines1 = content1.split('\n')
  const lines2 = content2.split('\n')
  const maxLines = Math.max(lines1.length, lines2.length)

  let diff = ''
  for (let i = 0; i < maxLines; i++) {
    const line1 = lines1[i] || ''
    const line2 = lines2[i] || ''

    if (line1 === line2) {
      diff += `<div class="unchanged">${line1}</div>`
    } else {
      if (line1) {
        diff += `<div class="removed">- ${line1}</div>`
      }
      if (line2) {
        diff += `<div class="added">+ ${line2}</div>`
      }
    }
  }

  return { hasChanges: true, diff }
})

const metadataComparison = computed(() => {
  const meta1 = props.version1?.data?.metadata || {}
  const meta2 = props.version2?.data?.metadata || {}

  return {
    wordCount: {
      v1: meta1.wordCount || 0,
      v2: meta2.wordCount || 0,
      changed: meta1.wordCount !== meta2.wordCount,
    },
    characterCount: {
      v1: meta1.characterCount || 0,
      v2: meta2.characterCount || 0,
      changed: meta1.characterCount !== meta2.characterCount,
    },
  }
})

const tabs = computed(() => [
  { key: 'overview', label: 'Overview', icon: 'mdi-view-dashboard' },
  { key: 'content', label: 'Content', icon: 'mdi-file-document' },
  { key: 'metadata', label: 'Metadata', icon: 'mdi-information' },
  { key: 'comments', label: 'Comments', icon: 'mdi-comment' },
])

// Methods
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString()
}

const getChangeType = (field) => {
  const changes = comparison.value.differences
  if (!changes[field]) return 'unchanged'

  const v1 = props.version1.data[field]
  const v2 = props.version2.data[field]

  if (!v1 && v2) return 'added'
  if (v1 && !v2) return 'removed'
  return 'modified'
}

const getChangeIcon = (changeType) => {
  const icons = {
    added: 'mdi-plus-circle',
    removed: 'mdi-minus-circle',
    modified: 'mdi-pencil-circle',
    unchanged: 'mdi-check-circle',
  }
  return icons[changeType] || 'mdi-help-circle'
}

const getChangeColor = (changeType) => {
  const colors = {
    added: 'success',
    removed: 'error',
    modified: 'warning',
    unchanged: 'grey',
  }
  return colors[changeType] || 'grey'
}

// Watch for prop changes
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      activeTab.value = 'overview'
    }
  },
)
</script>

<template>
  <v-dialog :model-value="show" @update:model-value="emit('close')" max-width="1400px" scrollable>
    <v-card class="version-comparison-dialog">
      <v-card-title class="dialog-header">
        <v-icon class="mr-2">mdi-compare</v-icon>
        Version Comparison
        <v-spacer />
        <v-btn icon @click="emit('close')" size="small">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Version Headers -->
        <div class="version-headers">
          <div class="version-header">
            <div class="version-info">
              <h3>Version {{ version1.versionNumber }}</h3>
              <p class="version-meta">
                <v-icon size="small" class="mr-1">{{
                  getVersionTypeIcon(version1.versionType)
                }}</v-icon>
                {{ version1.author }} • {{ formatDate(version1.timestamp) }}
              </p>
              <p class="version-description">{{ version1.changeDescription }}</p>
            </div>
          </div>

          <div class="vs-divider">
            <v-icon size="large">mdi-arrow-left-right</v-icon>
          </div>

          <div class="version-header">
            <div class="version-info">
              <h3>Version {{ version2.versionNumber }}</h3>
              <p class="version-meta">
                <v-icon size="small" class="mr-1">{{
                  getVersionTypeIcon(version2.versionType)
                }}</v-icon>
                {{ version2.author }} • {{ formatDate(version2.timestamp) }}
              </p>
              <p class="version-description">{{ version2.changeDescription }}</p>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <v-tabs v-model="activeTab" class="comparison-tabs">
          <v-tab v-for="tab in tabs" :key="tab.key" :value="tab.key" class="tab-item">
            <v-icon size="small" class="mr-2">{{ tab.icon }}</v-icon>
            {{ tab.label }}
          </v-tab>
        </v-tabs>

        <!-- Tab Content -->
        <v-window v-model="activeTab" class="comparison-content">
          <!-- Overview Tab -->
          <v-window-item value="overview">
            <div class="overview-content">
              <div class="changes-summary">
                <h4>Changes Summary</h4>
                <div v-if="comparison.hasChanges" class="changes-list">
                  <div v-for="field in comparison.changedFields" :key="field" class="change-item">
                    <v-icon :color="getChangeColor(getChangeType(field))" size="small">
                      {{ getChangeIcon(getChangeType(field)) }}
                    </v-icon>
                    <span class="change-field">{{
                      field.charAt(0).toUpperCase() + field.slice(1)
                    }}</span>
                  </div>
                </div>
                <div v-else class="no-changes">
                  <v-icon color="success" size="large">mdi-check-circle</v-icon>
                  <p>No differences found between these versions</p>
                </div>
              </div>

              <div class="quick-stats">
                <h4>Quick Stats</h4>
                <div class="stats-grid">
                  <div class="stat-item">
                    <span class="stat-label">Word Count</span>
                    <div class="stat-values">
                      <span class="stat-value">{{ metadataComparison.wordCount.v1 }}</span>
                      <v-icon size="small">mdi-arrow-right</v-icon>
                      <span class="stat-value">{{ metadataComparison.wordCount.v2 }}</span>
                    </div>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Character Count</span>
                    <div class="stat-values">
                      <span class="stat-value">{{ metadataComparison.characterCount.v1 }}</span>
                      <v-icon size="small">mdi-arrow-right</v-icon>
                      <span class="stat-value">{{ metadataComparison.characterCount.v2 }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </v-window-item>

          <!-- Content Tab -->
          <v-window-item value="content">
            <div class="content-comparison">
              <div class="content-header">
                <h4>Content Comparison</h4>
                <v-switch
                  v-model="showUnchanged"
                  label="Show unchanged lines"
                  density="compact"
                  hide-details
                />
              </div>

              <div class="content-diff" v-html="contentDiff.diff"></div>
            </div>
          </v-window-item>

          <!-- Metadata Tab -->
          <v-window-item value="metadata">
            <div class="metadata-comparison">
              <h4>Metadata Comparison</h4>
              <v-table density="compact">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Version {{ version1.versionNumber }}</th>
                    <th>Version {{ version2.versionNumber }}</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="field in [
                      'title',
                      'description',
                      'status',
                      'sectionHead',
                      'writers',
                      'artists',
                      'dueDate',
                    ]"
                    :key="field"
                  >
                    <td class="field-name">{{ field.charAt(0).toUpperCase() + field.slice(1) }}</td>
                    <td class="field-value">{{ version1.data[field] || 'N/A' }}</td>
                    <td class="field-value">{{ version2.data[field] || 'N/A' }}</td>
                    <td class="field-status">
                      <v-chip
                        :color="getChangeColor(getChangeType(field))"
                        size="small"
                        variant="outlined"
                      >
                        <v-icon size="small" class="mr-1">{{
                          getChangeIcon(getChangeType(field))
                        }}</v-icon>
                        {{ getChangeType(field) }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>
            </div>
          </v-window-item>

          <!-- Comments Tab -->
          <v-window-item value="comments">
            <div class="comments-comparison">
              <h4>Comments Comparison</h4>
              <div class="comments-grid">
                <div class="comments-section">
                  <h5>Version {{ version1.versionNumber }} Comments</h5>
                  <div v-if="version1.comments.length > 0" class="comments-list">
                    <div
                      v-for="comment in version1.comments"
                      :key="comment.id"
                      class="comment-item"
                    >
                      <div class="comment-header">
                        <span class="comment-author">{{ comment.author }}</span>
                        <span class="comment-time">{{ formatDate(comment.timestamp) }}</span>
                      </div>
                      <div class="comment-content">{{ comment.content }}</div>
                    </div>
                  </div>
                  <div v-else class="no-comments">
                    <v-icon color="grey">mdi-comment-off</v-icon>
                    <p>No comments</p>
                  </div>
                </div>

                <div class="comments-section">
                  <h5>Version {{ version2.versionNumber }} Comments</h5>
                  <div v-if="version2.comments.length > 0" class="comments-list">
                    <div
                      v-for="comment in version2.comments"
                      :key="comment.id"
                      class="comment-item"
                    >
                      <div class="comment-header">
                        <span class="comment-author">{{ comment.author }}</span>
                        <span class="comment-time">{{ formatDate(comment.timestamp) }}</span>
                      </div>
                      <div class="comment-content">{{ comment.content }}</div>
                    </div>
                  </div>
                  <div v-else class="no-comments">
                    <v-icon color="grey">mdi-comment-off</v-icon>
                    <p>No comments</p>
                  </div>
                </div>
              </div>
            </div>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-spacer />
        <v-btn @click="emit('close')" color="primary"> Close </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.version-comparison-dialog {
  max-height: 90vh;
}

.dialog-header {
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 24px;
}

.version-headers {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.version-header {
  flex: 1;
  padding: 0 12px;
}

.version-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #1f2937;
}

.version-meta {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #6b7280;
  display: flex;
  align-items: center;
}

.version-description {
  margin: 0;
  font-size: 14px;
  color: #374151;
  font-style: italic;
}

.vs-divider {
  padding: 0 20px;
  color: #6b7280;
}

.comparison-tabs {
  border-bottom: 1px solid #e5e7eb;
}

.tab-item {
  text-transform: none;
  font-weight: 500;
}

.comparison-content {
  max-height: 60vh;
  overflow-y: auto;
}

.overview-content {
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.changes-summary h4,
.quick-stats h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1f2937;
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.change-field {
  font-size: 14px;
  color: #374151;
  text-transform: capitalize;
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

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.stat-label {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.stat-values {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
}

.content-comparison {
  padding: 24px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.content-header h4 {
  margin: 0;
  font-size: 16px;
  color: #1f2937;
}

.content-diff {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  max-height: 400px;
  overflow-y: auto;
}

.content-diff :deep(.unchanged) {
  color: #374151;
}

.content-diff :deep(.added) {
  color: #059669;
  background: #d1fae5;
  padding: 2px 4px;
  border-radius: 3px;
}

.content-diff :deep(.removed) {
  color: #dc2626;
  background: #fee2e2;
  padding: 2px 4px;
  border-radius: 3px;
}

.metadata-comparison {
  padding: 24px;
}

.metadata-comparison h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1f2937;
}

.field-name {
  font-weight: 600;
  color: #374151;
  text-transform: capitalize;
}

.field-value {
  color: #6b7280;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-status {
  text-align: center;
}

.comments-comparison {
  padding: 24px;
}

.comments-comparison h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1f2937;
}

.comments-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.comments-section h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #374151;
  font-weight: 600;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-item {
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.comment-author {
  font-size: 12px;
  font-weight: 500;
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

.no-comments {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  color: #9ca3af;
}

.no-comments p {
  margin: 8px 0 0 0;
  font-size: 14px;
}

.dialog-actions {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

/* Responsive Design */
@media (max-width: 768px) {
  .version-headers {
    flex-direction: column;
    gap: 16px;
  }

  .vs-divider {
    transform: rotate(90deg);
  }

  .overview-content {
    grid-template-columns: 1fr;
  }

  .comments-grid {
    grid-template-columns: 1fr;
  }
}
</style>
