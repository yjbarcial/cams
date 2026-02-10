# Return Tracking Migration Guide

## Overview

This migration adds columns to the `projects` table to track when and why projects are returned by different approval roles (Section Head, Technical Editor, Creative Director, Editor-in-Chief, Chief Adviser).

## Why This is Needed

When implementing the "Return to Writer/Artist" feature, we need to track:

- WHO returned the project (user ID)
- WHEN they returned it (timestamp)
- WHY they returned it (comments/reason)
- A flag indicating it was returned

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended for Users)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the SQL from `server/database/migrations/add_return_tracking_columns.sql`
6. Click **Run** button

### Option 2: Using Supabase CLI (For Developers)

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref stticfxjctyfnpvxjinr

# Apply the migration
supabase db pull  # Download schema first
supabase migration up
```

### Option 3: Direct SQL (If you have direct database access)

Connect to your PostgreSQL database and run the SQL file directly.

## What Gets Added

### Return Tracking Columns (for each role)

- `returned_by_[role]` - Boolean flag
- `returned_by_[role]_date` - TIMESTAMPTZ (when it was returned)
- `returned_by_[role]_comments` - TEXT (reason/comments)
- `returned_by_[role]_user` - UUID (who returned it)

### Affected Roles

- Section Head
- Technical Editor
- Creative Director
- Editor-in-Chief
- Chief Adviser

## Columns Added

### For Section Head:

```
returned_by_section_head (BOOLEAN)
returned_by_section_head_date (TIMESTAMPTZ)
returned_by_section_head_comments (TEXT)
returned_by_section_head_user (UUID)
```

### For Technical Editor:

```
returned_by_technical_editor (BOOLEAN)
returned_by_technical_editor_date (TIMESTAMPTZ)
returned_by_technical_editor_comments (TEXT)
returned_by_technical_editor_user (UUID)
```

### For Creative Director:

```
returned_by_creative_director (BOOLEAN)
returned_by_creative_director_date (TIMESTAMPTZ)
returned_by_creative_director_comments (TEXT)
returned_by_creative_director_user (UUID)
```

### For Editor-in-Chief:

```
returned_by_editor_in_chief (BOOLEAN)
returned_by_editor_in_chief_date (TIMESTAMPTZ)
returned_by_editor_in_chief_comments (TEXT)
returned_by_editor_in_chief_user (UUID)
```

### For Chief Adviser:

```
returned_by_chief_adviser (BOOLEAN)
returned_by_chief_adviser_date (TIMESTAMPTZ)
returned_by_chief_adviser_comments (TEXT)
returned_by_chief_adviser_user (UUID)
```

## Indexes Added

Indexes are created for better query performance when filtering returned projects:

- `idx_projects_returned_by_section_head`
- `idx_projects_returned_by_technical_editor`
- `idx_projects_returned_by_creative_director`
- `idx_projects_returned_by_editor_in_chief`
- `idx_projects_returned_by_chief_adviser`

## Testing After Migration

After applying the migration, test the return functionality:

1. Go to SectionHeadView
2. Click "Request to Edit" button
3. Add comments
4. Submit
5. Check that the project status updates to `returned_by_section_head`
6. Verify notification is sent to writer/artist
7. Check database that the new columns are populated

## Rollback (If Needed)

If you need to undo this migration:

```sql
ALTER TABLE projects
DROP COLUMN IF EXISTS returned_by_section_head,
DROP COLUMN IF EXISTS returned_by_section_head_date,
DROP COLUMN IF EXISTS returned_by_section_head_comments,
DROP COLUMN IF EXISTS returned_by_section_head_user,
DROP COLUMN IF EXISTS returned_by_technical_editor,
DROP COLUMN IF EXISTS returned_by_technical_editor_date,
DROP COLUMN IF EXISTS returned_by_technical_editor_comments,
DROP COLUMN IF EXISTS returned_by_technical_editor_user,
DROP COLUMN IF EXISTS returned_by_creative_director,
DROP COLUMN IF EXISTS returned_by_creative_director_date,
DROP COLUMN IF EXISTS returned_by_creative_director_comments,
DROP COLUMN IF EXISTS returned_by_creative_director_user,
DROP COLUMN IF EXISTS returned_by_editor_in_chief,
DROP COLUMN IF EXISTS returned_by_editor_in_chief_date,
DROP COLUMN IF EXISTS returned_by_editor_in_chief_comments,
DROP COLUMN IF EXISTS returned_by_editor_in_chief_user,
DROP COLUMN IF EXISTS returned_by_chief_adviser,
DROP COLUMN IF EXISTS returned_by_chief_adviser_date,
DROP COLUMN IF EXISTS returned_by_chief_adviser_comments,
DROP COLUMN IF EXISTS returned_by_chief_adviser_user;
```

## Questions?

If you have issues:

1. Check that you have the correct Supabase project selected
2. Ensure you have `SUPERUSER` or database modification permissions
3. Check browser console for any SQL errors
4. Verify all previous migrations have been applied

## References

- Related Files:
  - `src/views/system/SectionHeadView.vue` - Uses these columns
  - `src/views/system/TechnicalEditorView.vue` - Uses these columns
  - `src/services/notificationsService.js` - Sends notifications for returns
