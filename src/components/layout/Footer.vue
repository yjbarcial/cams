<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToDashboard = () => {
  router.push('/dashboard')
}
</script>

<template>
  <footer class="site-footer">
    <div class="footer-left">
      <slot name="left"></slot>
    </div>
    <div class="footer-center">
      <slot name="center">
        <span>
          © 2025
          <span
            class="brand clickable-brand"
            @click="goToDashboard"
            role="button"
            tabindex="0"
            @keydown.enter="goToDashboard"
            @keydown.space="goToDashboard"
            title="Go to Dashboard"
          >
            GoldQuill.</span
          >
          All rights reserved.
        </span>
      </slot>
    </div>
    <div class="footer-right">
      <slot name="right"></slot>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  background: #353535;
  color: #ffffff;
  padding: 16px 12px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
}

.footer-left,
.footer-right {
  min-height: 1rem;
}

.footer-center {
  justify-self: center;
  text-align: center;
}

.brand {
  color: #f5c52b;
}

.clickable-brand {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 2px 4px;
  border-radius: 4px;
}

.clickable-brand:hover {
  color: #ffffff;
  transform: scale(1.05);
}

.clickable-brand:focus {
  outline: 2px solid #f5c52b;
  outline-offset: 2px;
}

.clickable-brand:active {
  transform: scale(0.95);
}
</style>
