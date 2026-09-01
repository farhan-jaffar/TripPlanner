import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

let inMemoryAccessToken = null;
let onAuthFailureCallback = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => inMemoryAccessToken;

export const setOnAuthFailure = (callback) => {
  onAuthFailureCallback = callback;
};

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach in-memory access token to outgoing requests
apiClient.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshPromise = null;

// Response interceptor: automatically refresh access token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Do not attempt refresh on auth endpoints or already retried requests
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/token/') ||
      originalRequest.url?.includes('/auth/register/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refreshToken =
        typeof window !== 'undefined'
          ? localStorage.getItem('trip_planner_refresh_token')
          : null;

      if (refreshToken) {
        try {
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = axios
              .post(`${baseURL}/auth/token/refresh/`, {
                refresh: refreshToken,
              })
              .then(({ data }) => {
                const newAccessToken = data.access;
                setAccessToken(newAccessToken);
                if (data.refresh) {
                  localStorage.setItem('trip_planner_refresh_token', data.refresh);
                }
                return newAccessToken;
              })
              .finally(() => {
                isRefreshing = false;
                refreshPromise = null;
              });
          }

          const newAccessToken = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed — clear local credentials and signal auth failure
          localStorage.removeItem('trip_planner_refresh_token');
          setAccessToken(null);
          if (onAuthFailureCallback) {
            onAuthFailureCallback();
          }
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);
