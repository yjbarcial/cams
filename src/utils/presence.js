import { supabase } from './supabase'
import { setProfileStatusByEmail } from './autoAddUser'

let cleanupPresenceListeners = null
let cachedEmail = ''
let cachedAccessToken = ''

const getSupabaseConfig = () => ({
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

const cacheCurrentSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  cachedEmail = session?.user?.email || localStorage.getItem('userEmail') || ''
  cachedAccessToken = session?.access_token || ''
}

const markInactiveBeforeClose = () => {
  const email = cachedEmail || localStorage.getItem('userEmail')
  if (!email || !cachedAccessToken) return

  const { url, anonKey } = getSupabaseConfig()
  if (!url || !anonKey) return

  const endpoint = `${url}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}`
  const body = JSON.stringify({
    status: 'inactive',
    updated_at: new Date().toISOString(),
  })

  try {
    fetch(endpoint, {
      method: 'PATCH',
      keepalive: true,
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${cachedAccessToken}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body,
    })
  } catch {
    // Browser shutdown can interrupt network work; logout still handles the normal path.
  }
}

export const startPresenceTracking = async () => {
  if (cleanupPresenceListeners) return cleanupPresenceListeners

  await cacheCurrentSession()

  if (cachedEmail) {
    await setProfileStatusByEmail(cachedEmail, 'active')
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    cachedEmail = session?.user?.email || localStorage.getItem('userEmail') || ''
    cachedAccessToken = session?.access_token || ''

    if (event === 'SIGNED_IN' && cachedEmail) {
      await setProfileStatusByEmail(cachedEmail, 'active')
    }
  })

  window.addEventListener('pagehide', markInactiveBeforeClose)
  window.addEventListener('beforeunload', markInactiveBeforeClose)

  cleanupPresenceListeners = () => {
    window.removeEventListener('pagehide', markInactiveBeforeClose)
    window.removeEventListener('beforeunload', markInactiveBeforeClose)
    subscription.unsubscribe()
    cleanupPresenceListeners = null
  }

  return cleanupPresenceListeners
}
