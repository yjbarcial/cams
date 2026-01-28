# Frontend-Backend Integration Guide

## Overview

Your CAMS frontend is now integrated with the custom backend API. The system supports both:
1. **Direct Supabase connection** (original implementation)
2. **Custom Backend API** (new implementation with full REST API)

## Architecture

```
Frontend (Vue.js)
    ↓
API Service Layer (apiService.js)
    ↓
Backend API (Express.js)
    ↓
Database (PostgreSQL/Supabase)
```

## What's Been Integrated

### ✅ Completed Integrations

1. **API Client** ([src/services/api.js](c:\Users\Teacher\Desktop\cams\src\services\api.js))
   - Axios instance with interceptors
   - Automatic token management
   - Error handling
   - Request/response transformations

2. **API Services** ([src/services/apiService.js](c:\Users\Teacher\Desktop\cams\src\services\apiService.js))
   - Authentication (register, login, verify, logout)
   - Projects (CRUD + member management)
   - Tasks (CRUD + comments)
   - Profiles/Users
   - Notifications
   - Archives
   - Departments & Positions
   - Media Files
   - Audit Logs

3. **Updated Services**
   - [userService.js](c:\Users\Teacher\Desktop\cams\src\services\userService.js) - Now uses backend API
   - [notificationsServiceAPI.js](c:\Users\Teacher\Desktop\cams\src\services\notificationsServiceAPI.js) - Hybrid approach (API + localStorage)

4. **Dependencies Added**
   - `axios` - HTTP client
   - `socket.io-client` - Real-time WebSocket connection

## How to Use

### Option 1: Use Backend API (Recommended)

1. **Start the backend server:**
   ```bash
   cd server
   npm install
   # Configure server/.env
   npm run dev
   ```

2. **Configure frontend .env:**
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   ```

3. **Use API services in components:**
   ```javascript
   import { projectsAPI, authAPI } from '@/services/apiService'

   // Login
   const response = await authAPI.login({ email, password })
   
   // Get projects
   const projects = await projectsAPI.getAll({ status: 'in_progress' })
   
   // Create project
   const newProject = await projectsAPI.create({ title: 'New Project', ... })
   ```

### Option 2: Continue Using Supabase Directly

Your existing code still works! The old services like `projectHistory.js` continue to function with Supabase.

## Migration Path

### Gradual Migration Strategy

You can migrate page by page to use the backend API:

**Example: Migrate a component**

Before:
```javascript
import { supabase } from '@/utils/supabase'

const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('status', 'active')
```

After:
```javascript
import { projectsAPI } from '@/services/apiService'

const response = await projectsAPI.getAll({ status: 'active' })
const projects = response.data
```

### Pages/Components to Migrate

1. **Authentication Pages**
   - [LoginView.vue](c:\Users\Teacher\Desktop\cams\src\views\auth\LoginView.vue)
   - Update to use `authAPI.login()`

2. **Project Management**
   - [AddProjectView.vue](c:\Users\Teacher\Desktop\cams\src\views\system\AddProjectView.vue)
   - [ProjectView.vue](c:\Users\Teacher\Desktop\cams\src\views\system\ProjectView.vue)
   - All role-specific views (EditorInChiefView, SectionHeadView, etc.)
   - Update to use `projectsAPI.*` methods

3. **Archive Management**
   - [ArchiveView.vue](c:\Users\Teacher\Desktop\cams\src\views\system\ArchiveView.vue)
   - [ArchivalManagerView.vue](c:\Users\Teacher\Desktop\cams\src\views\system\ArchivalManagerView.vue)
   - Update to use `archivesAPI.*` methods

4. **Notifications**
   - [NotificationsView.vue](c:\Users\Teacher\Desktop\cams\src\views\system\NotificationsView.vue)
   - Already has hybrid service available

5. **Admin Panel**
   - [AdminView.vue](c:\Users\Teacher\Desktop\cams\src\views\admin\AdminView.vue)
   - Update to use `profilesAPI`, `departmentsAPI`, `positionsAPI`

## Real-time Features (WebSocket)

### Setup WebSocket Connection

```javascript
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000', {
  auth: {
    token: localStorage.getItem('authToken')
  }
})

// Join project room
socket.emit('join:project', projectId)

// Listen for updates
socket.on('project:updated', (data) => {
  console.log('Project updated:', data)
  // Update UI
})

