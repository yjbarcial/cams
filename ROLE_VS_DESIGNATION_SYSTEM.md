# Comprehensive Role vs Designation System Scan

## Database Structure

### profiles table has TWO separate fields:

1. **`role` (user_role enum)** - System role for access control
   - Possible values: `'admin'`, `'editor'`, `'section_head'`, `'member'`, `'viewer'`
   - Set by: `src/utils/autoAddUser.js` based on email matching
   - Used for: Authorization, route guards, view access control

2. **`designation_label` (TEXT)** - Job title/position
   - Values: 'Technical Editor', 'Editor-in-Chief', 'Chief Adviser', 'Archival Manager', 'Creative Director', etc.
   - Set by: `SUPABASE_PROFILES_SETUP.sql` during profile creation
   - Used for: Notification routing, display names, UI labels

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  User Login @ Supabase Auth                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  autoAddUser.js - getUserRole()                │
│  ✓ Checks: email against role email lists      │
│  ✓ Returns: 'admin' | 'editor' | 'section_head'│
│            | 'member'                           │
│  ✓ Stores in: localStorage('userRole')         │
│  ✓ Stores in: profiles.role                    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│  profiles table (Database)                      │
│  - role: 'editor' (broad)                      │
│  - designation_label: 'Technical Editor'       │
│    (specific position)                         │
└─────────────────┬───────────────────────────────┘
                  │
          ┌───────┴────────┐
          ▼                ▼
    ┌──────────┐    ┌──────────────────┐
    │ Router   │    │ Views/Services   │
    │ Guards   │    │                  │
    │ (Role)   │    │ (Designation)    │
    └──────────┘    └──────────────────┘
```

---

## The Two Systems in Parallel

### System 1: ROLE (Access Control)

**Where It's Set:**

```
src/utils/autoAddUser.js lines 30-85:
  ADMIN_EMAILS → role = 'admin' (3 users)
  EDITOR_EMAILS → role = 'editor' (5 users)
  SECTION_HEAD_EMAILS → role = 'section_head' (10 users)
  WRITER_EMAILS/ARTIST_EMAILS → role = 'member' (33 users)
```

**Where It's Used:**

1. **Route Guards** (src/router/index.js)
   - `requireEditor` → checks `userRole === 'editor'`
   - `requireSectionHead` → checks `userRole === 'section_head'`
   - `requireMember` → checks `userRole === 'member'`

2. **Project List Filtering** (MagazineView, NewsletterView, FolioView, OtherView)
   - `userRole === 'member'` → Filter to user's projects only
   - `userRole === 'section_head'` → Load all projects
   - `userRole === 'editor'` → Load all projects

3. **localStorage Storage**

   ```javascript
   localStorage.setItem('userRole', role)
   ```

4. **Database**
   ```sql
   profiles table: role column (user_role enum)
   ```

---

### System 2: DESIGNATION_LABEL (Specific Positions)

**Where It's Set:**
In `SUPABASE_PROFILES_SETUP.sql` lines 120-180:

```sql
Users with DESIGNATION_LABELS:
  'Lex Zyrreh Devonnaire D. Abellanosa' → designation_label: 'Senior Graphic Designer'
  'Peter Lorenzo Calo' → 'Creative Director'
  'Jellan S. Denonong' → 'Technical Editor'
  'Jerby Claire M. Factularin' → 'Editor-in-Chief'
  'Melede S. Ganoy' → 'Feature Editor'
  'Jonee R. Elopre Jr.' → 'Managing Editor'
  'Jevan M. Racaza' → 'Associate Managing Editor'
  ... and 40+ others with various positions
