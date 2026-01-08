<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import { createProjectVersion } from '@/services/localProjectHistory.js'

// Accept optional prop; also support reading from route param/query
const props = defineProps({ type: { type: String, default: '' } })
const route = useRoute()
const router = useRouter()

// Determine category from prop, route name, or path
const routeType = computed(() => {
  if (props.type) return props.type
  if (route.query.type) return String(route.query.type)
  if (route.name && String(route.name).includes('magazine')) return 'magazine'
  if (route.name && String(route.name).includes('newsletter')) return 'newsletter'
  if (route.name && String(route.name).includes('folio')) return 'folio'
  if (route.name && String(route.name).includes('other')) return 'social-media'
  // Fallback by path
  const p = route.path
  if (p.includes('/magazine')) return 'magazine'
  if (p.includes('/newsletter')) return 'newsletter'
  if (p.includes('/folio')) return 'folio'
  if (p.includes('/other')) return 'social-media'
  return 'magazine'
})

const categoryLabel = computed(() => {
  return routeType.value === 'social-media'
    ? 'Other'
    : routeType.value.charAt(0).toUpperCase() + routeType.value.slice(1)
})

// Form state
const title = ref('')
const sectionHead = ref('')
const deadline = ref('')
const description = ref('')

// Temporary names for assignment (2 each)
const temporaryUsers = {
  sectionHeads: ['John Smith', 'Sarah Johnson'],
  writers: ['Emily Davis', 'Michael Brown'],
  artists: ['David Wilson', 'Lisa Anderson'],
}

// User data - using temporary names
const users = ref({
  sectionHeads: temporaryUsers.sectionHeads.map((name, index) => ({
    id: `sh_${index}`,
    full_name: name,
    role: 'Section Head',
    department: 'Editorial',
  })),
  writers: temporaryUsers.writers.map((name, index) => ({
    id: `writer_${index}`,
    full_name: name,
    role: 'Writer',
    department: 'Editorial',
  })),
  artists: temporaryUsers.artists.map((name, index) => ({
    id: `artist_${index}`,
    full_name: name,
    role: 'Artist',
    department: 'Design',
  })),
})

// Selected users
const selectedSectionHead = ref(null)
const selectedWriters = ref([])
const selectedArtists = ref([])

// Loading states (not needed for temporary users, but keeping for compatibility)
const loading = ref({
  sectionHeads: false,
  writers: false,
  artists: false,
})

// Notification card state
const showNotificationCard = ref(false)
const notificationMessage = ref('')
const notificationType = ref('success')

// Show notification card
const showNotification = (message, type = 'success') => {
  notificationMessage.value = message
  notificationType.value = type
  showNotificationCard.value = true

  // Auto-hide after 3 seconds
  setTimeout(() => {
    showNotificationCard.value = false
  }, 3000)
}

// Watch for route type changes if needed
watch(routeType, (newType) => {
  // You can add any type-specific logic here if needed
  console.log('Project type changed to:', newType)
})

// Remove any unused helper functions

const cancelPath = computed(() => {
  switch (routeType.value) {
    case 'magazine':
      return '/magazine'
    case 'newsletter':
      return '/newsletter'
    case 'folio':
      return '/folio'
    case 'social-media':
      return '/other'
    default:
      return '/'
  }
})

