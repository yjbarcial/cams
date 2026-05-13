<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { projectsService, profilesService, archivesService } from '@/services/supabaseService'
import { deleteProjectNotifications } from '@/services/notificationsService'
import { supabase } from '@/utils/supabase'
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
const initialLoadStatus = ref('')
let projectsSubscription = null
let profilesSubscription = null
const search = ref('')
const showUploadView = ref(false)
const showClearDialog = ref(false)
const clearTypedConfirm = ref('')
const clearInProgress = ref(false)
const clearMessage = ref('')
const showDeleteDialog = ref(false)
const publicationToDelete = ref(null)
const publicationDeleteLoading = ref(false)
const showDeleteProjectDialog = ref(false)
const projectToDelete = ref(null)
const projectDeleteLoading = ref(false)

// User edit dialog state
const showEditUserDialog = ref(false)
const editingUser = ref(null)
const showDeleteUserDialog = ref(false)
const userToDelete = ref(null)
const deleteUserLoading = ref(false)
const userDeleteError = ref('')
const editFormData = ref({
  role: '',
  status: '',
  designation_label: '',
  positions_label: '',
})
const editLoading = ref(false)

const INITIAL_LOAD_TIMEOUT_MS = 12000
const usersCacheKey = 'admin_users_cache'
const projectsCacheKey = 'admin_projects_cache'
const publicationsCacheKey = 'admin_publications_cache'

const safeParseCache = (key) => {
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return []
    const parsed = JSON.parse(cached)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveCache = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore cache write errors.
  }
}

