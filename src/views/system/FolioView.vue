<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import ProjectHistoryButton from '@/components/ProjectHistoryButton.vue'

const router = useRouter()
const route = useRoute()

// Initialize projects with localStorage data
const projects = ref([])

// Load projects from localStorage on component mount
onMounted(() => {
  loadProjects()
})

// Watch for route changes to reload projects
watch(
  () => route.path,
  () => {
    if (route.path === '/folio') {
      loadProjects()
    }
  },
)

const loadProjects = () => {
  const savedProjects = JSON.parse(localStorage.getItem('folio_projects') || '[]')
  projects.value = savedProjects.filter((p) => p.type === 'folio')
}

// ADD THIS FUNCTION
const formatDate = (dateString) => {
  if (!dateString) return 'No deadline set'

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString

  const options = { year: 'numeric', month: 'short', day: 'numeric' }
  return date.toLocaleDateString('en-US', options)
}

// Status formatter function
const formatStatus = (status) => {
  if (!status) return 'Draft'

  // Replace underscores with spaces and capitalize each word
  let formatted = status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  // Special case: "To Editor In Chief" should be "To Editor-in-Chief"
  formatted = formatted.replace(/Editor In Chief/g, 'Editor-in-Chief')

  // Ensure proper capitalization for Chief Adviser
  formatted = formatted.replace(/Chief Adviser/gi, 'Chief Adviser')

  // Ensure proper capitalization for For Publish
  formatted = formatted.replace(/For Publish/gi, 'For Publish')

  return formatted
}

const searchQuery = ref('')
const sortOrder = ref('Date Added ↓')
const showOnlyStarred = ref(false)

// Edit and delete functionality
const editingProject = ref(null)
const showEditDialog = ref(false)
const showDeleteConfirm = ref(false)
const projectToDelete = ref(null)

const handleView = (projectId) => {
  const project = projects.value.find((p) => String(p.id) === String(projectId))

  if (!project) {
    console.error('Project not found')
    return
  }

  // Route based on project status - Use string paths with query parameters
  if (project.status === 'draft' || project.status === 'returned_by_section_head') {
    router.push(`/project/${projectId}?type=folio`)
  } else if (
    project.status === 'to_section_head' ||
    project.status === 'returned_by_technical_editor' ||
    project.status === 'returned_by_creative_director'
  ) {
    router.push(`/section-head/${projectId}?type=folio`)
  } else if (
    project.status === 'to_technical_editor' ||
    project.status === 'to_creative_director'
  ) {
    router.push(`/technical-editor/${projectId}?type=folio`)
  } else if (
    project.status === 'to_editor_in_chief' ||
    project.status === 'EIC Review' ||
    project.status === 'Returned by EIC' ||
    project.status === 'Returned by Chief Adviser'
  ) {
    router.push(`/editor-in-chief/${projectId}?type=folio`)
  } else if (project.status === 'For Publish') {
    router.push(`/archival-manager/${projectId}?type=folio`)
  } else if (project.status === 'To Chief Adviser' || project.status === 'Adviser Review') {
    router.push(`/chief-adviser/${projectId}?type=folio`)
  } else if (project.status === 'Published' || project.status === 'EIC Approved') {
    router.push(`/project/${projectId}?type=folio`)
  } else {
    router.push(`/project/${projectId}?type=folio`)
  }
}

const toggleStar = (projectId) => {
  const project = projects.value.find((p) => p.id === projectId)
  if (project) {
    project.isStarred = !project.isStarred
    const savedProjects = JSON.parse(localStorage.getItem('folio_projects') || '[]')
    const updatedProjects = savedProjects.map((p) =>
      p.id === projectId ? { ...p, isStarred: project.isStarred } : p,
    )
    localStorage.setItem('folio_projects', JSON.stringify(updatedProjects))
  }
}

// Helpers for date-based sorts
const getDueMs = (p) => {
  if (p.dueDateISO) {
    const ms = Date.parse(p.dueDateISO)
    if (!Number.isNaN(ms)) return ms
  }
  if (p.dueDate) {
    const ms = Date.parse(p.dueDate)
    if (!Number.isNaN(ms)) return ms
  }
  return Number.POSITIVE_INFINITY
}

const getCreatedMs = (p) => {
  if (p.createdAtISO) {
    const ms = Date.parse(p.createdAtISO)
    if (!Number.isNaN(ms)) return ms
  }
  return 0
}

