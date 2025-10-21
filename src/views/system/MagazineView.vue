<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import ProjectHistoryButton from '@/components/ProjectHistoryButton.vue'

const router = useRouter()

// Sample magazine projects data
const defaultProjects = [
  {
    id: 1,
    title: 'Hope Magazine - The Gold Panicles 2020',
    sectionHead: 'Mark Dela Cruz',
    dueDate: 'Sep 7, 2020',
    status: 'To Editor-in-Chief',
    isStarred: true,
    type: 'magazine',
  },
  {
    id: 2,
    title: 'Hope Magazine - The Gold Panicles 2020',
    sectionHead: 'Rey Dela Cruz',
    dueDate: 'Sep 7, 2020',
    status: 'To Section Head',
    isStarred: true,
    type: 'magazine',
  },
  {
    id: 3,
    title: 'Hope Magazine - The Gold Panicles 2020',
    sectionHead: 'Ella Domingo',
    dueDate: 'Sep 7, 2020',
    status: 'To Publish',
    isStarred: true,
    type: 'magazine',
  },
  {
    id: 4,
    title: 'Hope Magazine - The Gold Panicles 2021',
    sectionHead: 'John Santos',
    dueDate: 'Oct 10, 2021',
    status: 'To Section Head',
    isStarred: false,
    type: 'magazine',
  },
  {
    id: 5,
    title: 'Hope Magazine - The Gold Panicles 2021',
    sectionHead: 'James Rivera',
    dueDate: 'Oct 10, 2021',
    status: 'To Technical Editor',
    isStarred: false,
    type: 'magazine',
  },
  {
    id: 6,
    title: 'Hope Magazine - The Gold Panicles 2021',
    sectionHead: 'Jane Rodriguez',
    dueDate: 'Oct 10, 2021',
    status: 'To Publish',
    isStarred: false,
    type: 'magazine',
  },
]

// Initialize projects with localStorage data
const projects = ref([])

// Load projects from localStorage on component mount
onMounted(() => {
  loadProjects()
})

const loadProjects = () => {
  const savedProjects = JSON.parse(localStorage.getItem('magazine_projects') || '[]')
  const allProjects = [...savedProjects, ...defaultProjects]

  // Remove duplicates based on title and merge data
  const uniqueProjects = allProjects.reduce((acc, project) => {
    const existing = acc.find((p) => p.title === project.title)
    if (!existing) {
      acc.push(project)
    }
    return acc
  }, [])

  projects.value = uniqueProjects
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
  // Navigate to project view with the project ID
  router.push(`/project/${projectId}`)
}

const handleAddProject = () => {
  console.log('Add new magazine project')
  // Handle add project logic here
}

