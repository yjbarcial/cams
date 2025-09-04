<script setup></script>
<template>
  <header class="archive-header">
    <div class="brand">
      <img src="@/assets/images/GoldQuill Logo.png" alt="GoldQuill" />
      <h1>GoldQuill</h1>
    </div>
    <div class="actions">
      <button class="icon-button" aria-label="Dashboard" title="Dashboard">
        <span class="mdi mdi-view-dashboard-outline" aria-hidden="true"></span>
      </button>
      <button class="icon-button" aria-label="Login" title="Login">
        <span class="mdi mdi-login" aria-hidden="true"></span>
      </button>
    </div>
  </header>
</template>
<style scoped>
.archive-header {
  background: #f5c52b;
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
  height: 36px; /* Make the logo smaller */
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
}

.icon-button:hover {
  background: rgba(0, 0, 0, 0.06);
}

/* MDI icon sizing */
.icon-button .mdi {
  font-size: 22px;
  line-height: 1;
}
</style>
