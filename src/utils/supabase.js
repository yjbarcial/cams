import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
// Persist auth only for the current browser tab/window.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: sessionStorage,
    },
  },
)
