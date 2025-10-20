<script setup>
import { ref } from 'vue'
import ProjectHistory from './ProjectHistory.vue'

const props = defineProps({
  projectId: {
    type: [String, Number],
    required: true,
  },
  projectType: {
    type: String,
    required: true,
  },
  buttonText: {
    type: String,
    default: 'Project History',
  },
  variant: {
    type: String,
    default: 'outlined',
  },
  size: {
    type: String,
    default: 'default',
  },
  icon: {
    type: String,
    default: 'mdi-history',
  },
})

const emit = defineEmits(['version-restored', 'version-deleted'])

const showHistory = ref(false)

const toggleHistory = () => {
  showHistory.value = !showHistory.value
}

const handleVersionRestored = (restoredProject) => {
  emit('version-restored', restoredProject)
}

const handleVersionDeleted = (versionId) => {
  emit('version-deleted', versionId)
}
</script>

<template>
  <div class="project-history-button">
    <v-btn @click="toggleHistory" :variant="variant" :size="size" class="history-toggle-btn">
      <v-icon :size="size === 'small' ? 'small' : 'default'" class="mr-2">
        {{ icon }}
      </v-icon>
      {{ buttonText }}
    </v-btn>

    <!-- History Panel -->
    <v-dialog v-model="showHistory" max-width="1000px" scrollable>
      <v-card class="history-dialog">
        <v-card-title class="dialog-header">
          <v-icon class="mr-2">mdi-history</v-icon>
          Project History
          <v-spacer />
          <v-btn icon @click="showHistory = false" size="small">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-0">
          <ProjectHistory
            :project-id="projectId"
            :project-type="projectType"
            @version-restored="handleVersionRestored"
            @version-deleted="handleVersionDeleted"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.project-history-button {
  display: inline-block;
}

.history-toggle-btn {
  text-transform: none;
  font-weight: 500;
}

.history-dialog {
  max-height: 90vh;
}

.dialog-header {
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 24px;
}

:deep(.v-card-text) {
  padding: 0 !important;
}
</style>
