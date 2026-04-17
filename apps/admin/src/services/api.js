// apps/admin/src/services/api.js
import axios from 'axios';
import { getAdminToken, clearAdminToken } from '../utils/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3011/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Interceptor to inject JWT
apiClient.interceptors.request.use(
  async (config) => {
    const token = getAdminToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for session expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAdminToken();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
