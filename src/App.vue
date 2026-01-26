<script setup>
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { supabase } from '@/utils/supabase'

// Set up auth state listener to track session changes
onMounted(async () => {
  console.log('🔄 App mounted - Setting up auth listener...')

  // Set up auth state listener
  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔐 Auth event:', event)
    console.log('📝 Session available:', !!session)
    if (session) {
      console.log('✅ Session established:', session.user.email)
    }
  })

  // Try to restore session on app load
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) {
      console.warn('⚠️  Could not refresh session:', error.message)
    } else if (data?.session) {
      console.log('✅ Session restored from localStorage')
    } else {
      console.log('ℹ️  No session in localStorage')
    }
  } catch (err) {
    console.error('❌ Error restoring session:', err.message)
  }

  // Return cleanup function
  return () => {
    authListener?.unsubscribe()
  }
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
