<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  requiredValidator,
  emailValidator,
  passwordValidator,
  confirmedValidator,
  betweenValidator,
  integerValidator,
  regexValidator,
  alphaValidator,
  urlValidator,
  lengthValidator,
  alphaDashValidator,
  imageValidator,
  isEmpty,
  isNullOrUndefined,
  isEmptyArray,
  isObject,
} from '@/utils/validators'
import { supabase } from '@/utils/supabase'
import { addUserToProfiles } from '@/utils/autoAddUser'
import libBg from '/images/lib-hd.jpg'

const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(true) // Start with true to prevent form interaction
const errorMessage = ref('')
const showDomainPopup = ref(false)
const redirecting = ref(false)
const isFirstTimeUser = ref(false)
const magicLinkSent = ref(false)
const checkingUser = ref(false)

// AUTHORIZED USERS ONLY - Complete whitelist
const AUTHORIZED_USERS = [
  // Admins
  'yssahjulianah.barcial@carsu.edu.ph',
  'lovellhudson.clavel@carsu.edu.ph',
  'altheaguila.gorres@carsu.edu.ph',
  // Artists & Writers
  'lexzyrrehdevonnaire.abellanosa@carsu.edu.ph',
  'teejay.abello@carsu.edu.ph',
  'nissi.abes@carsu.edu.ph',
  'belleblanchekyle.abiol@carsu.edu.ph',
  'jessahmei.allard@carsu.edu.ph',
]

// Check if email is authorized
function isAuthorizedUser(emailToCheck) {
  return AUTHORIZED_USERS.includes(emailToCheck.toLowerCase().trim())
}

// CARSU email validator with authorization check
const carsuEmailValidator = (value) => {
  const requiredValidation = requiredValidator(value)
  if (requiredValidation !== true) return requiredValidation

  const emailValidation = emailValidator(value)
  if (emailValidation !== true) return emailValidation

  if (!value.endsWith('@carsu.edu.ph')) {
    return 'Must be a CARSU email address'
  }

  if (!isAuthorizedUser(value)) {
    return 'This email is not authorized to access the system'
  }

  return true
}

// Password validator using your existing required validator
const carsuPasswordValidator = (value) => {
  const requiredValidation = requiredValidator(value)
  if (requiredValidation !== true) return requiredValidation

  if (value.length < 6) {
    return 'Password must be at least 6 characters'
  }

  return true
}

// Validation rules using your validator functions
const emailRules = [carsuEmailValidator]
const passwordRules = [carsuPasswordValidator]

const form = ref(null)

// Handle back button navigation prevention
const handlePopState = (event) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn')
  if (!isLoggedIn || isLoggedIn === 'false') {
    // Preserve history state when manipulating
    window.history.pushState(history.state, '', window.location.href)
  }
}

// Prevent navigation to dashboard when not logged in
const preventUnauthorizedNavigation = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn')
  if (!isLoggedIn || isLoggedIn === 'false') {
    // Preserve history state when manipulating
    window.history.replaceState(history.state, '', window.location.href)
  }
}

onMounted(async () => {
  // Check for active session FIRST
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    // Verify user is authorized
    if (!isAuthorizedUser(session.user.email)) {
      await supabase.auth.signOut()
      localStorage.setItem('isLoggedIn', 'false')
      errorMessage.value = 'Your account is not authorized to access this system.'
      loading.value = false
      return
    }

    // Already logged in - redirect immediately
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('userEmail', session.user.email)
    // Don't await - let it run in background, redirect now
    addUserToProfiles(session.user)
    router.replace('/dashboard')
    return
  }

  // No session - enable the form
  loading.value = false

  // Handle auth callback from magic link (legacy support)
  const hashParams = new URLSearchParams(window.location.hash.substring(1))
  const accessToken = hashParams.get('access_token')

  if (accessToken) {
    const {
      data: { session: newSession },
    } = await supabase.auth.getSession()
    if (newSession) {
      // Verify user is authorized
      if (!isAuthorizedUser(newSession.user.email)) {
        await supabase.auth.signOut()
        localStorage.setItem('isLoggedIn', 'false')
        errorMessage.value = 'Your account is not authorized to access this system.'
        loading.value = false
        return
      }

      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userEmail', newSession.user.email)
      addUserToProfiles(newSession.user) // Don't await
      router.replace('/dashboard')
      return
    }
  }

  const urlParams = new URLSearchParams(window.location.search)
  const fromLogout = urlParams.get('logout')

  if (fromLogout === 'true') {
    window.history.replaceState(history.state, '', window.location.pathname)
    localStorage.setItem('isLoggedIn', 'false')
    await supabase.auth.signOut()
  }

  preventUnauthorizedNavigation()
  window.addEventListener('popstate', handlePopState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
})

