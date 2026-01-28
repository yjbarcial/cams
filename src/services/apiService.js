import apiClient from './api';

/**
 * Authentication API Service
 */
export const authAPI = {
  // Register new user
  async register(userData) {
    return await apiClient.post('/auth/register', userData);
  },

  // Login user
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.success && response.data.token) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userEmail', response.data.user.email);
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('userRole', response.data.user.role);
    }
    return response;
  },

  // Verify token
  async verifyToken() {
    return await apiClient.get('/auth/verify');
  },

  // Refresh token
  async refreshToken() {
    return await apiClient.post('/auth/refresh');
  },

  // Logout
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
  }
};

/**
 * Projects API Service
 */
export const projectsAPI = {
  // Get all projects
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await apiClient.get(`/projects?${params}`);
  },

  // Get project by ID
  async getById(id) {
    return await apiClient.get(`/projects/${id}`);
  },

  // Create project
  async create(projectData) {
    return await apiClient.post('/projects', projectData);
  },

  // Update project
  async update(id, projectData) {
    return await apiClient.put(`/projects/${id}`, projectData);
  },

  // Delete project
  async delete(id) {
    return await apiClient.delete(`/projects/${id}`);
  },

  // Add member to project
  async addMember(projectId, userId, role) {
    return await apiClient.post(`/projects/${projectId}/members`, { user_id: userId, role });
  },

  // Remove member from project
  async removeMember(projectId, userId) {
    return await apiClient.delete(`/projects/${projectId}/members/${userId}`);
  }
};

/**
 * Tasks API Service
 */
export const tasksAPI = {
  // Get all tasks
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await apiClient.get(`/tasks?${params}`);
  },

  // Get task by ID
  async getById(id) {
    return await apiClient.get(`/tasks/${id}`);
  },

  // Create task
  async create(taskData) {
    return await apiClient.post('/tasks', taskData);
  },

  // Update task
  async update(id, taskData) {
    return await apiClient.put(`/tasks/${id}`, taskData);
  },

  // Delete task
  async delete(id) {
    return await apiClient.delete(`/tasks/${id}`);
  },

  // Add comment to task
  async addComment(taskId, content, parentCommentId = null) {
    return await apiClient.post(`/tasks/${taskId}/comments`, { content, parent_comment_id: parentCommentId });
  }
};

/**
 * Profiles API Service
 */
export const profilesAPI = {
  // Get all profiles
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await apiClient.get(`/profiles?${params}`);
  },

  // Get current user profile
  async getCurrent() {
    return await apiClient.get('/profiles/me');
  },

  // Get profile by ID
  async getById(id) {
    return await apiClient.get(`/profiles/${id}`);
  },

  // Create profile
  async create(profileData) {
    return await apiClient.post('/profiles', profileData);
  },

  // Update profile
  async update(id, profileData) {
    return await apiClient.put(`/profiles/${id}`, profileData);
  },

  // Delete profile
  async delete(id) {
    return await apiClient.delete(`/profiles/${id}`);
  }
};

/**
 * Notifications API Service
 */
export const notificationsAPI = {
  // Get user notifications
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await apiClient.get(`/notifications?${params}`);
  },

  // Get unread count
  async getUnreadCount() {
    return await apiClient.get('/notifications/unread-count');
  },

  // Mark notification as read
  async markAsRead(id) {
    return await apiClient.put(`/notifications/${id}/read`);
  },

  // Mark all as read
  async markAllAsRead() {
    return await apiClient.put('/notifications/read-all');
  },

  // Delete notification
  async delete(id) {
    return await apiClient.delete(`/notifications/${id}`);
  }
};

/**
 * Archives API Service
 */
export const archivesAPI = {
  // Get all archives
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await apiClient.get(`/archives?${params}`);
  },

  // Get archive by ID
  async getById(id) {
    return await apiClient.get(`/archives/${id}`);
  },

  // Create archive
  async create(archiveData) {
    return await apiClient.post('/archives', archiveData);
  },

  // Update archive
  async update(id, archiveData) {
    return await apiClient.put(`/archives/${id}`, archiveData);
  },

  // Delete archive
  async delete(id) {
    return await apiClient.delete(`/archives/${id}`);
  }
};

/**
 * Departments API Service
 */
export const departmentsAPI = {
  // Get all departments
  async getAll() {
    return await apiClient.get('/departments');
  },

  // Get department by ID
  async getById(id) {
    return await apiClient.get(`/departments/${id}`);
  },

  // Create department
  async create(departmentData) {
    return await apiClient.post('/departments', departmentData);
  },

  // Update department
  async update(id, departmentData) {
    return await apiClient.put(`/departments/${id}`, departmentData);
  },

  // Delete department
  async delete(id) {
    return await apiClient.delete(`/departments/${id}`);
  }
};

/**
 * Positions API Service
 */
export const positionsAPI = {
  // Get all positions
  async getAll() {
    return await apiClient.get('/positions');
  },

  // Get position by ID
  async getById(id) {
    return await apiClient.get(`/positions/${id}`);
  },

  // Get positions by department
  async getByDepartment(departmentId) {
    return await apiClient.get(`/positions/department/${departmentId}`);
  },

  // Create position
  async create(positionData) {
    return await apiClient.post('/positions', positionData);
  },

  // Update position
  async update(id, positionData) {
    return await apiClient.put(`/positions/${id}`, positionData);
  },

  // Delete position
  async delete(id) {
    return await apiClient.delete(`/positions/${id}`);
  }
};

/**
 * Media Files API Service
 */
export const mediaFilesAPI = {
  // Get all media files
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await apiClient.get(`/media-files?${params}`);
  },

  // Get file by ID
  async getById(id) {
    return await apiClient.get(`/media-files/${id}`);
  },

  // Upload file
  async upload(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });

    return await apiClient.post('/media-files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Delete file
  async delete(id) {
    return await apiClient.delete(`/media-files/${id}`);
  }
};

/**
 * Audit Logs API Service (Admin only)
 */
export const auditLogsAPI = {
  // Get all audit logs
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters).toString();
    return await apiClient.get(`/audit-logs?${params}`);
  },

  // Get audit log by ID
  async getById(id) {
    return await apiClient.get(`/audit-logs/${id}`);
  }
};

export default {
  auth: authAPI,
  projects: projectsAPI,
  tasks: tasksAPI,
  profiles: profilesAPI,
  notifications: notificationsAPI,
  archives: archivesAPI,
  departments: departmentsAPI,
  positions: positionsAPI,
  mediaFiles: mediaFilesAPI,
  auditLogs: auditLogsAPI
};
