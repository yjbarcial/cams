<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import libBg from '/images/lib-hd.jpg'

const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isValidToken = ref(false)

onMounted(async () => {
  try {
    console.log('=== ResetPasswordView mounted ===')
    console.log('URL:', window.location.href)
    console.log('Hash:', window.location.hash)

    // First, check if there are recovery tokens in the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')

    console.log('Hash params:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      type: type,
    })

    // If we have recovery tokens in the URL, use them to establish the session
    if (type === 'recovery' && accessToken) {
      console.log('Found recovery tokens in URL, establishing session...')

      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || '',
      })

      if (error) {
        console.error('❌ Failed to set session:', error)
        errorMessage.value = `Session error: ${error.message}`
        return
      }

      if (data.session) {
        console.log('✅ Session established successfully!')
        console.log('User:', data.session.user.email)
        isValidToken.value = true

        // Clean up the URL hash for security
        window.history.replaceState({}, document.title, window.location.pathname)
        return
      } else {
        console.error('❌ setSession succeeded but no session returned')
        errorMessage.value = 'Failed to establish session. Please try again.'
        return
      }
    }

    // Fallback: Check if there's already an existing session
    console.log('No tokens in URL, checking for existing session...')
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      console.error('❌ Session error:', error)
      errorMessage.value = 'Session error. Please request a new reset link.'
      return
    }

    if (session) {
      console.log('✅ Found existing session for:', session.user.email)
      isValidToken.value = true
    } else {
      console.log('❌ No valid session found')
      errorMessage.value = 'Invalid or expired reset link. Please request a new one.'
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    errorMessage.value = `Error: ${err.message}`
  }
})

async function resetPassword() {
  errorMessage.value = ''
  successMessage.value = ''

  // Validate password
  if (!newPassword.value || newPassword.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters long.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    return
  }

  loading.value = true

  try {
    // Double-check we have a valid session before attempting update
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      errorMessage.value = 'Session expired. Please request a new password reset link.'
      loading.value = false
      return
    }

    console.log('Updating password for user:', session.user.id)

    const { error } = await supabase.auth.updateUser({
      password: newPassword.value,
    })

    if (error) throw error

    successMessage.value = 'Password updated successfully! Redirecting to login...'

    // Sign out the user so they have to login with new password
    await supabase.auth.signOut()
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userEmail')

    // Redirect to login after 2 seconds
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (error) {
    errorMessage.value = error.message || 'Failed to reset password.'
    console.error('❌ Password reset error:', error)
  } finally {
    loading.value = false
  }
}

const loginBgStyle = { '--login-bg-url': `url('${libBg}')` }
</script>

<template>
  <v-container fluid class="login-page" :style="loginBgStyle">
    <v-sheet class="backdrop"></v-sheet>
    <v-btn
      to="/login"
      class="top-back-link"
      variant="outlined"
      color="white"
      prepend-icon="mdi-arrow-left"
      size="small"
    >
      Back to Login
    </v-btn>
    <v-row justify="center" class="content">
      <v-col cols="12" sm="8" md="6" lg="4" xl="3">
        <v-img
          src="/images/GoldQuill Logo.png"
          alt="GoldQuill"
          class="logo"
          width="140"
          height="140"
          contain
        />
        <v-card class="card" flat>
          <v-card-title class="headline pa-0 font-weight-bold"> Reset Password </v-card-title>
          <v-card-subtitle class="subtext pa-0"> Enter your new password </v-card-subtitle>

          <v-card-text class="pa-0">
            <!-- Success Alert -->
            <v-alert
              v-if="successMessage"
              type="success"
              class="mb-3"
              density="compact"
              variant="tonal"
            >
              {{ successMessage }}
            </v-alert>

            <!-- Error Alert -->
            <v-alert
              v-if="errorMessage"
              type="error"
              class="mb-3"
              density="compact"
              variant="tonal"
            >
              {{ errorMessage }}
            </v-alert>

            <v-form
              v-if="isValidToken && !successMessage"
              @submit.prevent="resetPassword"
              class="form"
            >
              <v-text-field
                v-model="newPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="New password (min 8 characters)"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                class="input-group"
                density="compact"
                :disabled="loading"
                required
              />

              <v-text-field
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm new password"
                prepend-inner-icon="mdi-lock-check-outline"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
                variant="outlined"
                class="input-group"
                density="compact"
                :disabled="loading"
                required
              />

              <v-btn type="submit" class="primary-btn" :loading="loading" :disabled="loading">
                RESET PASSWORD
              </v-btn>
            </v-form>

            <div v-if="!isValidToken" class="text-center mt-4">
              <v-btn variant="outlined" color="primary" to="/login"> Go to Login </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-footer class="footer-note">
      <v-spacer></v-spacer>
      <div>© 2025 <span class="brand">GoldQuill</span>. All rights reserved.</div>
      <v-spacer></v-spacer>
    </v-footer>
  </v-container>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  background: #1f1f1f;
}

.backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.backdrop::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgb(10, 9, 6);
  pointer-events: none;
}

.backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--login-bg-url);
  background-size: 100% auto;
  background-position: center;
  background-repeat: no-repeat;
  filter: grayscale(100%);
  opacity: 0.15;
  pointer-events: none;
}

.content {
  position: relative;
  z-index: 1;
  padding: 48px 12px 28px;
}

.logo {
  margin: 0 auto 18px !important;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
  transform: translateY(-10px);
  display: block !important;
}

.card {
  width: 100%;
  background: #fff !important;
  border-radius: 10px !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18) !important;
  padding: 22px 20px 18px !important;
  margin-top: 12px;
  border-bottom: 5px solid #f5c52b !important;
}

.headline {
  margin: 0 0 4px 0;
  text-align: center;
}

.subtext {
  margin: 0 0 8px 0;
  text-align: center;
  color: #6b6b6b;
}

.form {
  display: grid;
}

.input-group :deep(.v-field) {
  border-radius: 999px !important;
  border: 1px solid #d9d9d9 !important;
  background: #fff !important;
  min-height: 48px !important;
}

.input-group :deep(.v-field__input) {
  padding: 12px 16px !important;
  font-size: 14px !important;
}

.input-group :deep(.v-field__prepend-inner) {
  padding: 0 8px 0 8px !important;
  color: #7a7a7a !important;
}

.input-group :deep(.v-field__append-inner) {
  padding: 0 16px 0 8px !important;
  color: #555 !important;
}

.primary-btn {
  width: 100%;
  height: 48px !important;
  background: #353535 !important;
  color: #fff !important;
  border-radius: 999px !important;
  font-weight: 600;
}

.primary-btn:disabled {
  opacity: 0.6 !important;
}

.footer-note {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: transparent !important;
  color: #e6e6e6;
  text-align: center;
  padding: 24px 12px;
}

.brand {
  color: #f5c52b;
}

.top-back-link {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  background: rgba(20, 20, 20, 0.575) !important;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.11) !important;
  font-size: 13px;
  font-weight: 500;
  border-radius: 999px !important;
  padding: 4px 12px !important;
  text-transform: none !important;
}

@media (max-width: 480px) {
  .logo {
    width: 110px;
    height: 110px;
  }
  .card {
    padding: 18px 16px 16px;
  }
}
</style>
