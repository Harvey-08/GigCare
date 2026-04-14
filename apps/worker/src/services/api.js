// apps/worker/src/services/api.js
import axios from 'axios';
import { supabase } from '../supabaseClient';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3011/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add Supabase JWT token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    console.log(`DEBUG: API Request to ${config.url}`);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('DEBUG: Session found, attaching token');
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else {
      console.warn('DEBUG: No session found for request');
    }
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle responses and session expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - session might be expired, sign out to trigger redirect logic in App.js
      supabase.auth.signOut();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
