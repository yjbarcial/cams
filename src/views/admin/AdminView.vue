<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { projectsService, profilesService, archivesService } from '@/services/supabaseService'
import { deleteProjectNotifications } from '@/services/notificationsService'
import { supabase } from '@/utils/supabase'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import UploadView from '@/views/system/UploadView.vue'
import clearClientData from '@/utils/clearClientData'

// State for statistics and content
const statistics = ref({
  totalUsers: 0,
  activeUsers: 0,
  totalProjects: 0,
  totalPublications: 0,
  recentProjects: [],
  recentPublications: [],
})

const users = ref([])
const projects = ref([])
const publications = ref([])
const loading = ref(true)
const refreshing = ref(false)
const error = ref(null)
let projectsSubscription = null
const search = ref('')
const departmentFilter = ref('all')
const showAllDialog = ref(false)
const showAllType = ref('')
const allRecords = ref([])
const showUploadView = ref(false)
const showClearDialog = ref(false)
const clearTypedConfirm = ref('')
const clearInProgress = ref(false)
const clearMessage = ref('')
const showDeleteDialog = ref(false)
const publicationToDelete = ref(null)
const showDeleteProjectDialog = ref(false)
const projectToDelete = ref(null)

// Notification state
const showNotification = ref(false)
const notificationMessage = ref('')
const notificationType = ref('success')

// Display notification
const displayNotification = (message, type = 'success') => {
  notificationMessage.value = message
  notificationType.value = type
  showNotification.value = true

  setTimeout(() => {
    showNotification.value = false
  }, 4000)
}

// Handle upload events
const handleUploadSuccess = (message) => {
  displayNotification(message || 'Upload completed successfully!', 'success')
  showUploadView.value = false
}

const handleUploadError = (message) => {
  displayNotification(message || 'Upload failed', 'error')
}

// Departments for filtering
const departments = ['Creatives', 'Scribes']

const activeTab = ref('users')

// Format status function to remove underscores and capitalize
const formatStatus = (status) => {
  if (!status) return 'Draft'

  // Replace underscores with spaces and capitalize each word
  let formatted = status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  // Special case: "To Editor In Chief" should be "To Editor-in-Chief"
  formatted = formatted.replace(/Editor In Chief/g, 'Editor-in-Chief')
  formatted = formatted.replace(/Chief Adviser/gi, 'Chief Adviser')
  formatted = formatted.replace(/For Publish/gi, 'For Publish')
  formatted = formatted.replace(/Creative Director/gi, 'Creative Director')
  formatted = formatted.replace(/Technical Editor/gi, 'Technical Editor')

  return formatted
}

// Get status color matching workflow views
const getStatusColor = (status) => {
  if (!status) return 'grey'

  const statusColors = {
    draft: 'grey',
    to_section_head: 'orange',
    returned_by_section_head: 'amber',
    to_technical_editor: 'blue',
    to_creative_director: 'cyan',
    returned_by_technical_editor: 'deep-orange',
    returned_by_creative_director: 'deep-orange',
    to_editor_in_chief: 'indigo',
    'Returned by EIC': 'pink',
    returned_by_eic: 'pink',
    'EIC Approved': 'light-green',
    'To Chief Adviser': 'deep-purple',
    'Adviser Review': 'purple',
    'Returned by Chief Adviser': 'brown',
    returned_by_chief_adviser: 'brown',
    'For Publish': 'teal',
    for_publish: 'teal',
    Published: 'green',
    published: 'green',
    rejected: 'red',
  }

  return statusColors[status] || 'default'
}

