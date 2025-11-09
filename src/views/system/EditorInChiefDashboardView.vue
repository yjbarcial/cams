<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

const router = useRouter()

// State management
const selectedProjects = ref([])
const searchQuery = ref('')
const sortOrder = ref('Date Submitted ↓')
const showOnlyUrgent = ref(false)
const viewMode = ref('all')

// Projects data
const projects = ref([])

// Dialog states
const showPublishDialog = ref(false)
const showApproveDialog = ref(false)
const showForwardDialog = ref(false)
const showDetailDialog = ref(false) // ADD THIS
const currentProject = ref(null)
const detailProject = ref(null) // ADD THIS

// Dialog form data
const publishData = ref({
  publishDate: '',
  publishPlatform: 'Website',
  publishNotes: '',
})

const approveData = ref({
  approvalNotes: '',
  conditions: '',
})

const forwardData = ref({
  forwardNotes: '',
  priority: 'Medium',
  advisorNotes: '',
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

      // Filter projects that are ONLY for Editor-in-Chief
      const eicProjects = typeProjects
        .filter(
          (project) =>
            project.status === 'To Editor-in-Chief' ||
            project.status === 'EIC Review' ||
            project.status === 'EIC Approved',
        )
        .map((project) => ({
          ...project,
          type: type,
          submittedDate: project.submittedDate || new Date().toISOString(),
          priority: project.priority || 'Medium',
          department: project.department || getDepartmentFromType(type),
          submittedBy: project.submittedBy || project.sectionHead || 'Unknown',
        }))

      allProjects = [...allProjects, ...eicProjects]
    })

    projects.value = allProjects
    console.log('EIC Projects loaded:', allProjects)
  } catch (error) {
    console.error('Error loading EIC projects:', error)
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
    filtered = filtered.filter(
      (p) => p.status === 'To Editor-in-Chief' || p.status === 'EIC Review',
    )
  } else if (viewMode.value === 'approved') {
    filtered = filtered.filter((p) => p.status === 'EIC Approved')
  }
  // Remove 'published' and 'To Chief Adviser' modes

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
  pending: projects.value.filter(
    (p) => p.status === 'To Editor-in-Chief' || p.status === 'EIC Review',
  ).length,
  approved: projects.value.filter((p) => p.status === 'EIC Approved').length,
}))

// Action functions
const handleViewProject = (project) => {
  // DON'T route - just open dialog
  detailProject.value = project
  showDetailDialog.value = true
  console.log('Opening detail dialog for:', project)
}

const startPublish = (project) => {
  currentProject.value = project
  publishData.value = {
    publishDate: new Date().toISOString().split('T')[0],
    publishPlatform: 'Website',
    publishNotes: '',
  }
  showPublishDialog.value = true
}

const startApprove = (project) => {
  currentProject.value = project
  approveData.value = {
    approvalNotes: '',
    conditions: '',
  }
  showApproveDialog.value = true
}

const startForward = (project) => {
  currentProject.value = project
  forwardData.value = {
    forwardNotes: '',
    priority: project.priority || 'Medium',
    advisorNotes: '',
  }
  showForwardDialog.value = true
}

const closeDetailDialog = () => {
  showDetailDialog.value = false
  detailProject.value = null
}

