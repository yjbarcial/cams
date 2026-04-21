import { createRouter, createWebHistory } from 'vue-router'
import ArchiveView from '@/views/system/ArchiveView.vue'
import PublicationView from '@/views/system/PublicationView.vue'
import LoginView from '@/views/auth/LoginView.vue'
import ResetPasswordView from '@/views/auth/ResetPasswordView.vue'
import ContributorDashboard from '@/views/system/ContributorDashboard.vue'
import NotificationsView from '@/views/system/NotificationsView.vue'
import AddProjectView from '@/views/system/AddProjectView.vue'
import MagazineView from '@/views/system/MagazineView.vue'
import NewsletterView from '@/views/system/NewsletterView.vue'
import FolioView from '@/views/system/FolioView.vue'
import OtherView from '@/views/system/OtherView.vue'
import DeliverableView from '@/views/system/DeliverableView.vue'
import ProjectView from '@/views/system/ProjectView.vue'
import SettingsView from '@/views/system/SettingsView.vue'
import ProfileView from '@/views/system/ProfileView.vue'
import AdminView from '@/views/admin/AdminView.vue'
import SectionHeadView from '@/views/system/SectionHeadView.vue'
import TechnicalEditorView from '@/views/system/TechnicalEditorView.vue'
import EditorInChiefView from '@/views/system/EditorInChiefView.vue'
import ChiefAdviserView from '@/views/system/ChiefAdviserView.vue'
import ArchivalManagerView from '@/views/system/ArchivalManagerView.vue'
import { showAccessDenied } from '@/stores/accessDenied'

const getEffectiveUserRole = () => {
  return localStorage.getItem('debugRole') || localStorage.getItem('userRole')
}