// ⭐ CLEANED: Function to load only real projects from Supabase
const loadAllProjects = async () => {
  try {
    console.log('🔍 Fetching all projects from Supabase...')

    // Get user's access role to determine which projects to show
    const accessRole = localStorage.getItem('accessRole')
    const userRole = localStorage.getItem('userRole')

    // Build query based on user role
    let query = supabase.from('projects').select(
      `
        *,
        profiles!created_by (
          id,
          email,
          first_name,
          last_name
        )
      `,
    )

    // Filter projects based on user role
    if (userRole === 'admin') {
      // System admins see only published projects
      query = query.eq('status', 'Published')
    } else if (userRole === 'editor') {
      // Content administrators see projects at their workflow stage
      if (accessRole === 'online_accounts_manager') {
        // Online Accounts Manager sees: to_online_accounts_manager and for_publish for 'other' projects
        query = query.or(
          'status.eq.to_online_accounts_manager,and(status.eq.For Publish,project_type.eq.other)',
        )
      } else if (accessRole === 'archival_manager') {
        // Archival Managers see: for_publish for non-'other' projects
        query = query.and('status.eq.For Publish').neq('project_type', 'other')
      } else if (accessRole === 'editor_in_chief') {
        query = query.eq('status', 'to_editor_in_chief')
      } else if (accessRole === 'technical_editor' || accessRole === 'creative_director') {
        query = query.or('status.eq.to_technical_editor,status.eq.to_creative_director')
      } else if (accessRole === 'chief_adviser') {
        query = query.eq('status', 'to_chief_adviser')
      } else {
        // Default for other editors: show published
        query = query.eq('status', 'Published')
      }
    } else {
      // Other roles (section_head, member) see only published projects
      query = query.eq('status', 'Published')
    }

    query = query.order('created_at', { ascending: false })

    const { data: apiProjects, error } = await query

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }

    console.log('📊 Supabase Projects:', apiProjects?.length || 0)

    // Map to display format
    const mappedProjects = (apiProjects || []).map((project) => {
      // Get user info from the profiles join
      const userProfile = project.profiles
      const fullName =
        userProfile?.first_name && userProfile?.last_name
          ? `${userProfile.first_name} ${userProfile.last_name}`
          : null

      return {
        id: project.id,
        title: project.title,
        type: project.project_type
          ? project.project_type.charAt(0).toUpperCase() + project.project_type.slice(1)
          : 'Other',
        status: project.status || 'draft',
        department: project.department || 'N/A',
        created_at: project.created_at,
        updated_at: project.updated_at,
        user: {
          full_name: fullName || userProfile?.email || 'Unknown',
          email: userProfile?.email || 'N/A',
        },
      }
    })

    console.log('✅ Projects loaded from Supabase:', mappedProjects.length)
    return mappedProjects
  } catch (error) {
    console.error('❌ Error loading projects from Supabase:', error)
    return []
  }
}

// Refresh all data
const refreshData = async () => {
  try {
    refreshing.value = true
    const allProjects = await loadAllProjects()
    projects.value = allProjects

    // Reload publications too
    const allPublications = await loadPublications()
    publications.value = allPublications

    // Update statistics - show ALL items
    statistics.value.totalProjects = allProjects.length
    statistics.value.activeProjects = allProjects.filter(
      (p) => p.status === 'in_progress' || p.status === 'under_review',
    ).length
    statistics.value.publishedWorks = allProjects.filter((p) => p.status === 'published').length
    statistics.value.totalPublications = allPublications.length
    statistics.value.recentProjects = allProjects
    statistics.value.recentPublications = allPublications

    console.log('✅ Data refreshed successfully')
  } catch (err) {
    console.error('❌ Error refreshing data:', err)
  } finally {
    refreshing.value = false
  }
}

// Load publications/archives from Supabase
const loadPublications = async () => {
  try {
    const data = await archivesService.getAll()
    console.log('✅ Publications loaded:', data.length)
    return data || []
  } catch (error) {
    console.error('❌ Error loading publications:', error)
    return []
  }
}

// Delete publication
const confirmDeletePublication = (publication) => {
  publicationToDelete.value = publication
  showDeleteDialog.value = true
}

const deletePublication = async () => {
  if (!publicationToDelete.value) return

  try {
    await archivesService.delete(publicationToDelete.value.id)

    // Remove from local array
    publications.value = publications.value.filter((p) => p.id !== publicationToDelete.value.id)

    // Update statistics - show all remaining publications
    statistics.value.totalPublications = publications.value.length
    statistics.value.recentPublications = publications.value

    displayNotification('Publication deleted successfully', 'success')
    console.log('✅ Publication deleted:', publicationToDelete.value.title)
  } catch (error) {
    console.error('❌ Error deleting publication:', error)
    displayNotification('Failed to delete publication', 'error')
  } finally {
    showDeleteDialog.value = false
    publicationToDelete.value = null
  }
}

// Delete project
const confirmDeleteProject = (project) => {
  projectToDelete.value = project
  showDeleteProjectDialog.value = true
}

const deleteProject = async () => {
  if (!projectToDelete.value) return

  try {
    // Delete from database with cascading deletes
    await projectsService.delete(projectToDelete.value.id)

    // Delete all notifications related to this project
    await deleteProjectNotifications(projectToDelete.value.id)

    // Remove from local arrays
    projects.value = projects.value.filter((p) => p.id !== projectToDelete.value.id)
    allRecords.value = allRecords.value.filter((r) => r.id !== projectToDelete.value.id)

    // Update statistics
    statistics.value.totalProjects = projects.value.length
    statistics.value.recentProjects = projects.value.slice(0, 5)

    displayNotification('Project deleted successfully', 'success')
    console.log('✅ Project deleted:', projectToDelete.value.title)
  } catch (error) {
    console.error('❌ Error deleting project:', error)
    displayNotification('Failed to delete project', 'error')
  } finally {
    showDeleteProjectDialog.value = false
    projectToDelete.value = null
  }
}

