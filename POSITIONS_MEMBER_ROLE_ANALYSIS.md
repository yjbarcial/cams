# Positions vs Project Member Role - Schema Duplication Analysis

## Three Column Confusion

Your system has THREE columns that seem to track writer/artist roles, which is causing confusion:

### 1. **profiles.positions_label** (TEXT)

**Current Values:** 'Writer', 'News Writer', 'Feature Writer', 'Literary Writer', 'Sports Writer', 'Opinion Writer', 'Layout Artist', 'Illustrator', 'Photojournalist', 'Videographer', etc.

**Purpose:** Describes the user's actual position/job title  
**Data Type:** TEXT (descriptive, with capitalization: 'Writer' or 'Layout Artist')  
**Populated By:** SUPABASE_PROFILES_SETUP.sql (line 129)  
**Used In:**

- `src/views/system/AddProjectView.vue` (lines 82, 85) - Filters for writers and artists
- Display purposes

**Example from database:**

```sql
('Lex Zyrreh Devonnaire D.', 'Abellanosa', ..., 'Layout Artist', ...)
('Nissi Y.', 'Abes', ..., 'News Writer', ...)
('Jellan S.', 'Denonong', ..., 'Literary Writer', ...)
```

---

### 2. **profiles.project_member_role** ⚠️ **DOES NOT EXIST - BUG!**

**Status:** Referenced in INSERT but column was never created

**Where It's Referenced:**

- `SUPABASE_PROFILES_SETUP.sql` line 131 - INSERT statement tries to add it
- `SUPABASE_PROFILES_SETUP.sql` line 189 - ON CONFLICT tries to update it

**Where NOT Created:**

- No `ALTER TABLE public.profiles ADD COLUMN project_member_role` statement exists
- This will cause INSERT errors!

**Why Added to INSERT:**

```sql
-- Line 124: "Upsert profiles with project_member_role"
INSERT INTO public.profiles (
  positions_label,
  designation_label,
  project_member_role,  ← WRONG - this column doesn't exist!
  status,
  role
)
```

**Values Attempted:**

```sql
('Layout Artist', 'Senior Graphic Designer', 'artist', ...,)  ← 'artist' for project_member_role
('News Writer', 'Circulations Manager', 'writer', ...,)       ← 'writer' for project_member_role
```

---

### 3. **project_members.role** (project_member_role ENUM) ✅ CORRECT

**Uses the ENUM:** `'writer'`, `'artist'`, `'reviewer'`, `'contributor'` (lowercase)

**Data Type:** Enum  
**Table Location:** `project_members` table (NOT profiles table!)  
**Created By:** Line 417-419 and 439 in SUPABASE_PROFILES_SETUP.sql

**Purpose:** Tracks what role a user has in a SPECIFIC project

**Used In Code:**

```javascript
// src/views/system/SectionHeadView.vue lines 431, 439
.filter((m) => m.role === 'writer')    ← Filters project_members by their role
.filter((m) => m.role === 'artist')

// src/views/system/AddProjectView.vue lines 82, 85
u.role === 'writer'  ← INCORRECTLY checking user.role (system role, not project member role)
u.role === 'artist'  ← INCORRECTLY checking user.role (system role, not project member role)
```

**Database Schema:**

```sql
CREATE TABLE IF NOT EXISTS public.project_members (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT REFERENCES public.projects(id),
  user_id BIGINT REFERENCES public.profiles(id),
  role project_member_role,    ← 'writer', 'artist', 'reviewer', 'contributor'
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN,
  ...
);
```

---

## The Conceptual Problem

