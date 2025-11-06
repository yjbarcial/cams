<script setup>
import { ref, computed, watch } from 'vue'
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

// Options per category (demo data; could be fetched)
const baseWriterOptions = {
  magazine: ['Maria Dela Cruz', 'Juan Santos', 'Rey Dela Cruz'],
  newsletter: ['Sarah Johnson', 'Michael Chen', 'Emily Rodriguez'],
  folio: ['John Santos', 'James Rivera', 'Jane Rodriguez'],
  'social-media': ["Ryan O'Connor", 'Maya Patel', 'Jessica Park'],
}
const baseArtistOptions = {
  magazine: ['Maria Dela Cruz', 'Juan Santos', 'Ella Domingo'],
  newsletter: ['David Kim', 'Lisa Wang', 'Alex Thompson'],
  folio: ['Maria Garcia', 'Carlos Martinez', 'Ana Lopez'],
  'social-media': ['Kevin Liu', 'Sophie Anderson', 'Marcus Johnson'],
}

const writerOptions = ref([])
const artistOptions = ref([])

// Selected lists
const writers = ref([])
const artists = ref([])

// Selections from dropdowns before adding
const selectedWriter = ref('')
const selectedArtist = ref('')

watch(
  routeType,
  (t) => {
    writerOptions.value = baseWriterOptions[t] || []
    artistOptions.value = baseArtistOptions[t] || []
    writers.value = []
    artists.value = []
    selectedWriter.value = ''
    selectedArtist.value = ''
  },
  { immediate: true },
)

const addSelected = (kind) => {
  if (kind === 'writer' && selectedWriter.value) {
    if (!writers.value.includes(selectedWriter.value)) {
      writers.value.push(selectedWriter.value)
    }
    selectedWriter.value = ''
  }
  if (kind === 'artist' && selectedArtist.value) {
    if (!artists.value.includes(selectedArtist.value)) {
      artists.value.push(selectedArtist.value)
    }
    selectedArtist.value = ''
  }
}

