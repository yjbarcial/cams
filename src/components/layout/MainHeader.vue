<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getUnreadCount } from '@/services/notificationsService.js'
import { supabase } from '@/utils/supabase'

const router = useRouter()
const showAccountMenu = ref(false)
const logoutLoading = ref(false)
const unreadCount = ref(0)

// Update unread count
const updateUnreadCount = async () => {
  unreadCount.value = await getUnreadCount()
}

// Check for notifications periodically and on storage changes
let notificationCheckInterval = null

// Custom event listener for same-window notification updates
const handleNotificationUpdate = () => {
  updateUnreadCount()
}

onMounted(() => {
  updateUnreadCount()

  // Check for new notifications every 30 seconds (reduced from 2s to avoid spam)
  notificationCheckInterval = setInterval(() => {
    updateUnreadCount()
  }, 30000)

  // Listen for storage changes (when notifications are added/updated in other tabs)
  window.addEventListener('storage', handleStorageChange)

  // Listen for custom notification update events (same window)
  window.addEventListener('notificationUpdated', handleNotificationUpdate)
})

onUnmounted(() => {
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval)
  }
  window.removeEventListener('storage', handleStorageChange)
  window.removeEventListener('notificationUpdated', handleNotificationUpdate)
})

const handleStorageChange = (e) => {
  if (e.key === 'notifications') {
    updateUnreadCount()
  }
}

// SYSTEM ADMINS ONLY - Access to admin panel and system settings
// These are NOT content admins (EIC, Technical Editor, etc.)
const adminEmails = [
  'yssahjulianah.barcial@carsu.edu.ph',
  'lovellhudson.clavel@carsu.edu.ph',
  'altheaguila.gorres@carsu.edu.ph',
]

// Check if current user is a System Admin
const isAdmin = computed(() => {
  const userEmail = localStorage.getItem('userEmail')
  return userEmail && adminEmails.includes(userEmail)
})

const handleProfile = () => {
  console.log('Profile clicked')
  showAccountMenu.value = false
  router.push('/profile')
}

const handleSettings = () => {
  console.log('Settings clicked')
  showAccountMenu.value = false
  router.push('/settings')
}

const handleLogout = async () => {
  logoutLoading.value = true

  try {
    console.log('Logout clicked')

    // Sign out from Supabase
    await supabase.auth.signOut()

    // Clear any stored authentication data
    localStorage.removeItem('userEmail')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userId')
    localStorage.removeItem('accessRole')
    localStorage.removeItem('user_settings')
    sessionStorage.clear()

    // Navigate to login page with logout flag
    router.push('/login?logout=true')
    showAccountMenu.value = false
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    logoutLoading.value = false
  }
}

const goToDashboard = () => {
  router.push('/dashboard')
}
</script>

