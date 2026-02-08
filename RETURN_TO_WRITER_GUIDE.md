# Return to Writer/Artist Feature

## Overview

Implemented a comprehensive "Return to Writer/Artist" feature that allows Section Heads and Editors to send projects back to writers/artists for edits, with proper notification and metadata tracking.

## Features Implemented

### 1. **Return Button in Approval Views**

- Added "Return to Writer/Artist" button in SectionHeadView and TechnicalEditorView
- Button is always visible to editors on approval screens
- Clearly labeled with appropriate icon (↩️ arrow-left)

### 2. **Metadata Tracking**

Every return action now records:

- WHO returned it (returned_by_section_head_user, returned_by_technical_editor_user)
- WHEN it was returned (returned_by_section_head_date, returned_by_technical_editor_date)
- WHY it was returned (returned_by_section_head_comments, returned_by_technical_editor_comments)
- Status flag (returned_by_section_head: true, etc.)

### 3. **Smart Notifications**

When a project is returned:

- ✅ Writer/Artist receives notification
- ✅ All involved users are notified (Section Head, other editors, etc.)
- ✅ Notification includes reason for return
- ✅ Notification shows which role/editor returned it
- ✅ Uses clean status display: "Returned by Section Head" not "returned_by_section_head"

### 4. **Workflow Support**

The return feature works at multiple approval levels:

**Section Head Level:**

- Button: "Return to Writer/Artist"
- Status becomes: `returned_by_section_head`
- Notification type: "Returned"
- Metadata fields: `returned_by_section_head*`

**Technical Editor/Creative Director Level:**

- Button: "Return to Writer/Artist"
- Status becomes: `returned_by_technical_editor`
- Notification type: "Returned"
- Metadata fields: `returned_by_technical_editor*`

## How It Works

### For Section Head

```vue
<!-- Button appears in approval actions -->
<v-btn @click="startApproval('return')">
  Return to Writer/Artist
</v-btn>

<!-- When clicked, opens approval dialog -->
<!-- User can add comments explaining what needs editing -->
<!-- Clicking "Confirm" triggers return action -->
```

**Data saved to project:**

```javascript
{
  status: 'returned_by_section_head',
  returned_by_section_head: true,
  returned_by_section_head_date: '2026-02-08T...',
  returned_by_section_head_comments: 'Please revise the introduction',
  returned_by_section_head_user: 'user-uuid'
}
```

### For Technical Editor

```vue
<!-- Same button structure as Section Head -->
<!-- Can be called at any point in review -->
```

**Data saved to project:**

```javascript
{
  status: 'returned_by_technical_editor',
  returned_by_technical_editor: true,
  returned_by_technical_editor_date: '2026-02-08T...',
  returned_by_technical_editor_comments: 'Technical formatting issues need fixing',
  returned_by_technical_editor_user: 'user-uuid'
}
```

## Notifications

### Notification Message Examples

**When Section Head returns:**

```
Title: Status changed: "Project Title"
Description: "John Doe returned 'Project Title' for edits.
Comment: Please revise the introduction"
Type: Returned (Warning color)
```

**When Technical Editor returns:**

```
Title: Status changed: "Project Title"
Description: "Jane Smith returned 'Project Title' for edits.
Comment: Technical formatting issues need fixing"
Type: Returned (Warning color)
```

### Who Gets Notified

When a project is returned, notifications go to:

1. ✅ **Writer/Artist** (person who submitted it)
2. ✅ **Section Head**
3. ✅ **All other involved members**
4. ✅ **Not** the person who performed the return action (themselves)

## Database Changes

The projects table now tracks returns with these new columns:

```sql
-- Section Head returns
returned_by_section_head: boolean
returned_by_section_head_date: timestamp
returned_by_section_head_comments: text
returned_by_section_head_user: uuid

-- Technical Editor returns
returned_by_technical_editor: boolean
returned_by_technical_editor_date: timestamp
returned_by_technical_editor_comments: text
returned_by_technical_editor_user: uuid
```

## Modified Files

### 1. **SectionHeadView.vue**

- ✅ Changed import from `createStatusChangeNotification` to `notifyStatusChange`
- ✅ Enhanced `submitApproval()` to track return metadata
- ✅ Uses `notifyStatusChange` for comprehensive notifications
- ✅ Records: `returned_by_section_head*` fields

### 2. **TechnicalEditorView.vue**

- ✅ Added "Return to Writer/Artist" button to `approvalActions`
- ✅ Changed import from `createStatusChangeNotification` to `notifyStatusChange`
- ✅ Enhanced `submitApproval()` to track return metadata
- ✅ Uses `notifyStatusChange` for comprehensive notifications
- ✅ Records: `returned_by_technical_editor*` fields

### 3. **notificationsService.js** (Previously updated)

- ✅ `notifyStatusChange()` function handles all return scenarios
- ✅ `getStatusDisplayName()` exported for consistent formatting
- ✅ Finds all involved users and sends notifications to each

## Approval Workflow Lock

⚠️ **Important:** The feature respects approval hierarchy:

**Only the current approval level can act:**

- If project is at `to_section_head` → Only Section Head can approve/return
- If project is at `to_technical_editor` → Only Technical Editor can approve/return
- If project is at `to_editor_in_chief` → Only Editor-in-Chief can approve/return
- etc.

**Users cannot jump levels:**

- Section Head cannot approve what's already at Technical Editor level
- Technical Editor cannot approve Section Head level
- Each role handles its specific approval stage

## Future Enhancements

Possible future additions:

- [ ] Track return count (how many times was a project returned?)
- [ ] Track edit history after return
- [ ] Deadline extensions when projects are returned
- [ ] Return reason templates (dropdown for common issues)
- [ ] Automatic notification reminders if not re-submitted within X days
- [ ] Extend feature to EditorInChiefView and ChiefAdviserView
- [ ] Dashboard widget showing "returned to you" pending items

## Testing Checklist

- [ ] Section Head can return a project at `to_section_head` status
- [ ] Technical Editor can return a project at `to_technical_editor` status
- [ ] Return adds comments to the notification
- [ ] Writer/Artist receives notification about return
- [ ] Project status changes to `returned_by_*`
- [ ] Metadata fields are populated correctly
- [ ] Return is recorded in project history
- [ ] Returned project shows in writer's dashboard
- [ ] Multiple returns of same project work correctly
- [ ] Return with no comments doesn't error
