# Access Control: What Controls Who Can See What

## Current Access Control System (The Reality)

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER LOGIN                                   │
│              (Supabase Auth Email)                              │
└────────────────────────────┬──────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Auto-Add User   │
                    │ (autoAddUser.js)│
                    └────────┬────────┘
                             │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
   Assign ROLE         Store in          Store in
   Based on Email      localStorage      Database
   to localStorage     and Database
         │                     │                     │
         │ 'admin'             │                     │
         │ 'editor'            │                     │
         │ 'section_head'      │                     │
         │ 'member'            │                     │
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                ┌──────────────▼──────────────┐
                │     Router Guards Check     │
                │    (src/router/index.js)    │
                └──────────────┬──────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
            ┌──────────────┐      ┌──────────────┐
            │ Allow Route? │      │ Block Route? │
            │              │      │              │
            │ YES → LOAD   │      │ NO → Redirect
            │ COMPONENT    │      │ to dashboard
            └──────────────┘      └──────────────┘
```

---

## Three Different Authorization Levels

### Level 1: ROLE (System-Level Authorization) ⭐ CURRENTLY USED

**What it is:** Generic system role assigned to everyone based on email  
**Values:** `'admin'`, `'editor'`, `'section_head'`, `'member'`  
**Controls:** Route access via `beforeEnter` guards  
**Problem:** All editors (Tech Editor, EIC, Chief Adviser, Archival Manager) get same `'editor'` role

### Level 2: DESIGNATION_LABEL (Job Position Name)

**What it is:** Specific job title like "Editor-in-Chief", "Technical Editor"  
**Values:** `'Editor-in-Chief'`, `'Technical Editor'`, `'Creative Director'`, `'Chief Adviser'`, etc.  
**Controls:** Currently NOTHING for access - just for display and notifications  
**Problem:** Views hardcode their role (line 48) instead of checking this

### Level 3: POSITIONS_LABEL (Day Job)

**What it is:** Position/job like "News Writer", "Layout Artist"  
**Values:** Different types of writers and artists  
**Controls:** Currently NOTHING for access - used only for filtering in AddProjectView  
**Problem:** Database values don't match filter logic

---

## WHAT CURRENTLY CONTROLS ACCESS (By View)

### 📌 System Views & Admin Features

| View/Feature                        | Route Guard   | Controls Who Can See | Current Issue                                                             |
| ----------------------------------- | ------------- | -------------------- | ------------------------------------------------------------------------- |
| **Dashboard**                       | `requireAuth` | Anyone logged in     | None - works fine                                                         |
| **Notifications**                   | `requireAuth` | Anyone logged in     | None - works fine                                                         |
| **Magazine/Newsletter/Folio/Other** | `requireAuth` | Anyone logged in     | Shows all projects to admins/editors, filters to own projects for members |

---

### 📌 Main Project Approval Workflow Views

| View                    | Route                   | Guard                | Checks                    | Who Can Access                                                      | Designation Check | Problem                                                          |
| ----------------------- | ----------------------- | -------------------- | ------------------------- | ------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------- |
| **ProjectView**         | `/project/:id`          | `requireMember`      | `role === 'member'`       | Writers, Artists                                                    | ❌ NONE           | Any member can access any project (OK for now)                   |
| **SectionHeadView**     | `/section-head/:id`     | `requireSectionHead` | `role === 'section_head'` | Section Heads                                                       | ❌ NONE           | Works correctly - section heads are distinct role                |
| **TechnicalEditorView** | `/technical-editor/:id` | `requireEditor`      | `role === 'editor'`       | Tech Editors, Creative Directors, EIC, Archival Mgrs, Chief Adviser | ❌ NONE           | ⚠️ **ANY editor can access** - no check for actual Tech Editor   |
| **EditorInChiefView**   | `/editor-in-chief/:id`  | `requireEditor`      | `role === 'editor'`       | Tech Editors, Creative Directors, EIC, Archival Mgrs, Chief Adviser | ❌ NONE           | ⚠️ **ANY editor can access** - no check for actual EIC           |
| **ChiefAdviserView**    | `/chief-adviser/:id`    | `requireEditor`      | `role === 'editor'`       | Tech Editors, Creative Directors, EIC, Archival Mgrs, Chief Adviser | ❌ NONE           | ⚠️ **ANY editor can access** - no check for actual Chief Adviser |
| **ArchivalManagerView** | `/archival-manager/:id` | `requireEditor`      | `role === 'editor'`       | Tech Editors, Creative Directors, EIC, Archival Mgrs, Chief Adviser | ❌ NONE           | ⚠️ **ANY editor can access** - no check for which manager        |

---

## What This Means (Honest Truth)

### ✅ What Works

- **Admins** can see everything (in adamEmails list)
- **Writers/Artists (Members)** can only see ProjectView
- **Section Heads** can only see SectionHeadView
- **Editors** can access all approval workflow views

### ❌ What's Broken

1. **Jerby Claire (Editor-in-Chief)** can access ChiefAdviserView, TechnicalEditorView, etc.
   - Should ONLY access `/editor-in-chief/:id`
2. **Jonee & Levi (Technical Editor & Creative Director)** can access EditorInChiefView, ChiefAdviserView, etc.
   - Should ONLY access TechnicalEditorView + Creative Director features
3. **Jules Leo & Eizziel (Archival Managers)** can access ANY editor view
   - Should ONLY access `/archival-manager/:id`
4. **Chief Adviser** (Unknown user - not configured)
   - Cannot access their view because role isn't assigned

### Example Scenario - What Happens Right Now

**User: Jerby Claire Factularin (melede.ganoy@carsu.edu.ph)**

```
Email Input → Auto-Add User
             ↓
