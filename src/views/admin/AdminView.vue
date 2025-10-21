<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import ArchiveHeader from '@/components/layout/ArchiveHeader.vue'
import Footer from '@/components/layout/Footer.vue'

const router = useRouter()

// State for statistics and content
const statistics = ref({
  totalUsers: 0,
  activeUsers: 0,
  totalProjects: 0,
  totalSubmissions: 0,
  recentProjects: [],
  recentSubmissions: [],
})

const users = ref([])
const projects = ref([])
const loading = ref(true)
const error = ref(null)
const search = ref('')
const statusFilter = ref('all')
const departmentFilter = ref('all')
const sortBy = ref('created_at')
const showAllDialog = ref(false)
const showAllType = ref('')
const allRecords = ref([])

// Departments for filtering
const departments = ['News', 'Sports', 'Arts', 'Opinion', 'Features']

const activeTab = ref('users')

// Function to load all projects from localStorage
const loadAllProjects = () => {
  const magazineProjects = JSON.parse(localStorage.getItem('magazine_projects') || '[]')
  const folioProjects = JSON.parse(localStorage.getItem('folio_projects') || '[]')
  const newsletterProjects = JSON.parse(localStorage.getItem('newsletter_projects') || '[]')
  const otherProjects = JSON.parse(localStorage.getItem('other_projects') || '[]')

  // Default projects from each view
  const defaultMagazineProjects = [
    {
      id: 1,
      title: 'Hope Magazine - The Gold Panicles 2020',
      sectionHead: 'Mark Dela Cruz',
      dueDate: 'Sep 7, 2020',
      status: 'To Editor-in-Chief',
      type: 'Magazine',
      created_at: new Date('2020-09-01').toISOString(),
      user: { full_name: 'Mark Dela Cruz', email: 'mark.delacruz@campus.edu' },
    },
    {
      id: 2,
      title: 'Hope Magazine - The Gold Panicles 2020',
      sectionHead: 'Rey Dela Cruz',
      dueDate: 'Sep 7, 2020',
      status: 'To Section Head',
      type: 'Magazine',
      created_at: new Date('2020-09-01').toISOString(),
      user: { full_name: 'Rey Dela Cruz', email: 'rey.delacruz@campus.edu' },
    },
    {
      id: 3,
      title: 'Hope Magazine - The Gold Panicles 2020',
      sectionHead: 'Ella Domingo',
      dueDate: 'Sep 7, 2020',
      status: 'To Publish',
      type: 'Magazine',
      created_at: new Date('2020-09-01').toISOString(),
      user: { full_name: 'Ella Domingo', email: 'ella.domingo@campus.edu' },
    },
  ]

  const defaultFolioProjects = [
    {
      id: 11,
      title: 'Laom Folio - Yaon 2021',
      sectionHead: 'John Santos',
      dueDate: 'Oct 10, 2021',
      status: 'To Section Head',
      type: 'Folio',
      created_at: new Date('2021-10-01').toISOString(),
      user: { full_name: 'John Santos', email: 'john.santos@campus.edu' },
    },
    {
      id: 12,
      title: 'Laom Folio - Yaon 2021',
      sectionHead: 'James Rivera',
      dueDate: 'Oct 10, 2021',
      status: 'To Technical Editor',
      type: 'Folio',
      created_at: new Date('2021-10-01').toISOString(),
      user: { full_name: 'James Rivera', email: 'james.rivera@campus.edu' },
    },
  ]

  const defaultNewsletterProjects = [
    {
      id: 21,
      title: 'Weekly Newsletter - Campus Updates',
      sectionHead: 'Sarah Johnson',
      dueDate: 'Jan 15, 2025',
      status: 'To Editor-in-Chief',
      type: 'Newsletter',
      created_at: new Date('2025-01-10').toISOString(),
      user: { full_name: 'Sarah Johnson', email: 'sarah.johnson@campus.edu' },
    },
    {
      id: 22,
      title: 'Monthly Newsletter - Student Spotlight',
      sectionHead: 'Michael Chen',
      dueDate: 'Jan 20, 2025',
      status: 'To Section Head',
      type: 'Newsletter',
      created_at: new Date('2025-01-10').toISOString(),
      user: { full_name: 'Michael Chen', email: 'michael.chen@campus.edu' },
    },
  ]

  const defaultOtherProjects = [
    {
      id: 31,
      title: 'Instagram Post - Campus Event Promotion',
      sectionHead: 'Jessica Park',
      dueDate: 'Jan 18, 2025',
      status: 'To Editor-in-Chief',
      type: 'Social Media',
      created_at: new Date('2025-01-15').toISOString(),
      user: { full_name: 'Jessica Park', email: 'jessica.park@campus.edu' },
    },
    {
      id: 32,
      title: 'Facebook Post - Student Achievement',
      sectionHead: "Ryan O'Connor",
      dueDate: 'Jan 22, 2025',
      status: 'To Section Head',
      type: 'Social Media',
      created_at: new Date('2025-01-15').toISOString(),
      user: { full_name: "Ryan O'Connor", email: 'ryan.oconnor@campus.edu' },
    },
  ]

  // Combine all projects
  const allProjects = [
    ...defaultMagazineProjects,
    ...defaultFolioProjects,
    ...defaultNewsletterProjects,
    ...defaultOtherProjects,
    ...magazineProjects.map((p) => ({ ...p, type: 'Magazine' })),
    ...folioProjects.map((p) => ({ ...p, type: 'Folio' })),
    ...newsletterProjects.map((p) => ({ ...p, type: 'Newsletter' })),
    ...otherProjects.map((p) => ({ ...p, type: 'Social Media' })),
  ]

  // Remove duplicates based on title and id
  const uniqueProjects = allProjects.reduce((acc, project) => {
    const existing = acc.find((p) => p.id === project.id || p.title === project.title)
    if (!existing) {
      acc.push({
        ...project,
        user: project.user || {
          full_name: project.sectionHead,
          email: `${project.sectionHead?.toLowerCase().replace(/\s+/g, '.')}@campus.edu`,
        },
      })
    }
    return acc
  }, [])

  return uniqueProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// Function to load submissions data
const loadSubmissions = () => {
  // Mock submissions - expanded for demo
  return [
    {
      id: 1,
      title: 'Breaking News - Campus Event',
      type: 'News Article',
      department: 'News',
      created_at: new Date().toISOString(),
      user: { full_name: 'John Doe', email: 'john.doe@campus.edu' },
    },
    {
      id: 2,
      title: 'Basketball Game Highlights',
      type: 'Sports Report',
      department: 'Sports',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      user: { full_name: 'Jane Smith', email: 'jane.smith@campus.edu' },
    },
    {
      id: 3,
      title: 'Gallery Opening Review',
      type: 'Arts Review',
      department: 'Arts',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      user: { full_name: 'Mike Johnson', email: 'mike.johnson@campus.edu' },
    },
    {
      id: 4,
      title: 'Student Opinion Survey Results',
      type: 'Opinion Piece',
      department: 'Opinion',
      created_at: new Date(Date.now() - 259200000).toISOString(),
      user: { full_name: 'Sarah Wilson', email: 'sarah.wilson@campus.edu' },
    },
    {
      id: 5,
      title: 'Campus Life Feature Story',
      type: 'Feature Article',
      department: 'Features',
      created_at: new Date(Date.now() - 345600000).toISOString(),
      user: { full_name: 'David Brown', email: 'david.brown@campus.edu' },
    },
    {
      id: 6,
      title: 'Football Team Victory Report',
      type: 'Sports Report',
      department: 'Sports',
      created_at: new Date(Date.now() - 432000000).toISOString(),
      user: { full_name: 'Carlos Rodriguez', email: 'carlos.rodriguez@campus.edu' },
    },
    {
      id: 7,
      title: 'Art Exhibition Opening',
      type: 'Arts Review',
      department: 'Arts',
      created_at: new Date(Date.now() - 518400000).toISOString(),
      user: { full_name: 'Emily Chen', email: 'emily.chen@campus.edu' },
    },
    {
      id: 8,
      title: 'Student Government Elections',
      type: 'News Article',
      department: 'News',
      created_at: new Date(Date.now() - 604800000).toISOString(),
      user: { full_name: 'Alex Thompson', email: 'alex.thompson@campus.edu' },
    },
  ]
}

// Load data on mount
onMounted(async () => {
  try {
    console.log('Starting to fetch admin data...')
    loading.value = true

    // Load all projects from localStorage and defaults
    const allProjects = loadAllProjects()
    projects.value = allProjects

    // Load submissions
    const allSubmissions = loadSubmissions()

    // Extract unique users from projects
    const uniqueUsers = new Map()

    // Add users from projects
    allProjects.forEach((project) => {
      if (project.user) {
        const userId = project.user.email
        if (!uniqueUsers.has(userId)) {
          uniqueUsers.set(userId, {
            id: uniqueUsers.size + 1,
            full_name: project.user.full_name,
            email: project.user.email,
            department: getDepartmentFromEmail(project.user.email),
            status: 'active',
            created_at: new Date().toISOString(),
            role: getRoleFromName(project.user.full_name),
          })
        }
      }
    })

    // Add mock admin users
    const adminUsers = [
      {
        id: uniqueUsers.size + 1,
        full_name: 'Admin User',
        email: 'admin@campus.edu',
        department: 'Administration',
        status: 'active',
        created_at: new Date().toISOString(),
        role: 'Administrator',
      },
      {
        id: uniqueUsers.size + 2,
        full_name: 'Editor Chief',
        email: 'editor.chief@campus.edu',
        department: 'Editorial',
        status: 'active',
        created_at: new Date().toISOString(),
        role: 'Editor-in-Chief',
      },
    ]

    adminUsers.forEach((user) => {
      uniqueUsers.set(user.email, user)
    })

    users.value = Array.from(uniqueUsers.values())

    // Update statistics - show all data in fixed tables
    statistics.value = {
      totalUsers: users.value.length,
      activeUsers: users.value.filter((u) => u.status === 'active').length,
      totalProjects: allProjects.length,
      totalSubmissions: allSubmissions.length,
      recentProjects: allProjects, // All projects in fixed table
      recentSubmissions: allSubmissions, // All submissions in fixed table
    }

    console.log('All data loaded successfully:', {
      users: users.value.length,
      projects: allProjects.length,
      submissions: allSubmissions.length,
    })
  } catch (err) {
    console.error('Error in onMounted:', err)
    error.value = `Failed to load dashboard data: ${err.message}`
  } finally {
    loading.value = false
  }
})

// Helper functions
const getDepartmentFromEmail = (email) => {
  const domains = {
    news: 'News',
    sports: 'Sports',
    arts: 'Arts',
    opinion: 'Opinion',
    features: 'Features',
  }

  for (const [key, dept] of Object.entries(domains)) {
    if (email.toLowerCase().includes(key)) {
      return dept
    }
  }

  // Default assignment based on name patterns
  return departments[Math.floor(Math.random() * departments.length)]
}

const getRoleFromName = (name) => {
  const roles = ['Section Head', 'Writer', 'Technical Editor', 'Assistant Editor']
  if (name.toLowerCase().includes('mark') || name.toLowerCase().includes('sarah')) {
    return 'Section Head'
  }
  if (name.toLowerCase().includes('john') || name.toLowerCase().includes('jane')) {
    return 'Editor-in-Chief'
  }
  return roles[Math.floor(Math.random() * roles.length)]
}

// Computed properties for filtered users
const filteredUsers = computed(() => {
  return users.value
    .filter((user) => {
      const matchesSearch =
        !search.value ||
        user.email.toLowerCase().includes(search.value.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(search.value.toLowerCase())

      const matchesStatus =
        statusFilter.value === 'all' ||
        (statusFilter.value === 'active' && user.status === 'active') ||
        (statusFilter.value === 'inactive' && user.status !== 'active')

      const matchesDepartment =
        departmentFilter.value === 'all' || user.department === departmentFilter.value

      return matchesSearch && matchesStatus && matchesDepartment
    })
    .sort((a, b) => {
      if (sortBy.value === 'created_at') {
        return new Date(b.created_at) - new Date(a.created_at)
      }
      if (sortBy.value === 'email') {
        return a.email.localeCompare(b.email)
      }
      if (sortBy.value === 'full_name') {
        return (a.full_name || '').localeCompare(b.full_name || '')
      }
      return 0
    })
})

// Format date helper
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Update user status
const updateUserStatus = async (userId, newStatus) => {
  try {
    const userIndex = users.value.findIndex((u) => u.id === userId)
    if (userIndex !== -1) {
      users.value[userIndex].status = newStatus
      // Update active users count
      statistics.value.activeUsers = users.value.filter((u) => u.status === 'active').length
    }
    console.log(`Updated user ${userId} status to ${newStatus}`)
  } catch (err) {
    console.error('Error updating user status:', err)
    error.value = 'Failed to update user status'
  }
}

// View user details
const viewUserDetails = (userId) => {
  console.log('Viewing user details:', userId)
  // Implement user details view
}

// Navigation helper
const goTo = (route, params = {}) => {
  router.push({ name: route, params })
}

// Fetch all records function
const fetchAllRecords = async (type) => {
  try {
    showAllType.value = type
    if (type === 'projects') {
      allRecords.value = projects.value
    } else if (type === 'submissions') {
      allRecords.value = statistics.value.recentSubmissions
    }
    showAllDialog.value = true
  } catch (err) {
    console.error('Error fetching all records:', err)
  }
}
</script>

<template>
  <v-app class="admin-page">
    <ArchiveHeader />

    <v-main class="main-content">
      <v-container class="py-8">
        <!-- Loading State -->
        <v-overlay v-if="loading" class="align-center justify-center">
          <v-progress-circular indeterminate size="64"></v-progress-circular>
        </v-overlay>

        <!-- Error State -->
        <v-alert v-if="error" type="error" class="mb-4">
          {{ error }}
        </v-alert>

        <!-- Dashboard Overview -->
        <v-row>
          <v-col cols="12">
            <v-card class="mb-6">
              <v-card-title class="text-h5 font-weight-bold">
                <v-icon class="mr-2" color="primary">mdi-view-dashboard</v-icon>
                CAMS Admin Dashboard
              </v-card-title>
              <v-card-text>
                <v-row>
                  <!-- Stats Cards -->
                  <v-col cols="12" sm="6" md="3">
                    <v-card class="pa-4" color="primary" dark elevation="4">
                      <div class="d-flex align-center">
                        <v-icon size="36" class="mr-3">mdi-account-group</v-icon>
                        <div>
                          <div class="text-h4 mb-2">{{ statistics.totalUsers }}</div>
                          <div class="text-subtitle-1">Total Users</div>
                        </div>
                      </div>
                    </v-card>
                  </v-col>

                  <v-col cols="12" sm="6" md="3">
                    <v-card class="pa-4" color="success" dark elevation="4">
                      <div class="d-flex align-center">
                        <v-icon size="36" class="mr-3">mdi-account-check</v-icon>
                        <div>
                          <div class="text-h4 mb-2">{{ statistics.activeUsers }}</div>
                          <div class="text-subtitle-1">Active Users</div>
                        </div>
                      </div>
                    </v-card>
                  </v-col>

                  <v-col cols="12" sm="6" md="3">
                    <v-card class="pa-4" color="info" dark elevation="4">
                      <div class="d-flex align-center">
                        <v-icon size="36" class="mr-3">mdi-folder-multiple</v-icon>
                        <div>
                          <div class="text-h4 mb-2">{{ statistics.totalProjects }}</div>
                          <div class="text-subtitle-1">Total Projects</div>
                        </div>
                      </div>
                    </v-card>
                  </v-col>

                  <v-col cols="12" sm="6" md="3">
                    <v-card class="pa-4" color="warning" dark elevation="4">
                      <div class="d-flex align-center">
                        <v-icon size="36" class="mr-3">mdi-file-document-multiple</v-icon>
                        <div>
                          <div class="text-h4 mb-2">{{ statistics.totalSubmissions }}</div>
                          <div class="text-subtitle-1">Total Submissions</div>
                        </div>
                      </div>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- Recent Activity - Fixed Tables -->
                <v-row class="mt-4">
                  <v-col cols="12">
                    <v-card>
                      <v-card-title class="text-h6 d-flex justify-space-between align-center">
                        <div>
                          <v-icon class="mr-2" color="primary">mdi-folder-multiple</v-icon>
                          All Projects
                        </div>
                        <v-btn
                          variant="text"
                          color="primary"
                          @click="fetchAllRecords('projects')"
                          class="text-none"
                        >
                          View Details
                          <v-icon end>mdi-chevron-right</v-icon>
                        </v-btn>
                      </v-card-title>
                      <v-card-text>
                        <v-table>
                          <thead>
                            <tr>
                              <th class="text-center" style="width: 60px">#</th>
                              <th>Title</th>
                              <th>Type</th>
                              <th>Status</th>
                              <th>Created By</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="(project, index) in statistics.recentProjects"
                              :key="project.id"
                            >
                              <td class="text-center">{{ index + 1 }}</td>
                              <td>{{ project.title }}</td>
                              <td>{{ project.type }}</td>
                              <td>
                                <v-chip
                                  :color="
                                    project.status === 'Published' ||
                                    project.status === 'To Publish'
                                      ? 'success'
                                      : project.status.includes('Review') ||
                                          project.status.includes('Editor')
                                        ? 'warning'
                                        : 'default'
                                  "
                                  size="small"
                                >
                                  {{ project.status }}
                                </v-chip>
                              </td>
                              <td>
                                {{ project.user?.full_name || project.sectionHead }}
                              </td>
                              <td>{{ formatDate(project.created_at) }}</td>
                            </tr>
                          </tbody>
                        </v-table>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <v-col cols="12" class="mt-4">
                    <v-card>
                      <v-card-title class="text-h6 d-flex justify-space-between align-center">
                        <div>
                          <v-icon class="mr-2" color="primary">mdi-file-document-multiple</v-icon>
                          All Submissions
                        </div>
                        <v-btn
                          variant="text"
                          color="primary"
                          @click="fetchAllRecords('submissions')"
                          class="text-none"
                        >
                          View Details
                          <v-icon end>mdi-chevron-right</v-icon>
                        </v-btn>
                      </v-card-title>
                      <v-card-text>
                        <v-table>
                          <thead>
                            <tr>
                              <th class="text-center" style="width: 60px">#</th>
                              <th>Title</th>
                              <th>Type</th>
                              <th>Department</th>
                              <th>Submitted By</th>
                              <th>Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="(submission, index) in statistics.recentSubmissions"
                              :key="submission.id"
                            >
                              <td class="text-center">{{ index + 1 }}</td>
                              <td>{{ submission.title }}</td>
                              <td>{{ submission.type }}</td>
                              <td>{{ submission.department }}</td>
                              <td>{{ submission.user?.full_name || submission.user?.email }}</td>
                              <td>{{ formatDate(submission.created_at) }}</td>
                            </tr>
                          </tbody>
                        </v-table>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- View All Dialog -->
                <v-dialog v-model="showAllDialog" max-width="1200">
                  <v-card>
                    <v-card-title class="text-h5 d-flex justify-space-between align-center pa-4">
                      <div>
                        <v-icon class="mr-2" color="primary">
                          {{
                            showAllType === 'projects'
                              ? 'mdi-folder-multiple'
                              : 'mdi-file-document-multiple'
                          }}
                        </v-icon>
                        All {{ showAllType === 'projects' ? 'Projects' : 'Submissions' }} Details
                      </div>
                      <v-btn icon @click="showAllDialog = false">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </v-card-title>
                    <v-card-text class="pa-4">
                      <v-table>
                        <thead>
                          <tr>
                            <th class="text-center" style="width: 60px">#</th>
                            <th>Title</th>
                            <th>Type</th>
                            <th v-if="showAllType === 'projects'">Status</th>
                            <th v-else>Department</th>
                            <th>
                              {{ showAllType === 'projects' ? 'Created By' : 'Submitted By' }}
                            </th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(record, index) in allRecords" :key="record.id">
                            <td class="text-center">{{ index + 1 }}</td>
                            <td>{{ record.title }}</td>
                            <td>{{ record.type }}</td>
                            <td>
                              <v-chip
                                v-if="showAllType === 'projects'"
                                :color="
                                  record.status === 'Published' || record.status === 'To Publish'
                                    ? 'success'
                                    : record.status.includes('Review') ||
                                        record.status.includes('Editor')
                                      ? 'warning'
                                      : 'default'
                                "
                                size="small"
                              >
                                {{ record.status }}
                              </v-chip>
                              <span v-else>{{ record.department }}</span>
                            </td>
                            <td>{{ record.user?.full_name || record.sectionHead }}</td>
                            <td>{{ formatDate(record.created_at) }}</td>
                          </tr>
                        </tbody>
                      </v-table>
                    </v-card-text>
                  </v-card>
                </v-dialog>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Content Tabs -->
        <v-row>
          <v-col cols="12">
            <v-card>
              <v-tabs v-model="activeTab" color="primary">
                <v-tab value="users">User Management</v-tab>
                <v-tab value="content">Content Management</v-tab>
                <v-tab value="settings">System Settings</v-tab>
              </v-tabs>

              <v-window v-model="activeTab">
                <!-- User Management Tab -->
                <v-window-item value="users">
                  <v-card-text>
                    <!-- Filters -->
                    <v-row class="mb-4">
                      <v-col cols="12" md="4">
                        <v-text-field
                          v-model="search"
                          label="Search users"
                          prepend-inner-icon="mdi-magnify"
                          variant="outlined"
                          density="comfortable"
                          hide-details
                        ></v-text-field>
                      </v-col>
                      <v-col cols="12" md="3">
                        <v-select
                          v-model="statusFilter"
                          label="Status"
                          :items="['all', 'active', 'inactive']"
                          variant="outlined"
                          density="comfortable"
                          hide-details
                        ></v-select>
                      </v-col>
                      <v-col cols="12" md="3">
                        <v-select
                          v-model="departmentFilter"
                          label="Department"
                          :items="['all', ...departments, 'Administration', 'Editorial']"
                          variant="outlined"
                          density="comfortable"
                          hide-details
                        ></v-select>
                      </v-col>
                      <v-col cols="12" md="2">
                        <v-select
                          v-model="sortBy"
                          label="Sort by"
                          :items="[
                            { title: 'Date', value: 'created_at' },
                            { title: 'Email', value: 'email' },
                            { title: 'Name', value: 'full_name' },
                          ]"
                          variant="outlined"
                          density="comfortable"
                          hide-details
                        ></v-select>
                      </v-col>
                    </v-row>

                    <!-- Users Table - Fixed, No Scroll -->
                    <v-table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Department</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="user in filteredUsers" :key="user.id">
                          <td>{{ user.full_name || 'N/A' }}</td>
                          <td>{{ user.email }}</td>
                          <td>{{ user.department || 'N/A' }}</td>
                          <td>{{ user.role || 'N/A' }}</td>
                          <td>
                            <v-chip
                              :color="user.status === 'active' ? 'success' : 'error'"
                              @click="
                                updateUserStatus(
                                  user.id,
                                  user.status === 'active' ? 'inactive' : 'active',
                                )
                              "
                            >
                              {{ user.status || 'active' }}
                            </v-chip>
                          </td>
                          <td>
                            <v-btn
                              icon
                              variant="text"
                              color="primary"
                              @click="viewUserDetails(user.id)"
                            >
                              <v-icon>mdi-eye</v-icon>
                            </v-btn>
                          </td>
                        </tr>
                      </tbody>
                    </v-table>
                  </v-card-text>
                </v-window-item>

                <!-- Content Management Tab -->
                <v-window-item value="content">
                  <v-card-text>
                    <div class="text-center py-8">
                      <v-icon size="64" color="grey">mdi-folder-multiple</v-icon>
                      <h3 class="text-h6 mt-4">Content Management</h3>
                      <p class="text-grey">
                        Manage newsletters, folios, and other content submissions
                      </p>
                      <v-btn color="primary" class="mt-4">
                        <v-icon left>mdi-plus</v-icon>
                        Add Content
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-window-item>

                <!-- System Settings Tab -->
                <v-window-item value="settings">
                  <v-card-text>
                    <div class="text-center py-8">
                      <v-icon size="64" color="grey">mdi-cog</v-icon>
                      <h3 class="text-h6 mt-4">System Settings</h3>
                      <p class="text-grey">Configure system settings and preferences</p>
                      <v-btn color="primary" class="mt-4">
                        <v-icon left>mdi-cog</v-icon>
                        Open Settings
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-window-item>
              </v-window>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <Footer />
  </v-app>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
}

.main-content {
  flex: 1;
  padding: 0 !important;
}

.v-card {
  border-radius: 8px;
}

.v-table {
  border-radius: 8px;
}

.v-btn {
  text-transform: none;
  letter-spacing: normal;
}

.v-chip {
  cursor: pointer;
}

/* Fixed Table Styles */
.v-table thead th {
  background-color: #f8fafc;
  border-bottom: 2px solid #e0e0e0;
  font-weight: 600;
  padding: 16px;
  color: #424242;
}

.v-table tbody tr {
  transition: background-color 0.2s ease;
}

.v-table tbody tr:hover {
  background-color: #f5f5f5;
}

.v-table tbody td {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .v-table thead th,
  .v-table tbody td {
    padding: 12px 8px;
    font-size: 14px;
  }
}
</style>
