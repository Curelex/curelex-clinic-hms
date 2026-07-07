// hms-backend/ims/src/services/api.js
import axios from 'axios';

const attachToken = (config) => {
  const token = localStorage.getItem('ims_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
};

const on401 = (err) => {
  if (err.response?.status === 401) localStorage.removeItem('ims_token');
  return Promise.reject(err);
};

// ── Auth  →  /api/auth/* ──────────────────────────────────────────────────
export const authApi = axios.create({
  baseURL: '/api',
});
authApi.interceptors.request.use(attachToken);
authApi.interceptors.response.use((r) => r, on401);

// ── IMS features  →  /api/v1/ims/* ───────────────────────────────────────
const api = axios.create({
  baseURL: '/api/v1/ims',
});
api.interceptors.request.use(attachToken);
api.interceptors.response.use((r) => r, on401);

export default api;