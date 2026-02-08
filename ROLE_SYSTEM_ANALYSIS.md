# Role System Analysis

## Current State of Implementation

### Role Assignment Overview

All roles are assigned based on **email addresses** defined in:

- **File:** `src/utils/autoAddUser.js` (lines 23-85)
- **Stored in:** `localStorage` as 'userRole' and `profiles.role` column

---

## 1. EDITOR-IN-CHIEF ✅ (Single User - As Expected)

**Current Status:** Working correctly as single-user role

- **Email:** `melede.ganoy@carsu.edu.ph`
- **Assigned Role:** `'editor'` (in localStorage and database)
- **Designation Label:** `'Editor-in-Chief'` (stored in profiles.designation_label)
- **View File:** `src/views/system/EditorInChiefView.vue`
  - Hardcodes `currentUserRole = ref('Editor-in-Chief')` (line 48)
  - No validation that user is actually the EIC - **ISSUE: Any editor can access this view**
- **Access Control:** Route guard `requireEditor` allows ANY user with 'editor' role
- **Issue:** Multiple users can have 'editor' role, but view doesn't check which specific editor

---

## 2. CHIEF ADVISER ❌ (Single User - But Not Working Like It)

**Current Status:** Not properly restricted to single user

- **Email:** Currently unclear - **NOT defined in EDITOR_EMAILS or any list**
  - Searching profiles, Chef Adviser is mentioned in seeding but no email assignments found
- **Route Status:** `/chief-adviser/:id` exists but no Chief Adviser email configuration
- **View File:** `src/views/system/ChiefAdviserView.vue`
  - Hardcodes `currentUserRole = ref('Chief Adviser')` (line 48)
  - No validation that user is actually the Chief Adviser
- **Access Control:** Route guard `requireEditor` - means ANY editor can access
- **Issue:** No single-user enforcement at all

**⚠️ PROBLEM:** Chief Adviser might not have a dedicated email in the system at all!

---

## 3. ARCHIVAL MANAGER ❌ (Two Users - But Treated As If One)

**Current Status:** Two users assigned but system doesn't differentiate

- **Emails:**
  1. `julesleo.reserva@carsu.edu.ph` (also an artist)
  2. `eizzielmarie.bacoy@carsu.edu.ph`
- **Assigned Role:** Both get `'editor'` role in localStorage/database
- **Designation Label:** `'Archival Manager'` (in profiles.designation_label)
- **View File:** `src/views/system/ArchivalManagerView.vue`
  - Hardcodes `currentUserRole = ref('Archival Manager')` (line 48)
  - No validation that user is actually an Archive Manager
- **Access Control:** Route guard `requireEditor` - ANY editor can access
- **Issue:** Two users but system treats them identically since they both get 'editor' role

**⚠️ PROBLEM:** System assigns 'editor' role to both, making them indistinguishable

---

## 4. SECTION HEAD ✅ (Multiple Users - Multiple Assignments Working)

**Current Status:** Working as expected for multiple users

- **Emails Assigned:** 10 users in `SECTION_HEAD_EMAILS` list
  ```
  - lexzyrrehdevonnaire.abellanosa@carsu.edu.ph
  - jessahmei.allard@carsu.edu.ph
  - nevlim.baldelovar@carsu.edu.ph
  - rexter.etang@carsu.edu.ph
  - jerbyclaire.factularin@carsu.edu.ph
  - jofredjames.gerasmio@carsu.edu.ph
  - megumierika.labaja@carsu.edu.ph
  - elainepearl.silagan@carsu.edu.ph
  - samuellhoide.ursales@carsu.edu.ph
  - kentadriane.vinatero@carsu.edu.ph
  ```
- **Assigned Role:** `'section_head'`
- **View File:** `src/views/system/SectionHeadView.vue`
  - View works for any section_head user
  - Projects filtered by `section_head_id` in the database
- **Access Control:** Route guard `requireSectionHead` - works correctly
- **Status:** ✅ Multiple users working as expected

---

## 5. TECHNICAL EDITOR vs CREATIVE DIRECTOR ⚠️ (Shared Same View - Using Status-Based Logic)

**Current Status:** Both roles share EditorsView, distinguished by PROJECT STATUS

- **Emails:**
  - **Technical Editor:** `jonee.elopre@carsu.edu.ph`
  - **Creative Director:** `levibrian.cejuela@carsu.edu.ph`