const assignProject = () => {
  if (!title.value.trim()) {
    showNotification('Please enter a project title', 'warning')
    return
  }

  // Validate required fields
  if (!selectedSectionHead.value) {
    showNotification('Please select a section head', 'warning')
    return
  }

  if (selectedWriters.value.length === 0) {
    showNotification('Please select at least one writer', 'warning')
    return
  }

  // Normalize dates
  const createdAt = new Date()
  const createdAtISO = createdAt.toISOString()
  const dueDateISO = deadline.value ? new Date(deadline.value + 'T00:00:00').toISOString() : ''
  const dueDateDisplay = deadline.value
    ? new Date(deadline.value + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No deadline set'

  // Get user names for display
  const sectionHeadName =
    users.value.sectionHeads.find((sh) => sh.id === selectedSectionHead.value)?.full_name ||
    'Not assigned'
  const writerNames = selectedWriters.value.map(
    (id) => users.value.writers.find((w) => w.id === id)?.full_name || 'Unknown',
  )
  const artistNames =
    selectedArtists.value.length > 0
      ? selectedArtists.value.map(
          (id) => users.value.artists.find((a) => a.id === id)?.full_name || 'Unknown',
        )
      : []

  const writersString = writerNames.length > 0 ? writerNames.join(', ') : 'Not assigned'
  const artistString = artistNames.length > 0 ? artistNames.join(', ') : 'Not assigned'

  // Determine storage key (handle other/social-media)
  let storageKey = `${routeType.value}_projects`
  if (routeType.value === 'social-media') {
    storageKey = 'social-media_projects'
  }

  // Create project object for localStorage
  const newProject = {
    id: Date.now(),
    title: title.value.trim(),
    type: routeType.value,
    sectionHead: sectionHeadName,
    writers: writersString,
    artists: artistString,
    dueDate: dueDateDisplay,
    dueDateISO,
    createdAtISO,
    createdBy: 'Current User',
    created_at: createdAtISO,
    description: description.value.trim() || 'No description provided',
    status: 'Draft',
    content: '',
    lastModified: new Date().toLocaleString(),
    mediaUploaded: 'No media',
    isStarred: false,
    priority: 'Medium',
    department: getDepartmentFromType(routeType.value),
  }

  // Save to localStorage
  const existingProjects = JSON.parse(localStorage.getItem(storageKey) || '[]')
  existingProjects.unshift(newProject)
  localStorage.setItem(storageKey, JSON.stringify(existingProjects))

  console.log('✅ Project assigned and saved to localStorage:', {
    type: routeType.value,
    storageKey,
    project: newProject,
    totalProjects: existingProjects.length,
  })

  // Create initial version for the project
  try {
    createProjectVersion(
      routeType.value,
      newProject.id,
      newProject,
      'Initial project creation',
      'Current User',
      'draft',
    )
  } catch (error) {
    console.error('Error creating initial version:', error)
  }

  showNotification('Project assigned successfully!', 'success')
  setTimeout(() => {
    router.push(cancelPath.value)
  }, 1000)
}

// Helper function to get department based on project type
const getDepartmentFromType = (type) => {
  const typeMap = {
    magazine: 'Editorial',
    newsletter: 'News',
    folio: 'Arts',
    'social-media': 'Marketing',
  }
  return typeMap[type] || 'General'
}

// Save as draft function
const saveAsDraft = () => {
  if (!title.value.trim()) {
    showNotification('Please enter a project title before saving as draft', 'warning')
    return
  }

  // Normalize dates
  const createdAt = new Date()
  const createdAtISO = createdAt.toISOString()
  const dueDateISO = deadline.value ? new Date(deadline.value + 'T00:00:00').toISOString() : ''
  const dueDateDisplay = deadline.value
    ? new Date(deadline.value + 'T00:00:00').toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'No deadline set'

  // Get selected user names (if any selected)
  const sectionHeadName = selectedSectionHead.value
    ? users.value.sectionHeads.find((sh) => sh.id === selectedSectionHead.value)?.full_name ||
      'Not assigned'
    : 'Not assigned'

  const writerNames = selectedWriters.value.map(
    (id) => users.value.writers.find((w) => w.id === id)?.full_name || 'Unknown',
  )
  const artistNames = selectedArtists.value.map(
    (id) => users.value.artists.find((a) => a.id === id)?.full_name || 'Unknown',
  )

  const writersString = writerNames.length > 0 ? writerNames.join(', ') : 'Not assigned'
  const artistsString = artistNames.length > 0 ? artistNames.join(', ') : 'Not assigned'

  // Determine storage key (handle other/social-media)
  let storageKey = `${routeType.value}_projects`
  if (routeType.value === 'social-media') {
    storageKey = 'social-media_projects'
  }

  const draftProject = {
    id: Date.now(),
    title: title.value.trim(),
    type: routeType.value,
    sectionHead: sectionHeadName,
    dueDate: dueDateDisplay,
    dueDateISO,
    createdAtISO,
    createdBy: 'Current User',
    created_at: createdAtISO,
    description: description.value.trim() || 'No description provided',
    writers: writersString,
    artists: artistsString,
    isStarred: false,
    status: 'Draft',
    content: '',
    lastModified: new Date().toLocaleString(),
    mediaUploaded: 'No media',
    priority: 'Medium',
    department: getDepartmentFromType(routeType.value),
  }

  const existingProjects = JSON.parse(localStorage.getItem(storageKey) || '[]')
  existingProjects.unshift(draftProject)
  localStorage.setItem(storageKey, JSON.stringify(existingProjects))

  console.log('✅ Draft saved to localStorage:', {
    type: routeType.value,
    storageKey,
    project: draftProject,
    totalProjects: existingProjects.length,
  })

  showNotification('Project saved as draft!', 'success')
  setTimeout(() => {
    router.push(cancelPath.value)
  }, 1000)
}
</script>

<template>
  <v-app class="add-project-page">
    <MainHeader />

    <v-main class="main-content">
      <h1 class="page-title">Add New {{ categoryLabel }} Project</h1>

      <v-card class="form-card" elevation="1">
        <v-card-text class="pa-6">
          <v-container class="form-grid pa-0">
            <v-row>
              <v-col cols="6" class="left-col pr-3">
                <v-container class="pa-0">
                  <v-row no-gutters>
                    <v-col cols="12" class="form-group">
                      <v-label class="label">Project Title:</v-label>
                      <v-text-field
                        v-model="title"
                        class="input"
                        :placeholder="categoryLabel + ' Title'"
                        variant="outlined"
                        hide-details
                        required
                      />
                    </v-col>

                    <v-col cols="12" class="form-group">
                      <v-label class="label">Section Head</v-label>
                      <v-select
                        v-model="selectedSectionHead"
                        :items="users.sectionHeads"
                        item-title="full_name"
                        item-value="id"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                        placeholder="Select section head"
                        clearable
                      >
                        <template v-slot:item="{ item, props: itemProps }">
                          <v-list-item v-bind="itemProps">
                            <template v-slot:title>
                              <div class="d-flex align-center">
                                <span class="text-body-1">{{ item.raw.full_name }}</span>
                                <v-chip size="small" class="ml-2" color="primary" variant="tonal">
                                  {{ item.raw.role }}
                                </v-chip>
                              </div>
                              <div class="text-caption text-medium-emphasis">
                                {{ item.raw.department }}
                              </div>
                            </template>
                          </v-list-item>
                        </template>
                      </v-select>
                    </v-col>

                    <v-col cols="12" class="form-group">
                      <v-label class="label">Project Type:</v-label>
                      <v-container class="project-type-display pa-3">
                        <v-row align="center" no-gutters>
                          <v-col cols="auto">
                            <v-chip class="type-badge">{{ categoryLabel }}</v-chip>
                          </v-col>
                          <v-spacer />
                          <v-col cols="auto">
                            <v-icon class="type-lock-icon">mdi-lock</v-icon>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-col>

                    <v-col cols="12" class="form-group">
                      <v-label class="label">Description (Optional):</v-label>
                      <v-textarea
                        v-model="description"
                        rows="6"
                        class="textarea"
                        placeholder="Describe the project..."
                        variant="outlined"
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </v-container>
              </v-col>

              <v-col cols="6" class="right-col pl-3">
                <v-container class="pa-0">
                  <v-row no-gutters>
                    <v-col cols="12" class="assign-block">
                      <v-container class="assign-header pa-0">
                        <v-row no-gutters>
                          <v-col cols="12">
                            <v-label class="label">Assign to Writer(s)</v-label>
                            <v-select
                              v-model="selectedWriters"
                              :items="users.writers"
                              item-title="full_name"
                              item-value="id"
                              variant="outlined"
                              density="comfortable"
                              hide-details
                              placeholder="Select writers"
                              multiple
                              chips
                              clearable
                            >
                              <template v-slot:selection="{ item, index }">
                                <v-chip
                                  v-if="index < 3"
                                  size="small"
                                  class="mr-2"
                                  close
                                  @click:close="
                                    selectedWriters = selectedWriters.filter(
                                      (id) => id !== item.raw.id,
                                    )
                                  "
                                >
                                  {{ item.raw.full_name }}
                                </v-chip>
                                <span
                                  v-else-if="index === 3"
                                  class="text-caption text-medium-emphasis"
                                >
                                  +{{ selectedWriters.length - 3 }} more
                                </span>
                              </template>
                              <template v-slot:item="{ item, props: itemProps }">
                                <v-list-item v-bind="itemProps">
                                  <template v-slot:title>
                                    <div class="d-flex align-center">
                                      <span class="text-body-1">{{ item.raw.full_name }}</span>
                                      <v-chip
                                        size="small"
                                        class="ml-2"
                                        color="primary"
                                        variant="tonal"
                                      >
                                        {{ item.raw.role }}
                                      </v-chip>
                                    </div>
                                    <div class="text-caption text-medium-emphasis">
                                      {{ item.raw.department }}
                                    </div>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-select>
                            <div v-if="selectedWriters.length > 0" class="mt-2">
                              <v-chip
                                v-for="writerId in selectedWriters"
                                :key="writerId"
                                size="small"
                                class="mr-1 mb-1"
                                close
                                @click:close="
                                  selectedWriters = selectedWriters.filter((id) => id !== writerId)
                                "
                              >
                                {{
                                  users.writers.find((w) => w.id === writerId)?.full_name ||
                                  'Unknown'
                                }}
                              </v-chip>
                            </div>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-col>

                    <v-col cols="12" class="assign-block">
                      <v-container class="assign-header pa-0">
                        <v-row no-gutters>
                          <v-col cols="12">
                            <v-label class="label">Assign to Artist(s) (Optional)</v-label>
                            <v-select
                              v-model="selectedArtists"
                              :items="users.artists"
                              item-title="full_name"
                              item-value="id"
                              variant="outlined"
                              density="comfortable"
                              hide-details
                              placeholder="Select artists"
                              multiple
                              chips
                              clearable
                            >
                              <template v-slot:selection="{ item, index }">
                                <v-chip
                                  v-if="index < 3"
                                  size="small"
                                  class="mr-2"
                                  close
                                  @click:close="
                                    selectedArtists = selectedArtists.filter(
                                      (id) => id !== item.raw.id,
                                    )
                                  "
                                >
                                  {{ item.raw.full_name }}
                                </v-chip>
                                <span
                                  v-else-if="index === 3"
                                  class="text-caption text-medium-emphasis"
                                >
                                  +{{ selectedArtists.length - 3 }} more
                                </span>
                              </template>

                              <template v-slot:item="{ item, props: itemProps }">
                                <v-list-item v-bind="itemProps">
                                  <template v-slot:title>
                                    <div class="d-flex align-center">
                                      <span class="text-body-1">{{ item.raw.full_name }}</span>
                                      <v-chip
                                        size="small"
                                        class="ml-2"
                                        color="primary"
                                        variant="tonal"
                                      >
                                        {{ item.raw.role }}
                                      </v-chip>
                                    </div>
                                    <div class="text-caption text-medium-emphasis">
                                      {{ item.raw.department }}
                                    </div>
                                  </template>
                                </v-list-item>
                              </template>
                            </v-select>

                            <div v-if="selectedArtists.length > 0" class="mt-2">
                              <v-chip
                                v-for="artistId in selectedArtists"
                                :key="artistId"
                                size="small"
                                class="mr-1 mb-1"
                                close
                                @click:close="
                                  selectedArtists = selectedArtists.filter((id) => id !== artistId)
                                "
                              >
                                {{
                                  users.artists.find((a) => a.id === artistId)?.full_name ||
                                  'Unknown'
                                }}
                              </v-chip>
                            </div>
                          </v-col>
                        </v-row>
                      </v-container>
                    </v-col>

                    <v-col cols="12" class="form-group">
                      <v-label class="label">Deadline:</v-label>
                      <v-text-field
                        v-model="deadline"
                        type="date"
                        class="date-input"
                        variant="outlined"
                        hide-details
                      />
                    </v-col>
                  </v-row>
                </v-container>
              </v-col>
            </v-row>

            <v-row class="actions mt-6 pt-2" style="border-top: 1px solid #e5e7eb">
              <v-col cols="auto">
                <v-btn class="primary" @click="assignProject">Assign Project</v-btn>
              </v-col>
              <v-col cols="auto">
                <v-btn class="draft" @click="saveAsDraft">Save as Draft</v-btn>
              </v-col>
              <v-col cols="auto">
                <v-btn :to="cancelPath" class="tertiary" variant="outlined">Cancel</v-btn>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
      </v-card>
    </v-main>

    <Footer />

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
  </v-app>
</template>

<style scoped>
.add-project-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}