// Authentication guard
const requireAuth = (to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  if (!isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
}

// System Admin guard - requires authentication and system admin privileges
const requireAdmin = (to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  if (!isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  const userRole = getEffectiveUserRole()
  if (userRole !== 'admin') {
    // Not a System Admin - redirect to dashboard
    next({ name: 'dashboard' })
  } else {
    next()
  }
}

// Role-based guards for approval workflows
// Section Head - can access section-head view
const requireSectionHead = (to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  if (!isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  const userRole = getEffectiveUserRole()

  // Allow if admin or section head
  if (userRole === 'section_head' || userRole === 'admin') {
    next()
  } else {
    showAccessDenied('section_head')
    next(false)
  }
}

// Specific editor role guards
const requireEditorInChief = (to, from, next) => {
  if (!checkAuth(to, from, next)) return
  const accessRole = localStorage.getItem('accessRole')
  const userRole = getEffectiveUserRole()

  if (accessRole === 'editor_in_chief' || userRole === 'admin') {
    next()
  } else {
    showAccessDenied('editor_in_chief')
    next(false)
  }
}

const requireChiefAdviser = (to, from, next) => {
  if (!checkAuth(to, from, next)) return
  const accessRole = localStorage.getItem('accessRole')
  const userRole = getEffectiveUserRole()

  if (accessRole === 'chief_adviser' || userRole === 'admin') {
    next()
  } else {
    showAccessDenied('chief_adviser')
    next(false)
  }
}

const requireArchivalManager = (to, from, next) => {
  if (!checkAuth(to, from, next)) return
  const accessRole = localStorage.getItem('accessRole')
  const userRole = getEffectiveUserRole()

  if (
    accessRole === 'archival_manager' ||
    accessRole === 'online_accounts_manager' ||
    userRole === 'admin'
  ) {
    next()
  } else {
    showAccessDenied('archival_manager')
    next(false)
  }
}

// Combined guard for unified Editor Review (both Technical Editor and Creative Director)
const requireEditorReview = (to, from, next) => {
  if (!checkAuth(to, from, next)) return
  const accessRole = localStorage.getItem('accessRole')
  const userRole = getEffectiveUserRole()

  if (
    accessRole === 'technical_editor' ||
    accessRole === 'creative_director' ||
    userRole === 'admin'
  ) {
    next()
  } else {
    showAccessDenied('editor_review')
    next(false)
  }
}

// Helper to check auth and avoid repetition
const checkAuth = (to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  if (!isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return false
  }
  return true
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Public Routes
    {
      path: '/',
      name: 'home',
      component: ArchiveView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/auth/reset-password',
      name: 'reset-password',
      component: ResetPasswordView,
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: LoginView, // Reuse LoginView to handle the callback
    },
    {
      path: '/archive',
      name: 'archive',
      component: ArchiveView,
    },
    {
      path: '/publication/:id',
      name: 'publication',
      component: PublicationView,
    },

    // Authenticated Routes
    {
      path: '/dashboard',
      name: 'dashboard',
      component: ContributorDashboard,
      beforeEnter: requireAuth,
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: NotificationsView,
      beforeEnter: requireAuth,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      beforeEnter: requireAuth,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfileView,
      beforeEnter: requireAuth,
    },
    {
      path: '/profile/:userId',
      name: 'userProfile',
      component: ProfileView,
      beforeEnter: requireAuth,
    },

    // System Admin Routes
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      beforeEnter: requireAdmin,
    },

    // Project Type Routes - ALL PROJECTS ARE HERE
    {
      path: '/magazine',
      name: 'magazine',
      component: MagazineView,
      beforeEnter: requireAuth,
    },
    {
      path: '/magazine/new',
      name: 'magazine-new',
      component: AddProjectView,
      beforeEnter: requireSectionHead,
    },
    {
      path: '/newsletter',
      name: 'newsletter',
      component: NewsletterView,
      beforeEnter: requireAuth,
    },
    {
      path: '/newsletter/new',
      name: 'newsletter-new',
      component: AddProjectView,
      beforeEnter: requireSectionHead,
    },
    {
      path: '/folio',
      name: 'folio',
      component: FolioView,
      beforeEnter: requireAuth,
    },
    {
      path: '/folio/new',
      name: 'folio-new',
      component: AddProjectView,
      beforeEnter: requireSectionHead,
    },
    {
      path: '/other',
      name: 'other',
      component: OtherView,
      beforeEnter: requireAuth,
    },
    {
      path: '/other/new',
      name: 'other-new',
      component: AddProjectView,
      beforeEnter: requireSectionHead,
    },

    // Project Detail Routes
    {
      path: '/deliverables/:id',
      name: 'deliverable',
      component: DeliverableView,
      props: true,
      beforeEnter: requireAuth,
    },
    {
      path: '/project/:id',
      name: 'project',
      component: ProjectView,
      props: true,
      beforeEnter: requireAuth,
    },

    // Approval Routes - Updated Flow: Section Head → Technical Editor → EIC → Chief Adviser → Archival Manager
    {
      path: '/section-head/:id',
      name: 'section-head',
      component: SectionHeadView,
      props: true,
      beforeEnter: requireSectionHead,
    },
    {
      path: '/technical-editor/:id',
      name: 'technical-editor',
      component: TechnicalEditorView,
      props: true,
      beforeEnter: requireEditorReview,
    },
    {
      path: '/creative-director/:id',
      name: 'creative-director',
      component: TechnicalEditorView,
      props: true,
      beforeEnter: requireEditorReview,
    },
    {
      path: '/editor-in-chief/:id',
      name: 'editor-in-chief',
      component: EditorInChiefView,
      props: true,
      beforeEnter: requireEditorInChief,
    },
    {
      path: '/chief-adviser/:id',
      name: 'chief-adviser',
      component: ChiefAdviserView,
      props: true,
      beforeEnter: requireChiefAdviser,
    },
    {
      path: '/archival-manager/:id',
      name: 'archival-manager',
      component: ArchivalManagerView,
      props: true,
      beforeEnter: requireArchivalManager,
    },
  ],
})

export default router
