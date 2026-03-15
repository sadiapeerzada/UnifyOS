import React, { createContext, useCallback, useContext, useMemo, useEffect, useState } from 'react';
import { Alert } from 'react-native';

const DEMO_USER = {
  uid: 'demo-001',
  name: 'Demo Admin',
  email: 'demo@unifyos.com',
  role: 'admin' as const,
  isDemo: true,
};

interface AuthUser {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'responder';
  isDemo: boolean;
}

interface AuthContextValue {
  currentUser: AuthUser | null;
  userRole: string;
  isDemo: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser] = useState<AuthUser>(DEMO_USER);
  const isDemo = true;

  const login = useCallback(async () => {
    Alert.alert('Demo Mode', 'Demo Mode — Firebase Auth Active');
  }, []);

  const logout = useCallback(async () => {
    Alert.alert('Demo Mode', 'Demo Mode — Firebase Auth Active');
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    currentUser,
    userRole: currentUser?.role || 'responder',
    isDemo,
    login,
    logout,
  }), [currentUser, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
