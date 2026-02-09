# Content Administrator Access Fix - Complete Guide

## Problem Summary

Content administrators (Technical Editor, Creative Director, Editor-in-Chief, Archival Managers) could not access projects for approval because:

1. Their emails were defined in `autoAddUser.js` but not checked in the `getUserRole()` function
2. They were not being assigned the 'editor' role
3. Database records had incorrect `designation_label` values
4. **Foreign key constraint issue**: The `designation_label` column had a foreign key constraint to a `designations` table, but the required values didn't exist, causing insert/update failures

## Approval Workflow Process

The correct approval hierarchy is:

1. **Section Head** → Approves/rejects from their section
2. **Technical Editor** (jonee.elopre@carsu.edu.ph) → Reviews technical aspects
3. **Creative Director** (levibrian.cejuela@carsu.edu.ph) → Reviews creative aspects
4. **Editor-in-Chief** (melede.ganoy@carsu.edu.ph) → Final editorial review
5. **Chief Adviser** (optional) → Advisory review
6. **Archival Manager** (julesleo.reserva@carsu.edu.ph, eizzielmarie.bacoy@carsu.edu.ph) → Archives and publishes

## Changes Made

### 1. Fixed `autoAddUser.js` (Client-Side Role Assignment)

#### Added `getDesignationLabel()` function

```javascript
function getDesignationLabel(email) {
  const normalizedEmail = email.toLowerCase()

  if (TECHNICAL_EDITOR_EMAILS.includes(normalizedEmail)) {
    return 'Technical Editor'
  }
  if (CREATIVE_DIRECTOR_EMAILS.includes(normalizedEmail)) {
    return 'Creative Director'
  }
  if (EDITOR_IN_CHIEF_EMAILS.includes(normalizedEmail)) {
    return 'Editor-in-Chief'
  }
  if (CHIEF_ADVISER_EMAILS.includes(normalizedEmail)) {
    return 'Chief Adviser'
  }
  if (ARCHIVAL_MANAGER_EMAILS.includes(normalizedEmail)) {
    return 'Archival Manager'
  }

  return null
}
```

#### Updated `getUserRole()` function

Now checks ALL content administrator email lists:

```javascript
// 2. Content Administrators - EIC, Technical Editor, Creative Director, Chief Adviser, Archive Managers
if (
  EDITOR_IN_CHIEF_EMAILS.includes(normalizedEmail) ||
  TECHNICAL_EDITOR_EMAILS.includes(normalizedEmail) ||
  CREATIVE_DIRECTOR_EMAILS.includes(normalizedEmail) ||
  CHIEF_ADVISER_EMAILS.includes(normalizedEmail) ||
  ARCHIVAL_MANAGER_EMAILS.includes(normalizedEmail) ||
  EDITOR_EMAILS.includes(normalizedEmail)
) {
  return 'editor'
}
```

#### Updated `getAccessRole()` function

Now checks email first, then falls back to designation_label:

```javascript
function getAccessRole(userRole, email, designationLabel) {
  // Check specific email lists first for precise role assignment
  if (TECHNICAL_EDITOR_EMAILS.includes(normalizedEmail)) {
    return 'technical_editor'
  }
  if (CREATIVE_DIRECTOR_EMAILS.includes(normalizedEmail)) {
    return 'creative_director'
  }
  // ... etc
}
```

#### Updated profile creation/update logic

Now sets `designation_label` when creating or updating profiles:

```javascript
const designationLabel = getDesignationLabel(user.email)

// When creating new user
const newUser = {
  email: user.email,
  role: userRole,
  status: 'active',
  last_active: new Date().toISOString(),
}

if (designationLabel) {
  newUser.designation_label = designationLabel
}
```

### 2. Fixed `TechnicalEditorView.vue`

Changed from checking `role` field to checking `accessRole` from localStorage:

**Before:**

```javascript
const isTechnicalEditor = computed(() => {
  if (currentUserRole.value === 'Technical Editor') return true // ❌ Wrong
  // ...
})
```

**After:**

```javascript
const currentAccessRole = computed(() => localStorage.getItem('accessRole') || '')

const isTechnicalEditor = computed(() => {
  if (currentAccessRole.value === 'technical_editor') return true // ✅ Correct
  // ...
})
```

### 3. Updated Database Schema SQL

Fixed the `SUPABASE_PROFILES_SETUP.sql` to have correct values:

| User                | Email                           | Role     | Designation Label |
| ------------------- | ------------------------------- | -------- | ----------------- |
| Jonee Elopre        | jonee.elopre@carsu.edu.ph       | `editor` | Technical Editor  |
| Levi Brian Cejuela  | levibrian.cejuela@carsu.edu.ph  | `editor` | Creative Director |
| Melede Ganoy        | melede.ganoy@carsu.edu.ph       | `editor` | Editor-in-Chief   |
| Jules Leo Reserva   | julesleo.reserva@carsu.edu.ph   | `editor` | Archival Manager  |
| Eizziel Marie Bacoy | eizzielmarie.bacoy@carsu.edu.ph | `editor` | Archival Manager  |

### 4. Created Migration SQL

Created `UPDATE_CONTENT_ADMIN_ROLES.sql` to update existing database records.

## How to Deploy These Fixes

### Step 1: Run the Database Migration

1. Open Supabase SQL Editor
2. Run the migration script to remove the foreign key constraint and update roles:

```sql
-- File: UPDATE_CONTENT_ADMIN_ROLES.sql

-- STEP 1: Remove foreign key constraint on designation_label
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'profiles_designation_label_fkey'
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_designation_label_fkey;
        RAISE NOTICE 'Dropped foreign key constraint profiles_designation_label_fkey';
    END IF;
END $$;

-- STEP 2: Update Technical Editor
UPDATE public.profiles
SET
  role = 'editor',
  designation_label = 'Technical Editor',
  updated_at = NOW()
WHERE email = 'jonee.elopre@carsu.edu.ph';

-- Update Creative Director
UPDATE public.profiles
SET
  role = 'editor',
  designation_label = 'Creative Director',
  updated_at = NOW()
WHERE email = 'levibrian.cejuela@carsu.edu.ph';

-- Update Editor-in-Chief
UPDATE public.profiles
SET
  role = 'editor',
  designation_label = 'Editor-in-Chief',
  updated_at = NOW()
WHERE email = 'melede.ganoy@carsu.edu.ph';

-- Update Archival Managers
UPDATE public.profiles
SET
  role = 'editor',
  designation_label = 'Archival Manager',
  updated_at = NOW()
WHERE email IN ('julesleo.reserva@carsu.edu.ph', 'eizzielmarie.bacoy@carsu.edu.ph');

-- Verify the updates
SELECT
  id,
  first_name,
  last_name,
  email,
  role,
  designation_label,
  status
FROM public.profiles
WHERE email IN (
  'jonee.elopre@carsu.edu.ph',
  'levibrian.cejuela@carsu.edu.ph',
  'melede.ganoy@carsu.edu.ph',
  'julesleo.reserva@carsu.edu.ph',
  'eizzielmarie.bacoy@carsu.edu.ph'
)
ORDER BY
  CASE email
    WHEN 'jonee.elopre@carsu.edu.ph' THEN 1
    WHEN 'levibrian.cejuela@carsu.edu.ph' THEN 2
    WHEN 'melede.ganoy@carsu.edu.ph' THEN 3
    WHEN 'julesleo.reserva@carsu.edu.ph' THEN 4
    WHEN 'eizzielmarie.bacoy@carsu.edu.ph' THEN 5
  END;
```

3. Verify the results show all 5 users with:
   - `role = 'editor'`
   - Correct `designation_label`
   - `status = 'active'`

### Step 2: Add Approval Tracking Columns to Projects Table

The projects table needs approval tracking columns for the complete workflow. Run this migration:

```sql
-- File: ADD_APPROVAL_COLUMNS.sql
-- This adds ALL approval columns needed for the workflow

-- SECTION HEAD APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS section_head_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS section_head_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS section_head_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_section_head_comments TEXT;

-- TECHNICAL EDITOR APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_editor_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_editor_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS technical_editor_comments TEXT;

-- CREATIVE DIRECTOR APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS creative_director_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS creative_director_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS creative_director_comments TEXT;

-- EDITOR-IN-CHIEF (EIC) APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eic_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eic_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS eic_comments TEXT;

-- CHIEF ADVISER APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chief_adviser_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chief_adviser_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS chief_adviser_comments TEXT;

-- ARCHIVAL MANAGER APPROVAL
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archival_manager_approved_by UUID REFERENCES auth.users(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archival_manager_approved_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archival_manager_comments TEXT;

-- RETURN TRACKING
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_technical_editor_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_creative_director_comments TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_eic BOOLEAN DEFAULT FALSE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_eic_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS returned_by_eic_comments TEXT;

-- WORKFLOW TRACKING
ALTER TABLE projects ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'Medium';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS submitted_date TIMESTAMPTZ;
```

