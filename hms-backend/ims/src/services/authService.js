// hms-backend/ims/src/services/authService.js
import api from '../utils/api';

// HMS endpoint: POST /api/auth/register (not /signup)
export const signup = async (payload) => {
  const { data } = await api.post('/auth/register', payload);
  return data;
};

// HMS endpoint: POST /api/auth/login ✅ matches
export const login = async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data;
};

// HMS endpoint: GET /api/auth/profile (not /me)
export const getMe = async () => {
  const { data } = await api.get('/auth/profile');
  return data;
};

// HMS endpoint: POST /api/auth/sso-exchange (added in step 1)
export const ssoExchange = async (token) => {
  const { data } = await api.post('/auth/sso-exchange', { token });
  return data;
};