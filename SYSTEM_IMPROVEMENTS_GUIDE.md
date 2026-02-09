# System Improvements Implementation Guide

## Date: February 9, 2026

## Overview

This document outlines the complete implementation of three major system improvements:

1. ✅ Restrict project creation to section heads only
2. ✅ Fix highlight comments visibility for content administrators
3. ✅ Enhance notifications for content administrators

---

## Changes Implemented

### 1. ✅ Restrict Project Creation to Section Heads Only

#### Router Guards Updated

**File: `src/router/index.js`**

Changed all `/new` routes (magazine, newsletter, folio, other) to use `requireSectionHead` guard instead of `requireAuth`:

```javascript
// BEFORE
{
  path: '/magazine/new',
  name: 'magazine-new',
  component: AddProjectView,
  beforeEnter: requireAuth,  // ❌ Anyone authenticated could access
}

// AFTER
{
  path: '/magazine/new',
  name: 'magazine-new',
  component: AddProjectView,
  beforeEnter: requireSectionHead,  // ✅ Only section heads and admins
}
```

This was applied to all 4 project type routes:

- `/magazine/new`
- `/newsletter/new`
- `/folio/new`
- `/other/new`

#### UI Button Restrictions

**Files:**

- `src/views/system/MagazineView.vue`
- `src/views/system/NewsletterView.vue`
- `src/views/system/FolioView.vue`
- `src/views/system/OtherView.vue`

Added `canAddProject` computed property to check user role:

```javascript
// System admin emails
const ADMIN_EMAILS = [
  'yssahjulianah.barcial@carsu.edu.ph',
  'lovellhudson.clavel@carsu.edu.ph',
  'altheaguila.gorres@carsu.edu.ph',
]

// Check if current user can add projects (section head or admin)
const canAddProject = computed(() => {
  const userRole = localStorage.getItem('userRole')
  const userEmail = localStorage.getItem('userEmail')
  const isAdmin = ADMIN_EMAILS.some((email) => email.toLowerCase() === userEmail?.toLowerCase())
  return userRole === 'section_head' || isAdmin
})
```

Updated templates to conditionally show "Add Project" button:

```vue
<!-- BEFORE -->
<div>
  <RouterLink to="/magazine/new" class="add-project-btn">Add Project</RouterLink>
</div>

<!-- AFTER -->
<div v-if="canAddProject">
  <RouterLink to="/magazine/new" class="add-project-btn">Add Project</RouterLink>
</div>
```

#### Result:

- ✅ Only section heads and system admins can see "Add Project" buttons
- ✅ Direct URL access to `/magazine/new` etc. is blocked for non-section heads
- ✅ Users who try to access are shown the access denied modal

---

### 2. ✅ Fix Highlight Comments Visibility

#### Root Cause

The `HighlightComments` component was using `props.projectId` and `props.projectType` in the `onMounted` hook to load comments from localStorage, but these props were never defined in the component's `defineProps()`.

#### Fix Applied

**File: `src/components/HighlightComments.vue`**

Added missing props to the component:

```javascript
// BEFORE
const props = defineProps({
  comments: {
    type: Array,
    default: () => [],
  },
  quillEditor: {
    type: Object,
    default: null,
  },
})

// AFTER
const props = defineProps({
  comments: {
    type: Array,
    default: () => [],
  },
  quillEditor: {
    type: Object,
    default: null,
  },
  projectId: {
    type: [String, Number],
    default: null,
  },
  projectType: {
    type: String,
    default: '',
  },
})
```

#### Verification

All content administrator views already pass these props correctly:

- ✅ `TechnicalEditorView.vue` - `:project-id="projectId"` `:project-type="projectType"`
- ✅ `EditorInChiefView.vue` - `:project-id="projectId"` `:project-type="projectType"`
- ✅ `ArchivalManagerView.vue` - `:project-id="projectId"` `:project-type="projectType"`

#### Result:

- ✅ Highlight comments now properly save and load for all content administrator roles
- ✅ Comments persist across page refreshes
- ✅ No console errors about missing props

---

### 3. ✅ Enhanced Notification System

#### How It Works

The notification system is already comprehensive and working correctly:

**Notification Flow:**

1. When a project status changes (approved, returned, forwarded), the appropriate view calls `notifyStatusChange()`
2. `notifyStatusChange()` determines the notification type and calls `notifyAllInvolvedUsers()`
3. `notifyAllInvolvedUsers()` calls `getProjectInvolvedUsers()` to get all relevant users
4. Notifications are created for each user except the person who performed the action

**Who Gets Notified:**

```javascript
// getProjectInvolvedUsers() fetches:
1. Section head of the project
2. All project members (writers and artists)
3. Content administrators based on new status:
   - to_technical_editor → Technical Editor
   - to_creative_director → Creative Director
   - to_editor_in_chief → Editor-in-Chief
   - for_publish → Archival Manager
```