// Confirm actions
const confirmPublish = () => {
  if (!currentProject.value) return

  try {
    const storageKey = `${currentProject.value.type}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const projectIndex = projects.findIndex((p) => p.id === currentProject.value.id)

    if (projectIndex !== -1) {
      projects[projectIndex] = {
        ...projects[projectIndex],
        status: 'Published',
        publishedDate: publishData.value.publishDate,
        publishedBy: 'Editor-in-Chief',
        publishPlatform: publishData.value.publishPlatform,
        publishNotes: publishData.value.publishNotes,
        lastModified: new Date().toLocaleString(),
      }

      localStorage.setItem(storageKey, JSON.stringify(projects))

      showNotification(
        `"${currentProject.value.title}" has been published successfully!`,
        'success',
      )
      loadProjects()
    }
  } catch (error) {
    console.error('Error publishing project:', error)
    showNotification('Error publishing project', 'error')
  }

  showPublishDialog.value = false
  currentProject.value = null
}

const confirmApprove = () => {
  if (!currentProject.value) return

  try {
    const storageKey = `${currentProject.value.type}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const projectIndex = projects.findIndex((p) => p.id === currentProject.value.id)

    if (projectIndex !== -1) {
      projects[projectIndex] = {
        ...projects[projectIndex],
        status: 'EIC Approved',
        eicApprovedDate: new Date().toISOString(),
        eicApprovedBy: 'Editor-in-Chief',
        eicApprovalNotes: approveData.value.approvalNotes,
        eicConditions: approveData.value.conditions,
        lastModified: new Date().toLocaleString(),
      }

      localStorage.setItem(storageKey, JSON.stringify(projects))

      showNotification(`"${currentProject.value.title}" has been approved!`, 'success')
      loadProjects()
    }
  } catch (error) {
    console.error('Error approving project:', error)
    showNotification('Error approving project', 'error')
  }

  showApproveDialog.value = false
  currentProject.value = null
}

const confirmForward = () => {
  if (!currentProject.value) return

  try {
    const storageKey = `${currentProject.value.type}_projects`
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]')
    const projectIndex = projects.findIndex((p) => p.id === currentProject.value.id)

    if (projectIndex !== -1) {
      projects[projectIndex] = {
        ...projects[projectIndex],
        status: 'To Chief Adviser',
        forwardedToAdviserDate: new Date().toISOString(),
        forwardedBy: 'Editor-in-Chief',
        forwardNotes: forwardData.value.forwardNotes,
        advisorNotes: forwardData.value.advisorNotes,
        priority: forwardData.value.priority,
        lastModified: new Date().toLocaleString(),
      }

      localStorage.setItem(storageKey, JSON.stringify(projects))

      showNotification(
        `"${currentProject.value.title}" has been forwarded to Chief Adviser!`,
        'success',
      )
      loadProjects()
    }
  } catch (error) {
    console.error('Error forwarding project:', error)
    showNotification('Error forwarding project', 'error')
  }

  showForwardDialog.value = false
  currentProject.value = null
}

// Cancel actions
const cancelPublish = () => {
  showPublishDialog.value = false
  currentProject.value = null
}

const cancelApprove = () => {
  showApproveDialog.value = false
  currentProject.value = null
}

const cancelForward = () => {
  showForwardDialog.value = false
  currentProject.value = null
}

