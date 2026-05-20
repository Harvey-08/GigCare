import axios from 'axios';
import { getToken, clearToken } from '../utils/auth';

const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  
  // If the browser is running the app on 3010, you're likely in local-dev mode
  if (window.location.port === '3010') {
    return 'http://localhost:3001/api'; 
  }
  
  return 'http://localhost:3011/api'; // Docker default
};

const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

console.log(`🔌 API Client initialized using: ${API_BASE_URL}`);

apiClient.interceptors.request.use(
  async (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['Content-Type'] = 'application/json';
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
