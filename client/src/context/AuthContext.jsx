import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Parse token on initial load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          // Get profile updates which also verifies token
          const { data } = await apiService.dashboard.getProfile();
          // Map user from profile info or token decode
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(window.atob(base64));
          
          setUser({
            id: payload.id,
            username: payload.username,
            role: payload.role,
            email: data.profile.email
          });
        } catch (e) {
          console.error('Invalid session, clearing token');
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();

    // Listen to global logout events from Axios interceptors
    const handleGlobalLogout = () => {
      setUser(null);
    };

    window.addEventListener('auth_logout', handleGlobalLogout);
    return () => {
      window.removeEventListener('auth_logout', handleGlobalLogout);
    };
  }, []);

  const login = async (username, password) => {
    const { data } = await apiService.auth.login(username, password);
    if (data.twoFactorRequired) {
      return { twoFactorRequired: true, tempToken: data.tempToken };
    }
    
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return { success: true };
  };

  const login2FA = async (tempToken, code) => {
    const { data } = await apiService.auth.verify2FA(tempToken, code);
    localStorage.setItem('accessToken', data.accessToken);
    setUser(data.user);
    return { success: true };
  };

  const logout = async () => {
    try {
      await apiService.auth.logout();
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, login2FA, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
