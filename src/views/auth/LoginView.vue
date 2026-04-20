<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { requiredValidator, emailValidator } from '@/utils/validators'
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
const isSignupMode = ref(false)
const confirmPassword = ref('')
const showConfirmPassword = ref(false)
const successMessage = ref('')
const signupDesignationLabel = ref('')
const signupPositionsLabel = ref('')

const designationItems = [
  'Technical Editor',
  'Creative Director',
  'Editor-in-Chief',
  'Chief Adviser',
  'Archival Manager',
  'Online Accounts Manager',
  'Section Head',
]

const contributorTypeItems = ['Writer', 'Artist']

// CARSU email validator
const carsuEmailValidator = (value) => {
  const requiredValidation = requiredValidator(value)
  if (requiredValidation !== true) return requiredValidation

  const emailValidation = emailValidator(value)
  if (emailValidation !== true) return emailValidation

  if (!value.endsWith('@carsu.edu.ph')) {
    return 'Must be a CARSU email address'
  }

  return true
}

// Validation rules using your validator functions
const emailRules = [carsuEmailValidator]

const form = ref(null)

function togglePassword() {
  showPassword.value = !showPassword.value
}

async function hasExistingProfile(emailAddress) {
  if (!emailAddress) return false

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', emailAddress)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    console.warn('Could not check existing profile:', error.message)
    return false
  }

  return Boolean(data?.id)
}

// Handle back button navigation prevention
const handlePopState = () => {
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
  const urlParams = new URLSearchParams(window.location.search)

  // Check for active session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    // Already logged in - redirect immediately
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('userEmail', session.user.email)
    // Ensure role/accessRole are available before redirecting
    await addUserToProfiles(session.user)
    router.replace('/dashboard')
    return
  }

  // Check for logout parameter
  const fromLogout = urlParams.get('logout')
  if (fromLogout === 'true') {
    window.history.replaceState(history.state, '', window.location.pathname)
    localStorage.setItem('isLoggedIn', 'false')
    await supabase.auth.signOut()
  }

  // No session - enable the form
  loading.value = false

  preventUnauthorizedNavigation()
  window.addEventListener('popstate', handlePopState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
})

// Sign in with password
async function signInWithPassword() {
  loading.value = true
  errorMessage.value = ''

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) throw error

    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('userEmail', data.user.email)
    await addUserToProfiles(data.user)
    router.replace('/dashboard')
  } catch (error) {
    if (error.message?.includes('Invalid login credentials')) {
      errorMessage.value =
        'Invalid email or password. New user? Click "Create Account" below. Just signed up? Check your email to verify your account first.'
    } else if (error.message?.includes('Email not confirmed')) {
      errorMessage.value =
        'Please verify your email first. Check your inbox for the verification link, click it, then try logging in again.'
    } else {
      errorMessage.value = error.message || 'Failed to sign in.'
    }
    if (import.meta.env.DEV) {
      console.error('❌ Password sign in error:', error)
    }
  } finally {
    loading.value = false
  }
}

// Sign up new user with password
async function signUpWithPassword() {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  // Validate password match
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Passwords do not match.'
    loading.value = false
    return
  }

  // Validate password strength
  if (password.value.length < 8) {
    errorMessage.value = 'Password must be at least 8 characters long.'
    loading.value = false
    return
  }

  try {
    const existingProfile = await hasExistingProfile(email.value)

    if (!existingProfile && !signupPositionsLabel.value) {
      errorMessage.value = 'Please select if the user is Writer or Artist.'
      loading.value = false
      return
    }

    const signupProfile = {
      designation_label: signupDesignationLabel.value || null,
      positions_label: signupPositionsLabel.value || null,
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: signupProfile,
      },
    })

    if (error) throw error

    // Check if email confirmation is required
    if (data.user && !data.session) {
      // Email verification required - show clear instructions
      successMessage.value = `✅ Account created! Check your email (${email.value}) for the verification link. Click it to activate your account, then return here to sign in.`
      isSignupMode.value = false // Switch back to login mode
      password.value = '' // Clear password for security
      confirmPassword.value = ''
      signupDesignationLabel.value = ''
      signupPositionsLabel.value = ''
      loading.value = false
      return
    }

    // Auto-login after successful signup (if session exists - instant verification)
    if (data.user && data.session) {
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userEmail', data.user.email)
      await addUserToProfiles(data.user, signupProfile)
      successMessage.value = 'Account created successfully! Redirecting...'

      // Short delay to show success message
      setTimeout(() => {
        router.replace('/dashboard')
      }, 1000)
    } else if (data.user) {
      // Fallback - user created but needs email confirmation
      successMessage.value = `Account created! Check ${email.value} for verification link, then sign in.`
      isSignupMode.value = false
      password.value = ''
      confirmPassword.value = ''
      signupDesignationLabel.value = ''
      signupPositionsLabel.value = ''
    }
  } catch (error) {
    if (error.message?.includes('already registered')) {
      errorMessage.value = 'This email is already registered. Try signing in instead.'
    } else {
      errorMessage.value = error.message || 'Failed to create account.'
    }
    if (import.meta.env.DEV) {
      console.error('❌ Sign up error:', error)
    }
  } finally {
    loading.value = false
  }
}

async function submit() {
  showDomainPopup.value = false
  errorMessage.value = ''
  successMessage.value = ''

  const { valid } = await form.value.validate()
  if (!valid) return

  // Check if email is CARSU domain
  if (!email.value.endsWith('@carsu.edu.ph')) {
    showDomainPopup.value = true
    errorMessage.value = 'Only CARSU email addresses (@carsu.edu.ph) are allowed.'
    return
  }

  // Password is now required
  if (!password.value || password.value.trim() === '') {
    errorMessage.value = 'Password is required.'
    return
  }

  // Handle signup or signin
  if (isSignupMode.value) {
    await signUpWithPassword()
  } else {
    await signInWithPassword()
  }
}

