<script setup>
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
</script>

<template>
  <v-app class="dashboard">
    <MainHeader />

    <v-main class="hero">
      <v-img src="/images/GoldQuill Logo.png" alt="GoldQuill" class="logo" />
      <v-card-title class="title">
        Welcome to
        <span class="brand font-weight-bold">GoldQuill</span>!
      </v-card-title>

      <v-row class="actions" justify="center">
        <v-col cols="auto">
          <RouterLink to="/magazine" class="pill">
            <v-icon class="mdi mdi-file-document-outline"></v-icon>
            <span>MAGAZINE</span>
          </RouterLink>
        </v-col>
        <v-col cols="auto">
          <RouterLink to="/newsletter" class="pill">
            <v-icon class="mdi mdi-newspaper-variant-outline"></v-icon>
            <span>NEWSLETTER</span>
          </RouterLink>
        </v-col>
        <v-col cols="auto">
          <RouterLink to="/folio" class="pill">
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

    <v-sheet class="contact-info" color="white" width="100%">
      <v-divider class="mx-5 mt-6" thickness="2" color="black"></v-divider>

      <v-container class="px-12">
        <!-- Contact Us Header -->
        <v-row justify="center">
          <v-col cols="12" class="text-center">
            <v-card-title class="text-h5">Contact Us!</v-card-title>
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
  </v-app>
</template>

<style scoped>
/* Override Vuetify defaults to match original layout */
:deep(.v-app.dashboard) {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

:deep(.v-main.hero) {
  flex: 1;
  text-align: center;
  padding: 28px 12px 12px;
}

.logo {
  width: 160px;
  height: 160px;
  object-fit: contain;
  margin: 0 auto 12px;
}

:deep(.v-card-title.title) {
  font-size: 36px;
  margin: 0 0 16px 0;
  font-weight: 800;
  line-height: 1.2;
  padding: 0;
}

:deep(.v-row.actions) {
  display: flex;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  margin: 0 0 14px 0;
}

:deep(.v-col) {
  padding: 0;
}

.brand {
  color: #f5c52b;
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
  text-decoration: none;
}

.pill.secondary {
  background: #3a3a3a;
}

:deep(.pill .v-icon) {
  font-size: 20px;
}

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

/* Add colored icons */
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

@media (max-width: 640px) {
  :deep(.v-card-title.title) {
    font-size: 28px;
  }

  .pill {
    min-width: 200px;
  }
}
</style>
