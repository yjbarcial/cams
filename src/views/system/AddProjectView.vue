<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

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

  const newProject = {
    id: Date.now(), // Simple ID generation
    title: title.value,
    type: categoryLabel.value,
    sectionHead: sectionHead.value || 'Unassigned',
    dueDate: dueDateDisplay,
    dueDateISO,
    createdAtISO,
    description: description.value || 'No description provided',
    writers: writers.value.join(', ') || 'Unassigned',
    artists: artists.value.join(', ') || 'Unassigned',
    isStarred: false,
    status: 'In Progress',
  }

  // Store in localStorage for persistence across page refreshes
  const storageKey = `${routeType.value}_projects`
  const existingProjects = JSON.parse(localStorage.getItem(storageKey) || '[]')
  existingProjects.unshift(newProject) // Add to beginning of array
  localStorage.setItem(storageKey, JSON.stringify(existingProjects))

  // Navigate back to the category view
  router.push(cancelPath.value)
}

// Add to script setup section
const saveAsDraft = () => {
  // Draft saving logic here
  console.log('Saving as draft...')
}
</script>

<template>
  <div class="add-project-page">
    <MainHeader />

    <main class="main-content">
      <h1 class="page-title">Add New {{ categoryLabel }} Project</h1>

      <section class="form-card">
        <div class="form-grid">
          <div class="left-col">
            <div class="form-group">
              <label class="label">Project Title:</label>
              <input
                v-model="title"
                type="text"
                class="input"
                :placeholder="categoryLabel + ' Title'"
                required
              />
            </div>

            <div class="form-group">
              <label class="label">Section Head:</label>
              <input
                v-model="sectionHead"
                type="text"
                class="input"
                placeholder="Name of Section Head"
              />
            </div>

            <div class="form-group">
              <label class="label">Project Type:</label>
              <div class="project-type-display">
                <span class="type-badge">{{ categoryLabel }}</span>
                <span class="type-lock-icon">🔒</span>
              </div>
            </div>

            <div class="form-group">
              <label class="label">Deadline:</label>
              <input v-model="deadline" type="date" class="date-input" />
            </div>

            <div class="form-group">
              <label class="label">Description (Optional):</label>
              <textarea
                v-model="description"
                rows="6"
                class="textarea"
                placeholder="Describe the project..."
              ></textarea>
            </div>
          </div>

          <div class="right-col">
            <div class="assign-block">
              <div class="assign-header">
                <label class="label">Assign to Writer(s)</label>
                <div class="inline">
                  <div class="select-wrap small">
                    <select v-model="selectedWriter" class="select">
                      <option value="">List of Writers</option>
                      <option v-for="w in writerOptions" :key="w" :value="w">{{ w }}</option>
                    </select>
                    <span class="mdi mdi-menu-down select-caret"></span>
                  </div>
                  <button class="ghost-btn" @click="addSelected('writer')">
                    +Add Another Writer
                  </button>
                </div>
              </div>
              <div class="listbox" aria-label="Selected writers">
                <div v-if="writers.length === 0" class="listbox-empty">No writers selected</div>
                <div v-for="(w, idx) in writers" :key="w + idx" class="listbox-item">
                  <span>{{ w }}</span>
                  <button
                    class="remove"
                    @click="removeItem('writer', idx)"
                    aria-label="Remove writer"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <div class="assign-block">
              <div class="assign-header">
                <label class="label">Assign to Artist(s)</label>
                <div class="inline">
                  <div class="select-wrap small">
                    <select v-model="selectedArtist" class="select">
                      <option value="">List of Artists</option>
                      <option v-for="a in artistOptions" :key="a" :value="a">{{ a }}</option>
                    </select>
                    <span class="mdi mdi-menu-down select-caret"></span>
                  </div>
                  <button class="ghost-btn" @click="addSelected('artist')">
                    +Add Another Artist
                  </button>
                </div>
              </div>
              <div class="listbox" aria-label="Selected artists">
                <div v-if="artists.length === 0" class="listbox-empty">No artists selected</div>
                <div v-for="(a, idx) in artists" :key="a + idx" class="listbox-item">
                  <span>{{ a }}</span>
                  <button
                    class="remove"
                    @click="removeItem('artist', idx)"
                    aria-label="Remove artist"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="primary" @click="assignProject">Assign Project</button>
          <button class="draft" @click="saveAsDraft">Save as Draft</button>
          <RouterLink :to="cancelPath" class="tertiary">Cancel</RouterLink>
        </div>
      </section>
    </main>

    <Footer />
  </div>
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
  border: 2px solid #d1d5db;
  border-radius: 12px;
  padding: 24px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.form-group {
  margin-bottom: 20px;
}

.label {
  font-weight: 700;
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-size: 14px;
}

.input,
.select,
.date-input,
.textarea {
  width: 100%;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  padding: 12px 16px;
  background: #fff;
  font-size: 14px;
  transition: border-color 0.2s ease;
}

.input:focus,
.select:focus,
.date-input:focus,
.textarea:focus {
  outline: none;
  border-color: #f5c52b;
  box-shadow: 0 0 0 3px rgba(245, 197, 43, 0.1);
}

.textarea {
  resize: vertical;
  min-height: 120px;
}

.project-type-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
}

.type-badge {
  background: #f5c52b;
  color: #1f2937;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
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

.select-caret {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #6b7280;
  font-size: 18px;
}

.listbox {
  border: 2px solid #d1d5db;
  border-radius: 8px;
  padding: 12px;
  min-height: 100px;
  background: #fff;
  overflow-y: auto;
  max-height: 200px;
}

.listbox-empty {
  color: #9ca3af;
  font-size: 14px;
  text-align: center;
  padding: 20px;
  font-style: italic;
}

.listbox-item {
  padding: 8px 12px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

.assign-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 12px;
}

.inline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ghost-btn {
  background: #ffffff;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.ghost-btn:hover {
  border-color: #f5c52b;
  color: #1f2937;
}

.remove {
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 20px;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.remove:hover {
  background-color: #fef2f2;
}

.actions {
  display: flex;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.primary {
  background: #f5c52b;
  border: 2px solid #d4a017;
  color: #1f2937;
  padding: 14px 24px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
}

.primary:hover {
  background: #e6b800;
  border-color: #b8941f;
  transform: translateY(-1px);
}

.draft {
  background: #353535; /* Gray-500 */
  border: 2px solid #353535; /* Gray-600 */
  color: #ffffff;
  padding: 14px 24px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
}

.draft:hover {
  background: #4b5563; /* Gray-600 */
  border-color: #374151; /* Gray-700 */
  transform: translateY(-1px);
}

.tertiary {
  background: #fff;
  color: #374151;
  border: 2px solid #d1d5db;
  padding: 14px 24px;
  border-radius: 10px;
  font-weight: 700;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  font-size: 16px;
  transition: all 0.2s ease;
}

.tertiary:hover {
  border-color: #9ca3af;
  background-color: #f9fafb;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .assign-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .inline {
    width: 100%;
    justify-content: flex-start;
  }

  .actions {
    flex-direction: column;
  }

  .primary,
  .draft,
  .tertiary {
    width: 100%;
    justify-content: center;
  }
}
</style>
