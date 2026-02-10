# IMMEDIATE ACTION REQUIRED: Apply Database Migration

## The Problem

The "Return to Writer/Artist" feature requires new columns in the `projects` table that don't exist yet. This causes a 400 Bad Request error.

## The Solution

Run the migration SQL file to add these columns.

## QUICK START (30 seconds)

### Step 1: Open Supabase Dashboard

1. Go to: https://app.supabase.com
2. Log in with your account
3. Select your **CAMS** project

### Step 2: Run the SQL Migration

1. Click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy contents of: `server/database/migrations/add_return_tracking_columns.sql`
4. Paste into the editor
5. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Success

- You should see: "Query executed successfully"
- No red error messages
- Check the console shows multiple "IF NOT EXISTS" operations

## What Gets Added

- 5 new tracking fields for each role (Section Head, Technical Editor, Creative Director, Editor-in-Chief, Chief Adviser)
- Total: 20 new columns (4 per role)
- Example: `returned_by_technical_editor`, `returned_by_technical_editor_date`, etc.

## Then What?

After running the migration:

1. Refresh the app in your browser
2. Try the "Return to Writer/Artist" feature again
3. It should work without errors ✅

## If You Get an Error

- **Error: "Column already exists"** → That's fine, migration uses IF NOT EXISTS
- **Error: "Permission denied"** → You need admin access to Supabase project
- **Other error** → Copy the error message and share it

## File Locations

- Migration SQL: `server/database/migrations/add_return_tracking_columns.sql`
- Full Guide: `RETURN_TRACKING_MIGRATION.md`
- Related Code:
  - `src/views/system/SectionHeadView.vue`
  - `src/views/system/TechnicalEditorView.vue`

---

**⚠️ Important**: This migration must be run BEFORE the return feature will work!