const needsPasswordSetup = ref(false)

// Debounce timer for login attempts to prevent rate limiting
const loginAttemptTimestamps = ref({})
const RATE_LIMIT_DELAY = 1000 // 1 second between attempts per email

// Check if user is rate-limited locally
function isLocallyRateLimited(emailToCheck) {
  const lastAttempt = loginAttemptTimestamps.value[emailToCheck] || 0
  const now = Date.now()

  if (now - lastAttempt < RATE_LIMIT_DELAY) {
    return true
  }

  loginAttemptTimestamps.value[emailToCheck] = now
  return false
}

// Send magic link for first-time users
async function sendMagicLink() {
  loading.value = true
  errorMessage.value = ''

  // Double-check authorization before sending magic link
  if (!isAuthorizedUser(email.value)) {
    errorMessage.value = 'This email is not authorized to access the system.'
    loading.value = false
    return
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.value,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) throw error

    magicLinkSent.value = true
  } catch (error) {
    if (error.message?.includes('rate limit')) {
      errorMessage.value = 'Too many requests. Please wait a few minutes.'
    } else {
      errorMessage.value = error.message || 'Failed to send magic link.'
    }
    if (import.meta.env.DEV) {
      console.error('❌ Magic link error:', error)
    }
  } finally {
    loading.value = false
  }
}

