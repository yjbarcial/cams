<script setup>
import { ref } from 'vue'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

// Settings state
const pushNotifications = ref(true)
const emailNotifications = ref(true)

// App info
const appVersion = '1.0.0'
const appCopyright = '© 2025 GoldQuill'
</script>

<template>
  <v-app class="settings-page">
    <MainHeader />

    <v-main class="main-content">
      <v-container fluid class="settings-container pa-5">
        <v-row>
          <v-col cols="12">
            <h1 class="page-title">Settings</h1>
          </v-col>
        </v-row>

        <!-- Notifications Section -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-card class="settings-card" elevation="0">
              <v-card-text class="pa-6">
                <h2 class="section-title mb-4">Notifications</h2>

                <v-row class="setting-item" align="center">
                  <v-col cols="auto" class="setting-icon">
                    <v-icon size="24" color="#6b7280">mdi-bell</v-icon>
                  </v-col>
                  <v-col class="setting-label">
                    <span>Push Notifications</span>
                  </v-col>
                  <v-col cols="auto" class="setting-control">
                    <v-switch
                      v-model="pushNotifications"
                      color="amber-accent-3
"
                      hide-details
                      density="compact"
                      inset
                    />
                  </v-col>
                </v-row>

                <v-row class="setting-item" align="center">
                  <v-col cols="auto" class="setting-icon">
                    <v-icon size="24" color="#6b7280">mdi-email</v-icon>
                  </v-col>
                  <v-col class="setting-label">
                    <span>Email Notifications</span>
                  </v-col>
                  <v-col cols="auto" class="setting-control">
                    <v-switch
                      v-model="emailNotifications"
                      color="amber-accent-3"
                      hide-details
                      density="compact"
                      inset
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- About Section -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-card class="settings-card" elevation="0">
              <v-card-text class="pa-6">
                <h2 class="section-title mb-4">About</h2>

                <v-row class="setting-item" align="center">
                  <v-col cols="auto" class="setting-icon">
                    <v-icon size="24" color="#6b7280">mdi-information</v-icon>
                  </v-col>
                  <v-col class="setting-label">
                    <div class="setting-content">
                      <div class="setting-main">Version</div>
                      <div class="setting-secondary">{{ appVersion }}</div>
                    </div>
                  </v-col>
                  <v-col cols="auto" class="setting-control">
                    <!-- Empty space for alignment -->
                  </v-col>
                </v-row>

                <v-row class="setting-item" align="center">
                  <v-col cols="auto" class="setting-icon">
                    <v-icon size="24" color="#6b7280">mdi-copyright</v-icon>
                  </v-col>
                  <v-col class="setting-label">
                    <div class="setting-content">
                      <div class="setting-main">Copyright</div>
                      <div class="setting-secondary">{{ appCopyright }}</div>
                    </div>
                  </v-col>
                  <v-col cols="auto" class="setting-control">
                    <!-- Empty space for alignment -->
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>

    <Footer />
  </v-app>
</template>

<style scoped>
.settings-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
}

.main-content {
  flex: 1;
  padding: 0 !important;
}

.settings-container {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.settings-card {
  background-color: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.setting-item {
  padding: 16px 0;
  border-bottom: 1px solid #f3f4f6;
  margin: 0 !important;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-icon {
  flex: 0 0 auto;
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.setting-label {
  flex: 1;
  display: flex;
  align-items: center;
  font-size: 16px;
  color: #374151;
  font-weight: 500;
}

.setting-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-main {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
}

.setting-secondary {
  font-size: 14px;
  color: #6b7280;
}

.setting-control {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
}

/* Override Vuetify switch colors */
:deep(.v-switch .v-selection-control__wrapper) {
  height: 24px;
}

:deep(.v-switch .v-selection-control__input) {
  width: 44px;
  height: 24px;
}

:deep(.v-switch--inset .v-selection-control__wrapper) {
  width: 44px;
  height: 24px;
}

:deep(.v-switch .v-switch__thumb) {
  width: 20px;
  height: 20px;
}

:deep(.v-switch--inset .v-switch__thumb) {
  width: 18px;
  height: 18px;
}

/* Custom switch colors */
:deep(
  .v-switch:not(.v-switch--loading):not(.v-input--disabled)
    .v-selection-control__input:hover
    .v-switch__track
) {
  opacity: 0.8;
}

:deep(.v-switch.v-input--disabled .v-selection-control__wrapper) {
  opacity: 0.4;
}

/* Responsive design */
@media (max-width: 768px) {
  .settings-container {
    padding: 16px !important;
  }

  .page-title {
    font-size: 24px;
  }

  .setting-item {
    padding: 12px 0;
  }

  .setting-icon {
    width: 40px;
  }

  .setting-label {
    font-size: 15px;
  }

  .setting-main {
    font-size: 15px;
  }

  .setting-secondary {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .settings-container {
    padding: 12px !important;
  }

  .page-title {
    font-size: 22px;
  }

  .section-title {
    font-size: 16px;
  }

  .setting-item {
    padding: 10px 0;
  }

  .setting-label {
    font-size: 14px;
  }

  .setting-main {
    font-size: 14px;
  }

  .setting-secondary {
    font-size: 12px;
  }
}
</style>
