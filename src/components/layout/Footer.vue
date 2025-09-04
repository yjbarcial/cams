<template>
  <footer class="site-footer">
    <div class="footer-left">
      <slot name="left"></slot>
    </div>
    <div class="footer-center">
      <slot name="center">
        <span> © 2025 <span class="brand">GoldQuill</span>. All rights reserved. </span>
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
</style>