<template>
  <header class="main-header">
    <div class="brand" @click="goToDashboard">
      <v-img src="/images/GoldQuill Logo.png" alt="GoldQuill" height="30px" width="30%" contain />
      <h3>GoldQuill.</h3>
    </div>
    <nav class="actions" aria-label="Primary">
      <RouterLink to="/dashboard" class="icon-button" aria-label="Dashboard" title="Dashboard">
        <span class="mdi mdi-view-dashboard" aria-hidden="true"></span>
      </RouterLink>
      <RouterLink
        to="/notifications"
        class="icon-button notification-button"
        aria-label="Notifications"
        title="Notifications"
      >
        <span class="mdi mdi-bell" aria-hidden="true"></span>
        <span
          v-if="unreadCount > 0"
          class="notification-dot"
          :class="{ pulse: unreadCount > 0 }"
          aria-label="Unread notifications"
        ></span>
      </RouterLink>

      <!-- System Admin icon - only visible for system admins -->
      <RouterLink
        v-if="isAdmin"
        to="/admin"
        class="icon-button"
        aria-label="System Admin Panel"
        title="System Admin Panel"
      >
        <span class="mdi mdi-shield-outline" aria-hidden="true"></span>
      </RouterLink>

      <!-- Account dropdown menu -->
      <div class="account-menu-wrapper">
        <v-menu
          v-model="showAccountMenu"
          :close-on-content-click="false"
          location="bottom center"
          offset="8"
          origin="top center"
          :attach="true"
        >
          <template v-slot:activator="{ props }">
            <button v-bind="props" class="icon-button" aria-label="Account" title="Account">
              <span class="mdi mdi-account-circle" aria-hidden="true"></span>
            </button>
          </template>

          <v-card class="account-dropdown-pill" elevation="8">
            <div class="icon-container">
              <div class="dropdown-icon" @click="handleProfile">
                <v-icon>mdi-account</v-icon>
              </div>
              <div class="dropdown-icon" @click="handleSettings">
                <v-icon>mdi-cog</v-icon>
              </div>
              <div
                class="dropdown-icon logout-icon"
                @click="handleLogout"
                :class="{ loading: logoutLoading }"
              >
                <v-progress-circular
                  v-if="logoutLoading"
                  :size="20"
                  :width="2"
                  color="#353535"
                  indeterminate
                />
                <v-icon v-else>mdi-logout</v-icon>
              </div>
            </div>
          </v-card>
        </v-menu>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.main-header {
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 2px solid #353535;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.brand:hover {
  opacity: 0.8;
}

.brand img {
  height: 20px;
  display: block;
}

.brand h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  color: #353535;
}

.actions {
  display: inline-flex;
  align-items: center;
  gap: 15px;
  padding: 0 10px;
}

.account-menu-wrapper {
  position: relative;
}

.icon-button {
  appearance: none;
  background: transparent;
  border: none;
  padding: 6px;
  border-radius: 6px;
  color: #353535;
  cursor: pointer;
  text-decoration: none;
}

.icon-button:hover {
  background: rgba(0, 0, 0, 0.06);
  color: #353535;
}

.icon-button {
  position: relative;
}

.icon-button .mdi {
  font-size: 24px;
  line-height: 1;
}

.notification-button {
  position: relative;
}

.notification-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 10px;
  height: 10px;
  background-color: #ef4444;
  border-radius: 50%;
  border: 2px solid white;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.3s ease;
  animation: dotAppear 0.3s ease;
  /* Ensure no text content can appear */
  display: block;
  text-indent: -9999px;
  overflow: hidden;
  font-size: 0 !important;
  line-height: 0 !important;
  color: transparent !important;
  text-align: center;
  white-space: nowrap;
}

/* Prevent any pseudo-elements from showing content */
.notification-dot::before,
.notification-dot::after {
  display: none !important;
  content: '' !important;
  width: 0 !important;
  height: 0 !important;
  font-size: 0 !important;
  line-height: 0 !important;
}

/* Prevent any child elements from showing */
.notification-dot * {
  display: none !important;
  font-size: 0 !important;
  line-height: 0 !important;
}

.notification-dot.pulse {
  opacity: 1;
  animation: dotPulse 1.5s ease-in-out infinite;
}

@keyframes dotAppear {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.3);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes dotPulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.9;
  }
}

/* Dropdown styles - fixed position and centered icons */
.account-dropdown-pill {
  min-width: 60px !important;
  max-width: 60px !important;
  height: 140px !important;
  border-radius: 30px !important;
  background: #ffffff !important;
  border: 2px solid #353535 !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
  margin-top: 10px;
  transform: translateX(-48%) !important;
  left: 50% !important;
  position: relative !important;
}

.icon-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.dropdown-icon {
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  transition: background 0.2s ease;
  color: #353535;
}

.dropdown-icon:hover {
  background: rgba(0, 0, 0, 0.1);
}

.logout-icon.loading {
  cursor: not-allowed;
  opacity: 0.7;
}

.logout-icon.loading:hover {
  background: transparent;
}
</style>
