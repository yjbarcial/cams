import { createRouter, createWebHistory } from 'vue-router'
import ArchiveView from '@/views/ArchiveView.vue'
import LoginView from '@/views/LoginView.vue'
import ContributorDashboard from '@/views/ContributorDashboard.vue'
import NotificationsView from '@/views/NotificationsView.vue'

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
  ],
})

export default router
