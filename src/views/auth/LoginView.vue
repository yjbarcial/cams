<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { requiredValidator, emailValidator } from '@/utils/validators'
import libBg from '/images/lib-hd.jpg'

const router = useRouter()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref('')

// CARSU email validator (custom)
const carsuEmailValidator = (value) => {
  if (!value) return 'Email is required'

  // First check if it's a valid email using your existing validator
  const emailValidation = emailValidator(value)
  if (emailValidation !== true) return emailValidation

  // Then check if it's a CARSU email
  if (!value.endsWith('@carsu.edu.ph')) {
    return 'Only CARSU email addresses are allowed (@carsu.edu.ph)'
  }

  return true
}

// Password validator (using your existing required validator + length check)
const passwordValidatorCustom = (value) => {
  // First check if required
  const requiredValidation = requiredValidator(value)
  if (requiredValidation !== true) return requiredValidation

  // Then check minimum length
  if (value.length < 6) {
    return 'Password must be at least 6 characters'
  }

  return true
}

// Validation rules using your validator functions
const emailRules = [carsuEmailValidator]
const passwordRules = [passwordValidatorCustom]

const form = ref(null)

async function submit() {
  // Validate form first
  const { valid } = await form.value.validate()

  if (!valid) {
    return
  }

  // Additional CARSU email validation
  if (!email.value.endsWith('@carsu.edu.ph')) {
    errorMessage.value = 'Access denied. Only CARSU email addresses are allowed.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Store user session
    localStorage.setItem('userEmail', email.value)
    localStorage.setItem('isLoggedIn', 'true')

    // Navigate to dashboard
    router.push('/dashboard')
  } catch (error) {
    errorMessage.value = 'Login failed. Please check your credentials and try again.'
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
          <v-card-title class="headline pa-0 font-weight-bold">Welcome Back!</v-card-title>
          <v-card-subtitle class="subtext pa-0">Enter your CARSU email for log in</v-card-subtitle>

          <v-card-text class="pa-0">
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
                <span v-if="!loading">LOG IN</span>
                <span v-else>Logging in...</span>
              </v-btn>
            </v-form>

            <!-- CARSU Domain Info -->
            <div class="domain-info">
              <v-icon size="14" color="grey">mdi-information-outline</v-icon>
              <span class="info-text">Only CARSU email addresses (@carsu.edu.ph) are allowed</span>
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
  background: rgb(10, 9, 6); /* #100E07 solid tint behind image */
  pointer-events: none;
}

.backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--login-bg-url);
  background-size: 100% auto; /* reduce zoom while keeping aspect */
  background-position: center;
  background-repeat: no-repeat;
  filter: grayscale(100%);
  opacity: 0.15; /* image at 15% opacity */
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

.icon-btn {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #555;
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
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(245, 197, 43, 0.08);
  border-radius: 8px;
  border: 1px solid rgba(245, 197, 43, 0.2);
}

.info-text {
  font-size: 12px;
  color: #666;
  text-align: center;
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
  background: rgba(20, 20, 20, 0.575) !important; /* subtle glass look */
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.11) !important;
  font-size: 13px;
  font-weight: 500;
  border-radius: 999px !important; /* pill style */
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