const removeItem = (kind, idx) => {
  if (kind === 'writer') writers.value.splice(idx, 1)
  if (kind === 'artist') artists.value.splice(idx, 1)
}

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
    alert('Please enter a project title')
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

  const writersString = writers.value.length > 0 ? writers.value.join(', ') : 'Not assigned'
  const artistsString = artists.value.length > 0 ? artists.value.join(', ') : 'Not assigned'

  const newProject = {
    id: Date.now(),
    title: title.value.trim(),
    type: routeType.value,
    sectionHead: sectionHead.value.trim() || 'Not assigned',
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

  const storageKey = `${routeType.value}_projects`
  const existingProjects = JSON.parse(localStorage.getItem(storageKey) || '[]')
  existingProjects.unshift(newProject)
  localStorage.setItem(storageKey, JSON.stringify(existingProjects))

  console.log('✅ Project saved:', {
    type: newProject.type,
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

  router.push(cancelPath.value)
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

// Add to script setup section
const saveAsDraft = () => {
  if (!title.value.trim()) {
    alert('Please enter a project title before saving as draft')
    return
  }

  // Create draft project with same structure as assignProject
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

  const writersString = writers.value.length > 0 ? writers.value.join(', ') : 'Not assigned'
  const artistsString = artists.value.length > 0 ? artists.value.join(', ') : 'Not assigned'

  const draftProject = {
    id: Date.now(),
    title: title.value.trim(),
    type: routeType.value, // Use routeType.value instead of categoryLabel.value
    sectionHead: sectionHead.value.trim() || 'Not assigned',
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

  const storageKey = `${routeType.value}_projects`
  const existingProjects = JSON.parse(localStorage.getItem(storageKey) || '[]')
  existingProjects.unshift(draftProject)
  localStorage.setItem(storageKey, JSON.stringify(existingProjects))

  console.log('Draft saved:', draftProject)

  // Navigate back
  router.push(cancelPath.value)
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
                      <v-label class="label">Section Head:</v-label>
                      <v-text-field
                        v-model="sectionHead"
                        class="input"
                        placeholder="Name of Section Head"
                        variant="outlined"
                        hide-details
                      />
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
                            <v-row class="inline" no-gutters align="center">
                              <v-col cols="auto" class="select-wrap-col">
                                <v-container class="select-wrap small pa-0">
                                  <v-select
                                    v-model="selectedWriter"
                                    :items="writerOptions"
                                    placeholder="List of Writers"
                                    class="select"
                                    variant="outlined"
                                    hide-details
                                  />
                                </v-container>
                              </v-col>
                              <v-col cols="auto" class="ml-3">
                                <v-btn
                                  class="ghost-btn"
                                  variant="outlined"
                                  @click="addSelected('writer')"
                                >
                                  +Add Writer
                                </v-btn>
                              </v-col>
                            </v-row>
                          </v-col>
                        </v-row>
                      </v-container>
                      <v-card class="listbox mt-3" flat>
                        <v-card-text class="pa-3">
                          <v-container v-if="writers.length === 0" class="listbox-empty pa-0">
                            <v-row justify="center">
                              <v-col cols="12" class="text-center">No writers selected</v-col>
                            </v-row>
                          </v-container>
                          <v-container
                            v-for="(w, idx) in writers"
                            :key="w + idx"
                            class="listbox-item pa-0"
                          >
                            <v-row align="center" no-gutters>
                              <v-col>{{ w }}</v-col>
                              <v-col cols="auto">
                                <v-btn
                                  class="remove"
                                  size="small"
                                  variant="text"
                                  icon
                                  @click="removeItem('writer', idx)"
                                  aria-label="Remove writer"
                                >
                                  <v-icon>mdi-close</v-icon>
                                </v-btn>
                              </v-col>
                            </v-row>
                          </v-container>
                        </v-card-text>
                      </v-card>
                    </v-col>

                    <v-col cols="12" class="assign-block">
                      <v-container class="assign-header pa-0">
                        <v-row no-gutters>
                          <v-col cols="12">
                            <v-label class="label">Assign to Artist(s)</v-label>
                            <v-row class="inline" no-gutters align="center">
                              <v-col cols="auto" class="select-wrap-col">
                                <v-container class="select-wrap small pa-0">
                                  <v-select
                                    v-model="selectedArtist"
                                    :items="artistOptions"
                                    placeholder="List of Artists"
                                    class="select"
                                    variant="outlined"
                                    hide-details
                                  />
                                </v-container>
                              </v-col>
                              <v-col cols="auto" class="ml-3">
                                <v-btn
                                  class="ghost-btn"
                                  variant="outlined"
                                  @click="addSelected('artist')"
                                >
                                  +Add Artist
                                </v-btn>
                              </v-col>
                            </v-row>
                          </v-col>
                        </v-row>
                      </v-container>
                      <v-card class="listbox mt-3" flat>
                        <v-card-text class="pa-3">
                          <v-container v-if="artists.length === 0" class="listbox-empty pa-0">
                            <v-row justify="center">
                              <v-col cols="12" class="text-center">No artists selected</v-col>
                            </v-row>
                          </v-container>
                          <v-container
                            v-for="(a, idx) in artists"
                            :key="a + idx"
                            class="listbox-item pa-0"
                          >
                            <v-row align="center" no-gutters>
                              <v-col>{{ a }}</v-col>
                              <v-col cols="auto">
                                <v-btn
                                  class="remove"
                                  size="small"
                                  variant="text"
                                  icon
                                  @click="removeItem('artist', idx)"
                                  aria-label="Remove artist"
                                >
                                  <v-icon>mdi-close</v-icon>
                                </v-btn>
                              </v-col>
                            </v-row>
                          </v-container>
                        </v-card-text>
                      </v-card>
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
</style>
