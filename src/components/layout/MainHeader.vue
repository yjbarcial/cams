<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const showAccountMenu = ref(false)

const handleSettings = () => {
  console.log('Settings clicked')
  showAccountMenu.value = false
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
      <v-img src="/images/GoldQuill Logo.png" alt="GoldQuill" height="40px" width="50%" contain />
      <h4>GoldQuill.</h4>
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
          location="bottom end"
          offset="8"
        >
          <template v-slot:activator="{ props }">
            <button v-bind="props" class="icon-button" aria-label="Account" title="Account">
              <span class="mdi mdi-account-circle" aria-hidden="true"></span>
            </button>
          </template>

          <v-card class="account-dropdown-pill" elevation="8">
            <v-list density="compact" class="dropdown-list">
              <v-list-item @click="handleSettings" class="dropdown-item" prepend-icon="mdi-cog">
              </v-list-item>

              <v-list-item @click="handleLogout" class="dropdown-item" prepend-icon="mdi-logout">
              </v-list-item>
            </v-list>
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

.brand h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.actions {
  display: inline-flex;
  align-items: center;
  gap: 15px;
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

/* Dropdown styles */
.account-dropdown-pill {
  min-width: 60px !important;
  max-width: 60px !important;
  height: 140px !important;
  border-radius: 30px !important;
  background: #ffffff !important;
  border: 2px solid #d3d3d3 !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
  margin-top: 8px;
}

.dropdown-list {
  background: transparent !important;
  padding: 15px 0 !important;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

:deep(.dropdown-item) {
  min-height: 50px !important;
  max-height: 50px !important;
  width: 50px !important;
  margin: 0 auto !important;
  padding: 0 !important;
  border-radius: 50% !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  transition: all 0.2s ease !important;
  cursor: pointer !important;
}

:deep(.dropdown-item:hover) {
  background-color: #f0f0f0 !important;
  transform: scale(0.9);
}

:deep(.dropdown-item .v-list-item__prepend) {
  width: 100% !important;
  margin: 0 !important;
  padding: 20px !important;
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

:deep(.dropdown-item .v-list-item__prepend .v-icon) {
  color: #2b2b2b !important;
  font-size: 20px !important;
}

:deep(.dropdown-item .v-list-item__content) {
  display: none !important;
}
</style>
