# Notification Integration Guide

## Overview

The notification system now automatically notifies all involved users (creators, section heads, artists, writers, technical editors, creative directors, editor-in-chief, chief adviser, and archival managers) for various project actions.

## Available Notification Functions

### 1. File Upload Notification

```javascript
import { notifyFileUpload } from '@/services/notificationsService.js'

// When a file is uploaded
await notifyFileUpload({
  project: projectObject, // Full project object from Supabase
  fileName: 'design.png',
  uploadedBy: 'John Doe',
})
```

### 2. Project Update Notification

```javascript
import { notifyProjectUpdate } from '@/services/notificationsService.js'

// When project content is edited
await notifyProjectUpdate({
  project: projectObject,
  updatedBy: 'Jane Smith',
  changes: 'Updated content and title', // Optional
})
```

### 3. Comment Notification

```javascript
import { notifyNewComment } from '@/services/notificationsService.js'

// When a comment is added
await notifyNewComment({
  project: projectObject,
  commentAuthor: 'Bob Johnson',
  commentText: 'Please revise the introduction section.',
})
```

### 4. Status Change Notification

```javascript
import { notifyStatusChange } from '@/services/notificationsService.js'

// When project status changes (approval, return, rejection, etc.)
await notifyStatusChange({
  project: projectObject,
  oldStatus: 'draft',
  newStatus: 'to_section_head',
  actionBy: 'Alice Brown',
  comments: 'Please review urgently', // Optional
})
```

## Integration Examples

### Example 1: In ProjectView when content is saved

```javascript
// In saveContent function
const saveContent = async (showNotif = false) => {
  try {
    // ... existing save logic ...

    // Notify all involved users
    const userName = localStorage.getItem('userName') || 'Unknown User'
    await notifyProjectUpdate({
      project: project.value,
      updatedBy: userName,
      changes: 'Content updated',
    })
  } catch (error) {
    console.error('Error saving:', error)
  }
}
```

### Example 2: In workflow views when changing status

```javascript
// In any workflow view (Section Head, Technical Editor, etc.)
const approveProject = async () => {
  try {
    const userName = localStorage.getItem('userName') || 'Unknown User'

    // Update project status
    await projectsService.update(projectId, {
      status: 'to_technical_editor',
    })

    // Notify all involved users
    await notifyStatusChange({
      project: project.value,
      oldStatus: project.value.status,
      newStatus: 'to_technical_editor',
      actionBy: userName,
      comments: 'Approved for technical review',
    })
  } catch (error) {
    console.error('Error approving:', error)
  }
}
```

### Example 3: When adding a comment

```javascript
// In comment submission
const submitComment = async () => {
  try {
    const userName = localStorage.getItem('userName') || 'Unknown User'

    // Add comment to database
    await addProjectComment(projectId, commentText)

    // Notify all involved users
    await notifyNewComment({
      project: project.value,
      commentAuthor: userName,
      commentText: commentText,
    })
  } catch (error) {
    console.error('Error adding comment:', error)
  }
}
```

### Example 4: When uploading media files

```javascript
// In file upload handler
const handleFileUpload = async (file) => {
  try {
    const userName = localStorage.getItem('userName') || 'Unknown User'

    // Upload file logic
    // ... upload to storage ...

    // Notify all involved users
    await notifyFileUpload({
      project: project.value,
      fileName: file.name,
      uploadedBy: userName,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
  }
}
```

## What happens automatically:

1. **Finds all involved users** including:
   - Project creator
   - Section head
   - All artists and writers (from project_members table)
   - Workflow role holders based on current status

2. **Sends notifications to ALL of them** (except the person who performed the action)

3. **Each user sees it in their notification panel** (filtered by their email/user ID)

## No API server needed!

All notifications use localStorage and Supabase directly - no localhost:3000 API server required!