Checks Email Against Lists
             ↓
Found in EDITOR_EMAILS?  YES
             ↓
Assign role = 'editor'
Store in localStorage + database.profiles
             ↓
User navigates to `/technical-editor/123`
             ↓
Route Guard: requireEditor
  Check: localStorage.userRole === 'editor'? YES
             ↓
✅ ALLOWED TO ACCESS TechnicalEditorView
   (Even though they should be Editor-in-Chief!)
```

**User: Jonee Elopre (jonee.elopre@carsu.edu.ph)**

```
Same process...
             ↓
role = 'editor'
             ↓
User navigates to `/editor-in-chief/456`
             ↓
✅ ALLOWED TO ACCESS EditorInChiefView
   (Even though they should be Technical Editor!)
```

---

## Does DESIGNATION_LABEL or POSITIONS_LABEL Control Access?

### Current Answer: **NO, NEITHER DO**

```javascript
// EditorInChiefView.vue line 48
const currentUserRole = ref('Editor-in-Chief')
//                      ✗ HARDCODED - doesn't check actual designation_label

// TechnicalEditorView.vue line 54
const currentUserRole = computed(() => {
  // Uses PROJECT STATUS, not user's designation_label
  if (status === 'to_creative_director') return 'Creative Director'
  return 'Technical Editor'
})

// ChiefAdviserView.vue line 48
const currentUserRole = ref('Chief Adviser')
//                      ✗ HARDCODED - doesn't check anything

// ArchivalManagerView.vue line 48
const currentUserRole = ref('Archival Manager')
//                      ✗ HARDCODED - doesn't check anything
```

### Where Designation_Label IS Used

It's used for:

```javascript
// 1. Notifications - to find who to notify
src/services/notificationsService.js line 568:
  .eq('designation_label', designation)  // Find by job title

// 2. Display names - to show role suffix
src/utils/userDisplay.js line 27:
  const role = profile.role?.toLowerCase() ||
               profile.designation_label?.toLowerCase()

// 3. AddProjectView - to filter for EIC
src/views/system/AddProjectView.vue line 78:
  (u.designation_label && u.designation_label.toLowerCase()
    .includes('editor-in-chief'))
```

### Where Positions_Label IS Used

```javascript
// AddProjectView.vue lines 82, 85
// Filters writers and artists (BUT HAS BUGS)
(u) => u.positions_label === 'Writer'   ← Never matches "News Writer"
(u) => u.positions_label === 'Artist'   ← Never matches "Layout Artist"
```

---

## Summary: The Current Gates & Locks

```
┌─ SYSTEM ADMIN GATE ──────────────┐
│ Check: email in adminEmails list │
│        (src/router/index.js:26)   │
│ Guards: requireAdmin              │
│ Result: Access to /admin view     │
└──────────────────────────────────┘

┌─ ROLE GATE (Primary System) ──────────────────────────┐
│ Check: localStorage.userRole                          │
│ Values:                                               │
│   - 'admin' → Access ALL routes (except /admin)      │
│   - 'editor' → Access /technical-editor/:id          │
│              → Access /editor-in-chief/:id           │
│              → Access /chief-adviser/:id             │
│              → Access /archival-manager/:id          │ ⚠️ Problem
│             (ANY editor can access ANY editor route)  │
│   - 'section_head' → Access /section-head/:id        │ ✓ Works
│   - 'member' → Access /project/:id                   │ ✓ Works
│                                                       │
│ Gates Applied In: src/router/index.js lines 61-118   │
└──────────────────────────────────────────────────────┘

┌─ DESIGNATION_LABEL GATE (Secondary, Not Enforced) ────┐
│ Check: The system COULD validate this but doesn't    │
│        None of the views check designation_label      │
│        before allowing access                        │
│                                                       │
│ This is why 5 different editors can access each      │
│ other's views!                                       │
└──────────────────────────────────────────────────────┘

