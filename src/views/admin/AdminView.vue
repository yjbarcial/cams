<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase.js'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import UploadView from '@/views/system/UploadView.vue'
import clearClientData from '@/utils/clearClientData'

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
const departmentFilter = ref('all')
const showAllDialog = ref(false)
const showAllType = ref('')
const allRecords = ref([])
const showAddUserDialog = ref(false)
const showUploadView = ref(false)
const showClearDialog = ref(false)
const clearTypedConfirm = ref('')
const clearInProgress = ref(false)
const clearMessage = ref('')
const newUser = ref({
  full_name: '',
  email: '',
  department: '',
  role: '',
})

// Departments for filtering
const departments = ['News', 'Sports', 'Arts', 'Opinion', 'Features']

const activeTab = ref('users')

// ⭐ CLEANED: Function to load only real projects from localStorage and Supabase
const loadAllProjects = () => {
  const magazineProjects = JSON.parse(localStorage.getItem('magazine_projects') || '[]')
  const folioProjects = JSON.parse(localStorage.getItem('folio_projects') || '[]')
  const newsletterProjects = JSON.parse(localStorage.getItem('newsletter_projects') || '[]')
  const otherProjects = JSON.parse(localStorage.getItem('other_projects') || '[]')

  // ✅ NO DEFAULT PROJECTS - Only user-created projects
  const allProjects = [
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
          full_name: project.sectionHead || '',
          email: `${(project.sectionHead || '').toLowerCase().replace(/\s+/g, '.')}@campus.edu`,
        },
      })
    }
    return acc
  }, [])

  return uniqueProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// ⭐ CLEANED: Function to load only real submissions (empty for now)
const loadSubmissions = () => {
  // ✅ NO DEFAULT SUBMISSIONS - Only real submissions from Supabase
  return []
}

// Fetch real users from Supabase profiles table
const fetchRealUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching profiles:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.warn('No users found in profiles table')
      return []
    }

    return data.map((profile) => ({
      id: profile.id,
      full_name: profile.full_name || 'N/A',
      email: profile.email,
      department: profile.department || 'N/A',
      role: profile.role || 'User',
      status: 'active',
      created_at: profile.created_at,
      last_sign_in: profile.last_sign_in_at,
    }))
  } catch (err) {
    console.error('Error fetching real users:', err)
    return []
  }
}

