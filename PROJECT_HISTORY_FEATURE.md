# Project History Feature

## Overview

The Project History feature provides comprehensive version control for all projects in the CAMS application. Users can create versions, track changes, compare different versions, restore previous versions, and add comments to specific versions.

## Features

### 1. Version Creation

- **Create Version**: Users can create snapshots of their project at any point in time
- **Version Types**: Draft, Published, Major, Minor, and Restoration versions
- **Automatic Metadata**: Word count, character count, and timestamps are automatically tracked
- **Change Descriptions**: Users must provide a description of changes made

### 2. Version Management

- **Version History**: View all versions of a project in chronological order
- **Version Comparison**: Compare any two versions side-by-side
- **Version Restoration**: Restore a project to any previous version
- **Version Deletion**: Soft delete versions (mark as deleted)

### 3. Comments System

- **Version Comments**: Add comments to specific versions
- **Comment Threading**: Comments are associated with specific versions
- **Comment Search**: Search through comments across all versions

### 4. Project Statistics

- **Version Count**: Total number of versions created
- **Comment Count**: Total number of comments across all versions
- **Word Count Tracking**: Average words per version
- **Version Type Distribution**: Breakdown of version types

## Usage

### Creating a Version

1. Open any project in the ProjectView
2. Click the "Create Version" button
3. Provide a description of the changes made
4. Click "Create Version" to save the snapshot

### Viewing Project History

1. In any project list view (Magazine, Newsletter, Folio, Other), click the history icon (📜) next to any project
2. Or in ProjectView, click "Show History" to toggle the history panel
3. Browse through all versions with their metadata and comments

### Comparing Versions

1. In the Project History view, select two versions by clicking on them
2. Click "Compare Selected" to see a detailed comparison
3. View changes in content, metadata, and comments

### Restoring a Version

1. In the Project History view, find the version you want to restore
2. Click the "Restore" button next to the version
3. Confirm the restoration - this will create a new version with the restored content

### Adding Comments

1. In the Project History view, scroll down to the "Add Comment" section for any version
2. Type your comment and press Ctrl+Enter or click "Add Comment"
3. Comments are associated with the specific version

## Technical Implementation

### Storage

- All history data is stored in localStorage using the pattern: `{projectType}_project_history_{projectId}`
- Each version includes complete project data, metadata, and comments
- Soft deletion is used to preserve data integrity

### Components

- **ProjectHistory.vue**: Main history display component
- **VersionComparison.vue**: Detailed version comparison dialog
- **ProjectHistoryButton.vue**: Reusable history button for project lists
- **projectHistory.js**: Service layer for all history operations

### Integration Points

- **ProjectView.vue**: Main project editing interface with history panel
- **AddProjectView.vue**: Creates initial version when project is created
- **All Project List Views**: Include history buttons for quick access

## Data Structure

### Version Object

```javascript
{
  id: "v1234567890",
  projectId: "123",
  projectType: "magazine",
  versionNumber: 1,
  timestamp: "2024-01-01T00:00:00.000Z",
  author: "Current User",
  changeDescription: "Initial project creation",
  versionType: "draft",
  data: {
    title: "Project Title",
    description: "Project Description",
    content: "<p>Project Content</p>",
    status: "In Progress",
    // ... other project fields
    metadata: {
      wordCount: 150,
      characterCount: 750,
      lastModified: "2024-01-01T00:00:00.000Z"
    }
  },
  comments: [
    {
      id: "c1234567890",
      author: "Comment Author",
      content: "Comment text",
      timestamp: "2024-01-01T00:00:00.000Z",
      isApproved: false
    }
  ],
  tags: [],
  isActive: true,
  isDeleted: false
}
```

## API Methods

### Core Methods

- `createProjectVersion(projectType, projectId, projectData, changeDescription, author, versionType)`
- `getProjectHistory(projectType, projectId)`
- `getProjectVersion(projectType, projectId, versionId)`
- `restoreProjectVersion(projectType, projectId, versionId)`
- `addVersionComment(projectType, projectId, versionId, comment, author)`
- `compareVersions(version1, version2)`
- `deleteProjectVersion(projectType, projectId, versionId)`

### Utility Methods

- `getProjectStatistics(projectType, projectId)`
- `getActiveProjectHistory(projectType, projectId)`

## Future Enhancements

1. **Database Integration**: Move from localStorage to a proper database
2. **User Authentication**: Integrate with auth system for proper user tracking
3. **File Attachments**: Support for version-specific file attachments
4. **Branching**: Support for project branches and merging
5. **Export/Import**: Export project history for backup or migration
6. **Advanced Diff**: More sophisticated content comparison with syntax highlighting
7. **Version Tags**: Custom tags for better organization
8. **Bulk Operations**: Bulk restore, delete, or compare operations

## Troubleshooting

### Common Issues

1. **History not showing**: Ensure project has been saved at least once
2. **Version creation fails**: Check that all required fields are filled
3. **Restore not working**: Ensure the target version exists and is not deleted
4. **Comments not saving**: Verify comment text is not empty

### Debug Information

- Check browser console for error messages
- Verify localStorage contains history data: `localStorage.getItem('{projectType}_project_history_{projectId}')`
- Ensure project ID is consistent across operations
