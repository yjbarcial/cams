import { createRouter, createWebHistory } from 'vue-router'
import ArchiveView from '@/views/ArchiveView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: ArchiveView,
    },
  ],
})

export default router
