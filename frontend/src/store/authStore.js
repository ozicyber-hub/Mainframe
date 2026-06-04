import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import api from '../utils/api';

const getToken = () => localStorage.getItem('access_token');
const setToken = (token) => localStorage.setItem('access_token', token);
const removeToken = () => localStorage.removeItem('access_token');

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  darkMode: localStorage.getItem('darkMode') === 'true',

  toggleDarkMode: () => {
    const next = !get().darkMode;
    localStorage.setItem('darkMode', String(next));
    set({ darkMode: next });
  },

  // Initialize auth state from localStorage
  initialize: () => {
    const token = getToken();
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;

        if (decoded.exp > now) {
          set({
            accessToken: token,
            isAuthenticated: true,
            user: decoded,
            isLoading: false
          });
          return true;
        } else {
          // Token expired, try to refresh
          return get().refreshToken();
        }
      } catch (error) {
        removeToken();
      }
    }
    set({ isLoading: false });
    return false;
  },

  // Login with email/password
  login: async (email, password) => {
    const response = await api.post('/auth/login/', { email, password });
    const data = response.data;

    if (data.mfa_required) {
      return data;
    }

    setToken(data.access);
    localStorage.setItem('refresh_token', data.refresh || '');
    localStorage.setItem('user', JSON.stringify(data.user));
    set({
      accessToken: data.access,
      isAuthenticated: true,
      user: data.user,
    });

    return data;
  },

  // Login with Google
  loginWithGoogle: async (credential) => {
    const response = await api.post('/auth/google-login/', { credential });
    const { access, user } = response.data;

    setToken(access);
    set({
      accessToken: access,
      isAuthenticated: true,
      user: user,
    });

    return response.data;
  },

  // Refresh token
  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        get().logout();
        return false;
      }

      const response = await api.post('/auth/token/refresh/', { refresh: refreshToken });
      const { access } = response.data;

      setToken(access);
      set({ accessToken: access });
      return true;
    } catch (error) {
      get().logout();
      return false;
    }
  },

  // Logout
  logout: () => {
    removeToken();
    localStorage.removeItem('refresh_token');
    set({
      accessToken: null,
      isAuthenticated: false,
      user: null,
    });
  },

  // Update user
  updateUser: (user) => {
    set({ user });
  },
}));

// Initialize auth on load
useAuthStore.getState().initialize();
