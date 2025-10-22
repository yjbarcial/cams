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
const viewMode = ref('all') // 'all', 'pending', 'approved', 'published'

// Projects data - will load from localStorage
const projects = ref([])

// Dialog states
const showApproveDialog = ref(false)
const showReturnDialog = ref(false)
const currentProject = ref(null)

// Dialog form data
const approveData = ref({
  approvalNotes: '',
  conditions: '',
})

const returnData = ref({
  returnNotes: '',
  returnTo: 'Editor-in-Chief',
})

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

      // Filter projects that are "To Chief Adviser"
      const adviserProjects = typeProjects
        .filter(
          (project) => project.status === 'To Chief Adviser' || project.status === 'Published',
        )
        .map((project) => ({
          ...project,
          type: type,
          submittedDate:
            project.forwardedToAdviserDate || project.submittedDate || new Date().toISOString(),
          priority: project.priority || 'Medium',
          department: project.department || getDepartmentFromType(type),
          submittedBy: project.forwardedBy || project.submittedBy || 'Editor-in-Chief',
        }))

      allProjects = [...allProjects, ...adviserProjects]
    })

    projects.value = allProjects
    console.log('Chief Adviser Projects loaded:', allProjects)
  } catch (error) {
    console.error('Error loading Chief Adviser projects:', error)
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
    filtered = filtered.filter((p) => p.status === 'To Chief Adviser')
  } else if (viewMode.value === 'approved') {
    filtered = filtered.filter((p) => p.status === 'Published')
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
  pending: projects.value.filter((p) => p.status === 'To Chief Adviser').length,
  approved: projects.value.filter((p) => p.status === 'Published').length,
}))

// Action functions
const handleViewProject = (project) => {
  // Open the section head detail view as Chief Adviser
  router.push(`/section-head/${project.id}?role=Chief Adviser`)
}

const startApprove = (project) => {
  currentProject.value = project
  approveData.value = {
    approvalNotes: '',
    conditions: '',
  }
  showApproveDialog.value = true
}

const startReturn = (project) => {
  currentProject.value = project
  returnData.value = {
    returnNotes: '',
    returnTo: 'Editor-in-Chief',
  }
  showReturnDialog.value = true
}

// Confirm actions
const confirmApprove = () => {
  if (!currentProject.value) return

  try {
    const storageKey = `${currentProject.value.type}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const projectIndex = projects.findIndex((p) => p.id === currentProject.value.id)

    if (projectIndex !== -1) {
      projects[projectIndex] = {
        ...projects[projectIndex],
        status: 'Published',
        adviserApprovedDate: new Date().toISOString(),
        adviserApprovedBy: 'Chief Adviser',
        adviserApprovalNotes: approveData.value.approvalNotes,
        adviserConditions: approveData.value.conditions,
        publishedDate: new Date().toISOString(),
        publishedBy: 'Chief Adviser',
        lastModified: new Date().toLocaleString(),
      }

      localStorage.setItem(storageKey, JSON.stringify(projects))

      showNotification(
        `"${currentProject.value.title}" has been approved and published!`,
        'success',
      )
      loadProjects()
    }
  } catch (error) {
    console.error('Error approving project:', error)
    showNotification('Error approving project', 'error')
  }

  showApproveDialog.value = false
  currentProject.value = null
}

const confirmReturn = () => {
  if (!currentProject.value) return

  try {
    const storageKey = `${currentProject.value.type}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const projectIndex = projects.findIndex((p) => p.id === currentProject.value.id)

    if (projectIndex !== -1) {
      projects[projectIndex] = {
        ...projects[projectIndex],
        status: 'Returned by Chief Adviser',
        returnedByAdviserDate: new Date().toISOString(),
        returnedBy: 'Chief Adviser',
        adviserReturnNotes: returnData.value.returnNotes,
        returnTo: returnData.value.returnTo,
        lastModified: new Date().toLocaleString(),
      }

      localStorage.setItem(storageKey, JSON.stringify(projects))

      showNotification(
        `"${currentProject.value.title}" has been returned to ${returnData.value.returnTo}!`,
        'warning',
      )
      loadProjects()
    }
  } catch (error) {
    console.error('Error returning project:', error)
    showNotification('Error returning project', 'error')
  }

  showReturnDialog.value = false
  currentProject.value = null
}

// Cancel actions
const cancelApprove = () => {
  showApproveDialog.value = false
  currentProject.value = null
}

