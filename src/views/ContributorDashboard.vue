<script setup>
import MainHeader from '@/components/layout/MainHeader.vue'
import Footer from '@/components/layout/Footer.vue'
</script>

<template>
  <div class="dashboard">
    <MainHeader />

    <section class="hero">
      <img src="@/assets/images/GoldQuill Logo.png" alt="GoldQuill" class="logo" />
      <h1 class="title">Welcome to <span class="brand">GoldQuill</span>!</h1>

      <div class="actions">
        <button class="pill">
          <span class="mdi mdi-file-document-outline"></span>
          <span>MAGAZINE</span>
        </button>
        <button class="pill">
          <span class="mdi mdi-newspaper-variant-outline"></span>
          <span>NEWSLETTER</span>
        </button>
        <button class="pill">
          <span class="mdi mdi-archive-outline"></span>
          <span>FOLIO</span>
        </button>
      </div>

      <div class="actions">
        <button class="pill secondary">
          <span class="mdi mdi-dots-horizontal"></span>
          <span>OTHER</span>
        </button>
      </div>
    </section>

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
}

.pill.secondary {
  background: #3a3a3a;
}

.pill .mdi {
  font-size: 20px;
}

/* info section removed */

@media (max-width: 640px) {
  .title {
    font-size: 28px;
  }
  .pill {
    min-width: 200px;
  }
}
</style>