```

**Where It's Used:**

1. **Notifications Service** (src/services/notificationsService.js lines 560-585)

   ```javascript
   // Explicitly uses designation_label INSTEAD of role
   // Because: "most profiles have role='member', use designation_label instead"

   const { data: designationProfiles } = await supabase
     .from('profiles')
     .select('email, first_name, last_name, designation_label')
     .eq('designation_label', designation)  ← Uses designation_label!
   ```

   Maps status to designations (lines 622-636):

   ```javascript
   to_section_head: ['Managing Editor', 'Associate Managing Editor']
   to_technical_editor: ['Technical Editor']
   to_creative_director: ['Creative Director']
   to_editor_in_chief: ['Editor-in-Chief']
   to_chief_adviser: ['Chief Adviser']
   to_archival_manager: ['Archival Manager', 'Circulations Manager']
   ```

2. **User Display Service** (src/utils/userDisplay.js lines 20-50)

   ```javascript
   // getRoleSuffix checks BOTH role AND designation_label
   const role = profile.role?.toLowerCase() ||
                profile.designation_label?.toLowerCase()

   if (role.includes('editor-in-chief')) → return ' (Editor-in-Chief)'
   if (role.includes('technical editor')) → return ' (Technical Editor)'
   ```

3. **AddProjectView.vue** (lines 78-79)
   ```javascript
   // Filters users with Editor-in-Chief designation:
   u.designation_label && u.designation_label.toLowerCase().includes('editor-in-chief')
   ```

---

## The Fundamental Problem: Role Mismatch

### What's Happening:

| Position              | Role Assigned    | Problem                                                               |
| --------------------- | ---------------- | --------------------------------------------------------------------- |
| **Technical Editor**  | `'editor'`       | Users need specific tech editor role, but get generic 'editor'        |
| **Creative Director** | `'editor'`       | Users need specific creative role, but get generic 'editor'           |
| **Editor-in-Chief**   | `'editor'`       | Users need specific EIC role, but get generic 'editor'                |
| **Archival Manager**  | `'editor'`       | TWO users get same 'editor' role, can't distinguish them              |
| **Chief Adviser**     | `'editor'`       | Users need specific adviser role, but get generic 'editor'            |
| **Section Head**      | `'section_head'` | ✅ Correct - distinct role per role                                   |
| **Member**            | `'member'`       | ✅ Correct - writers and artists distinguished by project member role |

### Why Designation_Label Was Added:

From `notificationsService.js` comment (line 562):

```javascript
// Skip role-based query since most profiles have role='member'
// Use designation_label instead which is the actual system for role assignment
```

**Translation:** The code recognizes that:

- Everyone except admins, editors, and section heads has `role='member'`
- You can't use `role` to find specific positions
- Must use `designation_label` instead

---

## How Each View Currently Works

### EditorInChiefView.vue

```javascript
// Line 48: HARDCODED - doesn't validate who the user is
const currentUserRole = ref('Editor-in-Chief')

// Expected: Only melede.ganoy@carsu.edu.ph should access
// Actually: ANY user with role='editor' can access
// Issue: No email or designation validation ❌
```

### ChiefAdviserView.vue

```javascript
// Line 48: HARDCODED - doesn't validate
const currentUserRole = ref('Chief Adviser')

// Expected: Only chief adviser user should access
// Actually: ANY user with role='editor' can access
// Issue: Chief Adviser email NOT defined in EDITOR_EMAILS ❌
```

### ArchivalManagerView.vue

```javascript
// Line 48: HARDCODED - doesn't validate
const currentUserRole = ref('Archival Manager')

// Expected: Only archival managers should access
// Actually: ANY user with role='editor' can access
// Issue: Two users get 'editor' role, system can't distinguish them ❌
```

### TechnicalEditorView.vue (Most Complex)

```javascript
// Lines 54-68: Uses PROJECT STATUS to determine role
const currentUserRole = computed(() => {
  const status = project.value?.status

  if (status === 'to_creative_director') {
    return 'Creative Director' // Artist
  }
  return 'Technical Editor' // Writer (default)
})