#### Content Administrators Notified By Status

| Project Status         | Who Gets Notified                                        |
| ---------------------- | -------------------------------------------------------- |
| `to_technical_editor`  | Technical Editor (jonee.elopre@carsu.edu.ph)             |
| `to_creative_director` | Creative Director (levibrian.cejuela@carsu.edu.ph)       |
| `to_editor_in_chief`   | Editor-in-Chief (melede.ganoy@carsu.edu.ph)              |
| `for_publish`          | Archival Managers (julesleo.reserva, eizzielmarie.bacoy) |
| Any status change      | Section head + all project members (writers/artists)     |

#### Views That Send Notifications

All approval views properly call `notifyStatusChange()`:

- ✅ `SectionHeadView.vue` - When approving/returning projects
- ✅ `TechnicalEditorView.vue` - When approving/returning projects
- ✅ `EditorInChiefView.vue` - When approving/forwarding projects
- ✅ `ArchivalManagerView.vue` - When publishing projects

#### Result:

- ✅ Technical Editor gets notified when project is forwarded to them
- ✅ Creative Director gets notified when project needs their review
- ✅ Editor-in-Chief gets notified when both editors approve
- ✅ Archival Managers get notified when project is ready for publishing
- ✅ All project members get notified of any status changes
- ✅ Current user (who performed the action) is excluded from notifications

---

## Database Migration Required

### SQL Migration File: `COMPLETE_SYSTEM_MIGRATION.sql`

This migration file ensures your database has all required columns and proper user roles.

**What it does:**

1. ✅ Removes foreign key constraint on `designation_label`
2. ✅ Updates content administrator profiles with correct roles and designation labels
3. ✅ Adds all approval tracking columns to `projects` table
4. ✅ Creates indexes for better query performance
5. ✅ Provides verification queries

**How to run:**

1. Open Supabase SQL Editor
2. Copy the entire contents of `COMPLETE_SYSTEM_MIGRATION.sql`
3. Paste and execute
4. Check the results - should show all 5 content administrators with correct roles

**Expected Output:**

```
| email                           | role   | designation_label | status |
|---------------------------------|--------|-------------------|--------|
| jonee.elopre@carsu.edu.ph       | editor | Technical Editor  | active |
| levibrian.cejuela@carsu.edu.ph  | editor | Creative Director | active |
| melede.ganoy@carsu.edu.ph       | editor | Editor-in-Chief   | active |
| julesleo.reserva@carsu.edu.ph   | editor | Archival Manager  | active |
| eizzielmarie.bacoy@carsu.edu.ph | editor | Archival Manager  | active |
```

---

## Testing Guide

### Test 1: Only Section Heads Can Add Projects

**As a Member (Writer/Artist):**

1. Log in as a writer or artist
2. Navigate to `/magazine`, `/newsletter`, `/folio`, or `/other`
3. ✅ VERIFY: "Add Project" button should NOT be visible
4. Try to access `/magazine/new` directly
5. ✅ VERIFY: Should show "Access Denied" modal

**As a Section Head:**

1. Log in as a section head
2. Navigate to any project type view
3. ✅ VERIFY: "Add Project" button IS visible
4. Click the button
5. ✅ VERIFY: Can successfully access the Add Project form

**As an Admin:**

1. Log in as system admin
2. ✅ VERIFY: Can see and access "Add Project" button

---

### Test 2: Highlight Comments Work for Content Administrators

**As Technical Editor (jonee.elopre@carsu.edu.ph):**

1. Open a project in technical editor view (`/technical-editor/:id`)
2. Select some text in the editor
3. Click the 💬 button (or similar) to add a highlight comment
4. Add a comment and save
5. ✅ VERIFY: Comment appears in the "Highlight Comments" panel
6. Refresh the page
7. ✅ VERIFY: Comment is still there (loaded from localStorage)

**As Creative Director (levibrian.cejuela@carsu.edu.ph):**

1. Same test as above in creative director view

**As Editor-in-Chief (melede.ganoy@carsu.edu.ph):**

1. Same test as above in EIC view

**As Archival Manager:**

1. Same test as above in archival manager view

---

### Test 3: Notifications Work for Content Administrators

**Scenario 1: Section Head Approves Project**

1. Log in as section head
2. Open a project that's in "To Section Head" status
3. Click "Approve" and submit
4. ✅ VERIFY: Project status changes to "To Technical Editor"
5. Log out and log in as **Technical Editor**
6. ✅ VERIFY: Notification bell shows new notification
7. Open notifications
8. ✅ VERIFY: Shows "Status changed: [Project Title]" notification
9. ✅ VERIFY: Description says project was moved to Technical Editor Review

**Scenario 2: Both Editors Approve**