// System Admin emails to hide from user management
const ADMIN_EMAILS = [
  'lovellhudson.clavel@carsu.edu.ph',
  'yssahjulianah.barcial@carsu.edu.ph',
  'altheaguila.gorres@carsu.edu.ph',
]

// Fetch real users from Supabase
const fetchRealUsers = async () => {
  try {
    console.log('🔍 Fetching users from Supabase...')

    const data = await profilesService.getAll()

    console.log('📊 Users Supabase result:', data)

    if (!data || data.length === 0) {
      console.warn('⚠️ No users found')
      return []
    }

    // ⭐ Filter out system admin emails
    const regularUsers = data.filter(
      (user) => user.email && !ADMIN_EMAILS.includes(user.email.toLowerCase()),
    )

    console.log('✅ Found users:', regularUsers.length, '(excluding system admins)')

    return regularUsers.map((user) => ({
      id: user.id,
      full_name: user.full_name || 'N/A',
      email: user.email,
      department: user.department || 'N/A',
      role: user.role || 'User',
      status: user.status || 'active',
      created_at: user.created_at,
      last_sign_in: user.last_login,
    }))
  } catch (err) {
    console.error('❌ Error fetching real users:', err)
    return []
  }
}

// Load data on mount
onMounted(async () => {
  try {
    console.log('Starting to fetch system admin data from Supabase...')
    loading.value = true

    // Fetch REAL users from Supabase
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

    // Load projects from Supabase (with localStorage fallback)
    const allProjects = await loadAllProjects()
    projects.value = allProjects

    // Load publications from Supabase
    const allPublications = await loadPublications()
    publications.value = allPublications

    // Update statistics - show ALL items in scrollable tables
    statistics.value = {
      totalUsers: users.value.length,
      activeUsers: users.value.filter((u) => u.status === 'active').length,
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(
        (p) => p.status === 'in_progress' || p.status === 'under_review',
      ).length,
      publishedWorks: allProjects.filter((p) => p.status === 'published').length,
      totalPublications: allPublications.length,
      recentProjects: allProjects,
      recentPublications: allPublications,
    }

    console.log('✅ All data loaded successfully from Supabase:', {
      users: users.value.length,
      projects: allProjects.length,
      publications: allPublications.length,
    })

    // Set up real-time subscription for projects (optional - will fail silently if connection issues)
    try {
      projectsSubscription = supabase
        .channel('projects-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'projects' },
          async (payload) => {
            console.log('📡 Real-time update received:', payload)
            // Refresh projects list when any change occurs
            await refreshData()
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscription active for projects')
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('⚠️ Real-time subscription error (non-critical)')
          } else if (status === 'TIMED_OUT') {
            console.warn('⚠️ Real-time subscription timed out (non-critical)')
          }
        })
    } catch (subscriptionError) {
      console.warn(
        '⚠️ Could not establish real-time subscription (non-critical):',
        subscriptionError,
      )
    }
  } catch (err) {
    console.error('❌ Error in onMounted:', err)
    error.value = `Failed to load dashboard data: ${err.message}`
  } finally {
    loading.value = false
  }
})

