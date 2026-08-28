import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  loginUser,
  registerUser,
  refreshToken as refreshApiToken,
  logoutUser,
  getCurrentProfile,
  updateCurrentProfile,
} from '../api/auth';
import { setAccessToken, setOnAuthFailure } from '../api/client';

const REFRESH_TOKEN_KEY = 'trip_planner_refresh_token';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [accessToken, setAccessTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const handleAuthFailure = useCallback(() => {
    setUser(null);
    setProfile(null);
    setAccessTokenState(null);
    setAccessToken(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    queryClient.clear();
  }, [queryClient]);

  // Hook up API client auth failure interceptor
  useEffect(() => {
    setOnAuthFailure(handleAuthFailure);
  }, [handleAuthFailure]);

  // Silent session boot on mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const storedRefresh = typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
      if (!storedRefresh) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const tokenData = await refreshApiToken(storedRefresh);
        const newAccess = tokenData.access;
        setAccessToken(newAccess);
        if (tokenData.refresh) {
          localStorage.setItem(REFRESH_TOKEN_KEY, tokenData.refresh);
        }

        const profileData = await getCurrentProfile();
        if (isMounted) {
          setAccessTokenState(newAccess);
          setUser({
            id: profileData.id,
            username: profileData.username,
            email: profileData.email,
          });
          setProfile({
            display_name: profileData.display_name,
            bio: profileData.bio,
            avatar_url: profileData.avatar_url,
          });
        }
      } catch {
        handleAuthFailure();
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [handleAuthFailure]);

  const login = async (username, password) => {
    const data = await loginUser({ username, password });
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
    setAccessToken(data.access);
    setAccessTokenState(data.access);
    setUser({
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
    });
    setProfile(data.user.profile || { display_name: '', bio: '', avatar_url: '' });
  };

  const register = async (formData) => {
    const data = await registerUser(formData);
    const access = data.tokens?.access || data.access;
    const refresh = data.tokens?.refresh || data.refresh;

    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    setAccessToken(access);
    setAccessTokenState(access);
    setUser({
      id: data.user.id,
      username: data.user.username,
      email: data.user.email,
    });
    setProfile(data.user.profile || { display_name: '', bio: '', avatar_url: '' });
  };

  const logout = () => {
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    // Instant client-side state reset
    handleAuthFailure();
    if (storedRefresh) {
      logoutUser(storedRefresh);
    }
  };

  const updateProfile = async (formData) => {
    const updated = await updateCurrentProfile(formData);
    setProfile({
      display_name: updated.display_name,
      bio: updated.bio,
      avatar_url: updated.avatar_url,
    });
    return updated;
  };

  const value = {
    user,
    profile,
    accessToken,
    isAuthenticated: Boolean(accessToken && user),
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