const toggleStar = (projectId) => {
  const project = projects.value.find((p) => p.id === projectId)
  if (project) {
    project.isStarred = !project.isStarred
    // Save to localStorage
    const savedProjects = JSON.parse(localStorage.getItem('magazine_projects') || '[]')
    const updatedProjects = savedProjects.map((p) =>
      p.id === projectId ? { ...p, isStarred: project.isStarred } : p,
    )
    localStorage.setItem('magazine_projects', JSON.stringify(updatedProjects))
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

  // Filter by search query
  if (searchQuery.value) {
    filtered = filtered.filter(
      (project) =>
        project.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        (project.sectionHead || '').toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  }

  // Filter by starred status
  if (showOnlyStarred.value) {
    filtered = filtered.filter((project) => project.isStarred)
  }

  // Sort projects
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

// Permission checking
const canEditProject = (project) => {
  // For development/demo purposes, allow editing all projects
  // In production, this would check against actual user authentication
  return true
}

// Edit functionality
const startEdit = (project) => {
  if (canEditProject(project)) {
    editingProject.value = { ...project }
    showEditDialog.value = true
  } else {
    alert('Only the section head who created this project can edit it.')
  }
}

const saveEdit = () => {
  if (!editingProject.value.title.trim()) {
    alert('Please enter a project title')
    return
  }

  const projectIndex = projects.value.findIndex((p) => p.id === editingProject.value.id)
  if (projectIndex !== -1) {
    // Update the project
    projects.value[projectIndex] = { ...editingProject.value }

    // Save to localStorage
    const savedProjects = JSON.parse(localStorage.getItem('magazine_projects') || '[]')
    const updatedProjects = savedProjects.map((p) =>
      p.id === editingProject.value.id ? { ...editingProject.value } : p,
    )
    localStorage.setItem('magazine_projects', JSON.stringify(updatedProjects))
  }

  // Close the dialog
  editingProject.value = null
  showEditDialog.value = false
}

const cancelEdit = () => {
  editingProject.value = null
  showEditDialog.value = false
}

// Delete functionality
const startDelete = (project) => {
  if (canEditProject(project)) {
    projectToDelete.value = project
    showDeleteConfirm.value = true
  } else {
    alert('Only the section head who created this project can delete it.')
  }
}

const confirmDelete = () => {
  if (projectToDelete.value) {
    // Remove from projects array
    projects.value = projects.value.filter((p) => p.id !== projectToDelete.value.id)

    // Remove from localStorage
    const savedProjects = JSON.parse(localStorage.getItem('magazine_projects') || '[]')
    const updatedProjects = savedProjects.filter((p) => p.id !== projectToDelete.value.id)
    localStorage.setItem('magazine_projects', JSON.stringify(updatedProjects))
  }

  showDeleteConfirm.value = false
  projectToDelete.value = null
}

const cancelDelete = () => {
  showDeleteConfirm.value = false
  projectToDelete.value = null
}

// Delete from edit dialog
const deleteFromEdit = () => {
  if (editingProject.value) {
    projectToDelete.value = editingProject.value
    showEditDialog.value = false
    showDeleteConfirm.value = true
  }
}
</script>

<template>
  <v-app class="magazine-page">
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
                placeholder="Search magazines..."
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
            <RouterLink to="/magazine/new" class="add-project-btn">Add Project</RouterLink>
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
              <v-col class="table-cell">{{ project.dueDate }}</v-col>
              <v-col class="table-cell">{{ project.status }}</v-col>
              <v-col class="table-cell actions-cell">
                <v-btn
                  class="action-btn view-btn"
                  @click="handleView(project.id)"
                  variant="text"
                  icon
                  size="small"
                  aria-label="View project"
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
                  aria-label="Edit project"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>
                <ProjectHistoryButton
                  :project-id="project.id"
                  project-type="magazine"
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
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </v-container>
        </v-container>
      </v-container>
    </v-main>

    <!-- Edit Project Modal -->
    <v-dialog v-model="showEditDialog" persistent max-width="500px">
      <v-card class="modal-content">
        <v-card-title>Edit Project</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="saveEdit">
            <v-container class="pa-0">
              <v-row>
                <v-col cols="12" class="form-group">
                  <v-label>Project Title:</v-label>
                  <v-text-field
                    v-model="editingProject.title"
                    variant="outlined"
                    required
                    hide-details
                  />
                </v-col>
                <v-col cols="12" class="form-group">
                  <v-label>Section Head:</v-label>
                  <v-text-field
                    v-model="editingProject.sectionHead"
                    variant="outlined"
                    required
                    hide-details
                  />
                </v-col>
                <v-col cols="12" class="form-group">
                  <v-label>Due Date:</v-label>
                  <v-text-field v-model="editingProject.dueDate" variant="outlined" hide-details />
                </v-col>
                <v-col cols="12" class="form-group">
                  <v-label>Status:</v-label>
                  <v-select
                    v-model="editingProject.status"
                    :items="[
                      'To Editor-in-Chief',
                      'To Section Head',
                      'To Technical Editor',
                      'To Publish',
                      'Published',
                    ]"
                    variant="outlined"
                    hide-details
                  />
                </v-col>
              </v-row>
            </v-container>
          </v-form>
        </v-card-text>
        <v-card-actions class="modal-actions">
          <v-btn class="cancel-btn" @click="cancelEdit" variant="outlined">Cancel</v-btn>
          <v-btn class="delete-btn" @click="deleteFromEdit" color="error" variant="outlined">
            <v-icon class="mr-1">mdi-delete</v-icon>
            Delete
          </v-btn>
          <v-spacer />
          <v-btn class="save-btn" @click="saveEdit" color="primary">Save Changes</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Modal -->
    <v-dialog v-model="showDeleteConfirm" persistent max-width="500px">
      <v-card class="modal-content delete-modal">
        <v-card-title>Confirm Delete</v-card-title>
        <v-card-text>
          <p>Are you sure you want to delete the project "{{ projectToDelete?.title }}"?</p>
          <p class="warning-text">This action cannot be undone.</p>
        </v-card-text>
        <v-card-actions class="modal-actions">
          <v-btn class="cancel-btn" @click="cancelDelete" variant="outlined">Cancel</v-btn>
          <v-btn class="delete-btn" @click="confirmDelete" color="error">Delete Project</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <Footer />
  </v-app>
</template>

<style scoped>
.magazine-page {
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

/* Responsive design */
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
