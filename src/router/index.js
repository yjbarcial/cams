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
import SectionHeadView from '@/views/system/SectionHeadView.vue'
import EditorInChiefView from '@/views/system/EditorInChiefView.vue'
import ChiefAdviserView from '@/views/system/ChiefAdviserView.vue'

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
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      beforeEnter: requireAuth,
    },
    {
      path: '/archive',
      name: 'archive',
      component: ArchiveView,
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: NotificationsView,
    },
    {
      path: '/magazine',
      name: 'magazine',
      component: MagazineView,
    },
    {
      path: '/newsletter',
      name: 'newsletter',
      component: NewsletterView,
    },
    {
      path: '/folio',
      name: 'folio',
      component: FolioView,
    },
    {
      path: '/other',
      name: 'other',
      component: OtherView,
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminView,
      beforeEnter: requireAdmin,
    },
    {
      path: '/section-head',
      name: 'section-head',
      component: SectionHeadView,
    },
    {
      path: '/section-head/:id',
      name: 'section-head-detail',
      component: SectionHeadView,
      props: true,
    },
    {
      path: '/editor-in-chief',
      name: 'editor-in-chief',
      component: EditorInChiefView,
    },
    {
      path: '/editor-in-chief/:id',
      name: 'editor-in-chief-detail',
      component: EditorInChiefView,
      props: true,
    },
    {
      path: '/chief-adviser',
      name: 'chief-adviser',
      component: ChiefAdviserView,
    },
    {
      path: '/chief-adviser/:id',
      name: 'chief-adviser-detail',
      component: ChiefAdviserView,
      props: true,
    },
    // Legacy routes for backwards compatibility
    {
      path: '/approval',
      redirect: '/section-head',
    },
    {
      path: '/approval/:id',
      redirect: (to) => `/section-head/${to.params.id}`,
    },
    { path: '/magazine/new', name: 'magazine-new', component: AddProjectView },
    { path: '/newsletter/new', name: 'newsletter-new', component: AddProjectView },
    { path: '/folio/new', name: 'folio-new', component: AddProjectView },
    { path: '/other/new', name: 'other-new', component: AddProjectView },
    { path: '/deliverables/:id', name: 'deliverable', component: DeliverableView, props: true },
    { path: '/project/:id', name: 'project', component: ProjectView, props: true },
  ],
})

export default router
