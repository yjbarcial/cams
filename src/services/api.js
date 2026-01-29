import axios from 'axios';
import { supabase } from '@/utils/supabase';

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

// Request interceptor - Add Supabase auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get current session from Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
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
          // Unauthorized - just log, don't redirect (let the app handle auth state)
          // This prevents redirect loops when API auth differs from Supabase auth
          console.warn('API 401: Unauthorized request');
          break;
        case 403:
          console.error('Forbidden:', error.response.data.error?.message);
          break;
        case 404:
          console.error('Not found:', error.response.data.error?.message);
          break;
        case 500:
          // Only log if not the expected "not logged in" case
          const msg = error.response.data.error?.message;
          if (msg && !msg.includes('Tenant or user not found')) {
            console.error('Server error:', msg);
          }
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
