 
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase credentials')
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add is_starred column to projects table...')

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      '../database/migrations/001_add_is_starred_to_projects.sql',
    )
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // If exec_sql RPC doesn't exist, try direct SQL execution
      console.log('⚠️  Note: Direct SQL execution via RPC not available')
      console.log('📋 Please run the following SQL in your Supabase SQL Editor:\n')
      console.log(migrationSQL)
      console.log('\n💡 Steps:')
      console.log('1. Go to your Supabase Dashboard')
      console.log('2. Navigate to SQL Editor')
      console.log('3. Create a new query and paste the SQL above')
      console.log('4. Run the query')
      process.exit(0)
    }

    console.log('✅ Migration completed successfully!')
    console.log('   - Added is_starred column to projects table')
    console.log('   - Default value set to FALSE for all existing projects')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()
