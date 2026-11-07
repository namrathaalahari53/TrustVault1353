/**
 * TrustVault - Authentication Context
 * Manages user session state, fast role-switcher for evaluation, and profile synchronization.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.ts';
import { api, clearStoredToken, getStoredToken } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (targetRole: 'Administrator' | 'Owner' | 'Editor' | 'Viewer2') => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_ACCOUNTS = {
  Administrator: {
    email: 'admin@trustvault.internal',
    password: 'Admin@TrustVault2026!',
    label: 'Global Administrator',
    badge: 'Admin',
    description: 'System-wide governance, user management, and audit inspection.',
  },
  Owner: {
    email: 'owner@trustvault.internal',
    password: 'Owner@TrustVault2026!',
    label: 'Sarah Jenkins (Document Owner)',
    badge: 'Owner',
    description: 'Upload confidential records, grant/revoke Reader & Editor access.',
  },
  Editor: {
    email: 'editor@trustvault.internal',
    password: 'Editor@TrustVault2026!',
    label: 'David Miller (Auditor / Editor)',
    badge: 'Editor',
    description: 'Authorized to preview, download, and edit granted documents.',
  },
  Viewer2: {
    email: 'viewer2@trustvault.internal',
    password: 'Viewer2@TrustVault2026!',
    label: 'Alex Rivera (Unauthorized / Secondary)',
    badge: 'Viewer',
    description: 'Used to test strict isolation, IDOR prevention, and 403 blocks.',
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      clearStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, pass);
      setUser(res.user);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearStoredToken();
    setUser(null);
  };

  const switchDemoUser = async (targetRole: 'Administrator' | 'Owner' | 'Editor' | 'Viewer2') => {
    const creds = DEMO_ACCOUNTS[targetRole];
    await login(creds.email, creds.password);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchDemoUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
