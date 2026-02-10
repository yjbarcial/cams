import { createClient } from '@supabase/supabase-js'
import http from 'http'

// Minimal reset server. Protects destructive actions with RESET_API_SECRET env var.
// Usage:
//  RESET_API_SECRET="mysecret" SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." node scripts/reset-server.mjs

const PORT = process.env.RESET_SERVER_PORT || 9999
const RESET_API_SECRET = process.env.RESET_API_SECRET

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

if (!RESET_API_SECRET) {
  console.error('Please set RESET_API_SECRET environment variable to protect the endpoint.')
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const parseJSONBody = (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })

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
  await supabase.from('project_history_comments').delete().not('id', 'is', null)
  await supabase.from('project_history').delete().not('id', 'is', null)
  await supabase.from('projects').delete().not('id', 'is', null)
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/reset') {
    try {
      const body = await parseJSONBody(req)
      const authHeader = req.headers['x-reset-secret'] || req.headers['authorization'] || ''
      const token = (authHeader || '').replace(/^Bearer\s+/i, '')

      if (!token || token !== RESET_API_SECRET) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Unauthorized' }))
        return
      }

      const dryRun = Boolean(body.dryRun)

      if (dryRun) {
        const counts = await getCounts()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ dryRun: true, counts }))
        return
      }

      if (body.confirm !== 'YES') {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: "Missing confirm:'YES' in body" }))
        return
      }

      await deleteAll()
      const after = await getCounts()
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ deleted: true, counts: after }))
    } catch (err) {
      console.error('Reset server error:', err)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: String(err) }))
    }
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true }))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }
})

server.listen(PORT, () => {
  console.log(`Reset server listening on http://localhost:${PORT}`)
  console.log('Use POST /reset with header x-reset-secret or Authorization: Bearer <secret>')
})
