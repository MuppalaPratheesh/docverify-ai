import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/api';
import type { AuthSuccessBody, AuthUser, UserRole } from '../types/auth';
import { AuthContext } from './authContextInstance';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiRequest<AuthSuccessBody>('/auth/me');
      setUser(response.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<AuthSuccessBody>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setUser(response.data.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await apiRequest<AuthSuccessBody>('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    setUser(response.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest<{ success: true }>('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      hasRole,
    }),
    [user, loading, login, register, logout, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
