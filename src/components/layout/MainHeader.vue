<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const showAccountMenu = ref(false)

const handleSettings = () => {
  console.log('Settings clicked')
  showAccountMenu.value = false
  router.push('/settings') // Add this line to navigate to settings
}

const handleLogout = () => {
  console.log('Logout clicked')
  // Clear any stored authentication data
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  sessionStorage.clear()

  // Navigate to login page
  router.push('/login')
  showAccountMenu.value = false
}
</script>

<template>
  <header class="main-header">
    <div class="brand">
      <v-img src="/images/GoldQuill Logo.png" alt="GoldQuill" height="30px" width="30%" contain />
      <h3>GoldQuill.</h3>
    </div>
    <nav class="actions" aria-label="Primary">
      <RouterLink to="/dashboard" class="icon-button" aria-label="Dashboard" title="Dashboard">
        <span class="mdi mdi-view-dashboard" aria-hidden="true"></span>
      </RouterLink>
      <RouterLink
        to="/notifications"
        class="icon-button"
        aria-label="Notifications"
        title="Notifications"
      >
        <span class="mdi mdi-bell" aria-hidden="true"></span>
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
              <div class="dropdown-icon" @click="handleSettings">
                <v-icon>mdi-cog</v-icon>
              </div>
              <div class="dropdown-icon" @click="handleLogout">
                <v-icon>mdi-logout</v-icon>
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
}

.brand img {
  height: 20px;
  display: block;
}

.brand h4 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
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
  color: #2b2b2b;
  cursor: pointer;
  text-decoration: none;
}

.icon-button:hover {
  background: rgba(0, 0, 0, 0.06);
}

.icon-button .mdi {
  font-size: 24px;
  line-height: 1;
}

/* Dropdown styles - fixed position and centered icons */
.account-dropdown-pill {
  min-width: 60px !important;
  max-width: 60px !important;
  height: 120px !important;
  border-radius: 30px !important;
  background: #ffffff !important;
  border: 2px solid #969595 !important;
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
}

.dropdown-icon:hover {
  background: rgba(0, 0, 0, 0.1);
}
</style>
