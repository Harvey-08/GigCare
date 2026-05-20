import axios from 'axios';
import { getAdminToken, clearAdminToken } from '../utils/auth';

const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  
  // If the browser is running the app on 3013, you're likely in local-dev mode
  if (window.location.port === '3013') {
    return 'http://localhost:3001/api'; 
  }
  
  return 'http://localhost:3011/api'; // Docker default
};

const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

console.log(`🔌 Admin API Client initialized using: ${API_BASE_URL}`);

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
