<script setup>
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
import { createVuetify } from 'vuetify'

const vuetify = createVuetify({
  components: {
    defaults: {
      global: true,
      // This enables auto-importing of all Vuetify components
    },
  },
})
</script>

<template>
  <div class="dashboard">
    <MainHeader />

    <section class="hero">
      <v-img src="/images/GoldQuill Logo.png" alt="GoldQuill" class="logo" />
      <h1 class="title">Welcome to <span class="brand">GoldQuill</span>!</h1>

      <div class="actions">
        <RouterLink to="/magazine" class="pill">
          <span class="mdi mdi-file-document-outline"></span>
          <span>MAGAZINE</span>
        </RouterLink>
        <RouterLink to="/newsletter" class="pill">
          <span class="mdi mdi-newspaper-variant-outline"></span>
          <span>NEWSLETTER</span>
        </RouterLink>
        <RouterLink to="/folio" class="pill">
          <span class="mdi mdi-archive-outline"></span>
          <span>FOLIO</span>
        </RouterLink>
      </div>

      <div class="actions">
        <RouterLink to="/other" class="pill secondary">
          <span class="mdi mdi-dots-horizontal"></span>
          <span>OTHER</span>
        </RouterLink>
      </div>
    </section>

    <v-sheet class="contact-info" color="white" width="100%">
      <v-divider class="mx-5 mt-6" thickness="2" color="black"></v-divider>

      <v-container class="px-12">
        <!-- Contact Us Header -->
        <v-row justify="center">
          <v-col cols="12" class="text-center">
            <v-card-title class="text-h">Contact Us!</v-card-title>
          </v-col>
        </v-row>

        <!-- Content Row -->
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

    <Footer />
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.hero {
  flex: 1;
}

.hero {
  text-align: center;
  padding: 28px 12px 12px;
}

.logo {
  width: 160px;
  height: 160px;
  object-fit: contain;
  margin: 0 auto 12px;
}

.title {
  font-size: 36px;
  margin: 0 0 16px 0;
  font-weight: 800;
}
.brand {
  color: #f5c52b;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: #2f2f2f;
  color: #fff;
  border: none;
  border-radius: 14px;
  padding: 14px 18px;
  min-width: 240px;
  justify-content: center;
  box-shadow: 0 6px 10px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  text-decoration: none; /* Add this line to remove underline */
}

.pill.secondary {
  background: #3a3a3a;
}

.pill .mdi {
  font-size: 20px;
}

.csu-logo {
  width: 120px;
  height: auto;
  object-fit: contain;
}

/* info section removed */

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

@media (max-width: 640px) {
  .title {
    font-size: 28px;
  }
  .pill {
    min-width: 200px;
  }
}
</style>
