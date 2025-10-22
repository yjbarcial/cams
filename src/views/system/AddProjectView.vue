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
                      <v-label class="label">Deadline:</v-label>
                      <v-text-field
                        v-model="deadline"
                        type="date"
                        class="date-input"
                        variant="outlined"
                        hide-details
                      />
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
                                  +Add Another Writer
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
                                  +Add Another Artist
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
  background: #ffffff;
}

.main-content {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 24px 0;
  color: #1f2937;
}

.form-card {
  border: 2px solid #d1d5db !important;
  border-radius: 12px !important;
  background: #ffffff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

.form-grid {
  gap: 16px !important;
}

.form-group {
  margin-bottom: 20px;
}

.left-col {
  padding-right: 12px !important;
}

.right-col {
  padding-left: 12px !important;
}

.label {
  font-weight: 700;
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-size: 14px;
}

/* Override Vuetify field styles to match original design and remove outlines */
:deep(.v-field) {
  border: 2px solid #d1d5db !important;
  border-radius: 8px !important;
  background: #fff !important;
}

:deep(.v-field:hover) {
  border-color: #d1d5db !important;
}

:deep(.v-field:focus-within) {
  border-color: #d1d5db !important;
  box-shadow: none !important;
  outline: none !important;
}

:deep(.v-field--focused) {
  border-color: #d1d5db !important;
  box-shadow: none !important;
  outline: none !important;
}

:deep(.v-field__input) {
  padding: 12px 16px !important;
  font-size: 14px !important;
}

:deep(.v-field__input:focus) {
  outline: none !important;
  box-shadow: none !important;
}

:deep(.v-textarea .v-field) {
  min-height: 120px !important;
}

/* Remove focus outlines from select fields */
:deep(.v-select .v-field) {
  border: 2px solid #d1d5db !important;
  border-radius: 8px !important;
  background: #fff !important;
}

:deep(.v-select .v-field:focus-within) {
  border-color: #d1d5db !important;
  box-shadow: none !important;
  outline: none !important;
}

:deep(.v-select .v-field--focused) {
  border-color: #d1d5db !important;
  box-shadow: none !important;
  outline: none !important;
}

.project-type-display {
  background: #f9fafb !important;
  border: 2px solid #e5e7eb !important;
  border-radius: 8px !important;
  color: #6b7280;
}

.type-badge {
  background: #f5c52b !important;
  color: #1f2937 !important;
  font-weight: 700 !important;
  font-size: 14px !important;
}

.type-lock-icon {
  font-size: 16px;
  opacity: 0.7;
}

.select-wrap {
  position: relative;
}

.select-wrap.small {
  width: 220px;
}

.listbox {
  border: 2px solid #d1d5db !important;
  border-radius: 8px !important;
  min-height: 100px;
  background: #fff !important;
  overflow-y: auto;
  max-height: 200px;
}

.listbox-empty {
  color: #9ca3af;
  font-size: 14px;
  padding: 20px 0;
  font-style: italic;
}

.listbox-item {
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.listbox-item:hover {
  background-color: #f9fafb;
}

.listbox-item:last-child {
  border-bottom: none;
}

.assign-block {
  margin-bottom: 24px;
}

.ghost-btn {
  background: #ffffff !important;
  border: 2px solid #d1d5db !important;
  color: #374151 !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
  white-space: nowrap !important;
}

.ghost-btn:hover {
  border-color: #f5c52b !important;
  color: #1f2937 !important;
}

.remove {
  color: #ef4444 !important;
  transition: background-color 0.2s ease !important;
}

.remove:hover {
  background-color: #fef2f2 !important;
}

.primary {
  background: #f5c52b !important;
  border: 2px solid #d4a017 !important;
  color: #1f2937 !important;
  font-weight: 700 !important;
  transition: all 0.2s ease !important;
}

.primary:hover {
  background: #e6b800 !important;
  border-color: #b8941f !important;
  transform: translateY(-1px);
}

.draft {
  background: #353535 !important;
  border: 2px solid #353535 !important;
  color: #ffffff !important;
  font-weight: 700 !important;
  transition: all 0.2s ease !important;
}

.draft:hover {
  background: #4b5563 !important;
  border-color: #374151 !important;
  transform: translateY(-1px);
}

.tertiary {
  background: #fff !important;
  color: #374151 !important;
  border: 2px solid #d1d5db !important;
  font-weight: 700 !important;
  transition: all 0.2s ease !important;
}

.tertiary:hover {
  border-color: #9ca3af !important;
  background-color: #f9fafb !important;
}

@media (max-width: 900px) {
  .form-grid {
    gap: 24px !important;
  }

  .left-col,
  .right-col {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  :deep(.v-row) {
    flex-direction: column;
  }

  .actions .v-col {
    width: 100%;
  }

  :deep(.actions .v-btn) {
    width: 100%;
    justify-content: center;
  }
}
</style>
