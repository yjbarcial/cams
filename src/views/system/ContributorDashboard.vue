<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'

const router = useRouter()

// Prevent back navigation to login page
const preventBackToLogin = () => {
  // Add a new history entry to prevent going back
  window.history.pushState(null, '', window.location.href)
}

// Handle browser back button
const handlePopState = (event) => {
  // Push the current state again to prevent going back
  window.history.pushState(null, '', window.location.href)

  // Optional: Show a message or do nothing
  console.log('Back navigation prevented. Please use the logout button to exit.')
}

onMounted(() => {
  // Prevent back navigation when component mounts
  preventBackToLogin()

  // Listen for back button attempts
  window.addEventListener('popstate', handlePopState)

  // Replace the current history entry to remove login page from history
  window.history.replaceState(null, '', window.location.href)
})

onUnmounted(() => {
  // Clean up event listener
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <v-app class="dashboard">
    <MainHeader />

    <v-main class="hero">
      <div class="logo-container">
        <v-img src="/images/GoldQuill Logo.png" alt="GoldQuill" class="logo" />
      </div>

      <v-card-title class="title">
        Welcome to
        <span class="brand font-weight-bold">GoldQuill</span>!
      </v-card-title>

      <v-row class="actions" justify="center">
        <v-col cols="auto">
          <RouterLink to="/magazine" class="pill magazine">
            <v-icon class="mdi mdi-file-document-outline"></v-icon>
            <span>MAGAZINE</span>
          </RouterLink>
        </v-col>
        <v-col cols="auto">
          <RouterLink to="/newsletter" class="pill newsletter">
            <v-icon class="mdi mdi-newspaper-variant-outline"></v-icon>
            <span>NEWSLETTER</span>
          </RouterLink>
        </v-col>
        <v-col cols="auto">
          <RouterLink to="/folio" class="pill folio">
            <v-icon class="mdi mdi-archive-outline"></v-icon>
            <span>FOLIO</span>
          </RouterLink>
        </v-col>
      </v-row>

      <v-row class="actions" justify="center">
        <v-col cols="auto">
          <RouterLink to="/other" class="pill secondary">
            <v-icon class="mdi mdi-dots-horizontal"></v-icon>
            <span>OTHER</span>
          </RouterLink>
        </v-col>
      </v-row>
    </v-main>

    <!-- Contact Information Section
    <v-sheet class="contact-info" color="white" width="100%">
      <v-divider class="mx-5 mt-6" thickness="2" color="black"></v-divider>

      <v-container class="px-12">
         Contact Us Header 
        <v-row justify="center">
          <v-col cols="12" class="text-center">
            <v-card-title class="text-h5">Contact Us!</v-card-title>
          </v-col>
        </v-row>

        Content Row
        <v-row justify="space-between" align="start" no-gutters>
          <v-col cols="12" sm="4" class="d-flex flex-column align-start">
            <v-img src="/images/csu-logo.png" alt="CSU Logo" class="csu-logo mb-4" />
            <v-card-title class="px-0">Old Administration Bldg.</v-card-title>
            <v-card-text class="px-0">Caraga State University - Main Campus, 8600</v-card-text>
          </v-col>

          <v-col cols="12" sm="4">
            <v-list class="social-links">
              <v-list-item
                href="https://facebook.com/thegoldpanicles"
                target="_blank"
                rel="noopener"
                class="justify-start"
              >
                <template v-slot:prepend>
                  <v-icon>mdi-facebook</v-icon>
                </template>
                <span>facebook.com/thegoldpanicles</span>
              </v-list-item>

              <v-list-item
                href="https://instagram.com/thegoldpanicles"
                target="_blank"
                rel="noopener"
                class="justify-start"
              >
                <template v-slot:prepend>
                  <v-icon>mdi-instagram</v-icon>
                </template>
                <span>@thegoldpanicles</span>
              </v-list-item>

              <v-list-item
                href="https://issuu.com/thegoldpanicles"
                target="_blank"
                rel="noopener"
                class="justify-start"
              >
                <template v-slot:prepend>
                  <v-icon>mdi-newspaper</v-icon>
                </template>
                <span>issuu.com/thegoldpanicles</span>
              </v-list-item>
            </v-list>
          </v-col>

          <v-col cols="12" sm="4" class="d-flex flex-column align-end pe-16">
            <v-list-item
              href="mailto:thegoldpanicles@carsu.edu.ph"
              target="_blank"
              rel="noopener"
              class="justify-start px-0"
            >
              <template v-slot:prepend>
                <v-icon>mdi-gmail</v-icon>
              </template>
              <span>thegoldpanicles@carsu.edu.ph</span>
            </v-list-item>
          </v-col>
        </v-row>
      </v-container>
    </v-sheet>
    -->

    <Footer />
  </v-app>
</template>

<style scoped>
/* Clean modern dashboard with subtle enhancements */
:deep(.v-app.dashboard) {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  position: relative;
}

:deep(.v-main.hero) {
  flex: 1;
  text-align: center;
  padding: 40px 12px 40px;
  position: relative;
}

/* Subtle background decoration */
.hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 20% 80%, rgba(245, 197, 43, 0.05) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(102, 126, 234, 0.05) 0%, transparent 50%);
  pointer-events: none;
}

