import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Handle specific error codes
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('isLoggedIn');
          window.location.href = '/login';
          break;
        case 403:
          console.error('Forbidden:', error.response.data.error?.message);
          break;
        case 404:
          console.error('Not found:', error.response.data.error?.message);
          break;
        case 500:
          console.error('Server error:', error.response.data.error?.message);
          break;
      }
      return Promise.reject(error.response.data);
    } else if (error.request) {
      console.error('Network error:', error.message);
      return Promise.reject({ error: { message: 'Network error. Please check your connection.' } });
    } else {
      console.error('Error:', error.message);
      return Promise.reject({ error: { message: error.message } });
    }
  }
);

export default apiClient;
