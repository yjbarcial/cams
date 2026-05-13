<script setup>
import { ref } from 'vue'
import ProjectHistory from './ProjectHistory.vue'

defineProps({
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
  if (!showHistory.value) {
    showHistory.value = true
    return
  }

  showHistory.value = false
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
    <v-dialog v-model="showHistory" max-width="1040px" scrollable>
      <v-card class="history-dialog">
        <v-card-title class="dialog-header">
          <div class="dialog-title">
            <v-icon>mdi-history</v-icon>
            <span>Project History</span>
          </div>
          <v-spacer />
          <v-btn icon variant="text" @click="showHistory = false" size="small" class="close-btn">
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
  font-weight: 700;
  letter-spacing: 0;
}

.history-dialog {
  max-height: 90vh;
  border: 2px solid #353535;
  border-radius: 8px !important;
  overflow: hidden;
}

.dialog-header {
  background: #353535;
  color: #ffffff;
  border-bottom: 3px solid #f5c52b;
  padding: 16px 20px;
  display: flex;
  align-items: center;
}

.dialog-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0;
}

.close-btn {
  color: #ffffff !important;
}

:deep(.v-card-text) {
  padding: 0 !important;
}
</style>
