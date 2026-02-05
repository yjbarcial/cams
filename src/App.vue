<script setup>
import { RouterView, useRouter } from 'vue-router'
import { supabase } from '@/utils/supabase'
import { onMounted } from 'vue'

const router = useRouter()

onMounted(() => {
  // Listen for auth state changes - Supabase will automatically process hash params
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event, 'Session:', session ? 'exists' : 'none')

    // If user clicked password recovery link, redirect to reset password page
    if (event === 'PASSWORD_RECOVERY') {
      console.log('PASSWORD_RECOVERY event detected, session established, redirecting')
      // Small delay to ensure session is fully established
      await new Promise((resolve) => setTimeout(resolve, 100))
      router.push('/auth/reset-password')
    }
  })
})
</script>
<template>
  <RouterView />
</template>

<style>
html,
body,
#app {
  height: 100%;
}
body {
  margin: 0;
  font-size: 15px;
  color: #353535;
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    Segoe UI,
    Roboto,
    Ubuntu,
    Cantarell,
    Noto Sans,
    Helvetica Neue,
    Arial,
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
    'Noto Color Emoji';
}
</style>