const cancelReturn = () => {
  showReturnDialog.value = false
  currentProject.value = null
}

// Get status color
const getStatusColor = (status) => {
  const colors = {
    'To Chief Adviser': 'purple',
    'Returned by Chief Adviser': 'warning',
    Published: 'success',
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

// Load data on mount
onMounted(() => {
  loadProjects()
})
</script>

<template>
  <v-app class="adviser-page">
    <MainHeader />

    <v-main class="main-content">
      <v-container fluid class="adviser-container pa-5">
        <!-- Header Section -->
        <div class="page-header">
          <div class="header-content">
            <h1 class="page-title">
              <v-icon class="title-icon">mdi-shield-crown</v-icon>
              Chief Adviser Dashboard
            </h1>
            <p class="page-subtitle">Final review and approval authority</p>
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
              :color="viewMode === 'pending' ? 'purple' : 'default'"
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
        <v-card class="projects-table-card">
          <v-card-title class="table-header">
            <span>Projects for Chief Adviser Review</span>
            <v-btn @click="loadProjects" variant="text" icon size="small" class="refresh-btn">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>

          <v-divider />

          <div class="table-container">
            <v-table class="projects-table">
              <thead>
                <tr>
                  <th>Project Details</th>
                  <th>Forwarded By</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Forwarded Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="project in filteredProjects"
                  :key="`${project.type}-${project.id}`"
                  class="project-row"
                >
                  <td>
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
                  </td>
                  <td>
                    <div class="submitter-info">
                      <div class="submitter-name">{{ project.submittedBy }}</div>
                      <div class="submitter-role">Editor-in-Chief</div>
                    </div>
                  </td>
                  <td>
                    <v-chip size="small" variant="outlined">
                      {{ project.department }}
                    </v-chip>
                  </td>
                  <td>
                    <v-chip :color="getPriorityColor(project.priority)" size="small">
                      {{ project.priority }}
                    </v-chip>
                  </td>
                  <td>
                    <v-chip :color="getStatusColor(project.status)" size="small">
                      {{ project.status }}
                    </v-chip>
                  </td>
                  <td>
                    <div class="date-info">
                      {{ formatDate(project.submittedDate) }}
                    </div>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <!-- View -->
                      <v-btn
                        @click="handleViewProject(project)"
                        variant="text"
                        icon
                        size="small"
                        class="action-btn view-btn"
                        title="View Project"
                      >
                        <v-icon>mdi-eye</v-icon>
                      </v-btn>

                      <!-- Return -->
                      <v-btn
                        @click="startReturn(project)"
                        variant="text"
                        icon
                        size="small"
                        class="action-btn return-btn"
                        title="Return to EIC"
                        :disabled="project.status === 'Published'"
                      >
                        <v-icon>mdi-arrow-left-circle</v-icon>
                      </v-btn>

                      <!-- Approve & Publish -->
                      <v-btn
                        @click="startApprove(project)"
                        variant="text"
                        icon
                        size="small"
                        class="action-btn approve-btn"
                        title="Approve & Publish"
                        :disabled="project.status === 'Published'"
                      >
                        <v-icon>mdi-check-decagram</v-icon>
                      </v-btn>
                    </div>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <!-- Empty State -->
            <div v-if="filteredProjects.length === 0" class="empty-state">
              <v-icon size="64" color="grey-lighten-1">mdi-shield-crown-outline</v-icon>
              <h3>No projects found</h3>
              <p>There are no projects for Chief Adviser review at this time.</p>
            </div>
          </div>
        </v-card>
      </v-container>
    </v-main>

    <Footer />

    <!-- Approve Dialog -->
    <v-dialog v-model="showApproveDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" color="success">mdi-check-decagram</v-icon>
          Approve & Publish Project
        </v-card-title>

        <v-card-text>
          <p class="mb-4">
            Approve and publish "{{ currentProject?.title }}" as Chief Adviser. This is the final
            approval step.
          </p>

          <v-textarea
            v-model="approveData.approvalNotes"
            label="Approval Notes"
            placeholder="Add your final approval comments..."
            variant="outlined"
            rows="3"
            class="mb-4"
          />

          <v-textarea
            v-model="approveData.conditions"
            label="Special Conditions (Optional)"
            placeholder="Any special conditions or notes..."
            variant="outlined"
            rows="2"
          />

          <v-alert type="success" variant="outlined" class="mt-4">
            <strong>Final Approval:</strong> This project will be marked as officially published
            with Chief Adviser approval.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-btn @click="cancelApprove" variant="outlined">Cancel</v-btn>
          <v-spacer />
          <v-btn @click="confirmApprove" color="success" prepend-icon="mdi-check-decagram">
            Approve & Publish
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Return Dialog -->
    <v-dialog v-model="showReturnDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" color="warning">mdi-arrow-left-circle</v-icon>
          Return Project
        </v-card-title>

        <v-card-text>
          <p class="mb-4">Return "{{ currentProject?.title }}" for revision.</p>

          <v-select
            v-model="returnData.returnTo"
            label="Return To"
            :items="['Editor-in-Chief', 'Section Head', 'Author']"
            variant="outlined"
            class="mb-4"
          />

          <v-textarea
            v-model="returnData.returnNotes"
            label="Return Notes (Required)"
            placeholder="Explain what needs to be revised..."
            variant="outlined"
            rows="4"
            required
          />

          <v-alert type="warning" variant="outlined" class="mt-4">
            <strong>Action:</strong> Project will be returned to {{ returnData.returnTo }} for
            revisions.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-btn @click="cancelReturn" variant="outlined">Cancel</v-btn>
          <v-spacer />
          <v-btn
            @click="confirmReturn"
            color="warning"
            prepend-icon="mdi-arrow-left-circle"
            :disabled="!returnData.returnNotes.trim()"
          >
            Return Project
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
.adviser-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
}

.main-content {
  flex: 1;
  padding: 0 !important;
}

.adviser-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding: 24px 0;
  border-bottom: 1px solid #e5e7eb;
}

