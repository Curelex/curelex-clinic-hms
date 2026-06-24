import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // If super_admin has selected a clinic to operate as, attach it as a header
  // so every API call (patients, billing, lab, etc.) knows which clinic to use
  // without each page having to manually pass it.
  const saClinicId = sessionStorage.getItem('sa_clinicId');
  if (saClinicId) config.headers['x-clinic-id'] = saClinicId;

  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.log("401 ERROR:", err.config?.url);
      console.log(err.response);
      localStorage.removeItem('hms_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;