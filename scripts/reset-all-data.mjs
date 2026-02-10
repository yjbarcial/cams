import { createClient } from '@supabase/supabase-js'
import readline from 'readline'

// This script deletes all rows from the main project tables.
// Usage:
//  node scripts/reset-all-data.mjs --dry-run      # shows counts but does not delete
//  node scripts/reset-all-data.mjs --yes          # deletes without interactive prompt
// Environment variables required:
//  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (recommended) OR VITE_SUPABASE_ANON_KEY

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY). Please set environment variables and retry.',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function getCounts() {
  const tables = ['project_history_comments', 'project_history', 'projects']
  const results = {}
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('id', { head: true, count: 'exact' })
    if (error) throw error
    results[t] = count || 0
  }
  return results
}

async function deleteAll() {
  // delete comments first, then history, then projects
  await supabase.from('project_history_comments').delete().not('id', 'is', null)
  await supabase.from('project_history').delete().not('id', 'is', null)
  await supabase.from('projects').delete().not('id', 'is', null)
}

;(async () => {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry-run') || args.includes('-n')
  const force = args.includes('--yes') || args.includes('-y')

  console.log('Reset script - target tables: project_history_comments, project_history, projects')

  try {
    const counts = await getCounts()
    console.log('Current row counts:', counts)

    if (dry) {
      console.log('Dry run mode: no deletions performed. Run with --yes to delete.')
      process.exit(0)
    }

    if (!force) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
      const answer = await new Promise((res) =>
        rl.question('Type YES to confirm irreversible deletion: ', (a) => {
          rl.close()
          res(a)
        }),
      )
      if (answer !== 'YES') {
        console.log('Aborted.')
        process.exit(0)
      }
    }

    console.log('Deleting rows...')
    await deleteAll()
    const after = await getCounts()
    console.log('Deletion complete. Current counts:', after)
  } catch (err) {
    console.error('Error during reset:', err)
    process.exit(1)
  }
})()
