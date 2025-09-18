import { createRouter, createWebHistory } from 'vue-router'
import ArchiveView from '@/views/system/ArchiveView.vue'
import LoginView from '@/views/auth/LoginView.vue'
import ContributorDashboard from '@/views/system/ContributorDashboard.vue'
import NotificationsView from '@/views/system/NotificationsView.vue'
import AddProjectView from '@/views/system/AddProjectView.vue'
import MagazineView from '@/views/system/MagazineView.vue'
import NewsletterView from '@/views/system/NewsletterView.vue'
import FolioView from '@/views/system/FolioView.vue'
import OtherView from '@/views/system/OtherView.vue'
import DeliverableView from '@/views/system/DeliverableView.vue'

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
      component: ContributorDashboard,
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
    { path: '/magazine/new', name: 'magazine-new', component: AddProjectView },
    { path: '/newsletter/new', name: 'newsletter-new', component: AddProjectView },
    { path: '/folio/new', name: 'folio-new', component: AddProjectView },
    { path: '/other/new', name: 'other-new', component: AddProjectView },
    { path: '/deliverables/:id', name: 'deliverable', component: DeliverableView, props: true },
  ],
})

export default router