const filteredProjects = computed(() => {
  let filtered = projects.value

  if (searchQuery.value) {
    filtered = filtered.filter(
      (project) =>
        project.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (project.sectionHead || '').toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  }

  if (showOnlyStarred.value) {
    filtered = filtered.filter((project) => project.isStarred)
  }

  const order = sortOrder.value
  filtered = [...filtered].sort((a, b) => {
    if (order === 'A - Z') return a.title.localeCompare(b.title)
    if (order === 'Z - A') return b.title.localeCompare(a.title)
    if (order === 'Starred First') {
      if (a.isStarred && !b.isStarred) return -1
      if (!a.isStarred && b.isStarred) return 1
      return a.title.localeCompare(b.title)
    }
    if (order === 'Due Date ↑') return getDueMs(a) - getDueMs(b)
    if (order === 'Due Date ↓') return getDueMs(b) - getDueMs(a)
    if (order === 'Date Added ↑') return getCreatedMs(a) - getCreatedMs(b)
    if (order === 'Date Added ↓') return getCreatedMs(b) - getCreatedMs(a)
    return 0
  })

  return filtered
})

const canEditProject = (project) => {
  return true
}

const startEdit = (project) => {
  editingProject.value = { ...project }
  showEditDialog.value = true
}

const saveEdit = () => {
  if (!editingProject.value.title.trim()) {
    alert('Please enter a project title')
    return
  }

  const projectIndex = projects.value.findIndex((p) => p.id === editingProject.value.id)
  if (projectIndex !== -1) {
    projects.value[projectIndex] = { ...editingProject.value }
    const savedProjects = JSON.parse(localStorage.getItem('folio_projects') || '[]')
    const updatedProjects = savedProjects.map((p) =>
      p.id === editingProject.value.id ? { ...editingProject.value } : p,
    )
    localStorage.setItem('folio_projects', JSON.stringify(updatedProjects))
  }

  editingProject.value = null
  showEditDialog.value = false
}

const cancelEdit = () => {
  editingProject.value = null
  showEditDialog.value = false
}

const startDelete = (project) => {
  projectToDelete.value = project
  showDeleteConfirm.value = true
}

const confirmDelete = () => {
  if (projectToDelete.value) {
    projects.value = projects.value.filter((p) => p.id !== projectToDelete.value.id)
    const savedProjects = JSON.parse(localStorage.getItem('folio_projects') || '[]')
    const updatedProjects = savedProjects.filter((p) => p.id !== projectToDelete.value.id)
    localStorage.setItem('folio_projects', JSON.stringify(updatedProjects))
  }

  showDeleteConfirm.value = false
  projectToDelete.value = null
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  projectToDelete.value = null
}

const deleteFromEdit = () => {
  if (editingProject.value) {
    projectToDelete.value = editingProject.value
    showEditDialog.value = false
    showDeleteConfirm.value = true
  }
}
</script>

<template>
  <v-app class="folio-page">
    <MainHeader />

    <v-main class="main-content">
      <v-container fluid class="projects-container pa-5">
        <!-- Search and Controls -->
        <div class="controls-section">
          <div class="search-section">
            <label for="search" class="search-label">Search:</label>
            <div class="search-input-container">
              <v-icon class="search-icon">mdi-magnify</v-icon>
              <v-text-field
                id="search"
                v-model="searchQuery"
                class="search-input"
                placeholder="Search folios..."
                variant="outlined"
                hide-details
                single-line
                density="compact"
              />
              <v-icon class="search-filter">mdi-tune</v-icon>
            </div>
          </div>

          <div class="sort-section">
            <label class="sort-label">Sort by:</label>
            <v-select
              v-model="sortOrder"
              class="sort-select"
              :items="[
                'A - Z',
                'Z - A',
                'Starred First',
                'Due Date ↑',
                'Due Date ↓',
                'Date Added ↑',
                'Date Added ↓',
              ]"
              variant="outlined"
              hide-details
              single-line
              density="compact"
            />
          </div>

          <div class="filter-section">
            <label class="filter-label">
              <v-checkbox
                v-model="showOnlyStarred"
                class="filter-checkbox"
                hide-details
                density="compact"
              />
              <span class="checkbox-text">Show starred only</span>
            </label>
          </div>

          <div class="spacer"></div>

          <div>
            <RouterLink to="/folio/new" class="add-project-btn">Add Project</RouterLink>
          </div>
        </div>

        <!-- Projects Table -->
        <v-container fluid class="projects-table pa-0">
          <v-row class="table-header" no-gutters>
            <v-col class="header-cell title-header">Title</v-col>
            <v-col class="header-cell">Section Head</v-col>
            <v-col class="header-cell">Due Date</v-col>
            <v-col class="header-cell">Status</v-col>
            <v-col class="header-cell actions-header">Actions</v-col>
          </v-row>

          <v-container fluid class="table-body pa-0">
            <v-row
              v-for="project in filteredProjects"
              :key="project.id"
              class="table-row"
              no-gutters
            >
              <v-col class="table-cell title-cell">
                <v-btn
                  class="star-button"
                  @click="toggleStar(project.id)"
                  :class="{ starred: project.isStarred }"
                  variant="text"
                  icon
                  size="small"
                  aria-label="Toggle favorite"
                >
                  <v-icon>{{ project.isStarred ? 'mdi-star' : 'mdi-star-outline' }}</v-icon>
                </v-btn>
                {{ project.title }}
              </v-col>
              <v-col class="table-cell">{{ project.sectionHead }}</v-col>
              <v-col class="table-cell">{{ formatDate(project.dueDate) }}</v-col>
              <v-col class="table-cell">{{ formatStatus(project.status) }}</v-col>
              <v-col class="table-cell actions-cell">
                <v-btn
                  class="action-btn view-btn"
                  @click="handleView(project.id)"
                  variant="text"
                  icon
                  size="small"
                  aria-label="View and edit project"
                  title="View and edit project"
                >
                  <v-icon>mdi-eye</v-icon>
                </v-btn>

                <v-btn
                  v-if="canEditProject(project)"
                  class="action-btn edit-btn"
                  @click="startEdit(project)"
                  variant="text"
                  icon
                  size="small"
                  aria-label="Edit project details"
                  title="Edit project details"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <ProjectHistoryButton
                  :project-id="project.id"
                  project-type="folio"
                  button-text=""
                  variant="text"
                  size="small"
                  icon="mdi-history"
                  class="action-btn history-btn"
                />
                <v-btn
                  v-if="canEditProject(project)"
                  class="action-btn delete-btn"
                  @click="startDelete(project)"
                  variant="text"
                  icon
                  size="small"
                  aria-label="Delete project"
                  title="Delete project"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </v-container>
        </v-container>
      </v-container>
    </v-main>

    <!-- Edit Project Modal - COPIED FROM MAGAZINEVIEW -->
    <v-dialog v-model="showEditDialog" max-width="550px" persistent>
      <v-card class="edit-dialog-card">
        <v-card-title class="edit-dialog-header">
          <v-icon class="mr-2" size="24">mdi-pencil</v-icon>
          <span>Edit Project</span>
        </v-card-title>

        <v-divider class="dialog-divider" />

        <v-card-text class="edit-dialog-content">
          <v-form @submit.prevent="saveEdit" v-if="editingProject">
            <div class="form-field">
              <label class="field-label">Project Title</label>
              <v-text-field
                v-model="editingProject.title"
                variant="outlined"
                density="comfortable"
                placeholder="Enter project title"
                hide-details="auto"
                :rules="[(v) => !!v || 'Title is required']"
              />
            </div>

            <div class="form-field">
              <label class="field-label">Section Head</label>
              <v-text-field
                v-model="editingProject.sectionHead"
                variant="outlined"
                density="comfortable"
                placeholder="Enter section head name"
                hide-details
              />
            </div>

            <div class="form-field">
              <label class="field-label">Due Date</label>
              <v-text-field
                v-model="editingProject.dueDate"
                type="date"
                variant="outlined"
                density="comfortable"
                hide-details
                prepend-inner-icon="mdi-calendar"
              />
            </div>

            <div class="form-field">
              <label class="field-label">Status</label>
              <v-select
                v-model="editingProject.status"
                :items="[
                  'draft',
                  'to_section_head',
                  'to_editor_in_chief',
                  'to_technical_editor',
                  'to_creative_director',
                  'to_publish',
                  'published',
                ]"
                variant="outlined"
                density="comfortable"
                hide-details
              />
            </div>
          </v-form>
        </v-card-text>

        <v-divider class="dialog-divider" />

        <v-card-actions class="edit-dialog-actions">
          <v-btn
            @click="deleteFromEdit"
            variant="outlined"
            size="default"
            class="delete-from-edit-btn"
            prepend-icon="mdi-delete"
          >
            Delete
          </v-btn>
          <v-spacer />
          <v-btn @click="cancelEdit" variant="outlined" size="default" class="cancel-btn">
            Cancel
          </v-btn>
          <v-btn
            @click="saveEdit"
            variant="flat"
            size="default"
            class="save-btn"
            prepend-icon="mdi-content-save"
          >
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Modal - COPIED FROM MAGAZINEVIEW -->
    <v-dialog v-model="showDeleteConfirm" max-width="500px" persistent>
      <v-card class="delete-dialog-card">
        <v-card-title class="delete-dialog-header">
          <v-icon class="mr-2" size="24">mdi-alert-circle</v-icon>
          <span>Confirm Delete</span>
        </v-card-title>

        <v-divider class="dialog-divider" />

        <v-card-text class="delete-dialog-content" v-if="projectToDelete">
          <div class="delete-info-box">
            <p class="delete-message">
              Are you sure you want to delete the project
              <strong>"{{ projectToDelete.title }}"</strong>?
            </p>
          </div>

          <v-alert type="error" variant="tonal" density="comfortable" class="warning-alert">
            <template v-slot:prepend>
              <v-icon size="20">mdi-alert</v-icon>
            </template>
            <div class="alert-text"><strong>Warning:</strong> This action cannot be undone.</div>
          </v-alert>
        </v-card-text>

        <v-divider class="dialog-divider" />

        <v-card-actions class="delete-dialog-actions">
          <v-btn @click="cancelDelete" variant="outlined" size="default" class="cancel-btn">
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            @click="confirmDelete"
            variant="flat"
            size="default"
            prepend-icon="mdi-delete"
            class="confirm-delete-btn"
          >
            Delete Project
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <Footer />
  </v-app>