```
┌─────────────────────────────────────────────────────────────────┐
│ User Profile                                                    │
├─────────────────────────────────────────────────────────────────┤
│ id: 1                                                           │
│ name: "Lex Zyrreh Devonnaire D. Abellanosa"                    │
│ email: "lexzyrrehdevonnaire.abellanosa@carsu.edu.ph"           │
├─────────────────────────────────────────────────────────────────┤
│ System Authorization Level:                                     │
│   role = 'member'  ← Used for access control                  │
│                                                                │
│ Job Title/Position:                                            │
│   positions_label = 'Layout Artist'  ← Their actual position  │
│   designation_label = 'Senior Graphic Designer'                │
│                                                                │
│ (Missing):                                                      │
│   project_member_role = MISSING  ← Doesn't exist!            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ joins projects
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Project Members Junction Table                                  │
├─────────────────────────────────────────────────────────────────┤
│ id: 101                                                         │
│ project_id: 5  (Magazine Issue #3)                            │
│ user_id: 1  (Lex Zyrreh)                                       │
│ role = 'artist'  ← Their role in THIS specific project       │
│ joined_at: 2026-02-08                                          │
│ is_active: TRUE                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Where Each Is Used

### profiles.positions_label (TEXT)

```javascript
// AddProjectView.vue line 82 - CORRECT
users.value.writers = allUsers.filter(
  (u) => u.positions_label === 'Writer'  ✅ Works - positions_label has "Writer"
)

// AddProjectView.vue line 82 - INCORRECT fallback
users.value.writers = allUsers.filter(
  (u) => u.role === 'writer'  ❌ Never matches - role is 'member', not 'writer'
)
```

**Problem:** Filter tries 3 different ways to find writers:

1. `u.positions_label === 'Writer'` ✅ Might work (but positions_label varies: 'News Writer', 'Literary Writer', etc.)
2. `u.role === 'writer'` ❌ Never works (role is always 'member' for writers)
3. `u.role === 'Writer'` ❌ Never works (role is always 'member' for writers)

---

### project_members.role (ENUM: 'writer'/'artist')

```javascript
// SectionHeadView.vue line 431 - CORRECT
project.project_members
  .filter((m) => m.role === 'writer')  ✅ Correct - project_members.role = 'writer'

// TechnicalEditorView.vue line 434 - CORRECT
.filter((m) => m.role === 'writer')  ✅ Correct - project_members.role = 'writer'
```

**This works correctly** because it's filtering the actual project_members data, and `m` is the project member record with a `role` field that can be 'writer', 'artist', etc.

---

## The Bugs & Issues

### 🔴 **Critical Bug: Profiles table INSERT references non-existent column**

**File:** `SUPABASE_PROFILES_SETUP.sql` lines 124-131

```sql
INSERT INTO public.profiles (
  first_name,
  last_name,
  email,
  positions_label,
  designation_label,
  project_member_role,  ← COLUMN DOES NOT EXIST IN PROFILES TABLE!
  status,
  role
) VALUES
  ('Lex Zyrreh Devonnaire D.', 'Abellanosa', ..., 'artist', 'active', 'member'),
```

**Error This Causes:**

```
ERROR:  column "project_member_role" of relation "profiles" does not exist
```

**Fix:** Either add the column:

```sql
ALTER TABLE public.profiles ADD COLUMN project_member_role TEXT;
```

OR remove from INSERT (recommended - this belongs in project_members, not profiles):

```sql
INSERT INTO public.profiles (
  first_name,
  last_name,
  email,
  positions_label,      ← Keep this
  designation_label,
  -- project_member_role,  ← Remove this line
  status,
  role
) VALUES
```

---

### 🟡 **Medium Bug: AddProjectView.vue checks user.role for writer/artist**

**File:** `src/views/system/AddProjectView.vue` lines 82, 85

```javascript
users.value.writers = allUsers.filter(
  (u) => u.positions_label === 'Writer' || u.role === 'writer' || u.role === 'Writer',
  //     ✅ Works                         ❌ Never true         ❌ Never true
)

users.value.artists = allUsers.filter(
  (u) => u.positions_label === 'Artist' || u.role === 'artist' || u.role === 'Artist',
  //     ⚠️ Might work                    ❌ Never true         ❌ Never true
)
```

**Problem:**

- User system role is always 'admin', 'editor', 'section_head', or 'member'
- Never 'writer' or 'artist'
- The `u.role === 'writer'` checks never match

**Real Example from Database:**

```
User: Nissi Y. Abes
  positions_label: 'News Writer'  ← Searched by filter
  role: 'member'                  ← What filter is incorrectly checking for 'writer'
```

**Better Filter Logic:**

```javascript
// Option 1: Filter by positions_label only (simplest)
users.value.writers = allUsers.filter((u) => u.positions_label?.toLowerCase().includes('writer'))