.header-content {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.title-icon {
  color: #7c3aed;
  font-size: 36px;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 24px;
}

.stat-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  min-width: 120px;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

.controls-section {
  margin-bottom: 24px;
}

.view-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding: 4px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  width: fit-content;
}

.tab-btn {
  text-transform: none !important;
  font-weight: 500 !important;
  border-radius: 4px !important;
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
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
  gap: 16px;
}

.sort-select {
  width: 200px;
  background: white;
}

.urgent-filter {
  white-space: nowrap;
}

.projects-table-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.refresh-btn {
  opacity: 0.7;
}

.refresh-btn:hover {
  opacity: 1;
}

.table-container {
  min-height: 400px;
}

.projects-table {
  width: 100%;
}

.projects-table thead th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.project-row {
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.project-row:hover {
  background-color: #f8fafc;
}

.projects-table td {
  padding: 16px;
  vertical-align: middle;
}

.project-info {
  min-width: 250px;
}

.project-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
  line-height: 1.4;
}

.project-title.clickable {
  cursor: pointer;
  color: #7c3aed;
  transition: color 0.2s ease;
}

.project-title.clickable:hover {
  color: #6d28d9;
  text-decoration: underline;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-id {
  font-size: 12px;
  color: #6b7280;
  font-family: monospace;
}

.submitter-info {
  min-width: 150px;
}

.submitter-name {
  font-weight: 500;
  color: #1f2937;
}

.submitter-role {
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}

.date-info {
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-start;
  align-items: center;
}

.action-btn {
  transition: all 0.2s ease;
}

.view-btn {
  color: #7c3aed !important;
}

.view-btn:hover {
  background-color: #faf5ff !important;
}

.return-btn {
  color: #f59e0b !important;
}

.return-btn:hover {
  background-color: #fffbeb !important;
}

.approve-btn {
  color: #10b981 !important;
}

.approve-btn:hover {
  background-color: #f0fdf4 !important;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-state h3 {
  margin: 16px 0 8px 0;
  color: #374151;
}

.empty-state p {
  color: #6b7280;
  margin: 0;
}

@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
    gap: 20px;
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
}

@media (max-width: 768px) {
  .adviser-container {
    padding: 16px !important;
  }

  .page-title {
    font-size: 28px;
  }

  .view-tabs {
    flex-wrap: wrap;
    width: 100%;
  }

  .tab-btn {
    flex: 1;
    min-width: calc(50% - 4px);
  }

  .header-stats {
    flex-direction: column;
    gap: 12px;
  }

  .stat-card {
    padding: 16px;
  }

  .projects-table {
    font-size: 14px;
  }

  .projects-table td,
  .projects-table th {
    padding: 12px 8px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 2px;
  }
}
</style>
