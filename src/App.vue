<script setup>
import { RouterView, useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import { onMounted } from 'vue'
import { accessDeniedState, hideAccessDenied } from '@/stores/accessDenied'

const router = useRouter()

const dismissAccessDenied = () => {
  hideAccessDenied()
}

onMounted(() => {
  // Listen for auth state changes - Supabase will automatically process hash params
  supabase.auth.onAuthStateChange(async (event) => {
    // If user clicked password recovery link, redirect to reset password page
    if (event === 'PASSWORD_RECOVERY') {
      // Small delay to ensure session is fully established
      await new Promise((resolve) => setTimeout(resolve, 100))
      router.push('/auth/reset-password')
    }
  })
})
</script>
<template>
  <RouterView />

  <!-- Global Access Denied Dialog - shows on current page without navigating -->
  <v-dialog v-model="accessDeniedState.show" max-width="440" persistent>
    <v-card class="access-denied-card">
      <div class="access-denied-header">
        <v-icon size="22" color="#ffffff" class="mr-2">mdi-shield-lock-outline</v-icon>
        <span>Access Restricted</span>
      </div>

      <div class="access-denied-body">
        <div class="access-denied-icon-area">
          <div class="access-denied-icon-circle">
            <v-icon size="36" color="#353535">mdi-lock-outline</v-icon>
          </div>
        </div>

        <p class="access-denied-message">
          You don't have permission to access this section. It is reserved for authorized personnel
          only.
        </p>

        <div class="access-denied-details">
          <div class="access-denied-detail-row">
            <span class="detail-label">Your Role</span>
            <span class="detail-value">{{ accessDeniedState.userRole }}</span>
          </div>
          <div class="access-denied-detail-divider"></div>
          <div class="access-denied-detail-row">
            <span class="detail-label">Required Role</span>
            <span class="detail-value detail-required">{{ accessDeniedState.requiredRole }}</span>
          </div>
        </div>

        <p class="access-denied-hint">
          Contact the system administrator if you believe this is an error.
        </p>
      </div>

      <div class="access-denied-footer">
        <v-btn variant="flat" class="access-denied-ok-btn" @click="dismissAccessDenied">
          Understood
        </v-btn>
      </div>
    </v-card>
  </v-dialog>
</template>

<style>
html,
body,
#app {
  height: 100%;
}
body {
  margin: 0;
  font-size: 15px;
  color: #353535;
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Ubuntu,
    Cantarell,
    Noto Sans,
    Helvetica Neue,
    Arial,
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji';
}

/* Global Access Denied Dialog */
.access-denied-card {
  border: 2px solid #353535;
  border-radius: 8px !important;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
}

.access-denied-header {
  background: #353535;
  color: #ffffff;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  letter-spacing: 0.3px;
}

.access-denied-body {
  padding: 28px 24px 20px;
  background: #ffffff;
}

.access-denied-icon-area {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.access-denied-icon-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f5f5f5;
  border: 2px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.access-denied-message {
  text-align: center;
  color: #374151;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 24px 0;
}

.access-denied-details {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-left: 4px solid #353535;
  border-radius: 6px;
  padding: 0;
  margin-bottom: 20px;
  overflow: hidden;
}

.access-denied-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.access-denied-detail-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 0 16px;
}

.detail-label {
  color: #6b7280;
  font-size: 13px;
  font-weight: 500;
}

.detail-value {
  color: #1f2937;
  font-size: 13px;
  font-weight: 600;
}

.detail-required {
  color: #353535;
  background: rgba(245, 197, 43, 0.15);
  border: 1px solid rgba(245, 197, 43, 0.4);
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
}

.access-denied-hint {
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
}

.access-denied-footer {
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  padding: 14px 24px;
  display: flex;
  justify-content: flex-end;
}

.access-denied-ok-btn {
  background: #353535 !important;
  color: #ffffff !important;
  font-weight: 600 !important;
  text-transform: none !important;
  border-radius: 6px !important;
  padding: 0 28px !important;
  height: 36px !important;
  font-size: 13px !important;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}

.access-denied-ok-btn:hover {
  background: #1f1f1f !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}
</style>