async function submit() {
  showDomainPopup.value = false
  magicLinkSent.value = false

  const { valid } = await form.value.validate()
  if (!valid) return

  // Check if email is CARSU domain
  if (!email.value.endsWith('@carsu.edu.ph')) {
    showDomainPopup.value = true
    errorMessage.value = 'Only CARSU email addresses (@carsu.edu.ph) are allowed.'
    return
  }

  // Check if user is authorized BEFORE doing anything else
  if (!isAuthorizedUser(email.value)) {
    errorMessage.value =
      'This email is not authorized to access the system. Please contact an administrator.'
    // Reset the needsPasswordSetup flag to prevent button from showing
    needsPasswordSetup.value = false
    isFirstTimeUser.value = false
    return
  }

  // Check local rate limiting
  if (isLocallyRateLimited(email.value)) {
    errorMessage.value = 'Please wait a moment before trying again.'
    return
  }

  loading.value = true
  checkingUser.value = true
  errorMessage.value = ''

  try {
    // First attempt: Try password login (works for existing users with passwords)
    console.log('🔐 Attempting password-based login...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    // If password login succeeds, we're done
    if (loginData?.session) {
      console.log('✅ Password login successful')
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userEmail', loginData.session.user.email)
      addUserToProfiles(loginData.session.user) // Don't await
      router.replace('/dashboard')
      return
    }

    // Handle specific login errors
    if (loginError) {
      if (loginError.message?.includes('Invalid login credentials')) {
        // ONLY show password setup for AUTHORIZED users
        if (isAuthorizedUser(email.value)) {
          console.log('📧 No password found, offering magic link option...')
          needsPasswordSetup.value = true
          errorMessage.value = 'Use magic link to sign in: click "Set Password" below.'
        } else {
          errorMessage.value = 'This email is not authorized to access the system.'
          needsPasswordSetup.value = false
        }
        return
      } else if (loginError.message?.includes('Email not confirmed')) {
        errorMessage.value = 'Please check your email and confirm your account first.'
        return
      } else if (loginError.message?.includes('rate limit')) {
        throw loginError
      } else {
        // For other errors, check authorization before trying magic link
        if (!isAuthorizedUser(email.value)) {
          errorMessage.value = 'This email is not authorized to access the system.'
          return
        }
        console.log('Password login failed, trying magic link...')
      }
    }

    // Fallback: Send magic link ONLY for authorized users
    if (isAuthorizedUser(email.value)) {
      console.log('📧 Sending magic link...')
      isFirstTimeUser.value = true
      await sendMagicLink()
    } else {
      errorMessage.value = 'This email is not authorized to access the system.'
    }
    return
  } catch (error) {
    // Handle rate limit error with user-friendly message
    if (error.message?.includes('rate limit')) {
      errorMessage.value = 'Too many login attempts. Please wait a few minutes and try again.'
    } else {
      errorMessage.value = error.message || 'Login failed. Please try again.'
    }
    // Only log in development
    if (import.meta.env.DEV) {
      console.error('❌ Login error:', error)
    }
  } finally {
    loading.value = false
    checkingUser.value = false
  }
}

async function sendPasswordResetEmail() {
  if (!email.value || !email.value.endsWith('@carsu.edu.ph')) {
    errorMessage.value = 'Please enter your CARSU email first.'
    return
  }

  if (!isAuthorizedUser(email.value)) {
    errorMessage.value = 'This email is not authorized to access the system.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error

    alert('✅ Password reset email sent! Check your inbox to set your password.')
    needsPasswordSetup.value = false
  } catch (error) {
    if (error.message?.includes('rate limit')) {
      errorMessage.value = 'Too many requests. Please wait a few minutes.'
    } else {
      errorMessage.value = error.message || 'Failed to send reset email.'
    }
  } finally {
    loading.value = false
  }
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

const loginBgStyle = { '--login-bg-url': `url('${libBg}')` }
</script>

<template>
  <v-container fluid class="login-page" :style="loginBgStyle">
    <v-sheet class="backdrop"></v-sheet>
    <v-btn
      to="/"
      class="top-back-link"
      variant="outlined"
      color="white"
      prepend-icon="mdi-arrow-left"
      size="small"
    >
      Back to Publications
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
          <v-card-title class="headline pa-0 font-weight-bold">
            {{ magicLinkSent ? 'Check Your Email!' : 'Welcome!' }}
          </v-card-title>
          <v-card-subtitle class="subtext pa-0">
            {{
              magicLinkSent
                ? 'We sent a magic link to your email'
                : 'Enter your CARSU email to continue'
            }}
          </v-card-subtitle>

          <v-card-text class="pa-0">
            <!-- Magic Link Sent Success -->
            <v-alert
              v-if="magicLinkSent"
              type="success"
              class="mb-3"
              density="compact"
              variant="tonal"
            >
              <div class="d-flex align-center">
                <v-icon start>mdi-email-check-outline</v-icon>
                <div>
                  <strong>Magic link sent!</strong><br />
                  <small
                    >Check your inbox at <strong>{{ email }}</strong> and click the link to sign
                    in.</small
                  >
                </div>
              </div>
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

            <v-form v-if="!magicLinkSent" ref="form" @submit.prevent="submit" class="form">
              <v-text-field
                v-model="email"
                type="email"
                placeholder="yourname@carsu.edu.ph"
                prepend-inner-icon="mdi-email-outline"
                variant="outlined"
                class="input-group"
                density="compact"
                :rules="emailRules"
                required
                :disabled="loading"
              />

              <!-- Only show password field for existing users (not first-time) -->
              <v-text-field
                v-if="!isFirstTimeUser"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Password"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                @click:append-inner="togglePassword"
                variant="outlined"
                class="input-group"
                density="compact"
                :rules="passwordRules"
                required
                :disabled="loading"
              />

              <v-btn type="submit" class="primary-btn" :loading="loading" :disabled="loading">
                <span v-if="checkingUser">Checking account...</span>
                <span v-else-if="!loading">CONTINUE</span>
                <span v-else>Authenticating...</span>
              </v-btn>

              <!-- Set Password button for magic link users -->
              <v-btn
                v-if="needsPasswordSetup"
                variant="text"
                color="primary"
                class="mt-2"
                :loading="loading"
                :disabled="loading"
                @click="sendPasswordResetEmail"
                block
              >
                <v-icon start>mdi-key</v-icon>
                Set Password
              </v-btn>

              <!-- CARSU Domain Info -->
              <div v-if="showDomainPopup" class="domain-info mt-3">
                <v-icon size="14" color="error">mdi-alert-circle-outline</v-icon>
                <span class="info-text error-text"
                  >Only CARSU email addresses (@carsu.edu.ph) are allowed</span
                >
              </div>
            </v-form>

            <!-- Reset button when magic link is sent -->
            <div v-if="magicLinkSent" class="text-center mt-4">
              <v-btn
                variant="text"
                color="primary"
                @click="
                  () => {
                    magicLinkSent = false
                    isFirstTimeUser = false
                    errorMessage = ''
                    loginAttemptTimestamps = {}
                  }
                "
              >
                <v-icon start>mdi-arrow-left</v-icon>
                Try a different email
              </v-btn>
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

.domain-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(244, 67, 54, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(244, 67, 54, 0.2);
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.info-text {
  font-size: 12px;
  text-align: center;
}

.error-text {
  color: #d32f2f;
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