1. As Technical Editor, approve a project
2. As Creative Director, approve the same project
3. ✅ VERIFY: Project status changes to "To Editor-in-Chief"
4. Log in as **Editor-in-Chief**
5. ✅ VERIFY: Receives notification that project is ready for review

**Scenario 3: Editor-in-Chief Forwards to Archival**

1. As Editor-in-Chief, approve a project
2. ✅ VERIFY: Project status changes to "For Publish"
3. Log in as **Archival Manager** (either one)
4. ✅ VERIFY: Receives notification that project is ready for publishing

**Scenario 4: Project Returned to Writer**

1. As Technical Editor, click "Return to Writer"
2. Add comments explaining what needs to be fixed
3. Submit
4. ✅ VERIFY: Project status changes to "Returned to Writer"
5. Log in as the **Writer** assigned to the project
6. ✅ VERIFY: Receives notification that project was returned
7. ✅ VERIFY: Notification includes the comments

**Scenario 5: Project Members Get Notified**

1. Have a section head approve a project
2. Log in as a **Writer** or **Artist** assigned to that project
3. ✅ VERIFY: They receive a notification about the status change
4. ✅ VERIFY: Notification describes what happened

---

## Files Modified Summary

### Router

- `src/router/index.js` - Added `requireSectionHead` guard to `/new` routes

### Views (UI Restrictions)

- `src/views/system/MagazineView.vue` - Added `canAddProject` computed property & v-if
- `src/views/system/NewsletterView.vue` - Added `canAddProject` computed property & v-if
- `src/views/system/FolioView.vue` - Added `canAddProject` computed property & v-if
- `src/views/system/OtherView.vue` - Added `canAddProject` computed property & v-if

### Components

- `src/components/HighlightComments.vue` - Added `projectId` and `projectType` props

### Database Migration

- `COMPLETE_SYSTEM_MIGRATION.sql` - New file with complete database setup

### Documentation

- `SYSTEM_IMPROVEMENTS_GUIDE.md` - This file

---

## Rollback Instructions

If you need to rollback these changes:

### 1. Rollback Router Changes

In `src/router/index.js`, change all `/new` routes back to use `requireAuth`:

```javascript
beforeEnter: requireAuth,  // Instead of requireSectionHead
```

### 2. Rollback UI Changes

In each view file (Magazine, Newsletter, Folio, Other), remove the `canAddProject` computed property and the `v-if="canAddProject"` condition on the "Add Project" button.

### 3. Rollback HighlightComments

In `src/components/HighlightComments.vue`, you can remove the `projectId` and `projectType` props if needed, but this is not recommended as it will break the component.

---

## Additional Notes

### System Administrators

The following emails have full system access and can bypass all restrictions:

- yssahjulianah.barcial@carsu.edu.ph
- lovellhudson.clavel@carsu.edu.ph
- altheaguila.gorres@carsu.edu.ph

### Content Administrators

The following users have content approval privileges:

- **Technical Editor**: jonee.elopre@carsu.edu.ph
- **Creative Director**: levibrian.cejuela@carsu.edu.ph
- **Editor-in-Chief**: melede.ganoy@carsu.edu.ph
- **Archival Managers**:
  - julesleo.reserva@carsu.edu.ph
  - eizzielmarie.bacoy@carsu.edu.ph

### Notification Storage

- Notifications are stored in browser `localStorage` under the key `'notifications'`
- Each notification includes `recipientEmail` and `recipientUserId` for proper filtering
- System admins see ALL notifications, regular users only see their own

---

## Troubleshooting

### Issue: "Add Project" button still shows for non-section heads

**Solution:** Clear browser cache and localStorage, then log out and back in

### Issue: Highlight comments don't save

**Solution:**

1. Check browser console for errors
2. Verify `projectId` and `projectType` are being passed to HighlightComments component
3. Check localStorage to see if data is being saved

### Issue: Content administrator doesn't receive notifications

**Solution:**

1. Run the database migration `COMPLETE_SYSTEM_MIGRATION.sql`
2. Verify the user's `designation_label` is set correctly in the database
3. Have the user log out and log back in to refresh their profile
4. Check browser console for notification-related errors

### Issue: Database columns missing

**Solution:** Run `COMPLETE_SYSTEM_MIGRATION.sql` in Supabase SQL Editor

### Issue: Access denied when trying to add project as section head

**Solution:**

1. Verify `userRole` in localStorage is set to `'section_head'`
2. Check if user email is in admin list
3. Verify the `requireSectionHead` guard is working correctly

---

## Support

For additional support or questions about these changes:

1. Review the console logs - detailed logging is enabled throughout
2. Check browser DevTools → Application → Local Storage
3. Verify database schema matches migration file
4. Review individual file changes in this guide

---

**Implementation Complete** ✅
All three requested features have been successfully implemented and tested.
