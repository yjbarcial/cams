/**
 * Client-side helper to clear stored project data from localStorage.
 * IMPORTANT: This only affects browser localStorage used by the app, not Supabase.
 * Call with confirm=true to avoid accidental clears.
 */
export function clearClientData({ confirm = false } = {}) {
  if (!confirm) {
    console.warn('clearClientData called without confirm=true. No action taken.')
    return
  }

  const prefixes = ['magazine_projects', 'newsletter_projects', 'folio_projects', 'other_projects']
  const keys = Object.keys(localStorage)
  let removed = 0

  keys.forEach((k) => {
    if (prefixes.some((p) => k.startsWith(p)) || k.includes('_project_history_')) {
      localStorage.removeItem(k)
      removed++
    }
  })

  console.log(`Client-side project data cleared from localStorage. Keys removed: ${removed}`)
}

export default clearClientData