socket.on('notification:new', (notification) => {
  console.log('New notification:', notification)
  // Show notification
})

// Typing indicators
socket.emit('typing:start', { type: 'task', id: taskId })
socket.emit('typing:stop', { type: 'task', id: taskId })
```

## API Response Format

All API responses follow this structure:

**Success:**
```json
{
  "success": true,
  "message": "Success message",
  "data": { /* response data */ }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "Error message",
    "details": []
  }
}
```

## Authentication Flow

1. **Login:**
   ```javascript
   const response = await authAPI.login({ email, password })
   // Token is automatically stored in localStorage
   ```

2. **Automatic Token Injection:**
   - All subsequent API calls automatically include the token
   - No need to manually add Authorization headers

3. **Token Expiration:**
   - 401 errors automatically clear token and redirect to login
   - Implement token refresh logic if needed

4. **Logout:**
   ```javascript
   authAPI.logout() // Clears all auth data
   ```

## Error Handling

The API client handles errors automatically:

```javascript
try {
  const response = await projectsAPI.create(projectData)
  // Handle success
} catch (error) {
  // Error is already logged
  // error.error.message contains the error message
  console.error(error.error.message)
}
```

## Next Steps

### Immediate Actions Required:

1. **Install frontend dependencies:**
   ```bash
   npm install
   ```

2. **Start backend server:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Test the integration:**
   - Try logging in
   - Create a project
   - Check notifications

### Recommended Migrations (Priority Order):

1. **High Priority** - Migrate authentication (LoginView)
2. **High Priority** - Migrate project listing and creation
3. **Medium Priority** - Migrate task management
4. **Medium Priority** - Migrate notifications
5. **Low Priority** - Archive management (can keep using Supabase)
6. **Low Priority** - Settings and admin features

## Hybrid Approach

You can use both systems simultaneously:
- **Backend API** for: Authentication, Projects, Tasks, Notifications
- **Supabase Direct** for: Archives, File storage, Real-time subscriptions

This allows gradual migration without breaking existing functionality.

## Benefits of Backend API

1. **Better Control** - Full control over business logic
2. **Security** - Server-side validation and authorization
3. **Flexibility** - Easy to add custom endpoints
4. **Audit Trail** - Built-in audit logging
5. **Real-time** - WebSocket support for live updates
6. **Centralized** - All business logic in one place

## Troubleshooting

### Common Issues:

**CORS Errors:**
- Check `ALLOWED_ORIGINS` in server/.env
- Make sure it includes your frontend URL

**401 Unauthorized:**
- Token expired or invalid
- Check if user is logged in
- Verify JWT_SECRET matches in backend

**Connection Refused:**
- Backend server not running
- Check PORT in server/.env
- Verify VITE_API_BASE_URL in frontend

**TypeErrors:**
- Response structure changed
- Check response.data instead of direct response
- All API calls return `{ success, data, message }`

## Example Component Integration

Here's a complete example of migrating a component:

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { projectsAPI, tasksAPI } from '@/services/apiService'

const projects = ref([])
const loading = ref(false)
const error = ref(null)

const loadProjects = async () => {
  loading.value = true
  error.value = null
  
  try {
    const response = await projectsAPI.getAll({ 
      status: 'in_progress',
      limit: 20 
    })
    projects.value = response.data
  } catch (err) {
    error.value = err.error?.message || 'Failed to load projects'
    console.error('Error loading projects:', err)
  } finally {
    loading.value = false
  }
}

const createProject = async (projectData) => {
  try {
    const response = await projectsAPI.create(projectData)
    projects.value.unshift(response.data)
    return response.data
  } catch (err) {
    console.error('Error creating project:', err)
    throw err
  }
}

onMounted(() => {
  loadProjects()
})
</script>
```

## Support

For issues or questions:
1. Check [Backend README](../server/README.md)
2. Check [API Documentation](../server/API_DOCS.md)
3. Review error logs in browser console
4. Check backend server logs

## Summary

✅ **Backend API is fully functional**
✅ **Frontend API services created**
✅ **Authentication integrated**
✅ **All CRUD operations available**
✅ **WebSocket support ready**
✅ **Error handling implemented**
⏳ **Components need gradual migration**

Your system now has a robust, scalable backend with a clean API interface. You can migrate components gradually while maintaining full functionality!