.main-content {
  padding: 32px 24px;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  flex: 1;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 28px 0;
  color: #353535;
  letter-spacing: -0.5px;
}

.form-card {
  border: 1px solid #e0e0e0 !important;
  border-radius: 12px !important;
  background: #ffffff !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
}

.form-grid {
  gap: 24px !important;
}

.form-group {
  margin-bottom: 24px;
}

.left-col {
  padding-right: 20px !important;
}

.right-col {
  padding-left: 20px !important;
  border-left: 1px solid #f0f0f0;
}

.label {
  font-weight: 600;
  display: block;
  margin-bottom: 10px;
  color: #353535;
  font-size: 14px;
  letter-spacing: 0.2px;
}

/* Enhanced input field styles with #353535 focus */
:deep(.v-field) {
  border: 1px solid #d0d0d0 !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  transition: all 0.2s ease !important;
}

:deep(.v-field:hover) {
  border-color: #b0b0b0 !important;
}

:deep(.v-field:focus-within) {
  border-color: #353535 !important;
  border-width: 2px !important;
  box-shadow: 0 0 0 3px rgba(53, 53, 53, 0.1) !important;
}

:deep(.v-field--focused) {
  border-color: #353535 !important;
  border-width: 2px !important;
  box-shadow: 0 0 0 3px rgba(53, 53, 53, 0.1) !important;
}

