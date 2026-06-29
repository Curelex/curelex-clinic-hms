// hms-backend/ims/src/utils/api.js
import axios from 'axios';

// Base URL comes from .env — defaults to /api which Vite proxies to :5000
const api = axios.create({
  baseURL: import.meta.env.VITE_IMS_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ims_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 — clear stale token so the user gets redirected to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ims_token');
    }
    return Promise.reject(err);
  }
);

export default api;