</template>

<style scoped>
.folio-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: white;
}

.main-content {
  flex: 1;
  padding: 0 !important;
}

.projects-container {
  width: 100% !important;
  max-width: none !important;
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
  min-height: 40px;
}

.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-label {
  font-weight: 600;
  color: #2f2f2f;
  white-space: nowrap;
  font-size: 14px;
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

:deep(.search-input .v-field) {
  min-height: 40px !important;
  height: 40px !important;
  border: 1px solid #d1d5db !important;
  border-radius: 6px !important;
  background-color: #f9fafb !important;
  font-size: 14px !important;
  width: 300px !important;
}

:deep(.search-input .v-field:focus-within) {
  border-color: #3b82f6 !important;
  background-color: white !important;
}

:deep(.search-input .v-field__input) {
  padding: 8px 12px 8px 36px !important;
  min-height: auto !important;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #6b7280;
  font-size: 16px;
  z-index: 1;
}

.search-filter {
  position: absolute;
  right: 12px;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
  z-index: 1;
}

.sort-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-label {
  font-weight: 600;
  color: #2f2f2f;
  white-space: nowrap;
  font-size: 14px;
}

.sort-select {
  width: 170px;
}

:deep(.sort-select .v-field) {
  min-height: 40px !important;
  height: 40px !important;
  background-color: #f9fafb !important;
  border: 1px solid #d1d5db !important;
  border-radius: 6px !important;
  color: #2f2f2f !important;
  font-size: 14px !important;
  width: 150px !important;
}

:deep(.sort-select .v-field__input) {
  padding: 8px 12px !important;
  min-height: auto !important;
}

.filter-section {
  display: flex;
  align-items: center;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #2f2f2f;
  cursor: pointer;
  font-size: 14px;
}

.checkbox-text {
  user-select: none;
  padding: 0 0 0 5px;
}

:deep(.filter-checkbox .v-input__control) {
  width: 20px !important;
  height: 20px !important;
  min-height: 20px !important;
}

:deep(.filter-checkbox .v-selection-control) {
  min-height: 20px !important;
}

:deep(.filter-checkbox .v-checkbox .v-selection-control__wrapper) {
  width: 20px !important;
  height: 20px !important;
}

.spacer {
  flex: 1;
}

.add-project-btn {
  padding: 10px 20px;
  background-color: #2f2f2f;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: background-color 0.2s ease;
  text-decoration: none;
  height: 40px;
  display: flex;
  align-items: center;
}

.add-project-btn:hover {
  background-color: #1f1f1f;
}

.projects-table {
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  overflow: hidden !important;
}

.table-header {
  background-color: #f9fafb !important;
  border-bottom: 1px solid #e5e7eb !important;
  display: grid !important;
  grid-template-columns: 2fr 1fr 1fr 1fr 120px !important;
}

.header-cell {
  padding: 12px 16px !important;
  font-weight: 600 !important;
  color: #2f2f2f !important;
  font-size: 14px !important;
}

.title-header {
  text-align: left !important;
}

.actions-header {
  text-align: center !important;
}

.table-body {
  background-color: white !important;
}

.table-row {
  border-bottom: 1px solid #e5e7eb !important;
  transition: background-color 0.2s ease !important;
  display: grid !important;
  grid-template-columns: 2fr 1fr 1fr 1fr 120px !important;
}

.table-row:last-child {
  border-bottom: none !important;
}

.table-row:hover {
  background-color: #f8fafc !important;
}

.table-cell {
  padding: 12px 16px !important;
  color: #2f2f2f !important;
  font-size: 14px !important;
  display: flex !important;
  align-items: center !important;
}

.title-cell {
  gap: 8px !important;
}

:deep(.star-button) {
  background: none !important;
  border: none !important;
  padding: 4px !important;
  cursor: pointer !important;
  border-radius: 4px !important;
  transition: all 0.2s ease !important;
  color: #d1d5db !important;
}

:deep(.star-button:hover) {
  background-color: #f3f4f6 !important;
  color: #fbbf24 !important;
}

:deep(.star-button.starred) {
  color: #f59e0b !important;
}

.actions-cell {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 8px !important;
}

:deep(.action-btn) {
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  padding: 6px !important;
  border-radius: 4px !important;
  transition: background-color 0.2s ease !important;
}

:deep(.view-btn) {
  color: #3b82f6 !important;
}

:deep(.view-btn:hover) {
  background-color: #eff6ff !important;
}

:deep(.edit-btn) {
  color: #f59e0b !important;
}

:deep(.edit-btn:hover) {
  background-color: #fef3c7 !important;
}

:deep(.delete-btn) {
  color: #ef4444 !important;
}

:deep(.delete-btn:hover) {
  background-color: #fee2e2 !important;
}

:deep(.history-btn) {
  color: #6b7280 !important;
  transition: all 0.2s ease !important;
}

:deep(.history-btn:hover) {
  color: #3b82f6 !important;
  background-color: #eff6ff !important;
}

/* Modal styles */
.modal-content h2 {
  margin: 0 0 20px 0 !important;
  color: #1f2937 !important;
  font-size: 20px !important;
}

.form-group {
  margin-bottom: 16px !important;
}

:deep(.modal-content label) {
  display: block !important;
  margin-bottom: 6px !important;
  font-weight: 600 !important;
  color: #374151 !important;
}

:deep(.modal-content .v-field) {
  border: 1px solid #d1d5db !important;
  border-radius: 6px !important;
  font-size: 14px !important;
}

:deep(.modal-content .v-field:focus-within) {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
}

.modal-actions {
  display: flex !important;
  gap: 12px !important;
  justify-content: flex-end !important;
  margin-top: 24px !important;
}

:deep(.cancel-btn) {
  background-color: #f3f4f6 !important;
  border: 1px solid #d1d5db !important;
  color: #374151 !important;
}

:deep(.cancel-btn:hover) {
  background-color: #e5e7eb !important;
}

:deep(.save-btn) {
  background-color: #3b82f6 !important;
  color: white !important;
}

:deep(.save-btn:hover) {
  background-color: #2563eb !important;
}

:deep(.delete-modal .delete-btn) {
  background-color: #ef4444 !important;
  color: white !important;
}

:deep(.delete-modal .delete-btn:hover) {
  background-color: #dc2626 !important;
}

.warning-text {
  color: #ef4444 !important;
  font-weight: 600 !important;
  margin-top: 8px !important;
}

/* ========================================
   Edit Dialog Styles - COPIED FROM MAGAZINEVIEW
   ======================================== */
.edit-dialog-card {
  border: 2px solid #353535 !important;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

:deep(.v-overlay--active .v-overlay__content) {
  align-self: center !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
}

.edit-dialog-header {
  display: flex;
  align-items: center;
  padding: 20px 24px !important;
  background: #353535 !important;
  color: white !important;
  font-size: 18px !important;
  font-weight: 600 !important;
}

.dialog-divider {
  border-color: #e0e0e0 !important;
  opacity: 1 !important;
}

.edit-dialog-content {
  padding: 24px !important;
  background: white !important;
}

.form-field {
  margin-bottom: 20px;
}

.form-field:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #353535;
  margin-bottom: 8px;
}

:deep(.form-field .v-field) {
  background: white !important;
  border-radius: 6px !important;
}

:deep(.form-field .v-field__outline) {
  border-color: #d0d0d0 !important;
  border-width: 1px !important;
}

:deep(.form-field .v-field--focused .v-field__outline) {
  border-color: #353535 !important;
  border-width: 2px !important;
}

:deep(.form-field .v-field__input) {
  padding: 12px 16px !important;
  font-size: 14px !important;
  color: #353535 !important;
}

:deep(.form-field .v-select__selection-text) {
  font-size: 14px !important;
  color: #353535 !important;
}

:deep(.form-field input[type='date']) {
  color: #353535 !important;
  font-size: 14px !important;
  cursor: pointer !important;
}

:deep(.form-field input[type='date']::-webkit-calendar-picker-indicator) {
  cursor: pointer !important;
  filter: invert(0.2);
}

.edit-dialog-actions {
  padding: 16px 24px !important;
  background: #fafafa !important;
  border-top: 1px solid #e0e0e0 !important;
}

.delete-from-edit-btn {
  border: 2px solid #ef4444 !important;
  color: #ef4444 !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 24px !important;
}

.delete-from-edit-btn:hover {
  background: #fef2f2 !important;
}

.cancel-btn {
  border: 2px solid #353535 !important;
  color: #353535 !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 24px !important;
}

.cancel-btn:hover {
  background: #f5f5f5 !important;
}

.save-btn {
  background: #353535 !important;
  color: white !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 28px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.save-btn:hover {
  background: #1f1f1f !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

/* ========================================
   Delete Dialog Styles - COPIED FROM MAGAZINEVIEW
   ======================================== */
.delete-dialog-card {
  border: 2px solid #353535 !important;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.delete-dialog-header {
  display: flex;
  align-items: center;
  padding: 20px 24px !important;
  background: #353535 !important;
  color: white !important;
  font-size: 18px !important;
  font-weight: 600 !important;
}

.delete-dialog-content {
  padding: 24px !important;
  background: white !important;
}

.delete-info-box {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #353535;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
}

.delete-message {
  font-size: 14px;
  line-height: 1.6;
  color: #555;
  margin: 0;
}

.delete-message strong {
  color: #353535;
  font-weight: 600;
}

.warning-alert {
  border-left: 4px solid #353535 !important;
  background: #f8f8f8 !important;
  border-radius: 6px !important;
  padding: 12px 16px !important;
}

:deep(.warning-alert .v-alert__prepend) {
  margin-right: 12px !important;
  color: #353535 !important;
}

.alert-text {
  font-size: 13px;
  line-height: 1.5;
  color: #555;
}

.alert-text strong {
  display: inline;
  font-weight: 600;
  color: #353535;
}

.delete-dialog-actions {
  padding: 16px 24px !important;
  background: #fafafa !important;
  border-top: 1px solid #e0e0e0 !important;
}

.confirm-delete-btn {
  background: #353535 !important;
  color: white !important;
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
  border-radius: 6px !important;
  padding: 0 28px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.confirm-delete-btn:hover {
  background: #1f1f1f !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

/* Responsive adjustments for modals */
@media (max-width: 600px) {
  .edit-dialog-header,
  .delete-dialog-header {
    padding: 16px 20px !important;
    font-size: 16px !important;
  }

  .edit-dialog-content,
  .delete-dialog-content {
    padding: 20px !important;
  }

  .delete-info-box {
    padding: 12px;
  }

  .delete-message {
    font-size: 13px;
  }

  .edit-dialog-actions,
  .delete-dialog-actions {
    padding: 12px 20px !important;
    flex-direction: column;
    gap: 8px;
  }

  .cancel-btn,
  .save-btn,
  .confirm-delete-btn,
  .delete-from-edit-btn {
    width: 100%;
  }

  .edit-dialog-actions .v-spacer,
  .delete-dialog-actions .v-spacer {
    display: none;
  }

  .edit-dialog-actions .delete-from-edit-btn {
    order: 3;
  }
}

/* Responsive design for main table */
@media (max-width: 1024px) {
  .controls-section {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 16px !important;
  }

  :deep(.search-input .v-field) {
    width: 100% !important;
  }

  .add-project-btn {
    margin-left: 0 !important;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px !important;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr !important;
    gap: 8px !important;
  }

  .header-cell,
  .table-cell {
    padding: 8px 12px !important;
  }

  .table-cell {
    border-bottom: 1px solid #f3f4f6 !important;
  }

  .table-cell:last-child {
    border-bottom: none !important;
  }

  .table-cell::before {
    content: attr(data-label) !important;
    font-weight: 600 !important;
    color: #6b7280 !important;
    margin-right: 8px !important;
    min-width: 100px !important;
  }
}
</style>
