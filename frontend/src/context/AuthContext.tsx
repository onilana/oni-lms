import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import type { AuthResponse, User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('oni_lms_token'));
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await apiRequest<{ user: User }>('/auth/me');
        setUser(response.user);
      } catch (err) {
        console.warn('Stored token invalid, clearing session', err);
        localStorage.removeItem('oni_lms_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, device_name: 'browser' }),
    });

    localStorage.setItem('oni_lms_token', response.token);
    setToken(response.token);
    setUser(response.user);
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('/auth/logout', { method: 'POST' });
      }
    } catch (err) {
      console.warn('Logout error', err);
    } finally {
      localStorage.removeItem('oni_lms_token');
      setToken(null);
      setUser(null);
    }
  };

  const hasRole = (role: string | string[]): boolean => {
    if (!user) return false;
    const roleList = Array.isArray(role) ? role : [role];
    return user.roles.some((r) => roleList.includes(r.name) || r.name === 'super_admin');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.roles.some((r) => r.name === 'super_admin')) return true;
    return user.permissions.includes(permission) || user.permissions.includes('*');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