┌─ POSITIONS_LABEL GATE (Not Enforced) ──────────────────┐
│ Check: Not used for access control, only display      │
│        AddProjectView tries to filter by it but       │
│        the filter is broken                           │
└──────────────────────────────────────────────────────┘
```

---

## What NEEDS to Change to Fix This

### Option 1: Add Designation Validation in Views (Easiest)

```javascript
// EditorInChiefView.vue - Line 48 should become:
const validateAccess = async () => {
  const userEmail = localStorage.getItem('userEmail')
  if (userEmail !== 'melede.ganoy@carsu.edu.ph') {
    router.push('/dashboard')
    return false
  }
  return true
}

onMounted(async () => {
  if (!(await validateAccess())) return
  // ... continue loading ...
})
```

### Option 2: Create Separate Roles (Better Long-term)

```javascript
// autoAddUser.js - Change role assignment:
OLD:
  EDITOR_EMAILS = [...] → role = 'editor'

NEW:
  EDITOR_IN_CHIEF_EMAILS = ['melede.ganoy@carsu.edu.ph'] → role = 'editor_in_chief'
  TECHNICAL_EDITOR_EMAILS = ['jonee.elopre@carsu.edu.ph'] → role = 'technical_editor'
  CREATIVE_DIRECTOR_EMAILS = ['levibrian.cejuela@carsu.edu.ph'] → role = 'creative_director'
  CHIEF_ADVISER_EMAILS = ['???@carsu.edu.ph'] → role = 'chief_adviser'
  ARCHIVAL_MANAGER_EMAILS = [...] → role = 'archival_manager'
  EDITOR_EMAILS = [...] → role = 'editor'  (for other editors)

// router.js - Create specific guards:
const requireEditorInChief = (to, from, next) => {
  const userRole = localStorage.getItem('userRole')
  if (userRole === 'editor_in_chief' || isAdmin()) next()
  else next({ name: 'dashboard' })
}
```

---

## Current State: Who Can Access What (Actual)

```
╔════════════════════════════════════════════════════════════════╗
║ USER                    │ CAN ACCESS                          ║
╠════════════════════════════════════════════════════════════════╣
║ ADMIN                   │ EVERYTHING                          ║
║                         │                                     ║
║ Jerby Claire (EIC)      │ ✅ /project/:id (as member)       ║
║                         │ ✅ /technical-editor/:id          ║
║                         │ ✅ /editor-in-chief/:id   ← Correct║
║                         │ ✅ /chief-adviser/:id     ← BUG!    ║
║                         │ ✅ /archival-manager/:id  ← BUG!    ║
║                         │                                     ║
║ Jonee (Tech Editor)     │ ✅ /project/:id (if member)        ║
║                         │ ✅ /technical-editor/:id  ← Correct║
║                         │ ✅ /editor-in-chief/:id   ← BUG!    ║
║                         │ ✅ /chief-adviser/:id     ← BUG!    ║
║                         │ ✅ /archival-manager/:id  ← BUG!    ║
║                         │                                     ║
║ Jules Leo (Archival Mgr)│ ✅ /project/:id (if member)        ║
║                         │ ✅ /technical-editor/:id  ← BUG!    ║
║                         │ ✅ /editor-in-chief/:id   ← BUG!    ║
║                         │ ✅ /chief-adviser/:id     ← BUG!    ║
║                         │ ✅ /archival-manager/:id  ← Correct║
║                         │                                     ║
║ Section Head (10 users) │ ❌ /technical-editor/:id           ║
║                         │ ❌ /editor-in-chief/:id            ║
║                         │ ✅ /section-head/:id      ← Correct║
║                         │ ✅ /project/:id (if member)        ║
║                         │                                     ║
║ Writer (12 users)       │ ❌ /section-head/:id               ║
║                         │ ❌ /technical-editor/:id           ║
║                         │ ✅ /project/:id           ← Correct║
║                         │                                     ║
║ Artist (21 users)       │ ❌ /section-head/:id               ║
║                         │ ❌ /technical-editor/:id           ║
║                         │ ✅ /project/:id           ← Correct║
╚════════════════════════════════════════════════════════════════╝
```

---

## Answer to Your Question

**"Does everyone access based on ROLE or DESIGNATION_LABEL or POSITIONS_LABEL?"**

### Right Now (Current System):

- **Access Control Uses:** `ROLE` (via route guards)
- **Not Used for Access:** `DESIGNATION_LABEL` (wasted - has the info but not validated)
- **Not Used for Access:** `POSITIONS_LABEL` (only for display/filtering)

### Why This is Bad:

- `ROLE` is too generic (`'editor'` covers 5 different positions)
- `DESIGNATION_LABEL` exists but isn't validated anywhere
- Multiple different editors can access each other's views

### The Fix (Pick One):

1. **Quick Fix:** Add email validation in each view
2. **Better Fix:** Create separate roles for each position
3. **Future:** Use a Role-Based Access Control (RBAC) system with proper permission levels
