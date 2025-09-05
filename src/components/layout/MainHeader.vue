<script setup></script>

<template>
  <header class="main-header">
    <div class="brand">
      <img src="@/assets/images/GoldQuill Logo.png" alt="GoldQuill" />
      <h3>GoldQuill.</h3>
    </div>
    <nav class="actions" aria-label="Primary">
      <RouterLink to="/dashboard" class="icon-button" aria-label="Dashboard" title="Dashboard">
        <span class="mdi mdi-view-dashboard" aria-hidden="true"></span>
      </RouterLink>
      <button class="icon-button" aria-label="Notifications" title="Notifications">
        <span class="mdi mdi-bell" aria-hidden="true"></span>
      </button>
      <button class="icon-button" aria-label="Account" title="Account">
        <span class="mdi mdi-account-circle" aria-hidden="true"></span>
      </button>
    </nav>
  </header>
</template>

<style scoped>
.main-header {
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.brand img {
  height: 36px;
  width: auto;
  display: block;
}

.brand h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
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
.icon-button .mdi {
  font-size: 24px;
  line-height: 1;
}
</style>