### Step 3: Deploy Code Changes

The following files have been updated and need to be deployed:

1. **`src/utils/autoAddUser.js`** - Core role assignment logic
2. **`src/views/system/TechnicalEditorView.vue`** - Fixed role checking
3. **`SUPABASE_PROFILES_SETUP.sql`** - Updated for future resets
4. **`ADD_APPROVAL_COLUMNS.sql`** - New migration for approval tracking columns

### Step 4: Test Each Content Administrator

Have each content administrator log out and log back in:

1. **Jonee Elopre** (Technical Editor)
   - Should see technical editor approval pages
   - Should be able to access projects with status `to_technical_editor`

2. **Levi Brian Cejuela** (Creative Director)
   - Should see creative director approval pages
   - Should be able to access projects with status `to_creative_director`

3. **Melede Ganoy** (Editor-in-Chief)
   - Should see EIC approval pages
   - Should be able to access projects with status `to_editor_in_chief`

4. **Jules Leo Reserva & Eizziel Marie Bacoy** (Archival Managers)
   - Should see archival manager pages
   - Should be able to publish approved projects

### Step 5: Verify localStorage Values

After login, check browser console for each user:

```javascript
localStorage.getItem('userRole') // Should be 'editor'
localStorage.getItem('accessRole') // Should be their specific role:
// 'technical_editor'
// 'creative_director'
// 'editor_in_chief'
// 'archival_manager'
```

## Understanding the Role System

### Database Fields

- **`role`**: Primary role in system (`admin`, `editor`, `section_head`, `member`)
  - Content administrators all have `role = 'editor'`
  - This gives them access to the editorial workflow

- **`designation_label`**: Specific position/title
  - "Technical Editor", "Creative Director", "Editor-in-Chief", etc.
  - Used for display purposes and specific permissions

### Client-Side (localStorage)

- **`userRole`**: Matches database `role` field
- **`accessRole`**: More specific role for route guards
  - Derived from email and designation_label
  - Used by Vue Router guards to control page access

### Route Protection

Routes are protected by guards in `src/router/index.js`:

- `/technical-editor/:id` → requires `accessRole === 'technical_editor'`
- `/creative-director/:id` → requires `accessRole === 'creative_director'`
- `/editor-in-chief/:id` → requires `accessRole === 'editor_in_chief'`
- `/archival-manager/:id` → requires `accessRole === 'archival_manager'`

## Troubleshooting

### User still can't access approval pages

1. **Check database**:

   ```sql
   SELECT email, role, designation_label, status
   FROM profiles
   WHERE email = 'user@carsu.edu.ph';
   ```

   - Verify `role = 'editor'`
   - Verify correct `designation_label`
   - Verify `status = 'active'`

2. **Check localStorage** (Browser Console):

   ```javascript
   console.log({
     userRole: localStorage.getItem('userRole'),
     accessRole: localStorage.getItem('accessRole'),
     userEmail: localStorage.getItem('userEmail'),
   })
   ```

   - Should show `userRole: 'editor'`
   - Should show correct `accessRole`

3. **Force re-login**:
   - Have user completely log out
   - Clear browser cache/localStorage
   - Log back in
   - Check console logs for role assignment

4. **Check autoAddUser console logs**:
   - Open browser console during login
   - Look for: `👤 Role assigned: editor (Technical Editor)`
   - Look for: `🔑 Access role: technical_editor`

### Project not visible in approval queue

Check project status matches the approver:

- Technical Editor sees: `to_technical_editor`
- Creative Director sees: `to_creative_director`
- Editor-in-Chief sees: `to_editor_in_chief`
- Archival Manager sees: `approved` or ready to archive

## Summary

✅ All content administrators now get `role = 'editor'`  
✅ They get specific `accessRole` based on their email  
✅ They have correct `designation_label` in database  
✅ Route guards properly check `accessRole`  
✅ Views correctly check against `accessRole`

The approval workflow should now work correctly with all content administrators able to access their respective approval pages.
