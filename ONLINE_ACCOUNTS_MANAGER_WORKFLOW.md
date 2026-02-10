# Online Accounts Manager Workflow Implementation

**Date:** February 10, 2026  
**Purpose:** Implement approval workflow where Online Accounts Manager approves "Other" (social media) projects before Editor-in-Chief, and handles publishing instead of Archival Manager.

## Changes Summary

### New Workflow for "Other" Section

**OLD WORKFLOW (Magazine/Newsletter/Folio):**

1. Section Head approves → to_technical_editor & creative_director
2. Both editors approve → to_editor_in_chief
3. Editor-in-Chief approves → for_publish (to Archival Manager)
4. Archival Manager publishes → published

**NEW WORKFLOW (Other/Social Media):**

1. Section Head approves → to_technical_editor & creative_director
2. Both editors approve → **to_online_accounts_manager** ✨ NEW
3. **Online Accounts Manager approves → to_editor_in_chief** ✨ NEW
4. Editor-in-Chief approves → for_publish (**to Online Accounts Manager**, not Archival Manager)
5. **Online Accounts Manager publishes → published** ✨ NEW

### Key Changes

- **Archival Managers NO LONGER approve "Other" projects**
- **Online Accounts Manager reviews BEFORE Editor-in-Chief** (for Other projects only)
- **Online Accounts Manager also handles publishing** (for Other projects only)

---

## Implementation Details

### 1. Database Migration

**File:** `ADD_ONLINE_ACCOUNTS_MANAGER_WORKFLOW.sql`

Added:

- New status enum value: `to_online_accounts_manager`
- New approval tracking columns:
  - `online_accounts_manager_approved_by` (UUID)
  - `online_accounts_manager_approved_date` (TIMESTAMPTZ)
  - `online_accounts_manager_comments` (TEXT)

**Action Required:** Run this SQL migration in Supabase dashboard

### 2. Status Formatter

**File:** `src/utils/statusFormatter.js`

Added display names for the new status:

- `to_online_accounts_manager`: 'To Online Accounts Manager'
- Also added alternate mapping for consistency

### 3. Technical Editor View

**File:** `src/views/system/TechnicalEditorView.vue`

Modified `submitApproval()` function to:

- Check if project_type is 'other'
- Route to `to_online_accounts_manager` for Other projects
- Route to `to_editor_in_chief` for all other project types (existing behavior)

Also updated notification logic to handle the new status transition.

### 4. Archival Manager View (Enhanced)

**File:** `src/views/system/ArchivalManagerView.vue`

Enhanced to support **both** Archival Manager and Online Accounts Manager roles:

- Detects user role from localStorage (`accessRole`)
- Shows different buttons based on role and project status:

  **Online Accounts Manager:**
  - When status = `to_online_accounts_manager`: Shows "Approve & Send to Editor-in-Chief" button
  - When status = `for_publish` AND project_type = `other`: Shows "Publish" button

  **Archival Manager:**
  - When status = `for_publish` AND project_type ≠ `other`: Shows "Publish" button

- Updated approval logic to handle both approval and publishing workflows
- Dynamic page title shows correct role name

### 5. Editor-in-Chief View

**File:** `src/views/system/EditorInChiefView.vue`

Updated notification message to be dynamic:

- For "Other" projects: "Project approved and sent to Online Accounts Manager for publishing!"
- For other projects: "Project approved and sent to Archival Manager for publishing!"

Status remains `for_publish` but the correct person is notified based on project type.

### 6. Other View Routing

**File:** `src/views/system/OtherView.vue`

Added routing for the new status:

- When status = `to_online_accounts_manager`: Routes to `/archival-manager/:id?type=other`

### 7. Router Configuration

**File:** `src/router/index.js`

No changes needed! The existing setup already supports this:

- `requireArchivalManager` guard already accepts both `archival_manager` and `online_accounts_manager` roles
- `/archival-manager/:id` route already exists and now handles both roles dynamically

### 8. Notifications Service

**File:** `src/services/notificationsService.js`

Updated notification routing to support the new workflow:

1. **Added to status-to-role mappings:**
   - `getWorkflowRolesByStatus()`: Added `to_online_accounts_manager: ['online_accounts_manager']`
   - Updated `for_publish` to include both archival and online accounts managers

2. **Added to status-to-designation mappings:**
   - `getDesignationsByStatus()`: Added `to_online_accounts_manager: ['Online Accounts Manager']`
   - Enhanced with project-type filtering for `for_publish` status:
     - If project_type = 'other': Only notify Online Accounts Manager
     - Otherwise: Only notify Archival Manager & Circulations Manager

3. **Added to workflow labels:**
   - `getWorkflowLabel()`: Added `to_online_accounts_manager: 'Online Accounts Manager Review'`

4. **Added to status change notifications:**
   - `notifyStatusChange()`: Added `to_online_accounts_manager` to forwarded statuses

---

## Testing Checklist

### Before Testing

- [ ] Run `ADD_ONLINE_ACCOUNTS_MANAGER_WORKFLOW.sql` in Supabase
- [ ] Verify new columns exist in projects table
- [ ] Verify new status exists in project_status enum

### Test Workflow

1. [ ] Create a new "Other" project as a writer
2. [ ] Submit to Section Head
3. [ ] Section Head approves
4. [ ] Technical Editor approves
5. [ ] Creative Director approves
6. [ ] **Verify:** Project goes to `to_online_accounts_manager` status
7. [ ] **Verify:** Online Accounts Manager (Kent) receives notification
8. [ ] **Verify:** Online Accounts Manager can see the project in their view
9. [ ] Online Accounts Manager approves
10. [ ] **Verify:** Project goes to `to_editor_in_chief` status
11. [ ] **Verify:** Editor-in-Chief receives notification
12. [ ] Editor-in-Chief approves
13. [ ] **Verify:** Project goes to `for_publish` status
14. [ ] **Verify:** Online Accounts Manager (NOT Archival Manager) receives notification
15. [ ] Online Accounts Manager publishes
16. [ ] **Verify:** Project is published and appears in archive

### Test Other Project Types

1. [ ] Create a "Magazine" project
2. [ ] Follow workflow through both editors
3. [ ] **Verify:** After both editors approve, project goes to `to_editor_in_chief` (NOT to Online Accounts Manager)
4. [ ] Editor-in-Chief approves
5. [ ] **Verify:** Archival Manager (NOT Online Accounts Manager) receives notification
6. [ ] Archival Manager publishes
7. [ ] **Verify:** Project is published successfully

---

## Files Modified

1. ✅ `ADD_ONLINE_ACCOUNTS_MANAGER_WORKFLOW.sql` (NEW)
2. ✅ `src/utils/statusFormatter.js`
3. ✅ `src/views/system/TechnicalEditorView.vue`
4. ✅ `src/views/system/ArchivalManagerView.vue`
5. ✅ `src/views/system/EditorInChiefView.vue`
6. ✅ `src/views/system/OtherView.vue`
7. ✅ `src/services/notificationsService.js`

## Database Migration Required

**IMPORTANT:** Before using the new workflow, run the following SQL migration in your Supabase dashboard:

```sql
c:\Users\yssah\OneDrive\Desktop\www\cams\ADD_ONLINE_ACCOUNTS_MANAGER_WORKFLOW.sql
```

This adds:

- The new `to_online_accounts_manager` status enum value
- Approval tracking columns for Online Accounts Manager

---

## Notes

- The Online Accounts Manager (Kent Adriane Vinatero) already has the `online_accounts_manager` access role
- The system automatically detects the user's role and shows appropriate buttons/actions
- Archival Managers and Online Accounts Managers use the same view (`ArchivalManagerView`), but see different options based on their role and the project type
- All notifications are automatically routed to the correct person based on project type and status

---

## Support

If you encounter any issues:

1. Verify the database migration was run successfully
2. Check that the user's `accessRole` in localStorage is set correctly
3. Check browser console for any errors
4. Verify the project's `project_type` field is set to 'other' for social media projects