:deep(.v-field__input) {
  padding: 14px 16px !important;
  font-size: 14px !important;
  color: #353535 !important;
}

:deep(.v-field__input::placeholder) {
  color: #9ca3af !important;
}

:deep(.v-textarea .v-field) {
  min-height: 162px !important;
}

/* Select field enhancements */
:deep(.v-select .v-field) {
  border: 1px solid #d0d0d0 !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  transition: all 0.2s ease !important;
}

:deep(.v-select .v-field:hover) {
  border-color: #b0b0b0 !important;
}

:deep(.v-select .v-field:focus-within) {
  border-color: #353535 !important;
  border-width: 2px !important;
  box-shadow: 0 0 0 3px rgba(53, 53, 53, 0.1) !important;
}

:deep(.v-select .v-field--focused) {
  border-color: #353535 !important;
  border-width: 2px !important;
  box-shadow: 0 0 0 3px rgba(53, 53, 53, 0.1) !important;
}

:deep(.v-select__selection-text) {
  color: #353535 !important;
}

/* Project Type Display with improved styling */
.project-type-display {
  background: #f5f5f5 !important;
  border: 1px solid #e0e0e0 !important;
  border-radius: 8px !important;
  color: #6b7280;
  padding: 16px !important;
}

.type-badge {
  background: #353535 !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  padding: 8px 16px !important;
  border-radius: 6px !important;
}