// Option 2: Add project_member_role to profiles (schema change)
users.value.writers = allUsers.filter(
  (u) => u.positions_label?.toLowerCase().includes('writer') || u.project_member_role === 'writer',
)
```

---

### 🟡 **Medium Bug: Inconsistent capitalization in positions_label**

**Database has:**

```sql
'Layout Artist'      -- Capitalized
'News Writer'        -- Capitalized
'Literary Writer'    -- Capitalized
'Illustrator'        -- Capitalized
'Videographer'       -- Capitalized
'Photojournalist'    -- Capitalized
'Feature Writer'     -- Capitalized
'Opinion Writer'     -- Capitalized
'Sports Writer'      -- Capitalized
```

**But filter checks:**

```javascript
u.positions_label === 'Writer'  ← Will NEVER match "News Writer", "Literary Writer", etc.
u.positions_label === 'Artist'  ← Will NEVER match "Layout Artist", "Illustrator", etc.
```

**Fix:** Use substring matching:

```javascript
u.positions_label?.toLowerCase().includes('writer')   ← Matches "News Writer", "Literary Writer"
u.positions_label?.toLowerCase().includes('artist') ||
u.positions_label?.toLowerCase().includes('illustrator') ||
u.positions_label?.toLowerCase().includes('videographer') ||
u.positions_label?.toLowerCase().includes('photojournalist')
```

---

## Current Data State

### In profiles table:

```sql
SELECT email, positions_label, designation_label, role FROM profiles LIMIT 5;

lexzyrrehdevonnaire.abellanosa@carsu.edu.ph  | 'Layout Artist' | 'Senior Graphic Designer' | member
nissi.abes@carsu.edu.ph                      | 'News Writer'   | 'Circulations Manager'   | member
jellanaille.denonong@carsu.edu.ph            | 'Literary Writer'| 'Technical Editor'      | member
peterlorenzo.calo@carsu.edu.ph               | 'Photojournalist'| 'Creative Director'     | member
```

**Observation:**

- Everyone has `role = 'member'` (except section heads and editors)
- `positions_label` contains the actual position (sometimes with specific type)
- `designation_label` contains the job position/title

---

## Three-Column Relationship Summary

| Column                  | Table           | Data Type                | Example Values                                         | Purpose                  |
| ----------------------- | --------------- | ------------------------ | ------------------------------------------------------ | ------------------------ |
| **role**                | profiles        | user_role enum           | 'admin', 'editor', 'section_head', 'member'            | SYSTEM ACCESS LEVEL      |
| **positions_label**     | profiles        | TEXT                     | 'News Writer', 'Layout Artist', 'Photographer'         | JOB POSITION/TITLE       |
| **project_member_role** | project_members | project_member_role enum | 'writer', 'artist', 'reviewer', 'contributor'          | ROLE IN SPECIFIC PROJECT |
| **designation_label**   | profiles        | TEXT                     | 'Editor-in-Chief', 'Technical Editor', 'Chief Adviser' | JOB DESIGNATION          |

---

## Files Containing These Issues

| File                                | Issue                                              | Line(s)             |
| ----------------------------------- | -------------------------------------------------- | ------------------- |
| SUPABASE_PROFILES_SETUP.sql         | INSERT to non-existent column                      | 124-189             |
| SUPABASE_PROFILES_SETUP.sql         | Missing CREATE for project_member_role in profiles | N/A (never created) |
| src/views/system/AddProjectView.vue | Checks user.role for writer/artist (wrong field)   | 82, 85              |
| src/views/system/AddProjectView.vue | Filter doesn't match exact positions_label values  | 82, 85              |

---

## Recommended Fixes

### Priority 1: Fix SQL INSERT Bug

Remove `project_member_role` from profiles table INSERT since that column doesn't exist

### Priority 2: Fix AddProjectView Filter

Replace `u.role === 'writer'` checks with proper `positions_label` substring matching

### Priority 3: Consider Schema Redesign

Either:

1. Add `project_member_role` to profiles table (currently only in project_members)
2. OR create separate "positions" enum for writer/artist distinction in profiles

### Priority 4: Standardize Capitalization

Use consistent case for positions_label values (all lowercase with proper case for display)
