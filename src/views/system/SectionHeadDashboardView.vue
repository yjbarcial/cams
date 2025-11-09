<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

const router = useRouter()

// State management
const searchQuery = ref('')
const sortOrder = ref('Date Submitted ↓')
const showOnlyUrgent = ref(false)
const viewMode = ref('all') // 'all', 'pending', 'approved', 'returned'

// Projects data
const projects = ref([])

// Dialog states
const showDetailDialog = ref(false)
const detailProject = ref(null)

// Snackbar
const showSnackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref('success')

// Show notification
const showNotification = (message, color = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  showSnackbar.value = true
}

// Load projects from localStorage
const loadProjects = () => {
  try {
    const projectTypes = ['magazine', 'newsletter', 'folio', 'other']
    let allProjects = []

    projectTypes.forEach((type) => {
      const storageKey = `${type}_projects`
      const typeProjects = JSON.parse(localStorage.getItem(storageKey) || '[]')

      // Filter projects that are "To Section Head" or related statuses
      const sectionHeadProjects = typeProjects
        .filter(
          (project) =>
            project.status === 'To Section Head' ||
            project.status === 'Returned by Section Head' ||
            project.status === 'To Editor-in-Chief',
        )
        .map((project) => ({
          ...project,
          type: type,
          submittedDate: project.submittedDate || new Date().toISOString(),
          priority: project.priority || 'Medium',
          department: project.department || getDepartmentFromType(type),
          submittedBy: project.submittedBy || project.writers || 'Unknown',
        }))

      allProjects = [...allProjects, ...sectionHeadProjects]
    })

    projects.value = allProjects
    console.log('Section Head Projects loaded:', allProjects)
  } catch (error) {
    console.error('Error loading Section Head projects:', error)
    showNotification('Error loading projects', 'error')
  }
}

// Helper function to get department from project type
const getDepartmentFromType = (type) => {
  const typeMap = {
    magazine: 'Editorial',
    newsletter: 'News',
    folio: 'Arts',
    other: 'Marketing',
  }
  return typeMap[type] || 'General'
}

// Computed properties
const filteredProjects = computed(() => {
  let filtered = projects.value

  // Filter by view mode
  if (viewMode.value === 'pending') {
    filtered = filtered.filter((p) => p.status === 'To Section Head')
  } else if (viewMode.value === 'approved') {
    filtered = filtered.filter((p) => p.status === 'To Editor-in-Chief')
  } else if (viewMode.value === 'returned') {
    filtered = filtered.filter((p) => p.status === 'Returned by Section Head')
  }

  // Filter by search query
  if (searchQuery.value) {
    filtered = filtered.filter(
      (project) =>
        project.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        project.submittedBy.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        project.department.toLowerCase().includes(searchQuery.value.toLowerCase()),
    )
  }

  // Filter by urgent only
  if (showOnlyUrgent.value) {
    filtered = filtered.filter((project) => project.priority === 'High')
  }

  // Sort projects
  filtered = [...filtered].sort((a, b) => {
    if (sortOrder.value === 'Date Submitted ↑') {
      return new Date(a.submittedDate) - new Date(b.submittedDate)
    } else if (sortOrder.value === 'Date Submitted ↓') {
      return new Date(b.submittedDate) - new Date(a.submittedDate)
    } else if (sortOrder.value === 'A - Z') {
      return a.title.localeCompare(b.title)
    } else if (sortOrder.value === 'Z - A') {
      return b.title.localeCompare(a.title)
    } else if (sortOrder.value === 'Priority High First') {
      const priorityOrder = { High: 3, Medium: 2, Low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    }
    return 0
  })

  return filtered
})

const projectCounts = computed(() => ({
  all: projects.value.length,
  pending: projects.value.filter((p) => p.status === 'To Section Head').length,
  approved: projects.value.filter((p) => p.status === 'To Editor-in-Chief').length,
  returned: projects.value.filter((p) => p.status === 'Returned by Section Head').length,
}))

// Action functions
const handleViewProject = (project) => {
  // Route to review view
  router.push(`/section-head/review/${project.id}`)
}

const closeDetailDialog = () => {
  showDetailDialog.value = false
  detailProject.value = null
}

// Get status color
const getStatusColor = (status) => {
  const colors = {
    'To Section Head': 'warning',
    'Returned by Section Head': 'error',
    'To Editor-in-Chief': 'success',
  }
  return colors[status] || 'default'
}

// Get priority color
const getPriorityColor = (priority) => {
  const colors = {
    High: 'error',
    Medium: 'warning',
    Low: 'success',
  }
  return colors[priority] || 'default'
}

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (error) {
    return dateString
  }
}

