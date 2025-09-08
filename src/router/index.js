import { createRouter, createWebHistory } from 'vue-router'
import ArchiveView from '@/views/ArchiveView.vue'
import LoginView from '@/views/LoginView.vue'
import ContributorDashboard from '@/views/ContributorDashboard.vue'
import NotificationsView from '@/views/NotificationsView.vue'
import AddProjectView from '@/views/AddProjectView.vue'
import MagazineView from '@/views/MagazineView.vue'
import NewsletterView from '@/views/NewsletterView.vue'
import FolioView from '@/views/FolioView.vue'
import OtherView from '@/views/OtherView.vue'

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
  ],
})

export default router
