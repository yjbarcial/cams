# 🔧 Fixing CAMS Project Creation & Profile Issues

## Issues Identified

### 1. **Profiles Table Issue**

**Error:** `Could not find the 'role' column of 'profiles' in the schema cache`

**Root Cause:** Your Supabase database doesn't have the profiles table properly configured with the correct columns and ENUM types.

### 2. **Project Creation Failure**

**Error:** `400 Bad Request` when creating projects

**Root Cause:** Mismatch between the data being sent and the Supabase schema expectations:

- Code was sending `section_head` (string) but schema expects `section_head_id` (bigint)
- Code was using invalid role values like `'contributor'` instead of valid enum values

## ✅ Changes Made

### 1. Fixed `autoAddUser.js`

Changed the default role from `'contributor'` to `'member'` (a valid enum value).

**Valid user roles:**

- `admin`
- `editor`
- `section_head`
- `member`
- `viewer`

### 2. Fixed `AddProjectView.vue`

Changed `section_head` to `section_head_id` and ensured it's an integer.

### 3. Created `SUPABASE_PROFILES_SETUP.sql`

A comprehensive SQL script to set up the profiles table correctly in Supabase.

## 🚀 Steps to Fix Your Supabase Database

### Step 1: Run the Profiles Table Setup

1. Open your **Supabase Dashboard**
2. Go to the **SQL Editor**
3. Open the file `SUPABASE_PROFILES_SETUP.sql` from your project
4. Copy and paste the entire SQL script into the Supabase SQL Editor
5. Click **Run** to execute the script

This will:

- Create the `user_role` and `user_status` ENUM types
- Create or update the `profiles` table with all required columns
- Set up Row Level Security (RLS) policies
- Create necessary indexes
- Grant proper permissions

### Step 2: Verify the Schema

After running the SQL script, verify your setup by running this query in the SQL Editor:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

You should see columns including:

- `id` (bigint)
- `email` (character varying)
- `role` (USER-DEFINED)
- `status` (USER-DEFINED)
- `first_name` (text)
- `last_name` (text)
- etc.

### Step 3: Refresh Supabase Schema Cache

Sometimes Supabase's schema cache needs to be refreshed:

1. In Supabase Dashboard, go to **Settings** → **Database**
2. Scroll down and click **Reset Database Pool** (this doesn't delete data, just refreshes connections)

OR simply wait a few minutes for the cache to refresh automatically.

### Step 4: Test the Application

1. **Clear your browser cache** (or open in incognito mode)
2. **Log in** to the application
3. Try creating a new project (e.g., Magazine, Newsletter, etc.)
4. It should now work without 400 errors

## 📋 Expected Project Schema in Supabase

Your `projects` table should have these columns:

```sql
CREATE TABLE public.projects (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title character varying NOT NULL,
  description text,
  project_type project_type NOT NULL,  -- ENUM
  status project_status DEFAULT 'draft',  -- ENUM
  priority priority_level,  -- ENUM (optional)
  start_date date,
  due_date date,
  completed_at timestamp with time zone,
  section_head_id bigint REFERENCES profiles(id),  -- ⚠️ THIS IS KEY
  created_by bigint REFERENCES profiles(id),
  updated_at timestamp with time zone,
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);
```

**Important:** Note that `section_head_id` is a foreign key to the `profiles` table, not a text field.

## 🔍 Troubleshooting

### If you still get 400 errors:

1. **Check Browser Console:**
   - Look for detailed error messages
   - Note which field is causing the issue

2. **Check Supabase API Logs:**
   - Go to Supabase Dashboard → **Logs** → **API**
   - Look for the failed POST request
   - Check the error details

3. **Verify ENUM Types:**
   Run this query to see all ENUM types:

   ```sql
   SELECT t.typname, e.enumlabel
   FROM pg_type t
   JOIN pg_enum e ON t.oid = e.enumtypid
   WHERE t.typname IN ('user_role', 'user_status', 'project_type', 'project_status')
   ORDER BY t.typname, e.enumsortorder;
   ```

4. **Check Row Level Security:**
   If you get permission errors, temporarily disable RLS for testing:

   ```sql
   ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
   ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
   ```

   **⚠️ Remember to re-enable it after testing!**

### If profiles still don't work:

Check if users exist in the profiles table:

```sql
SELECT id, email, role, status FROM public.profiles LIMIT 10;
```

If no users exist, you may need to manually add the admin users:

```sql
INSERT INTO public.profiles (email, role, status, first_name, last_name)
VALUES
  ('lovellhudson.clavel@carsu.edu.ph', 'admin', 'active', 'Lovell', 'Clavel'),
  ('yssahjulianah.barcial@carsu.edu.ph', 'admin', 'active', 'Yssah', 'Barcial'),
  ('altheaguila.gorres@carsu.edu.ph', 'admin', 'active', 'Althea', 'Gorres')
ON CONFLICT (email) DO NOTHING;
```

## 📝 Summary

**Files Changed:**

1. ✅ `src/utils/autoAddUser.js` - Fixed to use valid role enum value
2. ✅ `src/views/system/AddProjectView.vue` - Fixed to use `section_head_id` instead of `section_head`
3. ✅ Created `SUPABASE_PROFILES_SETUP.sql` - Setup script for Supabase database

**Next Steps:**

1. Run `SUPABASE_PROFILES_SETUP.sql` in Supabase SQL Editor
2. Verify the schema
3. Refresh the application
4. Test project creation

Your application should now work correctly! 🎉