// Toggle star (for priority)
const toggleStar = (projectId) => {
  console.log('Toggle priority for project:', projectId)
}

// Load data on mount
onMounted(() => {
  loadProjects()
})
</script>

<template>
  <v-app class="sh-page">
    <MainHeader />

    <v-main class="main-content">
      <v-container fluid class="sh-container pa-5">
        <!-- Header Section -->
        <div class="page-header">
          <div class="header-content">
            <h1 class="page-title">
              <v-icon class="title-icon">mdi-account-star</v-icon>
              Section Head Dashboard
            </h1>
            <p class="page-subtitle">Review and approve projects for your section</p>
          </div>
          <div class="header-stats">
            <div class="stat-card">
              <div class="stat-number">{{ projectCounts.pending }}</div>
              <div class="stat-label">Pending Review</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">{{ projectCounts.approved }}</div>
              <div class="stat-label">Approved</div>
            </div>
          </div>
        </div>

        <!-- Controls Section -->
        <div class="controls-section">
          <!-- View Mode Tabs -->
          <div class="view-tabs">
            <v-btn
              :variant="viewMode === 'all' ? 'flat' : 'text'"
              :color="viewMode === 'all' ? 'primary' : 'default'"
              @click="viewMode = 'all'"
              class="tab-btn"
            >
              All ({{ projectCounts.all }})
            </v-btn>
            <v-btn
              :variant="viewMode === 'pending' ? 'flat' : 'text'"
              :color="viewMode === 'pending' ? 'warning' : 'default'"
              @click="viewMode = 'pending'"
              class="tab-btn"
            >
              Pending ({{ projectCounts.pending }})
            </v-btn>
            <v-btn
              :variant="viewMode === 'approved' ? 'flat' : 'text'"
              :color="viewMode === 'approved' ? 'success' : 'default'"
              @click="viewMode = 'approved'"
              class="tab-btn"
            >
              Approved ({{ projectCounts.approved }})
            </v-btn>
            <v-btn
              :variant="viewMode === 'returned' ? 'flat' : 'text'"
              :color="viewMode === 'returned' ? 'error' : 'default'"
              @click="viewMode = 'returned'"
              class="tab-btn"
            >
              Returned ({{ projectCounts.returned }})
            </v-btn>
          </div>

          <!-- Search and Filters -->
          <div class="controls-row">
            <div class="search-section">
              <v-text-field
                v-model="searchQuery"
                placeholder="Search projects, authors, departments..."
                prepend-inner-icon="mdi-magnify"
                variant="outlined"
                density="compact"
                hide-details
                class="search-input"
              />
            </div>

            <div class="filter-section">
              <v-select
                v-model="sortOrder"
                :items="[
                  'Date Submitted ↓',
                  'Date Submitted ↑',
                  'A - Z',
                  'Z - A',
                  'Priority High First',
                ]"
                variant="outlined"
                density="compact"
                hide-details
                class="sort-select"
                label="Sort by"
              />

              <v-checkbox
                v-model="showOnlyUrgent"
                label="Urgent only"
                density="compact"
                hide-details
                class="urgent-filter"
              />
            </div>
          </div>
        </div>

        <!-- Projects Table -->
        <v-container fluid class="projects-table pa-0">
          <v-row class="table-header" no-gutters>
            <v-col class="header-cell title-header">Project Details</v-col>
            <v-col class="header-cell">Submitted By</v-col>
            <v-col class="header-cell">Department</v-col>
            <v-col class="header-cell">Priority</v-col>
            <v-col class="header-cell">Status</v-col>
            <v-col class="header-cell">Submitted Date</v-col>
            <v-col class="header-cell actions-header">Actions</v-col>
          </v-row>

          <v-container fluid class="table-body pa-0">
            <v-row
              v-for="project in filteredProjects"
              :key="`${project.type}-${project.id}`"
              class="table-row"
              no-gutters
            >
              <v-col class="table-cell title-cell">
                <v-btn
                  class="star-button"
                  @click="toggleStar(project.id)"
                  :class="{ starred: project.priority === 'High' }"
                  variant="text"
                  icon
                  size="small"
                  aria-label="Priority indicator"
                >
                  <v-icon>{{
                    project.priority === 'High' ? 'mdi-star' : 'mdi-star-outline'
                  }}</v-icon>
                </v-btn>
                <div class="project-info">
                  <div class="project-title clickable" @click="handleViewProject(project)">
                    {{ project.title }}
                  </div>
                  <div class="project-meta">
                    <v-chip
                      size="x-small"
                      :color="
                        project.type === 'magazine'
                          ? 'blue'
                          : project.type === 'newsletter'
                            ? 'green'
                            : project.type === 'folio'
                              ? 'purple'
                              : 'orange'
                      "
                    >
                      {{ project.type }}
                    </v-chip>
                    <span class="project-id">#{{ project.id }}</span>
                  </div>
                </div>
              </v-col>
              <v-col class="table-cell">
                <div class="submitter-info">
                  <div class="submitter-name">{{ project.submittedBy }}</div>
                  <div class="submitter-role">{{ project.writers || 'Writer' }}</div>
                </div>
              </v-col>
              <v-col class="table-cell">
                <v-chip size="small" variant="outlined">
                  {{ project.department }}
                </v-chip>
              </v-col>
              <v-col class="table-cell">
                <v-chip :color="getPriorityColor(project.priority)" size="small">
                  {{ project.priority }}
                </v-chip>
              </v-col>
              <v-col class="table-cell">
                <v-chip :color="getStatusColor(project.status)" size="small">
                  {{ project.status }}
                </v-chip>
              </v-col>
              <v-col class="table-cell">
                <div class="date-info">
                  {{ formatDate(project.submittedDate) }}
                </div>
              </v-col>
              <v-col class="table-cell actions-cell">
                <v-btn
                  class="action-btn view-btn"
                  @click="handleViewProject(project)"
                  variant="text"
                  icon
                  size="small"
                  aria-label="View and review project"
                >
                  <v-icon>mdi-eye</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </v-container>

          <!-- Empty State -->
          <div v-if="filteredProjects.length === 0" class="empty-state">
            <v-icon size="64" color="grey-lighten-1">mdi-account-star-outline</v-icon>
            <h3>No projects found</h3>
            <p>There are no projects for Section Head review at this time.</p>
          </div>
        </v-container>
      </v-container>
    </v-main>

    <Footer />

    <!-- Snackbar -->
    <v-snackbar
      v-model="showSnackbar"
      :color="snackbarColor"
      timeout="4000"
      location="bottom right"
    >
      {{ snackbarMessage }}
      <template v-slot:actions>
        <v-btn variant="text" @click="showSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<style scoped>
