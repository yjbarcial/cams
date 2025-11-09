import { createRouter, createWebHistory } from 'vue-router'
import ArchiveView from '@/views/system/ArchiveView.vue'
import LoginView from '@/views/auth/LoginView.vue'
import DashboardView from '@/views/system/DashboardView.vue'
import NotificationsView from '@/views/system/NotificationsView.vue'
import AddProjectView from '@/views/system/AddProjectView.vue'
import MagazineView from '@/views/system/MagazineView.vue'
import NewsletterView from '@/views/system/NewsletterView.vue'
import FolioView from '@/views/system/FolioView.vue'
import OtherView from '@/views/system/OtherView.vue'
import DeliverableView from '@/views/system/DeliverableView.vue'
import ProjectView from '@/views/system/ProjectView.vue'
import SettingsView from '@/views/system/SettingsView.vue'
import AdminView from '@/views/admin/AdminView.vue'
import SectionHeadDashboardView from '@/views/system/SectionHeadDashboardView.vue'
import SectionHeadReviewView from '@/views/system/SectionHeadReviewView.vue'
import EditorInChiefDashboardView from '@/views/system/EditorInChiefDashboardView.vue'
import ChiefAdviserDashboardView from '@/views/system/ChiefAdviserDashboardView.vue'

// Admin email list - users with admin privileges
const adminEmails = [
  'yssahjulianah.barcial@carsu.edu.ph',
  'lovellhudson.clavel@carsu.edu.ph',
  'altheaguila.gorres@carsu.edu.ph',
]

// Authentication guard
const requireAuth = (to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  if (!isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
}

// Admin guard - requires authentication and admin privileges
const requireAdmin = (to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  if (!isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  const userEmail = localStorage.getItem('userEmail')
  if (!userEmail || !adminEmails.includes(userEmail)) {
    // Not an admin, redirect to dashboard
    next({ name: 'dashboard' })
  } else {
    next()
  }
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
      path: '/archive',
      name: 'archive',
      component: ArchiveView,
    },

    // Authenticated Routes
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
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

    // Admin Routes
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      beforeEnter: requireAdmin,
    },

    // Project Type Routes
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
      beforeEnter: requireAuth,
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
      beforeEnter: requireAuth,
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
      beforeEnter: requireAuth,
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
      beforeEnter: requireAuth,
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

    // Section Head Routes
    {
      path: '/section-head',
      name: 'section-head-dashboard',
      component: SectionHeadDashboardView,
      beforeEnter: requireAuth,
      meta: {
        role: 'section-head',
        title: 'Section Head Dashboard',
      },
    },
    {
      path: '/section-head/review/:id',
      name: 'section-head-review',
      component: SectionHeadReviewView,
      props: true,
      beforeEnter: requireAuth,
      meta: {
        role: 'section-head',
        title: 'Review Project',
      },
    },

    // Editor-in-Chief Routes
    {
      path: '/editor-in-chief',
      name: 'editor-in-chief-dashboard',
      component: EditorInChiefDashboardView,
      beforeEnter: requireAuth,
      meta: {
        role: 'editor-in-chief',
        title: 'Editor-in-Chief Dashboard',
      },
    },
    {
      path: '/editor-in-chief/:id',
      name: 'editor-in-chief-detail',
      component: EditorInChiefDashboardView,
      props: true,
      beforeEnter: requireAuth,
    },

    // Chief Adviser Routes
    {
      path: '/chief-adviser',
      name: 'chief-adviser-dashboard',
      component: ChiefAdviserDashboardView,
      beforeEnter: requireAuth,
      meta: {
        role: 'chief-adviser',
        title: 'Chief Adviser Dashboard',
      },
    },
    {
      path: '/chief-adviser/:id',
      name: 'chief-adviser-detail',
      component: ChiefAdviserDashboardView,
      props: true,
      beforeEnter: requireAuth,
    },

    // Legacy routes for backwards compatibility
    {
      path: '/approval',
      redirect: '/section-head',
    },
    {
      path: '/approval/:id',
      redirect: (to) => `/section-head/review/${to.params.id}`,
    },
    {
      path: '/section-head/:id',
      redirect: (to) => `/section-head/review/${to.params.id}`,
    },
  ],
})

export default router
