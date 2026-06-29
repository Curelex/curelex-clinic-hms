// hms-backend/ims/src/services/authService.js
import { authApi } from './api';

export const signup = async (payload) => {
  const { data } = await authApi.post('/auth/register', payload);
  return data;
};

export const login = async (payload) => {
  const { data } = await authApi.post('/auth/login', payload);
  return data;
};

export const getMe = async () => {
  const { data } = await authApi.get('/auth/profile');
  return data;
};

export const ssoExchange = async (token) => {
  const { data } = await authApi.post('/auth/sso-exchange', { token });
  return data;
};