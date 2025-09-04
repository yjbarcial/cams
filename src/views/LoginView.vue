<script setup>
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const showPassword = ref(false)

function submit() {
  // Placeholder submit
  // In a real app, call your auth API here
  console.log('Login attempt', { email: email.value })
}

function togglePassword() {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="login-page" :style="{ '--login-bg-url': 'url(\'/public/favicon.ico\')' }">
    <div class="backdrop"></div>
    <RouterLink to="/" class="top-back-link" aria-label="Back to Publications">
      <span class="mdi mdi-arrow-left"></span>
      <span class="label">Back to Publications</span>
    </RouterLink>
    <div class="content">
      <img src="@/assets/images/GoldQuill Logo.png" alt="GoldQuill" class="logo" />
      <div class="card">
        <h2 class="headline">Welcome Back!</h2>
        <p class="subtext">Enter your CARSU email for log in</p>

        <form @submit.prevent="submit" class="form">
          <div class="input-group">
            <span class="mdi mdi-email-outline"></span>
            <input v-model="email" type="email" placeholder="Email" required />
          </div>

          <div class="input-group">
            <span class="mdi mdi-lock-outline"></span>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Password"
              required
            />
            <button
              type="button"
              class="icon-btn"
              @click="togglePassword"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
            >
              <span
                :class="['mdi', showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline']"
              ></span>
            </button>
          </div>

          <div class="row-between">
            <span></span>
            <RouterLink to="/" class="muted-link">Forgot Password?</RouterLink>
          </div>

          <button type="submit" class="primary-btn" @click.prevent="$router.push('/dashboard')">
            LOG IN
          </button>

          <hr class="divider" />
        </form>
      </div>

      <p class="footer-note">© 2025 <span class="brand">GoldQuill</span>. All rights reserved.</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  background: #1f1f1f;
  background-image: linear-gradient(rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.55)), var(--login-bg-url);
  background-size: cover;
  background-position: center;
}

.content {
  position: relative;
  max-width: 520px;
  margin: 0 auto;
  padding: 48px 12px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo {
  width: 140px;
  height: 140px;
  object-fit: contain;
  margin-bottom: 12px;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
}

.card {
  width: 100%;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 22px 20px 18px;
}

.headline {
  margin: 0 0 6px 0;
  text-align: center;
}

.subtext {
  margin: 0 0 14px 0;
  text-align: center;
  color: #6b6b6b;
}

.form {
  display: grid;
  gap: 12px;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
  border: 1px solid #d9d9d9;
  border-radius: 999px;
  padding: 8px 12px;
  background: #fff;
}

.input-group > .mdi {
  color: #7a7a7a;
  font-size: 18px;
}

.input-group input {
  flex: 1 1 auto;
  border: none;
  outline: none;
  padding: 4px 8px;
  font-size: 14px;
}

.icon-btn {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #555;
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: -4px;
}

.muted-link {
  color: #6b6b6b;
  text-decoration: none;
}

.muted-link:hover {
  text-decoration: underline;
}

.primary-btn {
  width: 100%;
  background: #353535;
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 12px 14px;
  font-weight: 600;
  cursor: pointer;
}

.primary-btn:hover {
  opacity: 0.92;
}

.divider {
  border: none;
  border-top: 1px solid #e9e9e9;
  margin: 14px 0 10px;
}

/* removed signup styles */

.footer-note {
  color: #e6e6e6;
  margin: 16px 0 0;
}

.brand {
  color: #f5c52b;
}

.top-back-link {
  position: absolute;
  top: 12px;
  left: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.4);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 6px 10px;
  text-decoration: none;
  backdrop-filter: blur(2px);
}

.top-back-link:hover {
  background: rgba(0, 0, 0, 0.5);
}

.top-back-link .label {
  font-size: 14px;
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