.type-lock-icon {
  font-size: 18px;
  color: #9ca3af;
}

/* Date input styling */
.date-input :deep(.v-field__input) {
  cursor: pointer !important;
}

.date-input :deep(input[type='date']) {
  color: #353535 !important;
  font-size: 14px !important;
}

.date-input :deep(input[type='date']::-webkit-calendar-picker-indicator) {
  cursor: pointer !important;
  filter: invert(0.3);
  width: 20px;
  height: 20px;
}

/* Assignment section styling */
.select-wrap {
  position: relative;
}

.select-wrap.small {
  min-width: 240px;
  flex: 1;
}

.assign-block {
  margin-bottom: 24px;
}

.assign-header {
  margin-bottom: 12px;
}

.inline {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.select-wrap-col {
  flex: 1;
  min-width: 0;
}

/* Listbox improvements - UPDATED HEIGHT */
.listbox {
  border: 1px solid #e0e0e0 !important;
  border-radius: 8px !important;
  min-height: 100px !important;
  max-height: 140px !important;
  background: #fafafa !important;
  overflow-y: auto;
}

.listbox-empty {
  color: #9ca3af;
  font-size: 14px;
  padding: 24px 16px;
  text-align: center;
  font-style: italic;
}

/* Enhanced button styles with #353535 palette */
.ghost-btn {
  background: #ffffff !important;
  border: 1px solid #d0d0d0 !important;
  color: #353535 !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
  white-space: nowrap !important;
  text-transform: none !important;
  letter-spacing: 0.3px !important;
  padding: 0 20px !important;
  height: 42px !important;
}

.ghost-btn:hover {
  border-color: #353535 !important;
  background: #f8f8f8 !important;
  color: #1f1f1f !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
}

.remove {
  color: #ef4444 !important;
  transition: all 0.2s ease !important;
  min-width: 32px !important;
  width: 32px !important;
  height: 32px !important;
}

.remove:hover {
  background-color: #fee2e2 !important;
  transform: scale(1.1);
}

/* Action buttons with improved styling */
.actions {
  margin-top: 32px !important;
  padding-top: 24px !important;
  border-top: 1px solid #e5e7eb !important;
  gap: 12px !important;
}

.primary {
  background: #353535 !important;
  border: 2px solid #353535 !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
  text-transform: none !important;
  letter-spacing: 0.3px !important;
  padding: 0 32px !important;
  height: 44px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.primary:hover {
  background: #1f1f1f !important;
  border-color: #1f1f1f !important;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.draft {
  background: #ffffff !important;
  border: 2px solid #353535 !important;
  color: #353535 !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
  text-transform: none !important;
  letter-spacing: 0.3px !important;
  padding: 0 32px !important;
  height: 44px !important;
}

.draft:hover {
  background: #f5f5f5 !important;
  border-color: #1f1f1f !important;
  color: #1f1f1f !important;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08) !important;
}

.tertiary {
  background: #ffffff !important;
  color: #6b7280 !important;
  border: 2px solid #d1d5db !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
  text-transform: none !important;
  letter-spacing: 0.3px !important;
  padding: 0 32px !important;
  height: 44px !important;
}

.tertiary:hover {
  border-color: #9ca3af !important;
  background-color: #f9fafb !important;
  color: #374151 !important;
  transform: translateY(-1px);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .main-content {
    max-width: 100%;
    padding: 24px 20px;
  }

  .page-title {
    font-size: 28px;
  }
}

@media (max-width: 960px) {
  .left-col,
  .right-col {
    padding: 0 !important;
    border: none !important;
  }

  .right-col {
    margin-top: 24px;
    padding-top: 24px !important;
    border-top: 1px solid #f0f0f0 !important;
  }

  .form-grid {
    gap: 16px !important;
  }

  .select-wrap.small {
    min-width: 200px;
  }
}

@media (max-width: 600px) {
  .main-content {
    padding: 20px 16px;
  }

  .page-title {
    font-size: 24px;
    margin-bottom: 20px;
  }

  .form-card {
    border-radius: 8px !important;
  }

  .inline {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .select-wrap.small {
    width: 100%;
    min-width: 100%;
  }

  .ghost-btn {
    width: 100%;
    justify-content: center;
  }

  .actions {
    margin-top: 24px !important;
    padding-top: 20px !important;
  }

  .actions .v-col {
    width: 100%;
    padding: 4px 0 !important;
  }

  :deep(.actions .v-btn) {
    width: 100%;
    justify-content: center;
  }

  .listbox {
    min-height: 60px !important;
    max-height: 120px !important;
  }

  .form-group {
    margin-bottom: 20px;
  }
}

/* Scrollbar styling for listbox */
.listbox::-webkit-scrollbar {
  width: 8px;
}

.listbox::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 4px;
}

.listbox::-webkit-scrollbar-thumb {
  background: #d0d0d0;
  border-radius: 4px;
}

.listbox::-webkit-scrollbar-thumb:hover {
  background: #b0b0b0;
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
</style>
