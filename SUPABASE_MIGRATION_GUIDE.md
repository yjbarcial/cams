# Supabase Migration Guide for Project History

## Overview

This guide will help you migrate your project history feature from localStorage to Supabase database.

## Prerequisites

- Supabase project set up with `projects` and `project_history` tables
- Environment variables configured (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)

## 1. Database Schema Updates

### Update your `project_history` table:

```sql
-- Add these columns if they don't exist
ALTER TABLE project_history
ADD COLUMN IF NOT EXISTS version_number INTEGER,
ADD COLUMN IF NOT EXISTS version_type TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS change_description TEXT,
ADD COLUMN IF NOT EXISTS author TEXT,
ADD COLUMN IF NOT EXISTS project_data JSONB,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_history_project_id ON project_history(project_id);
CREATE INDEX IF NOT EXISTS idx_project_history_created_at ON project_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_history_is_active ON project_history(is_active);
```

### Create comments table:

```sql
CREATE TABLE IF NOT EXISTS project_history_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_history_id UUID REFERENCES project_history(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE project_history_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all comments" ON project_history_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON project_history_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update comments" ON project_history_comments FOR UPDATE USING (true);
CREATE POLICY "Users can delete comments" ON project_history_comments FOR DELETE USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_history_comments_history_id ON project_history_comments(project_history_id);
CREATE INDEX IF NOT EXISTS idx_project_history_comments_created_at ON project_history_comments(created_at DESC);
```

## 2. Migration Script

Create a migration script to move existing localStorage data to Supabase:

```javascript
// migration-script.js
import { supabase } from './src/utils/supabase.js'

const migrateProjectHistory = async () => {
  try {
    // Get all localStorage keys that match project history pattern
    const historyKeys = Object.keys(localStorage).filter((key) => key.includes('_project_history_'))

    for (const key of historyKeys) {
      const [projectType, , projectId] = key.split('_')
      const historyData = JSON.parse(localStorage.getItem(key) || '[]')

      console.log(
        `Migrating ${historyData.length} versions for ${projectType} project ${projectId}`,
      )

      for (const version of historyData) {
        // Insert version into Supabase
        const { error } = await supabase.from('project_history').insert({
          project_id: projectId,
          version_number: version.versionNumber,
          version_type: version.versionType,
          change_description: version.changeDescription,
          author: version.author,
          project_data: version.data,
          metadata: version.data.metadata,
          is_active: version.isActive,
          is_deleted: version.isDeleted || false,
          deleted_at: version.deletedAt,
          created_at: version.timestamp,
        })

        if (error) {
          console.error(`Error migrating version ${version.id}:`, error)
        } else {
          console.log(`Migrated version ${version.id}`)
        }
      }
    }

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

// Run migration
migrateProjectHistory()
```

## 3. Update Your Application

### Step 1: Update imports

Replace all imports from `@/services/projectHistory.js` with `@/services/supabaseProjectHistory.js`:

```javascript
// Old
import { createProjectVersion } from '@/services/projectHistory.js'

// New
import { createProjectVersion } from '@/services/supabaseProjectHistory.js'
```

### Step 2: Update function calls

Make sure all function calls are awaited since they're now async:

```javascript
// Old
const version = createProjectVersion(...)

// New
const version = await createProjectVersion(...)
```

## 4. Testing the Migration

### Test 1: Create a new version

1. Open any project
2. Click "Create Version"
3. Add a description and create
4. Check if it appears in your Supabase `project_history` table

### Test 2: View project history

1. Click the history button on any project
2. Verify versions are loaded from Supabase
3. Test version comparison and restoration

### Test 3: Add comments

1. Add a comment to any version
2. Check if it appears in `project_history_comments` table
3. Verify comments persist after page refresh

## 5. Cleanup (Optional)

Once you've verified everything works with Supabase, you can remove localStorage dependencies:

```javascript
// Remove these localStorage operations from your components
localStorage.getItem('magazine_projects')
localStorage.setItem('magazine_projects', ...)
// etc.
```

## 6. Environment Variables

Make sure these are set in your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 7. Row Level Security (RLS)

If you want to add user-specific access control, update your RLS policies:

```sql
-- Example: Users can only see their own projects
CREATE POLICY "Users can view own projects" ON projects
FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can view own project history" ON project_history
FOR SELECT USING (auth.uid() = created_by);
```

## Troubleshooting

### Common Issues:

1. **"relation does not exist" error**: Make sure you've run the schema updates
2. **Permission denied**: Check your RLS policies
3. **Data not appearing**: Verify your project IDs match between localStorage and database
4. **Async/await errors**: Make sure all function calls are properly awaited

### Debug Steps:

1. Check browser console for errors
2. Verify Supabase connection in Network tab
3. Check Supabase logs in your dashboard
4. Test individual functions in browser console

## Benefits of Supabase Migration

- **Persistence**: Data survives browser clears and device changes
- **Scalability**: Handle large amounts of project history
- **Collaboration**: Multiple users can access the same data
- **Backup**: Automatic data backup and recovery
- **Real-time**: Potential for real-time updates across users
- **Security**: Row-level security and user authentication

## Next Steps

1. Run the database schema updates
2. Test the migration script
3. Update your application code
4. Test thoroughly
5. Deploy to production
6. Monitor for any issues

Your project history feature is now fully integrated with Supabase! 🎉
