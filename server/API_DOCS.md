# CAMS API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "member",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login
**POST** `/auth/login`

Authenticate user and receive token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Verify Token
**GET** `/auth/verify`

Verify if current token is valid.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ }
  }
}
```

---

## Archives

### Get All Archives
**GET** `/archives`

Get list of all archives (public endpoint).

**Query Parameters:**
- `category` (optional): Filter by category (magazine, newsletter, folio, other)
- `search` (optional): Search in title and description
- `limit` (optional): Limit results
- `offset` (optional): Offset for pagination

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Spring 2026 Magazine",
      "description": "Quarterly magazine",
      "category": "magazine",
      "file_url": "https://...",
      "cover_image_url": "https://...",
      "publication_date": "2026-03-15",
      "authors": "Editorial Team",
      "tags": ["campus", "students"],
      "created_at": "2026-01-28T..."
    }
  ],
  "count": 1
}
```

### Get Archive by ID
**GET** `/archives/:id`

Get single archive by ID (public endpoint).

### Create Archive
**POST** `/archives`

Create new archive entry (requires authentication).

**Request Body:**
```json
{
  "title": "Spring 2026 Magazine",
  "description": "Quarterly magazine for Spring",
  "category": "magazine",
  "file_url": "https://example.com/file.pdf",
  "cover_image_url": "https://example.com/cover.jpg",
  "publication_date": "2026-03-15",
  "authors": "Editorial Team",
  "volume_issue": "Vol 1, Issue 1",
  "tags": ["campus", "students"]
}
```

### Update Archive
**PUT** `/archives/:id`

Update archive (requires admin/editor role).

### Delete Archive
**DELETE** `/archives/:id`

Delete archive (requires admin role).

---

## Projects

### Get All Projects
**GET** `/projects`

Get all projects (requires authentication).

**Query Parameters:**
- `status`: Filter by status (draft, planning, in_progress, review, completed, archived)
- `project_type`: Filter by type (magazine, newsletter, folio, other)
- `priority`: Filter by priority (low, medium, high, urgent)
- `search`: Search in title and description

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Spring 2026 Magazine",
      "description": "Quarterly magazine project",
      "project_type": "magazine",
      "status": "in_progress",
      "priority": "high",
      "start_date": "2026-01-01",
      "due_date": "2026-03-31",
      "section_head_name": "John Doe",
      "created_by_name": "Jane Editor",
      "member_count": 5,
      "task_count": 12,
      "created_at": "2026-01-15T..."
    }
  ]
}
```

### Get Project by ID
**GET** `/projects/:id`

Get detailed project information including members.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Spring 2026 Magazine",
    "members": [
      {
        "id": 1,
        "user_id": 5,
        "role": "owner",
        "user_name": "Jane Editor"
      }
    ]
  }
}
```

### Create Project
**POST** `/projects`

Create new project.

**Request Body:**
```json
{
  "title": "Spring 2026 Magazine",
  "description": "Quarterly magazine for Spring semester",
  "project_type": "magazine",
  "status": "planning",
  "priority": "high",
  "start_date": "2026-01-01",
  "due_date": "2026-03-31",
  "section_head_id": 3
}
```

### Update Project
**PUT** `/projects/:id`

Update project details.

### Delete Project
**DELETE** `/projects/:id`

Delete project (admin/section_head only).

### Add Project Member
**POST** `/projects/:id/members`

Add member to project.

**Request Body:**
```json
{
  "user_id": 5,
  "role": "contributor"
}
```

### Remove Project Member
**DELETE** `/projects/:id/members/:userId`

Remove member from project.

---

## Tasks

### Get All Tasks
**GET** `/tasks`

Get all tasks.

**Query Parameters:**
- `project_id`: Filter by project
- `assigned_to`: Filter by assigned user
- `status`: Filter by status (todo, in_progress, review, completed, blocked)
- `priority`: Filter by priority

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "project_id": 1,
      "title": "Write Campus Life Article",
      "description": "Article about campus activities",
      "status": "in_progress",
      "priority": "high",
      "due_date": "2026-02-15T...",
      "created_by_name": "Jane Editor",
      "assigned_to_name": "John Writer",
      "project_title": "Spring 2026 Magazine"
    }
  ]
}
```

### Get Task by ID
**GET** `/tasks/:id`

Get task details including comments.

### Create Task
**POST** `/tasks`

Create new task.

**Request Body:**
```json
{
  "project_id": 1,
  "title": "Write Campus Life Article",
  "description": "Article about recent campus activities",
  "status": "todo",
  "priority": "high",
  "due_date": "2026-02-15",
  "assigned_to": 5
}
```

### Update Task
**PUT** `/tasks/:id`

Update task details.

### Delete Task
**DELETE** `/tasks/:id`

Delete task.

### Add Comment to Task
**POST** `/tasks/:id/comments`

Add comment to task.

**Request Body:**
```json
{
  "content": "This looks great!",
  "parent_comment_id": null
}
```

---

## Notifications

### Get User Notifications
**GET** `/notifications`

Get notifications for current user.

**Query Parameters:**
- `is_read`: Filter by read status (true/false)
- `type`: Filter by type (info, warning, error, success)
- `limit`: Limit results

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "New Task Assigned",
      "message": "You have been assigned to task 'Write Article'",
      "type": "info",
      "is_read": false,
      "created_at": "2026-01-28T..."
    }
  ]
}
```

### Get Unread Count
**GET** `/notifications/unread-count`

Get count of unread notifications.

**Response:**
```json
{
  "success": true,
  "data": {
    "count": 5
  }
}
```

### Mark as Read
**PUT** `/notifications/:id/read`

Mark single notification as read.

### Mark All as Read
**PUT** `/notifications/read-all`

Mark all notifications as read.

---

## Media Files

### Upload File
**POST** `/media-files`

Upload a file.

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: The file to upload
- `category`: File category (optional)
- `project_id`: Associated project ID (optional)
- `task_id`: Associated task ID (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "document.pdf",
    "url": "/uploads/document-123456.pdf",
    "mime_type": "application/pdf",
    "size": 1024000,
    "uploaded_by": 1
  }
}
```

### Get All Media Files
**GET** `/media-files`

Get all media files with optional filters.

### Delete File
**DELETE** `/media-files/:id`

Delete a file.

---

## Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## WebSocket Connection

Connect to WebSocket server:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your_jwt_token'
  }
});

// Join project room
socket.emit('join:project', projectId);

// Listen for updates
socket.on('project:updated', (data) => {
  console.log('Project updated:', data);
});

socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});
```

## Rate Limiting

Currently not implemented. Recommended for production:
- 100 requests per 15 minutes per IP
- 1000 requests per hour per user

## Pagination

For endpoints supporting pagination, use:
- `limit`: Number of results per page (default: 10, max: 100)
- `offset`: Number of results to skip

Response includes total count for calculating pages.