- **Assigned Role:** Both get `'editor'`
- **View File:** `src/views/system/TechnicalEditorView.vue`
  - Uses project status to determine which role is active:
    - If `status === 'to_creative_director'` → User is "Creative Director"
    - If `status === 'to_technical_editor'` → User is "Technical Editor"
  - Both can access this view but different UI features per status
- **Status:** ⚠️ Works but relies on STATUS not USER validation

**Implementation Code:**

```javascript
const currentUserRole = computed(() => {
  const status = project.value?.status

  if (status === 'to_creative_director') {
    return 'Creative Director' // Artist role
  }
  return 'Technical Editor' // Writer role (default)
})
```

---

## 6. ROLE HIERARCHY & ASSIGNMENT LOGIC

**File:** `src/utils/autoAddUser.js` (lines 104-130)

**Hierarchy (Highest to Lowest):**

1. `'admin'` - System Admins (3 users from ADMIN_EMAILS)
2. `'editor'` - Content Admins (5 emails: Tech Editor, Creative Dir, EIC, 2 Archive Managers)
3. `'section_head'` - Section Heads (10 users)
4. `'member'` - Writers/Artists (12 writers + 21 artists)

**Problem:** All content admin roles (Tech Editor, Creative Director, EIC, Archive Manager, Chief Adviser) assigned to same `'editor'` role

---

## Summary Table

| Role                  | Users | Storage             | Validation      | Status           | Issue                        |
| --------------------- | ----- | ------------------- | --------------- | ---------------- | ---------------------------- |
| **System Admin**      | 3     | ADMIN_EMAILS        | ✅ Email-based  | ✅ Working       | -                            |
| **Editor-in-Chief**   | 1     | EDITOR_EMAILS       | ❌ None         | ⚠️ Not validated | Any editor can access        |
| **Chief Adviser**     | ?     | NOT FOUND           | ❌ None         | ❌ Missing       | No email configuration       |
| **Archival Manager**  | 2     | EDITOR_EMAILS       | ❌ None         | ⚠️ Not validated | Two users, indistinguishable |
| **Technical Editor**  | 1     | EDITOR_EMAILS       | ❌ Status-based | ⚠️ Status-based  | Works by project status      |
| **Creative Director** | 1     | EDITOR_EMAILS       | ❌ Status-based | ⚠️ Status-based  | Works by project status      |
| **Section Head**      | 10    | SECTION_HEAD_EMAILS | ✅ Role-based   | ✅ Working       | -                            |
| **Member (Writer)**   | 12    | WRITER_EMAILS       | ✅ Role-based   | ✅ Working       | -                            |
| **Member (Artist)**   | 21    | ARTIST_EMAILS       | ✅ Role-based   | ✅ Working       | -                            |

---

## Recommendations

### 🔴 High Priority Issues

1. **Chief Adviser Role Missing**
   - No email assignment found in code
   - Cannot determine who should fill this role
   - **Action:** Define CHIEF_ADVISER_EMAIL(S) in autoAddUser.js

2. **Editor-in-Chief Not Validated**
   - View allows ANY editor to access
   - Should validate user email matches melede.ganoy@carsu.edu.ph
   - **Action:** Add email validation in EditorInChiefView

3. **Archival Manager Indistinguishable**
   - Two users get same 'editor' role
   - System cannot tell them apart
   - **Action:** Create separate 'archival_manager' role OR add individual validation

4. **Technical Editor/Creative Director Rely on Status**
   - Current implementation works but is fragile
   - If status is wrong, wrong person gets access
   - **Action:** Add email validation as backup check

### 🟡 Medium Priority Fixes

1. **Add Specific Role Validation to Views**
   - EditorInChiefView should validate email
   - ChiefAdviserView should validate email
   - ArchivalManagerView should validate specific users

2. **Create Separate Roles for Single-User Positions**
   - Consider creating `'chief_adviser'` role in role enum
   - Consider `'archival_manager'` as separate role
   - Keep `'editor'` for general editorial tasks

3. **Update Role System Documentation**
   - Current system has implicit assumptions
   - Document which roles are single-user vs multi-user
   - Document role hierarchy and access rules

---

## Files That Need Updates

- `src/utils/autoAddUser.js` - Add Chief Adviser emails, create new roles
- `src/views/system/EditorInChiefView.vue` - Add email validation (line ~48)
- `src/views/system/ChiefAdviserView.vue` - Add email validation + define emails
- `src/views/system/ArchivalManagerView.vue` - Add email validation for 2 users
- `src/views/system/TechnicalEditorView.vue` - Add email backup validation
- `src/router/index.js` - Consider role-specific route guards instead of generic 'editor'