const withTimeout = async (promise, timeoutMs, fallbackValue, label) => {
  let timeoutId
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`⏱️ ${label} timed out after ${timeoutMs}ms; using fallback data`)
      resolve({ timedOut: true, result: fallbackValue })
    }, timeoutMs)
  })

  try {
    return await Promise.race([
      promise.then((result) => ({ timedOut: false, result })),
      timeoutPromise,
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}

const roleOptions = [
  { title: 'Admin', value: 'admin' },
  { title: 'Editor', value: 'editor' },
  { title: 'Member', value: 'member' },
  { title: 'Viewer', value: 'viewer' },
]

const approvalStatusActions = [
  { title: 'Approve', value: 'active', icon: 'mdi-check-circle-outline', color: 'success' },
  { title: 'Reject', value: 'inactive', icon: 'mdi-close-circle-outline', color: 'error' },
]

const designationOptions = [
  { title: 'Section Head', value: 'Section Head' },
  { title: 'Technical Editor', value: 'Technical Editor' },
  { title: 'Creative Director', value: 'Creative Director' },
  { title: 'Editor-in-Chief', value: 'Editor-in-Chief' },
  { title: 'Chief Adviser', value: 'Chief Adviser' },
  { title: 'Archival Manager', value: 'Archival Manager' },
  { title: 'Online Accounts Manager', value: 'Online Accounts Manager' },
]

const positionOptions = [
  { title: 'Layout Artist', value: 'Layout Artist' },
  { title: 'News Writer', value: 'News Writer' },
  { title: 'Feature Writer', value: 'Feature Writer' },
  { title: 'Opinion Writer', value: 'Opinion Writer' },
  { title: 'Sports Writer', value: 'Sports Writer' },
  { title: 'Literary Writer', value: 'Literary Writer' },
  { title: 'Photojournalist', value: 'Photojournalist' },
  { title: 'Videographer', value: 'Videographer' },
  { title: 'Illustrator', value: 'Illustrator' },
]

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

const effectiveUserRole = ref(
  localStorage.getItem('debugRole') || localStorage.getItem('userRole') || '',
)
const effectiveAccessRole = ref(localStorage.getItem('accessRole') || '')
const canManageUsers = computed(() => effectiveUserRole.value === 'admin')
const canDeleteRecords = computed(() => effectiveUserRole.value === 'admin')
const canClearLocalData = computed(() => effectiveUserRole.value === 'admin')
const canReviewForPublishProjects = computed(
  () => effectiveUserRole.value !== 'admin' && effectiveAccessRole.value === 'archival_manager',
)
const canShowProjectActionCol = computed(
  () => canDeleteRecords.value || canReviewForPublishProjects.value,
)
const dashboardTitle = computed(() =>
  canManageUsers.value ? 'System Admin Dashboard' : 'Archival Manager Dashboard',
)
const dashboardSubtitle = computed(() =>
  canManageUsers.value ? 'Content & Archival Management System' : 'Review & Publication Queue',
)
const statsColMd = computed(() => (canManageUsers.value ? 3 : 6))

const activeTab = ref(canManageUsers.value ? 'users' : 'projects')
const projectSearch = ref('')
const projectTypeFilter = ref(null)
const projectStatusFilter = ref(null)
const projectSortBy = ref('created_at')
const projectSortOrder = ref('desc')
const publicationSearch = ref('')
const publicationCategoryFilter = ref(null)
const publicationSortBy = ref('created_at')
const publicationSortOrder = ref('desc')

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
        creator:profiles!created_by_profile_id (
          id,
          email,
          first_name,
          last_name
        ),
        section_head:profiles!section_head_id (
          id,
          email,
          first_name,
          last_name
        )
      `,
    )

    // Filter projects based on role/accessRole
    if (userRole === 'admin') {
      query = query.eq('status', 'Published')
    } else if (accessRole === 'online_accounts_manager') {
      query = query.or(
        'status.eq.to_online_accounts_manager,and(status.eq.For Publish,project_type.eq.other)',
      )
    } else if (accessRole === 'archival_manager') {
      query = query.eq('status', 'For Publish').neq('project_type', 'other')
    } else if (userRole === 'editor') {
      if (accessRole === 'editor_in_chief') {
        query = query.eq('status', 'to_editor_in_chief')
      } else if (accessRole === 'technical_editor' || accessRole === 'creative_director') {
        query = query.or('status.eq.to_technical_editor,status.eq.to_creative_director')
      } else if (accessRole === 'chief_adviser') {
        query = query.eq('status', 'to_chief_adviser')
      } else {
        query = query.eq('status', 'Published')
      }
    } else {
      query = query.eq('status', 'Published')
    }

    query = query.order('created_at', { ascending: false })

    const { result, timedOut } = await withTimeout(
      query,
      INITIAL_LOAD_TIMEOUT_MS,
      { data: safeParseCache(projectsCacheKey), error: null },
      'Fetching projects',
    )

    const { data: apiProjects, error } = result || {}

    if (timedOut) {
      initialLoadStatus.value = 'Using cached projects while Supabase is slow.'
    }

    if (error) {
      console.error('❌ Supabase error:', error)
      throw error
    }

    console.log('📊 Supabase Projects:', apiProjects?.length || 0)

    // Map to display format
    const mappedProjects = (apiProjects || []).map((project) => {
      // Try to get creator profile first, fall back to section_head
      const creatorProfile = project.creator || project.section_head
      const fullName =
        creatorProfile?.first_name && creatorProfile?.last_name
          ? `${creatorProfile.first_name} ${creatorProfile.last_name}`
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
          full_name: fullName || creatorProfile?.email || 'Unknown',
          email: creatorProfile?.email || 'N/A',
        },
      }
    })

    console.log('✅ Projects loaded from Supabase:', mappedProjects.length)
    saveCache(projectsCacheKey, mappedProjects)
    return mappedProjects
  } catch (error) {
    console.error('❌ Error loading projects from Supabase:', error)
    return safeParseCache(projectsCacheKey)
  }
}

// Refresh all data
const refreshData = async () => {
  try {
    refreshing.value = true
    if (canManageUsers.value) {
      const realUsers = await fetchRealUsers()
      users.value = realUsers
    } else {
      users.value = []
    }

    const allProjects = await loadAllProjects()
    projects.value = allProjects

    // Reload publications too
    const allPublications = await loadPublications()
    publications.value = allPublications

    // Update statistics - show ALL items
    statistics.value.totalUsers = canManageUsers.value ? users.value.length : 0
    statistics.value.activeUsers = canManageUsers.value
      ? users.value.filter((u) => u.status === 'active').length
      : 0
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
    const { result: data, timedOut } = await withTimeout(
      archivesService.getAll(),
      INITIAL_LOAD_TIMEOUT_MS,
      safeParseCache(publicationsCacheKey),
      'Fetching publications',
    )

    if (timedOut) {
      initialLoadStatus.value = 'Using cached publications while Supabase is slow.'
    }

    console.log('✅ Publications loaded:', data.length)
    const mappedPublications = data || []
    saveCache(publicationsCacheKey, mappedPublications)
    return mappedPublications
  } catch (error) {
    console.error('❌ Error loading publications:', error)
    return safeParseCache(publicationsCacheKey)
  }
}

// Delete publication
const confirmDeletePublication = (publication) => {
  publicationToDelete.value = publication
  showDeleteDialog.value = true
}

const deletePublication = async () => {
  if (!publicationToDelete.value) return

  publicationDeleteLoading.value = true
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
    publicationDeleteLoading.value = false
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

  projectDeleteLoading.value = true
  try {
    // Delete from database with cascading deletes
    await projectsService.delete(projectToDelete.value.id)

    // Delete all notifications related to this project
    await deleteProjectNotifications(projectToDelete.value.id)

    // Remove from local arrays
    projects.value = projects.value.filter((p) => p.id !== projectToDelete.value.id)

    // Update statistics
    statistics.value.totalProjects = projects.value.length
    statistics.value.recentProjects = projects.value

    displayNotification('Project deleted successfully', 'success')
    console.log('✅ Project deleted:', projectToDelete.value.title)
  } catch (error) {
    console.error('❌ Error deleting project:', error)
    displayNotification('Failed to delete project', 'error')
  } finally {
    projectDeleteLoading.value = false
    showDeleteProjectDialog.value = false
    projectToDelete.value = null
  }
}

// Fetch real users from Supabase
const fetchRealUsers = async () => {
  try {
    console.log('🔍 Fetching users from Supabase...')

    const { result: data, timedOut } = await withTimeout(
      profilesService.getAll(),
      INITIAL_LOAD_TIMEOUT_MS,
      safeParseCache(usersCacheKey),
      'Fetching users',
    )

    if (timedOut) {
      initialLoadStatus.value = 'Using cached users while Supabase is slow.'
    }

    console.log('📊 Users Supabase result:', data)

    if (!data || data.length === 0) {
      console.warn('⚠️ No users found')
      return []
    }

    // Filter out admins from user management (show only regular users)
    const regularUsers = data.filter((user) => user.role !== 'admin')

    console.log('✅ Found users:', regularUsers.length, '(excluding admins)')

    const mappedUsers = regularUsers.map((user) => {
      const derivedName =
        user.full_name ||
        [user.first_name, user.last_name].filter(Boolean).join(' ').trim() ||
        (user.email ? user.email.split('@')[0] : 'N/A')

      return {
        id: user.id,
        full_name: derivedName,
        email: user.email,
        department: user.department || 'N/A',
        role: user.role || 'member',
        designation_label: user.designation_label || '',
        positions_label: user.positions_label || '',
        status: user.status || 'inactive',
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_sign_in: user.last_login,
        last_active: user.last_active,
      }
    })

    saveCache(usersCacheKey, mappedUsers)
    return mappedUsers
  } catch (err) {
    console.error('❌ Error fetching real users:', err)
    return safeParseCache(usersCacheKey)
  }
}

// Load data on mount
onMounted(async () => {
  try {
    console.log('Starting to fetch system admin data from Supabase...')
    loading.value = true

    const [usersResult, projectsResult, publicationsResult] = await Promise.all([
      canManageUsers.value ? fetchRealUsers() : Promise.resolve([]),
      loadAllProjects(),
      loadPublications(),
    ])

    users.value = usersResult
    projects.value = projectsResult
    publications.value = publicationsResult

    // Update statistics - show ALL items in scrollable tables
    statistics.value = {
      totalUsers: canManageUsers.value ? usersResult.length : 0,
      activeUsers: canManageUsers.value
        ? usersResult.filter((u) => u.status === 'active').length
        : 0,
      totalProjects: projectsResult.length,
      activeProjects: projectsResult.filter(
        (p) => p.status === 'in_progress' || p.status === 'under_review',
      ).length,
      publishedWorks: projectsResult.filter((p) => p.status === 'published').length,
      totalPublications: publicationsResult.length,
      recentProjects: projectsResult,
      recentPublications: publicationsResult,
    }

    console.log('✅ All data loaded successfully from Supabase:', {
      users: usersResult.length,
      projects: projectsResult.length,
      publications: publicationsResult.length,
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

    if (canManageUsers.value) {
      try {
        profilesSubscription = supabase
          .channel('profiles-presence-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'profiles' },
            async (payload) => {
              console.log('📡 Profile status update received:', payload)
              const realUsers = await fetchRealUsers()
              users.value = realUsers
              statistics.value.totalUsers = users.value.length
              statistics.value.activeUsers = users.value.filter((u) => u.status === 'active').length
            },
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ Real-time subscription active for profiles')
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('⚠️ Profile real-time subscription error (non-critical)')
            } else if (status === 'TIMED_OUT') {
              console.warn('⚠️ Profile real-time subscription timed out (non-critical)')
            }
          })
      } catch (subscriptionError) {
        console.warn(
          '⚠️ Could not establish profile real-time subscription (non-critical):',
          subscriptionError,
        )
      }
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
  if (profilesSubscription) {
    supabase.removeChannel(profilesSubscription)
    console.log('🔌 Profile real-time subscription cleaned up')
  }
})

const isNewUser = (createdAt) => {
  if (!createdAt) return false

  const createdTime = new Date(createdAt).getTime()
  if (Number.isNaN(createdTime)) return false

  const ageMs = Date.now() - createdTime
  const dayMs = 24 * 60 * 60 * 1000
  return ageMs >= 0 && ageMs <= dayMs
}

const getUserStatusColor = (status) => {
  const colors = {
    active: '#e8f5e9',
    inactive: '#f3f4f6',
    pending: '#fff8e1',
    suspended: '#ffebee',
  }

  return colors[status] || '#f3f4f6'
}

const getUserStatusClass = (status) => {
  if (status === 'active') return 'status-chip-active'
  if (status === 'pending') return 'status-chip-pending'
  if (status === 'suspended') return 'status-chip-suspended'
  return 'status-chip-offline'
}

const getUserStatusText = (status) => {
  if (status === 'pending') return 'Pending Approval'
  if (status === 'active') return 'Online'
  if (status === 'inactive') return 'Offline'
  return formatText(status)
}

// Computed properties for filtered users
const filteredUsers = computed(() => {
  const key = (search.value || '').toLowerCase()
  return users.value.filter((user) => {
    const email = (user?.email || '').toLowerCase()
    const name = (user?.full_name || '').toLowerCase()

    return !key || email.includes(key) || name.includes(key)
  })
})

const projectTypeFilterOptions = computed(() => {
  const preferred = ['Magazine', 'Newsletter', 'Folio', 'Other']
  const all = new Set((projects.value || []).map((p) => p?.type).filter(Boolean))
  preferred.forEach((type) => all.add(type))

  const remaining = Array.from(all).filter((t) => !preferred.includes(t))
  remaining.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))

  return [...preferred.filter((t) => all.has(t)), ...remaining]
})

const projectStatusFilterOptions = computed(() => {
  const statuses = Array.from(new Set((projects.value || []).map((p) => p?.status).filter(Boolean)))
  return statuses
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))
    .map((status) => ({ title: formatStatus(status), value: status }))
})

const projectSortOptions = [
  { title: 'Date Created', value: 'created_at' },
  { title: 'Title', value: 'title' },
  { title: 'Type', value: 'type' },
  { title: 'Status', value: 'status' },
  { title: 'Created By', value: 'created_by' },
]

const publicationCategoryFilterOptions = computed(() => {
  const preferred = ['magazine', 'newsletter', 'folio', 'other']
  const all = new Set((publications.value || []).map((p) => p?.category).filter(Boolean))
  preferred.forEach((category) => all.add(category))

  const remaining = Array.from(all).filter((c) => !preferred.includes(c))
  remaining.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))

  return [...preferred.filter((c) => all.has(c)), ...remaining].map((category) => ({
    title: String(category).charAt(0).toUpperCase() + String(category).slice(1),
    value: category,
  }))
})

const publicationSortOptions = [
  { title: 'Date Published', value: 'created_at' },
  { title: 'Title', value: 'title' },
  { title: 'Category', value: 'category' },
]

const toggleProjectSortOrder = () => {
  projectSortOrder.value = projectSortOrder.value === 'asc' ? 'desc' : 'asc'
}

const togglePublicationSortOrder = () => {
  publicationSortOrder.value = publicationSortOrder.value === 'asc' ? 'desc' : 'asc'
}

const sortItems = (items, key, order, getValue) => {
  const factor = order === 'asc' ? 1 : -1

  return [...items].sort((a, b) => {
    const av = getValue(a, key)
    const bv = getValue(b, key)

    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1

    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor

    return (
      String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' }) *
      factor
    )
  })
}

const getProjectSortValue = (project, key) => {
  if (!project) return null
  if (key === 'created_at')
    return project.created_at ? new Date(project.created_at).getTime() : null
  if (key === 'title') return project.title || ''
  if (key === 'type') return project.type || ''
  if (key === 'status') return formatStatus(project.status || '')
  if (key === 'created_by')
    return project.user?.full_name || project.user?.email || project.sectionHead || ''
  return project[key] ?? ''
}

const getPublicationSortValue = (publication, key) => {
  if (!publication) return null
  if (key === 'created_at')
    return publication.created_at ? new Date(publication.created_at).getTime() : null
  if (key === 'title') return publication.title || ''
  if (key === 'category') return publication.category || ''
  return publication[key] ?? ''
}

const visibleProjects = computed(() => {
  const key = (projectSearch.value || '').toLowerCase().trim()

  let items = projects.value || []

  if (projectTypeFilter.value) {
    items = items.filter((p) => p?.type === projectTypeFilter.value)
  }

  if (projectStatusFilter.value) {
    items = items.filter((p) => p?.status === projectStatusFilter.value)
  }

  if (key) {
    items = items.filter((p) => {
      return (p?.title || '').toLowerCase().includes(key)
    })
  }

  return sortItems(items, projectSortBy.value, projectSortOrder.value, getProjectSortValue)
})

const projectTableColspan = computed(() => (canShowProjectActionCol.value ? 7 : 6))

const visiblePublications = computed(() => {
  const key = (publicationSearch.value || '').toLowerCase().trim()

  let items = publications.value || []

  if (publicationCategoryFilter.value) {
    items = items.filter((p) => p?.category === publicationCategoryFilter.value)
  }

  if (key) {
    items = items.filter((p) => {
      return (p?.title || '').toLowerCase().includes(key)
    })
  }

  return sortItems(
    items,
    publicationSortBy.value,
    publicationSortOrder.value,
    getPublicationSortValue,
  )
})

const publicationTableColspan = computed(() => (canDeleteRecords.value ? 5 : 4))

const normalizeStatus = (status) => {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

const openForPublishProject = (project) => {
  if (!project?.id) return
  if (normalizeStatus(project.status) !== 'for_publish') return
  router.push({ name: 'archival-manager', params: { id: project.id } })
}

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

// Format text by removing underscores and capitalizing (e.g., "section_head" -> "Section Head")
const formatText = (text) => {
  if (!text) return '—'

  return text
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

const confirmRemoveUser = (user) => {
  userToDelete.value = user
  userDeleteError.value = ''
  showDeleteUserDialog.value = true
}

const closeDeleteUserDialog = () => {
  if (deleteUserLoading.value) return
  showDeleteUserDialog.value = false
  userToDelete.value = null
  userDeleteError.value = ''
}

// Remove user from Supabase
const removeUser = async () => {
  if (!userToDelete.value) return

  const userId = userToDelete.value.id
  userDeleteError.value = ''
  deleteUserLoading.value = true

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

    displayNotification('User removed from User Management', 'success')
    showDeleteUserDialog.value = false
    userToDelete.value = null
  } catch (err) {
    console.error('Error removing user:', err)

    if (err.message?.includes('foreign key') || err.message?.includes('violates')) {
      userDeleteError.value =
        'Cannot delete this user because they still have associated data such as projects or comments. Reassign or remove that data first, then try again.'
    } else {
      userDeleteError.value = `Failed to delete user: ${err.message}`
    }
  } finally {
    deleteUserLoading.value = false
  }
}

// Open edit user dialog
const openEditUserDialog = (user) => {
  const isLegacySectionHead = user.role === 'section_head'

  editingUser.value = {
    ...user,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
  }
  editFormData.value = {
    role: isLegacySectionHead ? 'member' : user.role || 'member',
    status: user.status || 'pending',
    designation_label:
      isLegacySectionHead && !user.designation_label
        ? 'Section Head'
        : user.designation_label || '',
    positions_label: user.positions_label || '',
  }
  showEditUserDialog.value = true
}

// Close edit user dialog
const closeEditUserDialog = () => {
  showEditUserDialog.value = false
  editingUser.value = null
  editFormData.value = { role: '', status: '', designation_label: '', positions_label: '' }
}

const emptyToNull = (value) => {
  if (value === undefined || value === null) return null

  const normalized = String(value).trim()
  return normalized ? normalized : null
}

const hasNormalizedChange = (nextValue, previousValue) => {
  return emptyToNull(nextValue) !== emptyToNull(previousValue)
}

const setEditStatus = (status) => {
  editFormData.value.status = status
}

const applyApprovalStatus = async (status) => {
  setEditStatus(status)
  await saveUserChanges()
}

// Save user changes
const saveUserChanges = async () => {
  if (!editingUser.value) return

  editLoading.value = true
  try {
    const updateData = {
      role: editFormData.value.role,
      status: editFormData.value.status,
      updated_at: new Date().toISOString(),
    }

    if (
      hasNormalizedChange(editFormData.value.designation_label, editingUser.value.designation_label)
    ) {
      updateData.designation_label = emptyToNull(editFormData.value.designation_label)
    }

    if (
      hasNormalizedChange(editFormData.value.positions_label, editingUser.value.positions_label)
    ) {
      updateData.positions_label = emptyToNull(editFormData.value.positions_label)
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', editingUser.value.id)

    if (error) throw error

    // Update the user in the local array
    const userIndex = users.value.findIndex((u) => u.id === editingUser.value.id)
    if (userIndex !== -1) {
      users.value[userIndex].role = updateData.role
      users.value[userIndex].status = updateData.status
      users.value[userIndex].updated_at = updateData.updated_at
      if ('designation_label' in updateData) {
        users.value[userIndex].designation_label = updateData.designation_label || ''
      }
      if ('positions_label' in updateData) {
        users.value[userIndex].positions_label = updateData.positions_label || ''
      }
    }
    statistics.value.activeUsers = users.value.filter((u) => u.status === 'active').length

    displayNotification(`User ${editingUser.value.email} updated successfully!`, 'success')
    closeEditUserDialog()
  } catch (err) {
    console.error('Error updating user:', err)
    displayNotification(`Failed to update user: ${err.message}`, 'error')
  } finally {
    editLoading.value = false
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
      <v-container fluid class="py-6 px-4 px-lg-10 admin-container">
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
                      <div class="text-h5 font-weight-bold">{{ dashboardTitle }}</div>
                      <div class="text-caption text-grey">{{ dashboardSubtitle }}</div>
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
                      v-if="canClearLocalData"
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
                  <v-col v-if="canManageUsers" cols="12" sm="6" md="3">
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

                  <v-col v-if="canManageUsers" cols="12" sm="6" md="3">
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

                  <v-col cols="12" sm="6" :md="statsColMd">
                    <v-card class="stat-card stat-card-info" elevation="0">
                      <div class="stat-card-content">
                        <div class="stat-icon-wrapper">
                          <v-icon size="40" color="white">mdi-folder-multiple</v-icon>
                        </div>
                        <div class="stat-info">
                          <div class="stat-value">{{ statistics.totalProjects }}</div>
                          <div class="stat-label">
                            {{ canManageUsers ? 'Total Projects' : 'For Publish Queue' }}
                          </div>
                        </div>
                      </div>
                    </v-card>
                  </v-col>

                  <v-col cols="12" sm="6" :md="statsColMd">
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

                <!-- Clear Local Data Confirmation Dialog -->
                <v-dialog v-if="canClearLocalData" v-model="showClearDialog" max-width="600">
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
                <v-dialog
                  v-if="canDeleteRecords"
                  v-model="showDeleteDialog"
                  max-width="560px"
                  persistent
                >
                  <v-card class="edit-user-card delete-dialog-card">
                    <v-card-title class="edit-user-header delete-dialog-header">
                      <div class="header-content">
                        <v-avatar size="44" color="#6b7280" class="edit-user-avatar">
                          <v-icon color="white">mdi-delete-alert</v-icon>
                        </v-avatar>
                        <div class="edit-user-identity">
                          <div class="edit-user-title">Delete Publication</div>
                          <div class="edit-user-email">
                            {{ publicationToDelete?.title || 'Untitled' }}
                          </div>
                        </div>
                        <v-spacer />
                        <v-btn
                          icon
                          variant="text"
                          color="white"
                          :disabled="publicationDeleteLoading"
                          @click="showDeleteDialog = false"
                        >
                          <v-icon>mdi-close</v-icon>
                        </v-btn>
                      </div>
                    </v-card-title>
                    <v-card-text class="edit-user-body">
                      <div class="dialog-section">
                        <div class="section-heading">
                          <v-icon size="18">mdi-archive-remove-outline</v-icon>
                          <span>System Admin Dashboard</span>
                        </div>
                        <p class="delete-dialog-copy">
                          Are you sure you want to delete this publication?
                        </p>
                        <v-alert
                          class="delete-warning-alert"
                          color="#6b7280"
                          icon="mdi-information-outline"
                          density="compact"
                          variant="tonal"
                        >
                          This action cannot be undone. The publication will be permanently removed
                          from the system.
                        </v-alert>
                      </div>
                    </v-card-text>
                    <v-card-actions class="edit-user-actions">
                      <v-spacer />
                      <v-btn
                        variant="text"
                        class="cancel-edit-btn"
                        :disabled="publicationDeleteLoading"
                        @click="showDeleteDialog = false"
                      >
                        Cancel
                      </v-btn>
                      <v-btn
                        class="delete-confirm-btn"
                        :loading="publicationDeleteLoading"
                        @click="deletePublication"
                      >
                        <v-icon start>mdi-delete</v-icon>
                        Delete Publication
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>

                <!-- Delete Project Confirmation Dialog -->
                <v-dialog
                  v-if="canDeleteRecords"
                  v-model="showDeleteProjectDialog"
                  max-width="560px"
                  persistent
                >
                  <v-card class="edit-user-card delete-dialog-card">
                    <v-card-title class="edit-user-header delete-dialog-header">
                      <div class="header-content">
                        <v-avatar size="44" color="#6b7280" class="edit-user-avatar">
                          <v-icon color="white">mdi-delete-alert</v-icon>
                        </v-avatar>
                        <div class="edit-user-identity">
                          <div class="edit-user-title">Delete Project</div>
                          <div class="edit-user-email">
                            {{ projectToDelete?.title || 'Untitled' }}
                          </div>
                        </div>
                        <v-spacer />
                        <v-btn
                          icon
                          variant="text"
                          color="white"
                          :disabled="projectDeleteLoading"
                          @click="showDeleteProjectDialog = false"
                        >
                          <v-icon>mdi-close</v-icon>
                        </v-btn>
                      </div>
                    </v-card-title>
                    <v-card-text class="edit-user-body">
                      <div class="dialog-section">
                        <div class="section-heading">
                          <v-icon size="18">mdi-folder-remove-outline</v-icon>
                          <span>System Admin Dashboard</span>
                        </div>
                        <p class="delete-dialog-copy">
                          Are you sure you want to delete this project?
                        </p>
                        <v-alert
                          class="delete-warning-alert"
                          color="#6b7280"
                          icon="mdi-information-outline"
                          density="compact"
                          variant="tonal"
                        >
                          This action cannot be undone. The project and all related data will be
                          permanently removed from the system.
                        </v-alert>
                      </div>
                    </v-card-text>
                    <v-card-actions class="edit-user-actions">
                      <v-spacer />
                      <v-btn
                        variant="text"
                        class="cancel-edit-btn"
                        :disabled="projectDeleteLoading"
                        @click="showDeleteProjectDialog = false"
                      >
                        Cancel
                      </v-btn>
                      <v-btn
                        class="delete-confirm-btn"
                        :loading="projectDeleteLoading"
                        @click="deleteProject"
                      >
                        <v-icon start>mdi-delete</v-icon>
                        Delete Project
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="admin-section-layout">
          <v-col cols="12" md="3" class="d-none d-md-block">
            <v-card class="admin-sidebar-card" elevation="2">
              <div class="admin-sidebar-header">
                <div class="text-subtitle-1 font-weight-bold">Admin</div>
              </div>
              <v-divider />
              <v-list nav density="comfortable" class="admin-sidebar-list">
                <v-list-item
                  v-if="canManageUsers"
                  :active="activeTab === 'users'"
                  @click="activeTab = 'users'"
                  rounded="lg"
                >
                  <template #prepend>
                    <v-icon size="20">mdi-account-group</v-icon>
                  </template>
                  <v-list-item-title>User Management</v-list-item-title>
                </v-list-item>
                <v-list-item
                  :active="activeTab === 'projects'"
                  @click="activeTab = 'projects'"
                  rounded="lg"
                >
                  <template #prepend>
                    <v-icon size="20">mdi-folder-multiple</v-icon>
                  </template>
                  <v-list-item-title>Projects</v-list-item-title>
                </v-list-item>
                <v-list-item
                  :active="activeTab === 'publications'"
                  @click="activeTab = 'publications'"
                  rounded="lg"
                >
                  <template #prepend>
                    <v-icon size="20">mdi-book-open-page-variant</v-icon>
                  </template>
                  <v-list-item-title>Publications</v-list-item-title>
                </v-list-item>
                <v-list-item
                  :active="activeTab === 'uploads'"
                  @click="activeTab = 'uploads'"
                  rounded="lg"
                >
                  <template #prepend>
                    <v-icon size="20">mdi-cloud-upload</v-icon>
                  </template>
                  <v-list-item-title>Uploads</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>

          <v-col cols="12" md="9">
            <v-card elevation="2" class="admin-section-card">
              <div class="d-flex d-md-none">
                <v-tabs v-model="activeTab" bg-color="#fafafa" color="#f5c52b" class="w-100">
                  <v-tab v-if="canManageUsers" value="users">
                    <v-icon start size="20" color="#424242">mdi-account-group</v-icon>
                    Users
                  </v-tab>
                  <v-tab value="projects">
                    <v-icon start size="20" color="#424242">mdi-folder-multiple</v-icon>
                    Projects
                  </v-tab>
                  <v-tab value="publications">
                    <v-icon start size="20" color="#424242">mdi-book-open-page-variant</v-icon>
                    Publications
                  </v-tab>
                  <v-tab value="uploads">
                    <v-icon start size="20" color="#424242">mdi-cloud-upload</v-icon>
                    Uploads
                  </v-tab>
                </v-tabs>
              </div>
              <v-divider class="d-md-none" />

              <v-window v-model="activeTab" class="admin-section-window">
                <!-- User Management Tab -->
                <v-window-item v-if="canManageUsers" value="users">
                  <v-card-text>
                    <div class="user-management-panel">
                      <div class="user-management-header">
                        <div>
                          <div class="text-subtitle-1 font-weight-bold">User Management</div>
                        </div>
                        <div class="user-management-search">
                          <v-text-field
                            v-model="search"
                            label="Search users"
                            prepend-inner-icon="mdi-magnify"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                          ></v-text-field>
                        </div>
                      </div>

                      <v-table class="users-table">
                        <thead>
                          <tr>
                            <th class="th-name">Name</th>
                            <th class="th-email">Email</th>
                            <th class="th-role">Role</th>
                            <th class="th-designation">Designation</th>
                            <th class="th-status">Status</th>
                            <th class="th-actions">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="user in filteredUsers" :key="user.id" class="user-row">
                            <td class="td-name">
                              <div class="user-name-cell">
                                <span class="font-weight-600">{{ user.full_name || '—' }}</span>
                                <v-chip
                                  v-if="isNewUser(user.created_at)"
                                  size="x-small"
                                  color="#f5c52b"
                                  text-color="#374151"
                                  class="new-user-badge"
                                >
                                  New
                                </v-chip>
                              </div>
                            </td>
                            <td class="td-email">
                              <div class="email-cell">{{ user.email }}</div>
                            </td>
                            <td class="td-role">
                              <v-chip
                                size="small"
                                :color="user.role === 'admin' ? '#f5c52b' : '#ececec'"
                                class="role-chip"
                                :class="
                                  user.role === 'admin' ? 'role-chip-admin' : 'role-chip-default'
                                "
                              >
                                {{ formatText(user.role) }}
                              </v-chip>
                            </td>

                            <td class="td-designation">
                              <span v-if="user.designation_label" class="designation-badge">
                                {{ user.designation_label }}
                              </span>
                              <span v-else class="text-grey">—</span>
                            </td>
                            <td class="td-status">
                              <v-chip
                                size="small"
                                :color="getUserStatusColor(user.status)"
                                class="status-chip"
                                :class="getUserStatusClass(user.status)"
                              >
                                {{ getUserStatusText(user.status) }}
                              </v-chip>
                            </td>
                            <td class="td-actions">
                              <div style="display: flex; gap: 4px; justify-content: center">
                                <v-btn
                                  icon
                                  variant="text"
                                  color="primary"
                                  size="small"
                                  @click="openEditUserDialog(user)"
                                  title="Edit User"
                                >
                                  <v-icon>mdi-pencil</v-icon>
                                </v-btn>
                                <v-btn
                                  icon
                                  variant="text"
                                  color="error"
                                  size="small"
                                  @click="confirmRemoveUser(user)"
                                  title="Remove User"
                                >
                                  <v-icon>mdi-delete</v-icon>
                                </v-btn>
                              </div>
                            </td>
                          </tr>
                          <tr v-if="filteredUsers.length === 0">
                            <td colspan="6" class="text-center text-grey py-6">
                              No users yet. Accounts will appear here after first sign in or
                              registration.
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </div>
                  </v-card-text>
                </v-window-item>

                <v-window-item value="projects">
                  <v-card-text>
                    <div class="records-panel">
                      <div class="d-flex justify-space-between align-center flex-wrap mb-4">
                        <div>
                          <div class="text-subtitle-1 font-weight-bold">Projects</div>
                        </div>
                        <div class="text-caption text-grey-darken-1">
                          {{ visibleProjects.length }} of {{ projects.length }}
                        </div>
                      </div>

                      <v-row dense class="mb-2">
                        <v-col cols="12" md="4">
                          <v-text-field
                            v-model="projectSearch"
                            label="Search projects"
                            prepend-inner-icon="mdi-magnify"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                          />
                        </v-col>
                        <v-col cols="12" md="3">
                          <v-select
                            v-model="projectTypeFilter"
                            :items="projectTypeFilterOptions"
                            label="Type"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            clearable
                          />
                        </v-col>
                        <v-col cols="12" md="3">
                          <v-select
                            v-model="projectStatusFilter"
                            :items="projectStatusFilterOptions"
                            label="Status"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            clearable
                          />
                        </v-col>
                        <v-col cols="12" md="2">
                          <div class="d-flex align-center" style="gap: 6px">
                            <v-select
                              v-model="projectSortBy"
                              :items="projectSortOptions"
                              label="Sort by"
                              variant="outlined"
                              density="comfortable"
                              hide-details
                              class="flex-grow-1"
                            />
                            <v-btn
                              icon
                              variant="text"
                              @click="toggleProjectSortOrder"
                              :title="projectSortOrder === 'asc' ? 'Ascending' : 'Descending'"
                            >
                              <v-icon>
                                {{
                                  projectSortOrder === 'asc'
                                    ? 'mdi-sort-ascending'
                                    : 'mdi-sort-descending'
                                }}
                              </v-icon>
                            </v-btn>
                          </div>
                        </v-col>
                      </v-row>

                      <v-table>
                        <thead>
                          <tr>
                            <th class="text-center" style="width: 60px">#</th>
                            <th>Title</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Created By</th>
                            <th>Date</th>
                            <th
                              v-if="canShowProjectActionCol"
                              class="text-center"
                              style="width: 120px"
                            >
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(project, index) in visibleProjects" :key="project.id">
                            <td class="text-center">{{ index + 1 }}</td>
                            <td>{{ project.title }}</td>
                            <td>{{ project.type }}</td>
                            <td>
                              <v-chip :color="getStatusColor(project.status)" size="small">
                                {{ formatStatus(project.status) }}
                              </v-chip>
                            </td>
                            <td>{{ project.user?.full_name || project.sectionHead }}</td>
                            <td>{{ formatDate(project.created_at) }}</td>
                            <td v-if="canShowProjectActionCol" class="text-center">
                              <v-btn
                                v-if="canDeleteRecords"
                                icon
                                size="small"
                                color="error"
                                variant="text"
                                @click="confirmDeleteProject(project)"
                                title="Delete Project"
                              >
                                <v-icon>mdi-delete</v-icon>
                              </v-btn>
                              <v-btn
                                v-else
                                icon
                                size="small"
                                color="primary"
                                variant="text"
                                @click="openForPublishProject(project)"
                                title="Open For Publish"
                              >
                                <v-icon>mdi-publish</v-icon>
                              </v-btn>
                            </td>
                          </tr>
                          <tr v-if="visibleProjects.length === 0">
                            <td :colspan="projectTableColspan" class="text-center text-grey py-6">
                              No projects found.
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </div>
                  </v-card-text>
                </v-window-item>

                <v-window-item value="publications">
                  <v-card-text>
                    <div class="records-panel">
                      <div class="d-flex justify-space-between align-center flex-wrap mb-4">
                        <div>
                          <div class="text-subtitle-1 font-weight-bold">Publications</div>
                        </div>
                        <div class="text-caption text-grey-darken-1">
                          {{ visiblePublications.length }} of {{ publications.length }}
                        </div>
                      </div>

                      <v-row dense class="mb-2">
                        <v-col cols="12" md="5">
                          <v-text-field
                            v-model="publicationSearch"
                            label="Search publications"
                            prepend-inner-icon="mdi-magnify"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                          />
                        </v-col>
                        <v-col cols="12" md="3">
                          <v-select
                            v-model="publicationCategoryFilter"
                            :items="publicationCategoryFilterOptions"
                            label="Category"
                            variant="outlined"
                            density="comfortable"
                            hide-details
                            clearable
                          />
                        </v-col>
                        <v-col cols="12" md="4">
                          <div class="d-flex align-center" style="gap: 6px">
                            <v-select
                              v-model="publicationSortBy"
                              :items="publicationSortOptions"
                              label="Sort by"
                              variant="outlined"
                              density="comfortable"
                              hide-details
                              class="flex-grow-1"
                            />
                            <v-btn
                              icon
                              variant="text"
                              @click="togglePublicationSortOrder"
                              :title="publicationSortOrder === 'asc' ? 'Ascending' : 'Descending'"
                            >
                              <v-icon>
                                {{
                                  publicationSortOrder === 'asc'
                                    ? 'mdi-sort-ascending'
                                    : 'mdi-sort-descending'
                                }}
                              </v-icon>
                            </v-btn>
                          </div>
                        </v-col>
                      </v-row>

                      <v-table>
                        <thead>
                          <tr>
                            <th class="text-center" style="width: 60px">#</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Date Published</th>
                            <th v-if="canDeleteRecords" class="text-center" style="width: 120px">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="(publication, index) in visiblePublications"
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
                            <td v-if="canDeleteRecords" class="text-center">
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
                          <tr v-if="visiblePublications.length === 0">
                            <td
                              :colspan="publicationTableColspan"
                              class="text-center text-grey py-6"
                            >
                              No publications found. Upload content to get started.
                            </td>
                          </tr>
                        </tbody>
                      </v-table>
                    </div>
                  </v-card-text>
                </v-window-item>

                <v-window-item value="uploads">
                  <v-card-text>
                    <div class="content-management-panel">
                      <div class="content-management-header">
                        <div>
                          <div class="text-subtitle-1 font-weight-bold">Uploads</div>
                          <div class="text-caption text-grey-darken-1">
                            Manage uploads, publications, and archive-ready content
                          </div>
                        </div>
                      </div>

                      <div v-if="!showUploadView" class="content-management">
                        <div class="text-center py-8">
                          <v-icon size="64" color="#f5c52b">mdi-folder-multiple</v-icon>
                          <h3 class="text-h6 mt-4">Upload Content</h3>
                          <p class="text-grey">
                            Manage newsletters, folios, and other content submissions
                          </p>
                          <v-btn
                            color="#f5c52b"
                            class="mt-4 upload-content-btn"
                            @click="showUploadView = true"
                          >
                            <v-icon start color="#374151">mdi-cloud-upload</v-icon>
                            <span style="color: #374151; font-weight: 600">Upload Content</span>
                          </v-btn>
                        </div>
                      </div>
                      <UploadView
                        v-else
                        @close="showUploadView = false"
                        @upload-success="handleUploadSuccess"
                        @upload-error="handleUploadError"
                      />
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

    <!-- Delete User Dialog -->
    <v-dialog v-if="canManageUsers" v-model="showDeleteUserDialog" max-width="560px" persistent>
      <v-card class="edit-user-card delete-dialog-card">
        <v-card-title class="edit-user-header delete-dialog-header">
          <div class="header-content">
            <v-avatar size="44" color="#6b7280" class="edit-user-avatar">
              <v-icon color="white">mdi-account-remove</v-icon>
            </v-avatar>
            <div class="edit-user-identity">
              <div class="edit-user-title">Remove User</div>
              <div class="edit-user-email">
                {{ userToDelete?.full_name || userToDelete?.email || 'Selected user' }}
              </div>
            </div>
            <v-spacer></v-spacer>
            <v-btn
              icon
              variant="text"
              color="white"
              :disabled="deleteUserLoading"
              @click="closeDeleteUserDialog"
            >
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </div>
        </v-card-title>

        <v-card-text class="edit-user-body">
          <div class="dialog-section">
            <div class="section-heading">
              <v-icon size="18">mdi-account-remove-outline</v-icon>
              <span>User Management Delete</span>
            </div>
            <p class="delete-dialog-copy">
              Are you sure you want to remove this user from User Management?
            </p>
            <v-alert
              class="delete-warning-alert mb-3"
              color="#6b7280"
              icon="mdi-information-outline"
              density="compact"
              variant="tonal"
            >
              This removes the profile record from the system. If the account still exists in
              authentication, it must be fully deleted from Supabase Authentication separately.
            </v-alert>
            <v-alert v-if="userDeleteError" type="error" density="compact" variant="tonal">
              {{ userDeleteError }}
            </v-alert>
          </div>
        </v-card-text>

        <v-card-actions class="edit-user-actions">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            class="cancel-edit-btn"
            :disabled="deleteUserLoading"
            @click="closeDeleteUserDialog"
          >
            Cancel
          </v-btn>
          <v-btn class="delete-confirm-btn" :loading="deleteUserLoading" @click="removeUser">
            <v-icon start>mdi-delete</v-icon>
            Remove User
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit User Dialog -->
    <v-dialog v-if="canManageUsers" v-model="showEditUserDialog" max-width="560px">
      <v-card class="edit-user-card">
        <!-- Header -->
        <v-card-title class="edit-user-header">
          <div class="header-content">
            <v-avatar size="44" color="#374151" class="edit-user-avatar">
              <span class="font-weight-bold">
                {{ editingUser?.email?.charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
            <div class="edit-user-identity">
              <div class="edit-user-title">Edit User</div>
              <div class="edit-user-email">
                {{ editingUser?.email }}
              </div>
            </div>
            <v-spacer></v-spacer>
            <v-chip
              size="small"
              class="edit-status-chip"
              :class="getUserStatusClass(editFormData.status)"
              :color="getUserStatusColor(editFormData.status)"
            >
              {{ getUserStatusText(editFormData.status) }}
            </v-chip>
          </div>
        </v-card-title>

        <v-card-text class="edit-user-body">
          <v-form @submit.prevent="saveUserChanges">
            <div class="dialog-section">
              <div class="section-heading">
                <v-icon size="18">mdi-account-check-outline</v-icon>
                <span>Account Approval</span>
              </div>
              <div class="approval-actions">
                <v-btn
                  v-for="action in approvalStatusActions"
                  :key="action.value"
                  class="approval-action-btn"
                  variant="outlined"
                  size="large"
                  :disabled="editLoading"
                  :loading="editLoading && editFormData.status === action.value"
                  type="button"
                  @click="applyApprovalStatus(action.value)"
                >
                  <v-icon start size="16">{{ action.icon }}</v-icon>
                  {{ action.title }}
                </v-btn>
              </div>
              <div class="status-helper">Approval buttons save immediately.</div>
            </div>

            <div class="dialog-section">
              <div class="section-heading">
                <v-icon size="18">mdi-shield-account-outline</v-icon>
                <span>Access Details</span>
              </div>
              <div class="field-grid">
                <div class="form-section">
                  <label class="section-label">System Role</label>
                  <v-select
                    v-model="editFormData.role"
                    :items="roleOptions"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-account-key-outline"
                    hide-details
                    :disabled="editLoading"
                  />
                </div>

                <div class="form-section">
                  <label class="section-label">Workflow Designation</label>
                  <v-select
                    v-model="editFormData.designation_label"
                    :items="designationOptions"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-briefcase-outline"
                    hide-details
                    clearable
                    :disabled="editLoading"
                  />
                </div>
              </div>

              <div class="form-section form-section-last">
                <label class="section-label">Staff Position</label>
                <v-select
                  v-model="editFormData.positions_label"
                  :items="positionOptions"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-card-account-details-outline"
                  hide-details
                  clearable
                  :disabled="editLoading"
                />
              </div>

              <div class="info-message">
                Leave designation and staff position blank for basic members.
              </div>
            </div>
          </v-form>
        </v-card-text>

        <v-card-actions class="edit-user-actions">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            class="cancel-edit-btn"
            @click="closeEditUserDialog"
            :disabled="editLoading"
          >
            Cancel
          </v-btn>
          <v-btn class="save-btn" @click="saveUserChanges" :loading="editLoading">
            Save Changes
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<style scoped>
:global(:root) {
  --admin-primary: #374151;
  --admin-accent: #f5c52b;
  --admin-bg: #f7f7f8;
  --admin-surface: #ffffff;
  --admin-border: #e5e7eb;
  --admin-border-soft: #eef0f4;
  --admin-text: #111827;
  --admin-muted: #6b7280;
}

.admin-page {
  --admin-primary: #374151;
  --admin-accent: #f5c52b;
  --admin-bg: #f7f7f8;
  --admin-surface: #ffffff;
  --admin-border: #e5e7eb;
  --admin-border-soft: #eef0f4;
  --admin-text: #111827;
  --admin-muted: #6b7280;

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0 !important;
}

.main-content {
  background: linear-gradient(180deg, var(--admin-bg) 0%, #f3f4f6 100%);
}

.admin-container {
  max-width: 1640px;
  margin: 0 auto;
}

/* Dashboard Header */
.dashboard-header {
  background: var(--admin-surface);
  border-left: 4px solid var(--admin-accent);
  border: 1px solid var(--admin-border-soft);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-primary);
  box-shadow: 0 4px 12px rgba(17, 24, 39, 0.14);
}

.icon-wrapper.primary {
  background: var(--admin-primary);
}

.icon-wrapper-small {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--admin-primary);
}

.icon-wrapper-small.success {
  background: var(--admin-accent);
}

.refresh-btn,
.clear-btn {
  text-transform: none !important;
  letter-spacing: normal !important;
  padding: 0 20px !important;
}

.gap-2 {
  gap: 8px;
}

/* Edit User Dialog */
.edit-user-card {
  border-radius: 10px !important;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.22) !important;
  border: none !important;
  overflow: hidden;
}

.delete-dialog-card {
  border: 1px solid #d1d5db !important;
}

.edit-user-header {
  background: #f5c52b !important;
  padding: 18px 22px !important;
  display: flex;
  align-items: center;
  border: none !important;
}

.delete-dialog-header {
  background: #4b5563 !important;
}

.delete-dialog-card .edit-user-title {
  color: #f9fafb;
}

.delete-dialog-card .edit-user-email {
  color: rgba(249, 250, 251, 0.78);
}

.edit-user-header .header-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.edit-user-avatar {
  color: #fff !important;
  margin-right: 12px;
  flex-shrink: 0;
}

.delete-dialog-card .edit-user-avatar {
  background: #6b7280 !important;
}

.edit-user-identity {
  min-width: 0;
}

.edit-user-title {
  color: #172033;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.2;
}

.edit-user-email {
  color: rgba(23, 32, 51, 0.72);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.edit-status-chip {
  flex-shrink: 0;
  font-weight: 700 !important;
}

.edit-user-body {
  background: #f8fafc;
  padding: 18px 22px 20px !important;
}

.dialog-section {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 14px;
}

.dialog-section:last-child {
  margin-bottom: 0;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 14px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.form-section {
  margin-bottom: 16px;
}

.field-grid .form-section {
  margin-bottom: 0;
}

.form-section-last {
  margin-top: 14px;
}

.section-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  color: var(--admin-primary);
  margin-bottom: 7px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.approval-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.approval-action-btn {
  justify-content: center;
  min-height: 46px;
  border-color: #d9d9d9 !important;
  color: #444 !important;
  text-transform: none !important;
  font-weight: 700;
  border-radius: 8px !important;
  background: #fff !important;
}

.status-helper {
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
}

.info-message {
  background: #fff8df;
  border: 1px solid #f3df91;
  border-left: 4px solid #f5c52b;
  border-radius: 8px;
  color: #66500b;
  font-size: 12px;
  font-weight: 600;
  margin-top: 14px;
  padding: 10px 12px;
}

.delete-dialog-copy {
  color: #334155;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.55;
  margin: 0 0 12px;
}

.delete-warning-alert {
  border-left: 4px solid #6b7280 !important;
  background: #f3f4f6 !important;
  color: #374151 !important;
}

:deep(.delete-warning-alert .v-alert__prepend) {
  color: #6b7280 !important;
}

.edit-user-actions {
  background: #fff;
  border-top: 1px solid #e5e7eb;
  padding: 14px 22px !important;
}

.cancel-edit-btn {
  color: #64748b !important;
  font-weight: 700 !important;
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.save-btn {
  background: var(--admin-primary) !important;
  color: white !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  border-radius: 8px !important;
  padding: 0 22px !important;
}

.delete-confirm-btn {
  background: #6b7280 !important;
  color: #fff !important;
  font-weight: 700 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  border-radius: 8px !important;
  padding: 0 22px !important;
}

.delete-confirm-btn:hover {
  background: #4b5563 !important;
}

@media (max-width: 600px) {
  .field-grid {
    grid-template-columns: 1fr;
  }

  .edit-user-email {
    max-width: 180px;
  }

  .edit-status-chip {
    display: none !important;
  }
}

/* User Table Styling */
.user-management-panel {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-left: 4px solid var(--admin-accent);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.content-management-panel {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-left: 4px solid var(--admin-accent);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.records-panel {
  background: var(--admin-surface);
  border: 1px solid var(--admin-border);
  border-left: 4px solid var(--admin-accent);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.user-management-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.user-management-search {
  width: 100%;
  max-width: 340px;
}

.content-management-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.users-table {
  border-radius: 10px !important;
  overflow: hidden;
  border: 1px solid #efefef;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06) !important;
}

.th-name,
.th-email,
.th-role,
.th-designation,
.th-status,
.th-actions {
  text-align: left !important;
  background: #fafafa;
  font-size: 12px;
  letter-spacing: 0.3px;
}

.user-row {
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.user-row:hover {
  background-color: #fffbea !important;
}

@media (max-width: 900px) {
  .user-management-header {
    flex-direction: column;
  }

  .content-management-header {
    flex-direction: column;
  }

  .user-management-search {
    max-width: none;
  }
}

.user-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.new-user-badge {
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.2px;
}

.email-cell {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 13px;
  color: #4a4a4a;
  line-height: 1.35;
  word-break: break-word;
}

.role-chip {
  text-transform: capitalize;
  font-weight: 600;
  border: 1px solid #d9d9d9;
}

.role-chip-admin {
  color: var(--admin-primary) !important;
}

.role-chip-default {
  color: #374151 !important;
}

.designation-badge {
  display: inline-flex;
  align-items: center;
  max-width: 220px;
  padding: 4px 10px;
  background: #f2f2f2;
  color: #4f4f4f;
  border: 1px solid #d9d9d9;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  word-break: break-word;
  white-space: normal;
}

.status-chip {
  font-weight: 600;
  border: 1px solid #d9d9d9;
}

.status-chip-active {
  color: #1b5e20 !important;
  border-color: #81c784 !important;
}

.status-chip-offline {
  color: #374151 !important;
  border-color: #9ca3af !important;
}

.status-chip-pending {
  color: #8a5a00 !important;
  border-color: #f5c52b !important;
}

.status-chip-suspended {
  color: #b71c1c !important;
  border-color: #ef9a9a !important;
}

.td-actions {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.user-row:hover .td-actions {
  opacity: 1;
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
  background: var(--admin-accent);
  color: var(--admin-primary);
  box-shadow: 0 2px 8px rgba(245, 197, 43, 0.2);
}

.stat-card-success {
  background: var(--admin-surface);
  color: var(--admin-primary);
  border: 1px solid var(--admin-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-card-info {
  background: #1f2937;
  color: white;
  box-shadow: 0 2px 10px rgba(31, 41, 55, 0.2);
}

.stat-card-warning {
  background: #334155;
  color: white;
  box-shadow: 0 2px 10px rgba(51, 65, 85, 0.18);
}

.stat-card-light {
  background: #475569;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(71, 85, 105, 0.16);
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
  background: rgba(15, 23, 42, 0.02);
  border-bottom: 1px solid var(--admin-border);
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
  background: rgba(15, 23, 42, 0.02) !important;
  border-bottom: 1px solid var(--admin-border) !important;
  font-weight: 600 !important;
  padding: 18px 16px !important;
  color: var(--admin-muted) !important;
  font-size: 0.875rem !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.v-table tbody tr {
  transition: all 0.2s ease;
}

.v-table tbody tr:hover {
  background-color: rgba(245, 197, 43, 0.12) !important;
  border-left: 3px solid var(--admin-accent);
}

.v-table tbody td {
  padding: 16px !important;
  border-bottom: 1px solid var(--admin-border-soft) !important;
  color: var(--admin-text);
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

.admin-section-layout {
  align-items: flex-start;
}

.admin-sidebar-card {
  position: sticky;
  top: 88px;
  border: 1px solid var(--admin-border);
  background: var(--admin-surface);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.admin-sidebar-header {
  padding: 18px 18px 14px;
}

.admin-sidebar-list :deep(.v-list-item) {
  margin: 6px 12px;
}

.admin-sidebar-list :deep(.v-list-item--active) {
  background: rgba(245, 197, 43, 0.18);
}

.admin-sidebar-list :deep(.v-list-item--active .v-icon),
.admin-sidebar-list :deep(.v-list-item--active .v-list-item-title) {
  color: var(--admin-primary) !important;
}

.admin-section-card {
  overflow: hidden;
  border: 1px solid var(--admin-border);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.admin-section-window {
  min-height: 420px;
}

/* Tabs */
:deep(.v-tabs) {
  background: rgba(15, 23, 42, 0.02);
  border-bottom: 1px solid var(--admin-border);
}

:deep(.v-tab) {
  text-transform: none !important;
  letter-spacing: normal !important;
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--admin-muted) !important;
}

:deep(.v-tab--selected) {
  color: var(--admin-primary) !important;
}

:deep(.v-tab__slider) {
  background-color: var(--admin-accent) !important;
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
  background: var(--admin-primary);
  box-shadow: 0 2px 8px rgba(17, 24, 39, 0.14);
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
  color: var(--admin-primary);
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
