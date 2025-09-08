<script setup>
import { ref, computed, onMounted } from 'vue'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

// Sample folio projects data
const defaultProjects = [
  {
    id: 1,
    title: 'Laom Folio - Yaon 2021',
    sectionHead: 'John Santos',
    dueDate: 'Oct 10, 2021',
    status: 'To Section Head',
    isStarred: false,
    type: 'folio',
  },
  {
    id: 2,
    title: 'Laom Folio - Yaon 2021',
    sectionHead: 'James Rivera',
    dueDate: 'Oct 10, 2021',
    status: 'To Technical Editor',
    isStarred: false,
    type: 'folio',
  },
  {
    id: 3,
    title: 'Laom Folio - Yaon 2021',
    sectionHead: 'Jane Rodriguez',
    dueDate: 'Oct 10, 2021',
    status: 'To Publish',
    isStarred: false,
    type: 'folio',
  },
  {
    id: 4,
    title: 'Laom Folio - Yaon 2022',
    sectionHead: 'Maria Garcia',
    dueDate: 'Nov 15, 2022',
    status: 'To Editor-in-Chief',
    isStarred: true,
    type: 'folio',
  },
  {
    id: 5,
    title: 'Laom Folio - Yaon 2022',
    sectionHead: 'Carlos Martinez',
    dueDate: 'Nov 15, 2022',
    status: 'To Section Head',
    isStarred: true,
    type: 'folio',
  },
  {
    id: 6,
    title: 'Laom Folio - Yaon 2022',
    sectionHead: 'Ana Lopez',
    dueDate: 'Nov 15, 2022',
    status: 'To Publish',
    isStarred: true,
    type: 'folio',
  },
]

// Initialize projects with localStorage data
const projects = ref([])

// Load projects from localStorage on component mount
onMounted(() => {
  loadProjects()
})

const loadProjects = () => {
  const savedProjects = JSON.parse(localStorage.getItem('folio_projects') || '[]')
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
const showDeleteConfirm = ref(false)
const projectToDelete = ref(null)
const currentUser = ref('Current User') // This would come from auth system

const handleView = (projectId) => {
  console.log(`View folio project ${projectId}`)
  // Handle view logic here
}

const handleAddProject = () => {
  console.log('Add new folio project')
  // Handle add project logic here
}

const toggleStar = (projectId) => {
  const project = projects.value.find((p) => p.id === projectId)
  if (project) {
    project.isStarred = !project.isStarred
    // Save to localStorage
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
  return project.sectionHead === currentUser.value
}

// Edit functionality
const startEdit = (project) => {
  if (canEditProject(project)) {
    editingProject.value = { ...project }
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
    const savedProjects = JSON.parse(localStorage.getItem('folio_projects') || '[]')
    const updatedProjects = savedProjects.map((p) =>
      p.id === editingProject.value.id ? { ...editingProject.value } : p,
    )
    localStorage.setItem('folio_projects', JSON.stringify(updatedProjects))
  }

  editingProject.value = null
}

const cancelEdit = () => {
  editingProject.value = null
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
</script>

<template>
  <div class="folio-page">
    <MainHeader />

    <main class="main-content">
      <div class="projects-container">
        <!-- Search and Controls -->
        <div class="controls-section">
          <div class="search-section">
            <label for="search" class="search-label">Search:</label>
            <div class="search-input-container">
              <span class="mdi mdi-magnify search-icon"></span>
              <input
                id="search"
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="Search folios..."
              />
              <span class="mdi mdi-tune search-filter"></span>
            </div>
          </div>

          <div class="sort-section">
            <label class="sort-label">Sort by:</label>
            <select class="sort-select" v-model="sortOrder">
              <option>A - Z</option>
              <option>Z - A</option>
              <option>Starred First</option>
              <option>Due Date ↑</option>
              <option>Due Date ↓</option>
              <option>Date Added ↑</option>
              <option>Date Added ↓</option>
            </select>
          </div>

          <div class="filter-section">
            <label class="filter-label">
              <input type="checkbox" v-model="showOnlyStarred" class="filter-checkbox" />
              Show starred only
            </label>
          </div>

          <RouterLink to="/folio/new" class="add-project-btn">Add Project</RouterLink>
        </div>

        <!-- Projects Table -->
        <div class="projects-table">
          <div class="table-header">
            <div class="header-cell title-header">Title</div>
            <div class="header-cell">Section Head</div>
            <div class="header-cell">Due Date</div>
            <div class="header-cell">Status</div>
            <div class="header-cell actions-header">Actions</div>
          </div>

          <div class="table-body">
            <div v-for="project in filteredProjects" :key="project.id" class="table-row">
              <div class="table-cell title-cell">
                <button
                  class="star-button"
                  @click="toggleStar(project.id)"
                  :class="{ starred: project.isStarred }"
                  aria-label="Toggle favorite"
                >
                  <span
                    class="mdi"
                    :class="project.isStarred ? 'mdi-star' : 'mdi-star-outline'"
                  ></span>
                </button>
                {{ project.title }}
              </div>
              <div class="table-cell">{{ project.sectionHead }}</div>
              <div class="table-cell">{{ project.dueDate }}</div>
              <div class="table-cell">{{ project.status }}</div>
              <div class="table-cell actions-cell">
                <button
                  class="action-btn view-btn"
                  @click="handleView(project.id)"
                  aria-label="View project"
                >
                  <span class="mdi mdi-eye"></span>
                </button>
                <button
                  v-if="canEditProject(project)"
                  class="action-btn edit-btn"
                  @click="startEdit(project)"
                  aria-label="Edit project"
                >
                  <span class="mdi mdi-pencil"></span>
                </button>
                <button
                  v-if="canEditProject(project)"
                  class="action-btn delete-btn"
                  @click="startDelete(project)"
                  aria-label="Delete project"
                >
                  <span class="mdi mdi-delete"></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Edit Project Modal -->
    <div v-if="editingProject" class="modal-overlay" @click="cancelEdit">
      <div class="modal-content" @click.stop>
        <h2>Edit Project</h2>
        <form @submit.prevent="saveEdit">
          <div class="form-group">
            <label>Project Title:</label>
            <input v-model="editingProject.title" type="text" required />
          </div>
          <div class="form-group">
            <label>Section Head:</label>
            <input v-model="editingProject.sectionHead" type="text" required />
          </div>
          <div class="form-group">
            <label>Due Date:</label>
            <input v-model="editingProject.dueDate" type="text" />
          </div>
          <div class="form-group">
            <label>Status:</label>
            <select v-model="editingProject.status">
              <option>To Editor-in-Chief</option>
              <option>To Section Head</option>
              <option>To Technical Editor</option>
              <option>To Publish</option>
              <option>Published</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="cancel-btn" @click="cancelEdit">Cancel</button>
            <button type="submit" class="save-btn">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDelete">
      <div class="modal-content delete-modal" @click.stop>
        <h2>Confirm Delete</h2>
        <p>Are you sure you want to delete the project "{{ projectToDelete?.title }}"?</p>
        <p class="warning-text">This action cannot be undone.</p>
        <div class="modal-actions">
          <button type="button" class="cancel-btn" @click="cancelDelete">Cancel</button>
          <button type="button" class="delete-btn" @click="confirmDelete">Delete Project</button>
        </div>
      </div>
    </div>

    <Footer />
  </div>
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
  padding: 20px;
}

.projects-container {
  width: 100%;
}

.controls-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
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
}

.search-input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: 8px 12px 8px 36px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: #f9fafb;
  font-size: 14px;
  width: 300px;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  background-color: white;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #6b7280;
  font-size: 16px;
}