/* Logo styling with subtle shadow */
.logo-container {
  position: relative;
  margin-bottom: 24px;
}

.logo {
  width: 180px;
  height: 180px;
  object-fit: contain;
  margin: 0 auto;
  filter: drop-shadow(0 8px 25px rgba(0, 0, 0, 0.1));
  transition:
    transform 0.3s ease,
    filter 0.3s ease;
}

.logo:hover {
  transform: scale(1.02);
  filter: drop-shadow(0 12px 30px rgba(0, 0, 0, 0.15));
}

/* Enhanced typography */
:deep(.v-card-title.title) {
  font-size: 38px;
  margin: 0 0 32px 0;
  font-weight: 700;
  line-height: 1.2;
  padding: 0;
  color: #1e293b;
  letter-spacing: -0.01em;
}

.brand {
  background: linear-gradient(135deg, #f5c52b, #eab308);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
}

.brand::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(135deg, #f5c52b, #eab308);
  border-radius: 1px;
}

/* Navigation pills with improved styling */
:deep(.v-row.actions) {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  margin: 0 0 20px 0;
}

:deep(.v-col) {
  padding: 0;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: #353535;
  color: #ffffff;
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 16px 24px;
  min-width: 200px;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.pill::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s ease;
}

.pill:hover::before {
  left: 100%;
}

.pill:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  background: #404040;
}

.pill.secondary {
  background: #353535;
  color: #ffffff;
}

.pill.secondary:hover {
  background: #404040;
}

/* Color-coded pill variants */
.pill.magazine {
  border-left: 4px solid transparent;
}

.pill.newsletter {
  border-left: 4px solid transparent;
}

.pill.folio {
  border-left: 4px solid transparent;
}

/* Icon styling */
:deep(.pill .v-icon) {
  font-size: 20px;
  transition: transform 0.3s ease;
}

.pill.magazine .v-icon {
  color: #ff6b6b;
}

.pill.newsletter .v-icon {
  color: #60a5fa;
}

.pill.folio .v-icon {
  color: #4ade80;
}

.pill.secondary .v-icon {
  color: #f5c52b;
}

.pill:hover .v-icon {
  transform: scale(1.1);
}

/* Legacy styles for contact section */
.csu-logo {
  width: 120px;
  height: auto;
  object-fit: contain;
}

:deep(.text-h5) {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2f2f2f;
}

:deep(.v-container) {
  max-width: 1400px !important;
}

:deep(.v-card-title) {
  line-height: 1.2;
}

:deep(.v-card-text) {
  padding-top: 8px;
}

.social-links {
  padding: 0;
}

:deep(.social-links .v-list-item) {
  padding-inline-start: 0;
  padding-inline-end: 0;
}

:deep(.social-links .v-list-item-content) {
  justify-content: flex-start;
}

/* Social media icon colors */
:deep(.mdi-facebook) {
  color: #1877f2;
}

:deep(.mdi-instagram) {
  color: #e4405f;
}

:deep(.mdi-newspaper) {
  color: #ff5c62;
}

:deep(.mdi-gmail) {
  color: #ea4335;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .logo {
    width: 140px;
    height: 140px;
  }

  :deep(.v-card-title.title) {
    font-size: 28px;
    margin-bottom: 24px;
  }

  .pill {
    min-width: 180px;
    padding: 14px 20px;
    font-size: 13px;
  }

  :deep(.v-main.hero) {
    padding: 30px 12px;
  }
}

@media (max-width: 480px) {
  .logo {
    width: 120px;
    height: 120px;
  }

  :deep(.v-card-title.title) {
    font-size: 24px;
  }

  .pill {
    min-width: 160px;
    padding: 12px 18px;
    gap: 8px !important;
  }

  :deep(.pill .v-icon) {
    font-size: 18px;
  }
}
</style>
