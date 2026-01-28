<script setup>
import { RouterView, useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { supabase } from '@/utils/supabase'

const router = useRouter()

// Set up auth state listener to track session changes
onMounted(async () => {
  console.log('🔄 App mounted - Setting up auth listener...')

  // Set up auth state listener
  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔐 Auth event:', event)
    console.log('📝 Session available:', !!session)
    
    if (session) {
      console.log('✅ Session established:', session.user.email)
      
      // ⭐ Sync localStorage with Supabase session
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userEmail', session.user.email)
      
      console.log('📝 localStorage.isLoggedIn =', localStorage.getItem('isLoggedIn'))
      
      // Auto-add user to profiles if needed
      const { addUserToProfiles } = await import('@/utils/autoAddUser')
      await addUserToProfiles(session.user)
      
      console.log('✅ Login state synced to localStorage')
      
      // ⭐ If on login page with active session, redirect to dashboard
      if (window.location.pathname === '/login') {
        console.log('📍 Redirecting from login to dashboard...')
        // Small delay to ensure localStorage is fully written
        await new Promise(resolve => setTimeout(resolve, 200))
        await router.replace({ name: 'dashboard' })
      }
    } else {
      // No session - clear login state
      console.log('❌ No session - clearing login state')
      localStorage.setItem('isLoggedIn', 'false')
      localStorage.removeItem('userEmail')
      localStorage.removeItem('user')
    }
  })

  // Try to restore session on app load
  try {
    const { data, error } = await supabase.auth.refreshSession()
    if (error) {
      console.warn('⚠️  Could not refresh session:', error.message)
      localStorage.setItem('isLoggedIn', 'false')
    } else if (data?.session) {
      console.log('✅ Session restored from localStorage')
      
      // ⭐ Sync login state
      
      // ⭐ If on login page with active session, redirect to dashboard
      if (window.location.pathname === '/login') {
        console.log('📍 Redirecting from login to dashboard...')
        await router.replace({ name: 'dashboard' })
      }
      localStorage.setItem('isLoggedIn', 'true')
      localStorage.setItem('userEmail', data.session.user.email)
      
      // Auto-add user to profiles if needed
      const { addUserToProfiles } = await import('@/utils/autoAddUser')
      await addUserToProfiles(data.session.user)
    } else {
      console.log('ℹ️  No session in localStorage')
      localStorage.setItem('isLoggedIn', 'false')
    }
  } catch (err) {
    console.error('❌ Error restoring session:', err.message)
    localStorage.setItem('isLoggedIn', 'false')
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