.search-filter {
  position: absolute;
  right: 12px;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
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
}

.sort-button {
  padding: 8px 12px;
  background-color: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #2f2f2f;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-button:hover {
  background-color: #f3f4f6;
}

.sort-select {
  padding: 8px 12px;
  background-color: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #2f2f2f;
  font-size: 14px;
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
}

.filter-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.add-project-btn {
  margin-left: auto;
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
}

.add-project-btn:hover {
  background-color: #1f1f1f;
}

.projects-table {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 120px;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.header-cell {
  padding: 12px 16px;
  font-weight: 600;
  color: #2f2f2f;
  font-size: 14px;
}

.title-header {
  text-align: left;
}

.actions-header {
  text-align: center;
}

.table-body {
  background-color: white;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 120px;
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s ease;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background-color: #f8fafc;
}

.table-cell {
  padding: 12px 16px;
  color: #2f2f2f;
  font-size: 14px;
  display: flex;
  align-items: center;
}

.title-cell {
  gap: 8px;
}

.star-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #d1d5db;
}

.star-button:hover {
  background-color: #f3f4f6;
  color: #fbbf24;
}

.star-button.starred {
  color: #f59e0b;
}

.star-button .mdi {
  font-size: 16px;
}

.actions-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.view-btn {
  color: #3b82f6;
}

.view-btn:hover {
  background-color: #eff6ff;
}

.edit-btn {
  color: #f59e0b;
}

.edit-btn:hover {
  background-color: #fef3c7;
}

.delete-btn {
  color: #ef4444;
}

.delete-btn:hover {
  background-color: #fee2e2;
}

.action-btn .mdi {
  font-size: 16px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 20px;
}

.modal-content .form-group {
  margin-bottom: 16px;
}

.modal-content label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #374151;
}

.modal-content input,
.modal-content select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.modal-content input:focus,
.modal-content select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.cancel-btn {
  padding: 8px 16px;
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  color: #374151;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background-color: #e5e7eb;
}

.save-btn {
  padding: 8px 16px;
  background-color: #3b82f6;
  border: 1px solid #2563eb;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.save-btn:hover {
  background-color: #2563eb;
}

.delete-modal .delete-btn {
  padding: 8px 16px;
  background-color: #ef4444;
  border: 1px solid #dc2626;
  border-radius: 6px;
  color: white;
  cursor: pointer;
  font-size: 14px;
}

.delete-modal .delete-btn:hover {
  background-color: #dc2626;
}

.warning-text {
  color: #ef4444;
  font-weight: 600;
  margin-top: 8px;
}

/* Responsive design */
@media (max-width: 1024px) {
  .controls-section {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .search-input {
    width: 100%;
  }

  .add-project-btn {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .header-cell,
  .table-cell {
    padding: 8px 12px;
  }

  .table-cell {
    border-bottom: 1px solid #f3f4f6;
  }

  .table-cell:last-child {
    border-bottom: none;
  }

  .table-cell::before {
    content: attr(data-label);
    font-weight: 600;
    color: #6b7280;
    margin-right: 8px;
    min-width: 100px;
  }
}
</style>