// Clean up subscription on component unmount
onUnmounted(() => {
  if (projectsSubscription) {
    supabase.removeChannel(projectsSubscription)
    console.log('🔌 Real-time subscription cleaned up')
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

// Remove user from Supabase
const removeUser = async (userId) => {
  const user = users.value.find((u) => u.id === userId)
  if (!user) return

  const confirmMsg = `Are you sure you want to remove ${user.email || 'this user'}?\n\nNote: This only removes from profiles. To fully delete, go to Supabase Dashboard → Authentication → Users.`

  if (!confirm(confirmMsg)) return

  try {
    // Only delete from profiles table (frontend can't delete from auth.users)
    const { error } = await supabase.from('profiles').delete().eq('id', userId)

    if (error) throw error

    const index = users.value.findIndex((u) => u.id === userId)
    if (index !== -1) {
      users.value.splice(index, 1)
      statistics.value.totalUsers = users.value.length
      statistics.value.activeUsers = users.value.filter((u) => u.status === 'active').length
    }

    alert(
      'User removed from profiles successfully!\n\nTo fully delete from authentication, go to Supabase Dashboard → Authentication → Users → Delete user.',
    )
  } catch (err) {
    console.error('Error removing user:', err)

    // Provide helpful error message
    if (err.message?.includes('foreign key') || err.message?.includes('violates')) {
      alert(
        'Cannot delete user: This user has associated data (projects, comments, etc.).\n\nTo delete:\n1. First delete/reassign their projects\n2. Then try again\n\nOr manually delete from Supabase Dashboard.',
      )
    } else {
      alert(
        `Failed to delete user: ${err.message}\n\nTry using Supabase Dashboard → Authentication → Users → Delete user instead.`,
      )
    }
  }
}

// Fetch all records function
const fetchAllRecords = async (type) => {
  try {
    showAllType.value = type
    if (type === 'projects') {
      allRecords.value = projects.value
    } else if (type === 'publications') {
      allRecords.value = publications.value
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

    const result = clearClientData({ confirm: true })

    if (result.removed > 0) {
      clearMessage.value = `Successfully cleared ${result.removed} local storage item(s). The page will reload to refresh all views...`
    } else {
      clearMessage.value = 'No local project data found to clear.'
    }

    console.log('📋 Cleared localStorage items:', result.details)

    setTimeout(() => {
      window.location.reload()
    }, 1500)
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
            <v-card class="dashboard-header mb-6" elevation="2">
              <v-card-title class="px-6 py-5">
                <div class="d-flex justify-space-between align-center flex-wrap">
                  <div class="d-flex align-center mb-2 mb-md-0">
                    <div class="icon-wrapper primary">
                      <v-icon size="28" color="white">mdi-view-dashboard</v-icon>
                    </div>
                    <div class="ml-3">
                      <div class="text-h5 font-weight-bold">System Admin Dashboard</div>
                      <div class="text-caption text-grey">Content & Archival Management System</div>
                    </div>
                  </div>
                  <div class="d-flex gap-2">
                    <v-btn
                      color="primary"
                      variant="outlined"
                      @click="refreshData"
                      :loading="refreshing"
                      class="refresh-btn"
                    >
                      <v-icon start>mdi-refresh</v-icon>
                      Refresh
                    </v-btn>
                    <v-btn
                      color="error"
                      variant="outlined"
                      @click="showClearDialog = true"
                      class="clear-btn"
                    >
                      <v-icon start>mdi-delete-alert</v-icon>
                      Clear Local Data
                    </v-btn>
                  </div>
                </div>
              </v-card-title>
              <v-card-text class="px-6 pb-6">
                <v-row class="stats-cards">
                  <!-- Stats Cards -->
                  <v-col cols="12" sm="6" md="3">
                    <v-card class="stat-card stat-card-primary" elevation="0">
                      <div class="stat-card-content">
                        <div class="stat-icon-wrapper">
                          <v-icon size="40" color="white">mdi-account-group</v-icon>
                        </div>
                        <div class="stat-info">
                          <div class="stat-value">{{ statistics.totalUsers }}</div>
                          <div class="stat-label">Total Users</div>
                        </div>
                      </div>
                    </v-card>
                  </v-col>

                  <v-col cols="12" sm="6" md="3">
                    <v-card class="stat-card stat-card-success" elevation="0">
                      <div class="stat-card-content">
                        <div class="stat-icon-wrapper">
                          <v-icon size="40" color="white">mdi-account-check</v-icon>
                        </div>
                        <div class="stat-info">
                          <div class="stat-value">{{ statistics.activeUsers }}</div>
                          <div class="stat-label">Active Users</div>
                        </div>
                      </div>
                    </v-card>
                  </v-col>

                  <v-col cols="12" sm="6" md="3">
                    <v-card class="stat-card stat-card-info" elevation="0">
                      <div class="stat-card-content">
                        <div class="stat-icon-wrapper">
                          <v-icon size="40" color="white">mdi-folder-multiple</v-icon>
                        </div>
                        <div class="stat-info">
                          <div class="stat-value">{{ statistics.totalProjects }}</div>
                          <div class="stat-label">Total Projects</div>
                        </div>
                      </div>
                    </v-card>
                  </v-col>

                  <v-col cols="12" sm="6" md="3">
                    <v-card class="stat-card stat-card-light" elevation="0">
                      <div class="stat-card-content">
                        <div class="stat-icon-wrapper">
                          <v-icon size="40" color="white">mdi-book-open-page-variant</v-icon>
                        </div>
                        <div class="stat-info">
                          <div class="stat-value">{{ statistics.totalPublications }}</div>
                          <div class="stat-label">Total Publications</div>
                        </div>
                      </div>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- Recent Activity - Fixed Tables -->
                <v-row class="mt-6">
                  <v-col cols="12">
                    <v-card class="data-table-card" elevation="2">
                      <v-card-title class="table-header px-6 py-4">
                        <div class="d-flex justify-space-between align-center w-100">
                          <div class="d-flex align-center">
                            <div class="icon-wrapper-small primary">
                              <v-icon size="20" color="white">mdi-folder-multiple</v-icon>
                            </div>
                            <span class="text-h6 font-weight-bold ml-3">All Projects</span>
                          </div>
                          <v-btn
                            variant="text"
                            color="#757575"
                            @click="fetchAllRecords('projects')"
                            class="view-details-btn"
                          >
                            View Details
                            <v-icon end size="18">mdi-chevron-right</v-icon>
                          </v-btn>
                        </div>
                      </v-card-title>
                      <v-divider></v-divider>
                      <v-card-text class="pa-0 table-scroll-container">
                        <v-table>
                          <thead>
                            <tr>
                              <th class="text-center" style="width: 60px">#</th>
                              <th>Title</th>
                              <th>Type</th>
                              <th>Status</th>
                              <th>Created By</th>
                              <th>Date</th>
                              <th class="text-center" style="width: 120px">Actions</th>
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
                                <v-chip :color="getStatusColor(project.status)" size="small">
                                  {{ formatStatus(project.status) }}
                                </v-chip>
                              </td>
                              <td>
                                {{ project.user?.full_name || project.sectionHead }}
                              </td>
                              <td>{{ formatDate(project.created_at) }}</td>
                              <td class="text-center">
                                <v-btn
                                  icon
                                  size="small"
                                  color="error"
                                  variant="text"
                                  @click="confirmDeleteProject(project)"
                                  title="Delete Project"
                                >
                                  <v-icon>mdi-delete</v-icon>
                                </v-btn>
                              </td>
                            </tr>
                          </tbody>
                        </v-table>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>

                <!-- All Publications Section -->
                <v-row class="mt-6">
                  <v-col cols="12">
                    <v-card class="data-table-card" elevation="2">
                      <v-card-title class="table-header px-6 py-4">
                        <div class="d-flex justify-space-between align-center w-100">
                          <div class="d-flex align-center">
                            <div class="icon-wrapper-small success">
                              <v-icon size="20" color="white">mdi-book-open-page-variant</v-icon>
                            </div>
                            <span class="text-h6 font-weight-bold ml-3">All Publications</span>
                          </div>
                          <v-btn
                            variant="text"
                            color="#757575"
                            @click="fetchAllRecords('publications')"
                            class="view-details-btn"
                          >
                            View Details
                            <v-icon end size="18">mdi-chevron-right</v-icon>
                          </v-btn>
                        </div>
                      </v-card-title>
                      <v-divider></v-divider>
                      <v-card-text class="pa-0 table-scroll-container">
                        <v-table>
                          <thead>
                            <tr>
                              <th class="text-center" style="width: 60px">#</th>
                              <th>Title</th>
                              <th>Category</th>
                              <th>Date Published</th>
                              <th class="text-center" style="width: 120px">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr
                              v-for="(publication, index) in statistics.recentPublications"
                              :key="publication.id"
                            >
                              <td class="text-center">{{ index + 1 }}</td>
                              <td>{{ publication.title || 'Untitled' }}</td>
                              <td>
                                <v-chip color="success" size="small">
                                  {{ publication.category || 'General' }}
                                </v-chip>
                              </td>
                              <td>{{ formatDate(publication.created_at) }}</td>
                              <td class="text-center">
                                <v-btn
                                  icon
                                  size="small"
                                  color="error"
                                  variant="text"
                                  @click="confirmDeletePublication(publication)"
                                  title="Delete Publication"
                                >
                                  <v-icon>mdi-delete</v-icon>
                                </v-btn>
                              </td>
                            </tr>
                            <tr v-if="statistics.recentPublications.length === 0">
                              <td colspan="5" class="text-center text-grey py-4">
                                No publications yet. Upload content to get started.
                              </td>
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
                        This will remove <strong>ALL</strong> project-related data stored in your
                        browser's localStorage for this app, including:
                      </p>
                      <ul class="mb-3">
                        <li>Magazine projects list and history</li>
                        <li>Newsletter projects list and history</li>
                        <li>Folio projects list and history</li>
                        <li>Other projects list and history</li>
                        <li>All project version history data</li>
                      </ul>
                      <p class="font-weight-bold text-warning">
                        <v-icon size="small" color="warning">mdi-alert</v-icon>
                        This will NOT affect data stored in Supabase. This action is irreversible
                        for the local client copy.
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

                <!-- Delete Publication Confirmation Dialog -->
                <v-dialog v-model="showDeleteDialog" max-width="500">
                  <v-card>
                    <v-card-title class="text-h6 d-flex justify-space-between align-center">
                      <div>
                        <v-icon class="mr-2" color="error">mdi-delete-alert</v-icon>
                        Delete Publication
                      </div>
                      <v-btn icon @click="showDeleteDialog = false">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </v-card-title>
                    <v-card-text>
                      <p class="mb-3">Are you sure you want to delete this publication?</p>
                      <v-alert type="warning" density="compact" class="mb-3">
                        <strong>{{ publicationToDelete?.title || 'Untitled' }}</strong>
                      </v-alert>
                      <p class="text-caption text-grey">
                        This action cannot be undone. The publication will be permanently removed
                        from the system.
                      </p>
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer />
                      <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
                      <v-btn color="error" @click="deletePublication">
                        <v-icon left>mdi-delete</v-icon>
                        Delete
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>

                <!-- Delete Project Confirmation Dialog -->
                <v-dialog v-model="showDeleteProjectDialog" max-width="500">
                  <v-card>
                    <v-card-title class="text-h6 d-flex justify-space-between align-center">
                      <div>
                        <v-icon class="mr-2" color="error">mdi-delete-alert</v-icon>
                        Delete Project
                      </div>
                      <v-btn icon @click="showDeleteProjectDialog = false">
                        <v-icon>mdi-close</v-icon>
                      </v-btn>
                    </v-card-title>
                    <v-card-text>
                      <p class="mb-3">Are you sure you want to delete this project?</p>
                      <v-alert type="warning" density="compact" class="mb-3">
                        <strong>{{ projectToDelete?.title || 'Untitled' }}</strong>
                      </v-alert>
                      <p class="text-caption text-grey">
                        This action cannot be undone. The project and all related data (media files,
                        comments, history, notifications) will be permanently removed from the
                        system.
                      </p>
                    </v-card-text>
                    <v-card-actions>
                      <v-spacer />
                      <v-btn variant="text" @click="showDeleteProjectDialog = false">Cancel</v-btn>
                      <v-btn color="error" @click="deleteProject">
                        <v-icon left>mdi-delete</v-icon>
                        Delete
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
                              : 'mdi-book-open-page-variant'
                          }}
                        </v-icon>
                        All {{ showAllType === 'projects' ? 'Projects' : 'Publications' }} Details
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
                            <th>{{ showAllType === 'projects' ? 'Type' : 'Category' }}</th>
                            <th v-if="showAllType === 'projects'">Status</th>
                            <th v-if="showAllType === 'projects'">Created By</th>
                            <th>Date</th>
                            <th class="text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(record, index) in allRecords" :key="record.id">
                            <td class="text-center">{{ index + 1 }}</td>
                            <td>{{ record.title || 'Untitled' }}</td>
                            <td>
                              <v-chip
                                :color="showAllType === 'projects' ? 'primary' : 'success'"
                                size="small"
                              >
                                {{
                                  showAllType === 'projects'
                                    ? record.type
                                    : record.category || 'General'
                                }}
                              </v-chip>
                            </td>
                            <td v-if="showAllType === 'projects'">
                              <v-chip :color="getStatusColor(record.status)" size="small">
                                {{ formatStatus(record.status) }}
                              </v-chip>
                            </td>
                            <td v-if="showAllType === 'projects'">
                              {{ record.user?.full_name || record.sectionHead }}
                            </td>
                            <td>{{ formatDate(record.created_at) }}</td>
                            <td class="text-center">
                              <v-btn
                                icon
                                size="small"
                                color="error"
                                variant="text"
                                @click="
                                  showAllType === 'projects'
                                    ? confirmDeleteProject(record)
                                    : confirmDeletePublication(record)
                                "
                                :title="
                                  showAllType === 'projects'
                                    ? 'Delete Project'
                                    : 'Delete Publication'
                                "
                              >
                                <v-icon>mdi-delete</v-icon>
                              </v-btn>
                            </td>
                          </tr>
                          <tr v-if="allRecords.length === 0">
                            <td
                              :colspan="showAllType === 'publications' ? 5 : 7"
                              class="text-center text-grey py-4"
                            >
                              No
                              {{ showAllType === 'projects' ? 'projects' : 'publications' }} found.
                            </td>
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
              <v-tabs v-model="activeTab" bg-color="#fafafa" color="#f5c52b">
                <v-tab value="users">
                  <v-icon start size="20" color="#424242">mdi-account-group</v-icon>
                  User Management
                </v-tab>
                <v-tab value="content">
                  <v-icon start size="20" color="#424242">mdi-folder-multiple</v-icon>
                  Content Management
                </v-tab>
              </v-tabs>

              <v-divider></v-divider>

              <v-window v-model="activeTab">
                <!-- User Management Tab -->
                <v-window-item value="users">
                  <v-card-text>
                    <!-- Filters -->
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
                  </v-card-text>
                </v-window-item>

                <!-- Content Management Tab -->
                <v-window-item value="content">
                  <v-card-text>
                    <div v-if="!showUploadView" class="content-management">
                      <div class="text-center py-8">
                        <v-icon size="64" color="#f5c52b">mdi-folder-multiple</v-icon>
                        <h3 class="text-h6 mt-4">Content Management</h3>
                        <p class="text-grey">
                          Manage newsletters, folios, and other content submissions
                        </p>
                        <v-btn
                          color="#f5c52b"
                          class="mt-4 upload-content-btn"
                          @click="showUploadView = true"
                        >
                          <v-icon start color="#2c3e50">mdi-cloud-upload</v-icon>
                          <span style="color: #2c3e50; font-weight: 600">Upload Content</span>
                        </v-btn>
                      </div>
                    </div>
                    <UploadView
                      v-else
                      @close="showUploadView = false"
                      @upload-success="handleUploadSuccess"
                      @upload-error="handleUploadError"
                    />
                  </v-card-text>
                </v-window-item>
              </v-window>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <Footer />

    <!-- Notification Card -->
    <Teleport to="body">
      <transition name="slide-down">
        <v-card
          v-if="showNotification"
          class="notification-card"
          :class="`notification-${notificationType}`"
          elevation="8"
        >
          <div class="notification-content">
            <v-icon
              :color="
                notificationType === 'success'
                  ? 'success'
                  : notificationType === 'error'
                    ? 'error'
                    : 'warning'
              "
              size="24"
              class="notification-icon"
            >
              {{
                notificationType === 'success'
                  ? 'mdi-check-circle'
                  : notificationType === 'error'
                    ? 'mdi-alert-circle'
                    : 'mdi-alert'
              }}
            </v-icon>
            <span class="notification-message">{{ notificationMessage }}</span>
            <v-btn
              icon
              size="small"
              variant="text"
              @click="showNotification = false"
              class="notification-close"
            >
              <v-icon size="20">mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card>
      </transition>
    </Teleport>
  </v-app>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.main-content {
  flex: 1;
  padding: 0 !important;
}

/* Dashboard Header */
.dashboard-header {
  border-radius: 16px !important;
  background: white;
  border-left: 4px solid #f5c52b;
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2c3e50;
  box-shadow: 0 4px 12px rgba(44, 62, 80, 0.2);
}

.icon-wrapper-small {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2c3e50;
}

.icon-wrapper-small.primary {
  background: #f5c52b;
}

.icon-wrapper-small.success {
  background: #4caf50;
}

.refresh-btn,
.clear-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
  font-weight: 500;
  border-radius: 8px !important;
  padding: 0 20px !important;
}

.gap-2 {
  gap: 8px;
}

/* Stats Cards */
.stats-cards {
  margin-top: 24px;
}

.stat-card {
  border-radius: 16px !important;
  padding: 24px 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 2px solid #e0e0e0 !important;
  height: 100%;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
  border-color: #bdbdbd !important;
}

.stat-card-primary {
  background: #f5c52b;
  color: #2c3e50;
  box-shadow: 0 2px 8px rgba(245, 197, 43, 0.2);
}

.stat-card-success {
  background: white;
  color: #2c3e50;
  border: 2px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-card-info {
  background: #424242;
  color: white;
  box-shadow: 0 2px 8px rgba(66, 66, 66, 0.2);
}

.stat-card-warning {
  background: #757575;
  color: white;
  box-shadow: 0 2px 8px rgba(117, 117, 117, 0.2);
}

.stat-card-light {
  background: #747474;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-card-content {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: flex-start;
}

.stat-icon-wrapper {
  width: 68px;
  height: 68px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
}

.stat-card-success .stat-icon-wrapper {
  background: #f5c52b;
}

.stat-card-info .stat-icon-wrapper,
.stat-card-warning .stat-icon-wrapper {
  background: rgba(255, 255, 255, 0.15);
}

.stat-card-light .stat-icon-wrapper {
  background: rgba(255, 255, 255, 0.1);
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 2.125rem;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.95;
  font-weight: 500;
  line-height: 1.3;
}

/* Data Table Cards */
.data-table-card {
  border-radius: 16px !important;
  overflow: hidden;
  background: white;
}

.table-scroll-container {
  max-height: 400px;
  overflow-y: auto;
  overflow-x: auto;
}

.table-scroll-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.table-scroll-container::-webkit-scrollbar-track {
  background: #f5f5f5;
}

.table-scroll-container::-webkit-scrollbar-thumb {
  background: #bdbdbd;
  border-radius: 4px;
}

.table-scroll-container::-webkit-scrollbar-thumb:hover {
  background: #9e9e9e;
}

.table-header {
  background: #fafafa;
  border-bottom: 2px solid #e0e0e0;
}

.view-details-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
  font-weight: 500;
  padding: 0 16px !important;
}

/* Tables */
.v-table {
  border-radius: 0 !important;
}

.v-table thead th {
  background: #fafafa !important;
  border-bottom: 2px solid #e0e0e0 !important;
  font-weight: 600 !important;
  padding: 18px 16px !important;
  color: #424242 !important;
  font-size: 0.875rem !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.v-table tbody tr {
  transition: all 0.2s ease;
}

.v-table tbody tr:hover {
  background-color: #fffbea !important;
  border-left: 3px solid #f5c52b;
}

.v-table tbody td {
  padding: 16px !important;
  border-bottom: 1px solid #f0f0f0 !important;
  color: #2c3e50;
  font-size: 0.9rem;
}

/* Buttons */
.v-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
  font-weight: 500;
  border-radius: 8px !important;
}

/* Chips */
.v-chip {
  font-weight: 600 !important;
  border-radius: 8px !important;
  padding: 0 12px !important;
  height: 28px !important;
}

/* Cards */
.v-card {
  border-radius: 12px !important;
}

/* Tabs */
:deep(.v-tabs) {
  background: #fafafa;
  border-bottom: 2px solid #e0e0e0;
}

:deep(.v-tab) {
  text-transform: none !important;
  letter-spacing: normal !important;
  font-weight: 500;
  font-size: 0.95rem;
  color: #757575 !important;
}

:deep(.v-tab--selected) {
  color: #2c3e50 !important;
}

:deep(.v-tab__slider) {
  background-color: #f5c52b !important;
  height: 3px !important;
}

/* Upload Content Button */
.upload-content-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
  font-weight: 600 !important;
  box-shadow: 0 2px 8px rgba(245, 197, 43, 0.3) !important;
}

.upload-content-btn:hover {
  box-shadow: 0 4px 12px rgba(245, 197, 43, 0.4) !important;
  transform: translateY(-2px);
}

/* Dialog Styling */
.dialog-title-admin {
  background: #fafafa !important;
  padding: 20px 24px !important;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-icon-admin {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2c3e50;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.2);
}

/* Dialogs */
:deep(.v-dialog .v-card) {
  border-radius: 16px !important;
}

/* Text Fields */
:deep(.v-text-field .v-field) {
  border-radius: 8px !important;
}

/* Responsive */
@media (max-width: 960px) {
  .stat-card {
    padding: 20px;
  }

  .stat-value {
    font-size: 1.75rem;
  }

  .stat-icon-wrapper {
    width: 56px;
    height: 56px;
  }
}

@media (max-width: 600px) {
  .dashboard-header .v-card-title {
    padding: 16px !important;
  }

  .icon-wrapper {
    width: 48px;
    height: 48px;
  }

  .stat-card-content {
    gap: 12px;
  }

  .stat-icon-wrapper {
    width: 48px;
    height: 48px;
  }

  .stat-value {
    font-size: 1.5rem;
  }

  .stat-label {
    font-size: 0.8rem;
  }

  .v-table thead th,
  .v-table tbody td {
    padding: 12px 8px !important;
    font-size: 0.85rem !important;
  }

  .table-header {
    padding: 12px 16px !important;
  }
}

/* Notification Card */
.notification-card {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 99999;
  min-width: 340px;
  max-width: 500px;
  border-radius: 12px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
}

.notification-success {
  background: #fff;
  border-left: 4px solid #4caf50;
}

.notification-error {
  background: #fff;
  border-left: 4px solid #f44336;
}

.notification-warning {
  background: #fff;
  border-left: 4px solid #ff9800;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.notification-icon {
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #2c3e50;
  font-weight: 500;
}

.notification-close {
  flex-shrink: 0;
}

/* Slide down animation */
.slide-down-enter-active {
  animation: slideDown 0.3s ease-out;
}

.slide-down-leave-active {
  animation: slideUp 0.3s ease-in;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}
</style>