// Load data on mount
onMounted(async () => {
  try {
    console.log('Starting to fetch admin data...')
    loading.value = true

    // Load projects from localStorage (no defaults)
    const allProjects = loadAllProjects()

    // Fetch projects from Supabase and merge
    const fetchProjectsFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching projects from Supabase', error)
          return []
        }

        return (data || []).map((p) => ({
          id: p.id,
          title: p.title,
          sectionHead: p.section_head,
          dueDate: p.due_date || '',
          status: p.status || '',
          type: p.project_type
            ? String(p.project_type).charAt(0).toUpperCase() + String(p.project_type).slice(1)
            : 'Magazine',
          created_at: p.created_at,
          user: {
            full_name: p.section_head || '',
            email: p.section_head
              ? `${(p.section_head || '').toLowerCase().replace(/\s+/g, '.')}@campus.edu`
              : '',
          },
          _raw: p,
        }))
      } catch (err) {
        console.error('Error fetching projects from Supabase', err)
        return []
      }
    }

    const supaProjects = await fetchProjectsFromSupabase()

    // Merge Supabase projects
    supaProjects.forEach((sp) => {
      const exists = allProjects.find((p) => String(p.id) === String(sp.id) || p.title === sp.title)
      if (!exists) allProjects.push(sp)
    })

    projects.value = allProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // Load submissions (empty - no defaults)
    const allSubmissions = loadSubmissions()

    // Fetch REAL users from profiles table
    const realUsers = await fetchRealUsers()

    if (realUsers.length > 0) {
      users.value = realUsers
    } else {
      users.value = [
        {
          id: 1,
          full_name: 'No users yet',
          email: 'Users will appear here when they login',
          department: 'N/A',
          role: 'N/A',
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ]
    }

    // Update statistics
    statistics.value = {
      totalUsers: users.value.length,
      activeUsers: users.value.filter((u) => u.status === 'active').length,
      totalProjects: allProjects.length,
      totalSubmissions: allSubmissions.length,
      recentProjects: allProjects,
      recentSubmissions: allSubmissions,
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

// Computed properties for filtered users
const filteredUsers = computed(() => {
  const key = (search.value || '').toLowerCase()
  return users.value.filter((user) => {
    const email = (user?.email || '').toLowerCase()
    const name = (user?.full_name || '').toLowerCase()

    const matchesSearch = !key || email.includes(key) || name.includes(key)

    const matchesDepartment =
      departmentFilter.value === 'all' || user.department === departmentFilter.value

    return matchesSearch && matchesDepartment
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

// Add user to Supabase profiles table
const addUser = async () => {
  if (!newUser.value.full_name || !newUser.value.email) {
    alert('Please fill in all required fields')
    return
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          email: newUser.value.email,
          full_name: newUser.value.full_name,
          department: newUser.value.department || departments[0],
          role: newUser.value.role || 'Writer',
        },
      ])
      .select()

    if (error) throw error

    users.value.push({
      id: data[0].id,
      full_name: newUser.value.full_name,
      email: newUser.value.email,
      department: newUser.value.department || departments[0],
      role: newUser.value.role || 'Writer',
      status: 'active',
      created_at: new Date().toISOString(),
    })

    newUser.value = {
      full_name: '',
      email: '',
      department: '',
      role: '',
    }

    showAddUserDialog.value = false
    statistics.value.totalUsers = users.value.length
    statistics.value.activeUsers = users.value.filter((u) => u.status === 'active').length

    alert('User added successfully!')
  } catch (err) {
    console.error('Error adding user:', err)
    alert(`Failed to add user: ${err.message}`)
  }
}

// Remove user from Supabase
const removeUser = async (userId) => {
  if (!confirm('Are you sure you want to remove this user?')) return

  try {
    const { error } = await supabase.from('profiles').delete().eq('id', userId)

    if (error) throw error

    const index = users.value.findIndex((u) => u.id === userId)
    if (index !== -1) {
      users.value.splice(index, 1)
      statistics.value.totalUsers = users.value.length
      statistics.value.activeUsers = users.value.filter((u) => u.status === 'active').length
    }

    alert('User removed successfully!')
  } catch (err) {
    console.error('Error removing user:', err)
    alert(`Failed to remove user: ${err.message}`)
  }
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

// Clear client-side project data
const performClearClientData = async () => {
  try {
    if (clearTypedConfirm.value !== 'YES') return
    clearInProgress.value = true
    clearClientData({ confirm: true })
    clearMessage.value = 'Local project data cleared. Reloading...'
    setTimeout(() => {
      window.location.reload()
    }, 900)
  } catch (err) {
    console.error('Error clearing client data:', err)
    clearMessage.value = `Error: ${err.message || String(err)}`
    clearInProgress.value = false
  }
}
</script>

<template>
  <v-app class="admin-page">
    <MainHeader />

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
              <v-card-title
                class="text-h5 font-weight-bold d-flex justify-space-between align-center"
              >
                <div class="d-flex align-center">
                  <v-icon class="mr-2" color="primary">mdi-view-dashboard</v-icon>
                  CAMS Admin Dashboard
                </div>
                <div>
                  <v-btn color="error" variant="outlined" small @click="showClearDialog = true">
                    <v-icon left>mdi-delete-alert</v-icon>
                    Clear Local Data
                  </v-btn>
                </div>
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

                <!-- Clear Local Data Confirmation Dialog -->
                <v-dialog v-model="showClearDialog" max-width="600">
                  <v-card>
                    <v-card-title class="text-h6 d-flex justify-space-between align-center">
                      <div>
                        <v-icon class="mr-2" color="error">mdi-delete-alert</v-icon>
                        Confirm Clear Local Data
                      </div>
                      <v-btn icon @click="showClearDialog = false">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </v-card-title>
                    <v-card-text>
                      <p>
                        This will remove project lists and project history stored in your browser's
                        localStorage for this app. It will not affect Supabase data. This action is
                        irreversible for the client copy.
                      </p>
                      <p class="mb-4">
                        To confirm, type <strong>YES</strong> in the box below and press Confirm.
                      </p>

                      <v-text-field
                        v-model="clearTypedConfirm"
                        label="Type YES to confirm"
                        variant="outlined"
                      ></v-text-field>

                      <div v-if="clearMessage" class="mt-3">
                        <v-alert type="info">{{ clearMessage }}</v-alert>
                      </div>
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer />
                      <v-btn variant="text" @click="showClearDialog = false">Cancel</v-btn>
                      <v-btn
                        color="error"
                        :disabled="clearTypedConfirm !== 'YES' || clearInProgress"
                        @click="performClearClientData"
                      >
                        <v-icon left>mdi-delete</v-icon>
                        <span v-if="!clearInProgress">Confirm</span>
                        <span v-else>Clearing…</span>
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>

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
              </v-tabs>

              <v-window v-model="activeTab">
                <!-- User Management Tab -->
                <v-window-item value="users">
                  <v-card-text>
                    <!-- Filters and Add User Button -->
                    <v-row class="mb-4" align="center">
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
                          v-model="departmentFilter"
                          label="Department"
                          :items="['all', ...departments, 'Administration', 'Editorial']"
                          variant="outlined"
                          density="comfortable"
                          hide-details
                        ></v-select>
                      </v-col>
                      <v-col cols="12" md="3" class="d-flex justify-end">
                        <v-btn color="primary" @click="showAddUserDialog = true">
                          <v-icon left>mdi-plus</v-icon>
                          Add User
                        </v-btn>
                      </v-col>
                    </v-row>

                    <!-- Users Table -->
                    <v-table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Department</th>
                          <th>Role</th>
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
                            <v-btn
                              icon
                              variant="text"
                              color="error"
                              size="small"
                              @click="removeUser(user.id)"
                              title="Remove User"
                            >
                              <v-icon>mdi-delete</v-icon>
                            </v-btn>
                          </td>
                        </tr>
                      </tbody>
                    </v-table>

                    <!-- Add User Dialog -->
                    <v-dialog v-model="showAddUserDialog" max-width="600">
                      <v-card>
                        <v-card-title class="text-h6">
                          <v-icon class="mr-2">mdi-account-plus</v-icon>
                          Add New User
                        </v-card-title>
                        <v-card-text>
                          <v-text-field
                            v-model="newUser.full_name"
                            label="Full Name"
                            variant="outlined"
                            class="mb-3"
                            required
                          ></v-text-field>
                          <v-text-field
                            v-model="newUser.email"
                            label="Email"
                            type="email"
                            variant="outlined"
                            class="mb-3"
                            required
                          ></v-text-field>
                          <v-select
                            v-model="newUser.department"
                            label="Department"
                            :items="[...departments, 'Administration', 'Editorial']"
                            variant="outlined"
                            class="mb-3"
                          ></v-select>
                          <v-text-field
                            v-model="newUser.role"
                            label="Role"
                            variant="outlined"
                            placeholder="e.g., Writer, Editor, Section Head"
                          ></v-text-field>
                        </v-card-text>
                        <v-card-actions>
                          <v-spacer></v-spacer>
                          <v-btn variant="text" @click="showAddUserDialog = false">Cancel</v-btn>
                          <v-btn color="primary" @click="addUser">Add User</v-btn>
                        </v-card-actions>
                      </v-card>
                    </v-dialog>
                  </v-card-text>
                </v-window-item>

                <!-- Content Management Tab -->
                <v-window-item value="content">
                  <v-card-text>
                    <div v-if="!showUploadView" class="content-management">
                      <div class="text-center py-8">
                        <v-icon size="64" color="grey">mdi-folder-multiple</v-icon>
                        <h3 class="text-h6 mt-4">Content Management</h3>
                        <p class="text-grey">
                          Manage newsletters, folios, and other content submissions
                        </p>
                        <v-btn color="primary" class="mt-4" @click="showUploadView = true">
                          <v-icon left>mdi-cloud-upload</v-icon>
                          Upload Content
                        </v-btn>
                      </div>
                    </div>
                    <UploadView v-else @close="showUploadView = false" />
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

@media (max-width: 768px) {
  .v-table thead th,
  .v-table tbody td {
    padding: 12px 8px;
    font-size: 14px;
  }
}
</style>