function toggleMode() {
  isSignupMode.value = !isSignupMode.value
  errorMessage.value = ''
  successMessage.value = ''
  password.value = ''
  confirmPassword.value = ''
  signupDesignationLabel.value = ''
  signupPositionsLabel.value = ''
}

// Request password reset
async function requestPasswordReset() {
  successMessage.value = ''
  errorMessage.value = ''

  if (!email.value || !email.value.trim()) {
    errorMessage.value = 'Please enter your email address first.'
    return
  }

  if (!email.value.endsWith('@carsu.edu.ph')) {
    errorMessage.value = 'Please enter a valid CARSU email address.'
    return
  }

  loading.value = true

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) throw error

    successMessage.value = `Password reset email sent to ${email.value}. Check your inbox and click the link to reset your password.`
  } catch (error) {
    errorMessage.value = error.message || 'Failed to send password reset email. Please try again.'
    if (import.meta.env.DEV) {
      console.error('❌ Password reset error:', error)
    }
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
            {{ isSignupMode ? 'Create Account' : 'Welcome Back!' }}
          </v-card-title>
          <v-card-subtitle class="subtext pa-0">
            {{ isSignupMode ? 'Sign up with your CARSU email' : 'Sign in to your account' }}
          </v-card-subtitle>

          <v-card-text class="pa-0">
            <!-- Success Card -->
            <v-card v-if="successMessage" class="mb-3 message-card success-card" elevation="0">
              <div class="message-content">
                <v-icon color="success" size="22" class="message-icon"> mdi-check-circle </v-icon>
                <span class="message-text">{{ successMessage }}</span>
              </div>
            </v-card>

            <!-- Error Card -->
            <v-card v-if="errorMessage" class="mb-3 message-card error-card" elevation="0">
              <div class="message-content">
                <v-icon color="error" size="22" class="message-icon"> mdi-alert-circle </v-icon>
                <span class="message-text">{{ errorMessage }}</span>
              </div>
            </v-card>

            <v-form ref="form" @submit.prevent="submit" class="form">
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

              <v-text-field
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                :placeholder="
                  isSignupMode ? 'Create a password (min 8 characters)' : 'Your password'
                "
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                @click:append-inner="togglePassword"
                variant="outlined"
                class="input-group"
                density="compact"
                :disabled="loading"
                required
              />

              <v-text-field
                v-if="isSignupMode"
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="Confirm your password"
                prepend-inner-icon="mdi-lock-check-outline"
                :append-inner-icon="showConfirmPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                @click:append-inner="showConfirmPassword = !showConfirmPassword"
                variant="outlined"
                class="input-group"
                density="compact"
                :disabled="loading"
                required
              />

              <v-select
                v-if="isSignupMode"
                v-model="signupDesignationLabel"
                :items="designationItems"
                label="Designation (optional)"
                placeholder="Select designation (optional)"
                persistent-placeholder
                prepend-inner-icon="mdi-badge-account-outline"
                variant="outlined"
                class="input-group"
                density="compact"
                :disabled="loading"
                clearable
              />

              <v-select
                v-if="isSignupMode"
                v-model="signupPositionsLabel"
                :items="contributorTypeItems"
                label="Contributor Type"
                placeholder="Select contributor type (Writer or Artist)"
                persistent-placeholder
                prepend-inner-icon="mdi-account-edit-outline"
                variant="outlined"
                class="input-group"
                density="compact"
                :disabled="loading"
                required
              />

              <div v-if="!isSignupMode" style="text-align: right; margin-bottom: 16px">
                <v-btn
                  variant="text"
                  color="#999"
                  size="x-small"
                  @click="requestPasswordReset"
                  :disabled="loading || !email"
                  style="padding: 0"
                >
                  Forgot Password?
                </v-btn>
              </div>

              <v-btn type="submit" class="primary-btn" :loading="loading" :disabled="loading">
                {{ isSignupMode ? 'CREATE ACCOUNT' : 'LOG IN' }}
              </v-btn>

              <div class="text-center mt-3">
                <v-btn
                  variant="text"
                  color="#999"
                  size="small"
                  @click="toggleMode"
                  :disabled="loading"
                >
                  {{
                    isSignupMode
                      ? 'Already have an account? Log in'
                      : "Don't have an account? Create one"
                  }}
                </v-btn>
              </div>

              <!-- CARSU Domain Info -->
              <div v-if="showDomainPopup" class="domain-info mt-3">
                <v-icon size="14" color="error">mdi-alert-circle-outline</v-icon>
                <span class="info-text error-text"
                  >Only CARSU email addresses (@carsu.edu.ph) are allowed</span
                >
              </div>
            </v-form>
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
  padding: 48px 12px 80px;
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

/* Message Cards */
.message-card {
  border-radius: 12px !important;
  padding: 14px 18px;
  border-left: 4px solid;
}

.success-card {
  background: rgba(76, 175, 80, 0.08) !important;
  border-left-color: #4caf50;
}

.error-card {
  background: rgba(244, 67, 54, 0.08) !important;
  border-left-color: #f44336;
}

.message-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.message-icon {
  flex-shrink: 0;
}

.message-text {
  font-size: 0.9rem;
  line-height: 1.5;
  color: #2c3e50;
  flex: 1;
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