// Get status color
const getStatusColor = (status) => {
  const colors = {
    'To Editor-in-Chief': 'primary',
    'EIC Review': 'info',
    'EIC Approved': 'success',
    'To Chief Adviser': 'purple',
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

// Format due date
const formatDueDate = (dateString) => {
  if (!dateString) return 'No deadline set'
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch (error) {
    return dateString
  }
}

// Toggle star (for priority)
const toggleStar = (projectId) => {
  console.log('Toggle priority for project:', projectId)
}

// Helper methods for dialog close actions
const handlePublishAndClose = (project) => {
  startPublish(project)
  closeDetailDialog()
}

const handleForwardAndClose = (project) => {
  startForward(project)
  closeDetailDialog()
}

const handleApproveAndClose = (project) => {
  startApprove(project)
  closeDetailDialog()
}

// Load data on mount
onMounted(() => {
  loadProjects()
})
</script>

<template>
  <v-app class="eic-page">
    <MainHeader />

    <v-main class="main-content">
      <v-container fluid class="eic-container pa-5">
        <!-- Header Section -->
        <div class="page-header">
          <div class="header-content">
            <h1 class="page-title">
              <v-icon class="title-icon">mdi-crown</v-icon>
              Editor-in-Chief Dashboard
            </h1>
            <p class="page-subtitle">Review, approve, and publish projects</p>
          </div>
          <!-- Header Stats -->
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
                  <div class="submitter-role">{{ project.sectionHead }}</div>
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
                  aria-label="View project"
                >
                  <v-icon>mdi-eye</v-icon>
                </v-btn>

                <v-btn
                  class="action-btn edit-btn"
                  @click="startApprove(project)"
                  variant="text"
                  icon
                  size="small"
                  aria-label="Approve"
                  :disabled="project.status === 'Published' || project.status === 'EIC Approved'"
                >
                  <v-icon>mdi-pencil</v-icon>
                </v-btn>

                <v-btn
                  class="action-btn delete-btn"
                  @click="startForward(project)"
                  variant="text"
                  icon
                  size="small"
                  aria-label="Forward"
                  :disabled="
                    project.status === 'Published' || project.status === 'To Chief Adviser'
                  "
                >
                  <v-icon>mdi-dots-horizontal-circle-outline</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </v-container>

          <!-- Empty State -->
          <div v-if="filteredProjects.length === 0" class="empty-state">
            <v-icon size="64" color="grey-lighten-1">mdi-crown-outline</v-icon>
            <h3>No projects found</h3>
            <p>There are no projects for EIC review at this time.</p>
          </div>
        </v-container>
      </v-container>
    </v-main>

    <Footer />

    <!-- ADD THIS DIALOG BEFORE YOUR OTHER DIALOGS -->
    <v-dialog v-model="showDetailDialog" fullscreen transition="dialog-bottom-transition">
      <v-card>
        <v-toolbar color="primary" dark>
          <v-btn icon @click="closeDetailDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
          <v-toolbar-title>Editor-in-Chief Review - {{ detailProject?.title }}</v-toolbar-title>
          <v-spacer />
          <v-chip v-if="detailProject" :color="getStatusColor(detailProject.status)" dark>
            {{ detailProject.status }}
          </v-chip>
        </v-toolbar>

        <v-container v-if="detailProject" class="pa-6">
          <v-row>
            <v-col cols="12" md="8">
              <v-card class="mb-4">
                <v-card-title>Project Information</v-card-title>
                <v-divider />
                <v-card-text>
                  <div class="detail-item"><strong>Title:</strong> {{ detailProject.title }}</div>
                  <div class="detail-item">
                    <strong>Type:</strong>
                    <v-chip size="small">{{ detailProject.type }}</v-chip>
                  </div>
                  <div class="detail-item"><strong>ID:</strong> #{{ detailProject.id }}</div>
                  <div class="detail-item">
                    <strong>Section Head:</strong> {{ detailProject.sectionHead }}
                  </div>
                  <div class="detail-item">
                    <strong>Priority:</strong>
                    <v-chip size="small" :color="getPriorityColor(detailProject.priority)">
                      {{ detailProject.priority }}
                    </v-chip>
                  </div>
                  <div v-if="detailProject.description" class="detail-item">
                    <strong>Description:</strong>
                    <p class="mt-2">{{ detailProject.description }}</p>
                  </div>
                  <div v-if="detailProject.content" class="detail-item">
                    <strong>Content:</strong>
                    <div class="mt-2 content-preview" v-html="detailProject.content"></div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card>
                <v-card-title>Quick Actions</v-card-title>
                <v-divider />
                <v-card-text>
                  <v-btn
                    @click="handlePublishAndClose(detailProject)"
                    color="success"
                    block
                    size="large"
                    prepend-icon="mdi-publish"
                    class="mb-3"
                    :disabled="detailProject.status !== 'EIC Approved'"
                  >
                    Publish Project
                  </v-btn>

                  <v-btn
                    @click="handleForwardAndClose(detailProject)"
                    color="purple"
                    block
                    size="large"
                    prepend-icon="mdi-arrow-right-circle"
                    class="mb-3"
                  >
                    Forward to Adviser
                  </v-btn>

                  <v-btn
                    @click="handleApproveAndClose(detailProject)"
                    color="success"
                    variant="outlined"
                    block
                    size="large"
                    prepend-icon="mdi-check-circle"
                  >
                    Approve Project
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-card>
    </v-dialog>

    <!-- Publish Dialog -->
    <v-dialog v-model="showPublishDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" color="success">mdi-publish</v-icon>
          Publish Project
        </v-card-title>

        <v-card-text>
          <p class="mb-4">
            Publish "{{ currentProject?.title }}" and make it available to the public.
          </p>

          <v-text-field
            type="date"
            v-model="publishData.publishDate"
            label="Publish Date"
            variant="outlined"
            class="mb-4"
            required
          />

          <v-select
            v-model="publishData.publishPlatform"
            label="Publish Platform"
            :items="['Website', 'Print', 'Digital Magazine', 'Social Media', 'All Platforms']"
            variant="outlined"
            class="mb-4"
            required
          />

          <v-textarea
            v-model="publishData.publishNotes"
            label="Publication Notes (Optional)"
            placeholder="Add any notes about this publication..."
            variant="outlined"
            rows="3"
          />

          <v-alert type="success" variant="outlined" class="mt-4">
            <strong>Final Step:</strong> This project will be marked as published and made available
            to readers.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-btn @click="cancelPublish" variant="outlined">Cancel</v-btn>
          <v-spacer />
          <v-btn @click="confirmPublish" color="success" prepend-icon="mdi-publish">
            Publish Project
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Approve Dialog -->
    <v-dialog v-model="showApproveDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
          Approve Project
        </v-card-title>

        <v-card-text>
          <p class="mb-4">Approve "{{ currentProject?.title }}" as Editor-in-Chief.</p>

          <v-textarea
            v-model="approveData.approvalNotes"
            label="Approval Notes"
            placeholder="Add your approval comments..."
            variant="outlined"
            rows="3"
            class="mb-4"
          />

          <v-textarea
            v-model="approveData.conditions"
            label="Conditions/Requirements (Optional)"
            placeholder="Any conditions or requirements for this approval..."
            variant="outlined"
            rows="2"
          />

          <v-alert type="info" variant="outlined" class="mt-4">
            <strong>Note:</strong> This project will be marked as EIC approved and ready for final
            steps.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-btn @click="cancelApprove" variant="outlined">Cancel</v-btn>
          <v-spacer />
          <v-btn @click="confirmApprove" color="success" prepend-icon="mdi-check-circle">
            Approve Project
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Forward to Chief Adviser Dialog -->
    <v-dialog v-model="showForwardDialog" max-width="600px" persistent>
      <v-card>
        <v-card-title>
          <v-icon class="mr-2" color="purple">mdi-arrow-right-circle</v-icon>
          Forward to Chief Adviser
        </v-card-title>

        <v-card-text>
          <p class="mb-4">
            Forward "{{ currentProject?.title }}" to the Chief Adviser for final review.
          </p>

          <v-select
            v-model="forwardData.priority"
            label="Priority Level"
            :items="['High', 'Medium', 'Low']"
            variant="outlined"
            class="mb-4"
          />

          <v-textarea
            v-model="forwardData.forwardNotes"
            label="Forwarding Notes"
            placeholder="Add notes for the Chief Adviser..."
            variant="outlined"
            rows="3"
            class="mb-4"
            required
          />

          <v-textarea
            v-model="forwardData.advisorNotes"
            label="Special Instructions for Adviser (Optional)"
            placeholder="Any special instructions or context for the Chief Adviser..."
            variant="outlined"
            rows="2"
          />

          <v-alert type="info" variant="outlined" class="mt-4">
            <strong>Next Step:</strong> This project will be forwarded to the Chief Adviser for
            final approval.
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-btn @click="cancelForward" variant="outlined">Cancel</v-btn>
          <v-spacer />
          <v-btn @click="confirmForward" color="purple" prepend-icon="mdi-arrow-right-circle">
            Forward to Adviser
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
.eic-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
}

.main-content {
  flex: 1;
  padding: 0 !important;
}

.eic-container {
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
  color: #f59e0b;
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

/* Table - Match MagazineView exactly */
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
  color: #2563eb;
  transition: color 0.2s ease;
}

.project-title.clickable:hover {
  color: #1d4ed8;
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
  color: #6b7280 !important;
}

:deep(.delete-btn:hover) {
  background-color: #f3f4f6 !important;
  color: #3b82f6 !important;
}

:deep(.action-btn:disabled) {
  opacity: 0.4;
  cursor: not-allowed;
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

.detail-item {
  margin-bottom: 16px;
  line-height: 1.6;
}

.detail-item strong {
  color: #374151;
  margin-right: 8px;
}

.content-preview {
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  max-height: 400px;
  overflow-y: auto;
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
  .eic-container {
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
