import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest, ensureCsrfCookie } from '../api/client';
import type { AuthResponse, User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const response = await apiRequest<{ user: User }>('/auth/me');
      setUser(response.user);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    async function loadUser() {
      await refreshUser();
      setLoading(false);
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    await ensureCsrfCookie();
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, login: email, password, device_name: 'browser' }),
    });

    setUser(response.user);
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout error', err);
    } finally {
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
        loading,
        login,
        logout,
        refreshUser,
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
