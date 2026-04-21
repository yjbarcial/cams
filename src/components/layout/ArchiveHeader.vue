<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToPublications = () => {
  router.push('/archive')
}
</script>

<template>
  <header class="archive-header">
    <div class="brand">
      <v-img src="/images/GoldQuill Logo.png" alt="GoldQuill" height="30px" width="30%" contain />
      <h3>GoldQuill.</h3>
    </div>
    <div class="actions">
      <!-- Publications icon -->
      <button
        @click="goToPublications"
        class="icon-button"
        aria-label="Publications"
        title="Publications"
      >
        <span class="mdi mdi-bookshelf" aria-hidden="true"></span>
      </button>

      <RouterLink to="/login" class="icon-button" aria-label="Login" title="Login">
        <span class="mdi mdi-account-circle" aria-hidden="true"></span>
      </RouterLink>
    </div>
  </header>
</template>

<style scoped>
.archive-header {
  background: #f5c52b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 2px solid #353535; /* black line at the bottom */
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.brand img {
  height: 36px; /* Make the logo smaller */
  width: auto;
  display: block;
}

.actions {
  display: inline-flex;
  align-items: center;
  gap: 15px;
  padding: 0 10px;
}

.icon-button {
  appearance: none;
  background: transparent;
  border: none;
  padding: 6px;
  border-radius: 6px;
  color: #2b2b2b;
  cursor: pointer;
  text-decoration: none;
}

.icon-button:hover {
  background: rgba(0, 0, 0, 0.06);
}

/* MDI icon sizing */
.icon-button .mdi {
  font-size: 30px;
  line-height: 1;
}

/* Publications icon specific styling */
.icon-button .mdi-book-open-page-variant {
  color: #353535; /* Same dark color as admin icon */
}

.icon-button:hover .mdi-book-open-page-variant {
  color: #1a1a1a; /* Darker on hover */
}

/* Admin icon specific styling */
.icon-button .mdi-shield-outline {
  color: #353535; /* Darker brown color for admin icon */
}

.icon-button:hover .mdi-shield-outline {
  color: #1a1a1a; /* Darker on hover */
}
</style>
