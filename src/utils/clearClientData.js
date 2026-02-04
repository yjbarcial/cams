/**
 * Client-side helper to clear stored project data from localStorage.
 * IMPORTANT: This only affects browser localStorage used by the app, not Supabase.
 * Call with confirm=true to avoid accidental clears.
 */
export function clearClientData({ confirm = false } = {}) {
  if (!confirm) {
    console.warn('clearClientData called without confirm=true. No action taken.')
    return { removed: 0, details: [] }
  }

  const prefixes = [
    'magazine_projects',
    'newsletter_projects',
    'folio_projects',
    'other_projects',
    'magazine_project_history_',
    'newsletter_project_history_',
    'folio_project_history_',
    'other_project_history_',
  ]

  const keys = Object.keys(localStorage)
  let removed = 0
  const details = []

  keys.forEach((k) => {
    if (prefixes.some((p) => k.startsWith(p)) || k.includes('_project_history_')) {
      localStorage.removeItem(k)
      removed++
      details.push(k)
    }
  })

  console.log(`Client-side project data cleared from localStorage. Keys removed: ${removed}`)
  console.log('Cleared keys:', details)

  return { removed, details }
}

export default clearClientData