.sh-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
}

.main-content {
  flex: 1;
  padding: 0 !important;
}

.sh-container {
  max-width: 1400px;
  margin: 0 auto;
  width: 100% !important;
}

/* Compact Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 0;
  border-bottom: 1px solid #e5e7eb;
}

.header-content {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 4px 0;
}

.title-icon {
  color: #10b981;
  font-size: 28px;
}

.page-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

/* Compact Stats */
.header-stats {
  display: flex;
  gap: 16px;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px 16px;
  text-align: center;
  min-width: 100px;
}

.stat-number {
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

/* Controls */
.controls-section {
  margin-bottom: 16px;
}

.view-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  padding: 3px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  width: fit-content;
}

.tab-btn {
  text-transform: none !important;
  font-weight: 500 !important;
  font-size: 13px !important;
  border-radius: 4px !important;
  padding: 4px 12px !important;
  height: 32px !important;
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.search-section {
  flex: 1;
  max-width: 400px;
}

.search-input {
  background: white;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sort-select {
  width: 180px;
  background: white;
}

.urgent-filter {
  white-space: nowrap;
}

/* Table */
.projects-table {
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  overflow: hidden !important;
}

.table-header {
  background-color: #f9fafb !important;
  border-bottom: 1px solid #e5e7eb !important;
  display: grid !important;
  grid-template-columns: 2.5fr 1.2fr 1fr 0.8fr 1.2fr 1.2fr 140px !important;
}

.header-cell {
  padding: 12px 16px !important;
  font-weight: 600 !important;
  color: #2f2f2f !important;
  font-size: 14px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
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
  grid-template-columns: 2.5fr 1.2fr 1fr 0.8fr 1.2fr 1.2fr 140px !important;
  align-items: center !important;
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
  overflow: hidden !important;
}

.title-cell {
  gap: 8px !important;
  min-width: 0 !important;
}

.project-info {
  flex: 1;
  min-width: 0 !important;
  overflow: hidden !important;
}

.project-title {
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1.4;
  font-size: 14px;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.project-title.clickable {
  cursor: pointer;
  color: #10b981;
  transition: color 0.2s ease;
}

.project-title.clickable:hover {
  color: #059669;
  text-decoration: underline;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden !important;
}

.project-id {
  font-size: 11px;
  color: #6b7280;
  font-family: monospace;
  white-space: nowrap !important;
}

:deep(.star-button) {
  background: none !important;
  border: none !important;
  padding: 4px !important;
  cursor: pointer !important;
  border-radius: 4px !important;
  transition: all 0.2s ease !important;
  color: #d1d5db !important;
  flex-shrink: 0 !important;
}

:deep(.star-button:hover) {
  background-color: #f3f4f6 !important;
  color: #fbbf24 !important;
}

:deep(.star-button.starred) {
  color: #f59e0b !important;
}

.submitter-info {
  min-width: 100px;
  overflow: hidden !important;
}

.submitter-name {
  font-weight: 500;
  color: #1f2937;
  font-size: 13px;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  white-space: nowrap !important;
}

.submitter-role {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
  white-space: nowrap !important;
}

.date-info {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap !important;
}

.actions-cell {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 4px !important;
  flex-shrink: 0 !important;
}

:deep(.action-btn) {
  background: none !important;
  border: none !important;
  cursor: pointer !important;
  padding: 6px !important;
  border-radius: 4px !important;
  transition: background-color 0.2s ease !important;
  flex-shrink: 0 !important;
}

:deep(.view-btn) {
  color: #10b981 !important;
}

:deep(.view-btn:hover) {
  background-color: #d1fae5 !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-state h3 {
  margin: 12px 0 6px 0;
  color: #374151;
  font-size: 16px;
}

.empty-state p {
  color: #6b7280;
  margin: 0;
  font-size: 13px;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-stats {
    justify-content: center;
  }

  .controls-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-section {
    max-width: none;
  }

  .filter-section {
    justify-content: space-between;
  }

  .table-header,
  .table-row {
    grid-template-columns: 1fr !important;
  }

  .header-cell,
  .table-cell {
    padding: 8px 12px !important;
  }
}

@media (max-width: 768px) {
  .sh-container {
    padding: 12px !important;
  }

  .page-title {
    font-size: 20px;
  }

  .title-icon {
    font-size: 24px;
  }

  .view-tabs {
    flex-wrap: wrap;
    width: 100%;
  }

  .tab-btn {
    flex: 1;
    min-width: calc(50% - 2px);
    font-size: 12px !important;
  }

  .header-stats {
    flex-direction: column;
    gap: 8px;
  }

  .stat-card {
    padding: 10px 14px;
  }

  .stat-number {
    font-size: 20px;
  }
}
</style>
