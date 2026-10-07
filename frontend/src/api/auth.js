import { apiClient } from './client';

export const loginUser = async ({ username, password }) => {
  const response = await apiClient.post('/auth/token/', { username, password });
  return response.data;
};

export const registerUser = async ({ username, email, password }) => {
  const response = await apiClient.post('/auth/register/', {
    username,
    email,
    password,
  });
  return response.data;
};

export const refreshToken = async (refresh) => {
  const response = await apiClient.post('/auth/token/refresh/', { refresh });
  return response.data;
};

export const logoutUser = async (refresh) => {
  if (!refresh) return;
  try {
    await apiClient.post('/auth/logout/', { refresh });
  } catch {
    // Ignore logout failure on network/server — client state will be cleared regardless
  }
};

export const getCurrentProfile = async () => {
  const response = await apiClient.get('/auth/profile/me/');
  return response.data;
};

export const updateCurrentProfile = async (data) => {
  const response = await apiClient.patch('/auth/profile/me/', data);
  return response.data;
};