// Works for: Status-based routing
// Problem: Doesn't validate user is actually tech editor/creative director
// Relies on: Project status being correct ⚠️
```

---

## Where Designation_Label Actually Exists in Database

**Sample users in SUPABASE_PROFILES_SETUP.sql:**

```sql
Admins (these should have role='admin', but profile creation doesn't include them):
  - Yssah Julian Barcial
  - Lovell Hudson Clavel
  - Althea Guila Gorres

Editors with designation_label (but all have role='editor'):
  - Jonee Elopre → 'Managing Editor' (also called out as Tech Editor lead)
  - Levi Brian Cejuela → NULL (marked as Creative Director in autoAddUser.js)
  - Melede Ganoy → 'Feature Editor' (should be 'Editor-in-Chief')
  - Peter Lorenzo Calo → 'Creative Director' ✅
  - Jellan Denonong → 'Technical Editor' ✅

Archival Managers (both have role='member'):
  - Jules Leo Reserva → NULL (but listed as archive manager)
  - Eizziel Marie Bacoy → 'Online Accounts Manager' (but listed as archive manager)

Section Heads (have role='section_head'):
  - Lex Zyrreh Devonnaire Abellanosa → 'Senior Graphic Designer'
  - Jessah Mei Allard → 'Newsletter EIC'
  - Nevlim Baldelovar → 'Opinion Editor'
  - rexter Etang → 'Sports Editor'
  ... and 6 more
```

---

## Data Inconsistencies

### Discrepancy 1: Roles vs Emails Mismatch

**autoAddUser.js assigns:**

```javascript
EDITOR_EMAILS = [
  'jonee.elopre@carsu.edu.ph', // Assigned as Tech Editor here
  'levibrian.cejuela@carsu.edu.ph', // Assigned as Creative Director here
  'melede.ganoy@carsu.edu.ph', // Assigned as EIC here
  'julesleo.reserva@carsu.edu.ph', // Assigned as Archive Manager here
  'eizzielmarie.bacoy@carsu.edu.ph', // Assigned as Archive Manager here
]
```

**Database has:**

```sql
Melede Ganoy → designation_label: 'Feature Editor' (NOT 'Editor-in-Chief')
Levi Brian Cejuela → designation_label: NULL (NOT 'Creative Director')
Jules Leo Reserva → designation_label: NULL (NOT 'Archival Manager')
Eizziel Marie Bacoy → designation_label: 'Online Accounts Manager' (NOT 'Archival Manager')
```

### Discrepancy 2: Chief Adviser Missing Entirely

**autoAddUser.js:**

```javascript
// NO CHIEF_ADVISER_EMAILS variable
// NO code to assign role='adviser' or similar
```

**Notification system expects:**

```javascript
to_chief_adviser: ['Chief Adviser'] // Looks for designation_label='Chief Adviser'
```

**Database:**

```sql
-- No profile has designation_label='Chief Adviser'
```

---

## How It Should Work (Ideal System)

### Option A: Create Separate Roles (Recommended)

```javascript
// File: src/utils/autoAddUser.js

const ADMIN_EMAILS = [...]
const SECTION_HEAD_EMAILS = [...]
const EDITOR_IN_CHIEF_EMAILS = ['melede.ganoy@carsu.edu.ph']
const CHIEF_ADVISER_EMAILS = ['???@carsu.edu.ph']  // DEFINE THIS
const TECHNICAL_EDITOR_EMAILS = ['jonee.elopre@carsu.edu.ph']
const CREATIVE_DIRECTOR_EMAILS = ['levibrian.cejuela@carsu.edu.ph']
const ARCHIVAL_MANAGER_EMAILS = [
  'julesleo.reserva@carsu.edu.ph',
  'eizzielmarie.bacoy@carsu.edu.ph'
]
const WRITER_EMAILS = [...]
const ARTIST_EMAILS = [...]

// Role hierarchy
if (email in ADMIN_EMAILS) → 'admin'
else if (email in EDITOR_IN_CHIEF_EMAILS) → 'editor_in_chief'
else if (email in CHIEF_ADVISER_EMAILS) → 'chief_adviser'
else if (email in TECHNICAL_EDITOR_EMAILS) → 'technical_editor'
else if (email in CREATIVE_DIRECTOR_EMAILS) → 'creative_director'
else if (email in ARCHIVAL_MANAGER_EMAILS) → 'archival_manager'
else if (email in SECTION_HEAD_EMAILS) → 'section_head'
else if (email in WRITER_EMAILS or ARTIST_EMAILS) → 'member'
```

### Option B: Keep Roles Generic, Validate by Designation in Views

```javascript
// EditorInChiefView.vue
const loadCurrentUserProfile = async () => {
  // ... load profile ...

  // Validate this user IS the Editor-in-Chief
  if (currentUserProfile.value?.designation_label !== 'Editor-in-Chief') {
    showError('Only Editor-in-Chief can access this view')
    router.push('/dashboard')
    return
  }
}
```

---

## Current Notification System Dependence on Designation_Label

**File:** `src/services/notificationsService.js` lines 622-636

```javascript
const getDesignationsByStatus = (status) => {
  const designationsByStatus = {
    to_section_head: ['Managing Editor', 'Associate Managing Editor'],
    to_technical_editor: ['Technical Editor'],
    to_creative_director: ['Creative Director'],
    to_editor_in_chief: ['Editor-in-Chief'],
    to_chief_adviser: ['Chief Adviser'],
    to_archival_manager: ['Archival Manager', 'Circulations Manager'],
    for_publish: ['Archival Manager', 'Circulations Manager'],
    published: ['Admin', 'Archival Manager'],
  }
  return designationsByStatus[status?.toLowerCase()?.replace(/\s+/g, '_')] || []
}
```

**This queries the database:**

```javascript
.eq('designation_label', designation)  // Looks for exact match
```

**Problem:** Database doesn't have matching designations!

- Looks for `designation_label = 'Chief Adviser'` but no profile has that
- Notification system will send notifications to NOBODY for chief adviser status

---

## Summary of Issues

| Issue                                        | Impact                                                              | Severity    |
| -------------------------------------------- | ------------------------------------------------------------------- | ----------- |
| **Chief Adviser role undefined**             | Notifications never sent to Chief Adviser                           | 🔴 CRITICAL |
| **designation_label doesn't match database** | Wrong users notified                                                | 🔴 CRITICAL |
| **Archival Managers not distinguishable**    | Cannot determine which one to notify                                | 🟠 HIGH     |
| **designations don't match definitions**     | Melede: 'Feature Editor' ≠ 'Editor-in-Chief'                        | 🟠 HIGH     |
| **Views hardcode roles**                     | No validation who's accessing what view                             | 🟡 MEDIUM   |
| **No email validation in views**             | Multiple users with same 'editor' role can access single-user views | 🟡 MEDIUM   |

---

## Files Using These Systems

### Role ('editor', 'member', 'section_head', 'admin'):

- `src/router/index.js` - Route guards
- `src/utils/autoAddUser.js` - Role assignment
- `src/views/system/MagazineView.vue` - Project filtering
- `src/views/system/NewsletterView.vue` - Project filtering
- `src/views/system/FolioView.vue` - Project filtering
- `src/views/system/OtherView.vue` - Project filtering
- `server/src/middleware/auth.js` - Server authorization

### Designation_Label ('Technical Editor', 'Editor-in-Chief', etc.):

- `src/services/notificationsService.js` - Notification routing (lines 562-585)
- `src/utils/userDisplay.js` - Display name formatting
- `src/views/system/AddProjectView.vue` - Filtering users (lines 78-79)
- `SUPABASE_PROFILES_SETUP.sql` - Profile creation

---

## Recommendation

**The system has TWO partially-working authorization systems:**

1. **Role-based access control** (works for generic roles)
   - Fine for: admin, section_head, member
   - Broken for: editor variants (all get same 'editor' role)

2. **Designation-based finding** (used for notifications)
   - Finds: Technical Editor, Creative Director, Managing Editor, etc.
   - Missing: Chief Adviser, Archival Manager entries
   - Wrong: Melede Ganoy's designation is 'Feature Editor' not 'Editor-in-Chief'

**Next Step:** Unify the system by either:

- Creating distinct roles for each position, OR
- Adding email validation in views + fixing designation_label data in database
