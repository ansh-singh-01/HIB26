import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('shg_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('shg_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const userData = await authService.getMe();
          setUser(userData);
          localStorage.setItem('shg_user', JSON.stringify(userData));
        } catch (err) {
          console.error('Failed to verify session token:', err);
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const data = await authService.login(email, password);
    const accessToken = data.access_token;
    localStorage.setItem('shg_token', accessToken);
    setToken(accessToken);

    const userData = data.user || (await authService.getMe());
    setUser(userData);
    localStorage.setItem('shg_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (userData) => {
    const data = await authService.register(userData);
    if (data && data.access_token && data.user) {
      localStorage.setItem('shg_token', data.access_token);
      localStorage.setItem('shg_user', JSON.stringify(data.user));
      setToken(data.access_token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('shg_token');
    localStorage.removeItem('shg_user');
    setToken(null);
    setUser(null);
  };

  const hasRole = (...allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedFields };
      localStorage.setItem('shg_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, hasRole, updateUser }}>
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
