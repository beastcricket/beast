'use client';
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import api, { clearToken, getToken } from '@/lib/api';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin'|'organizer'|'team_owner'|'viewer'|null;
  isVerified: boolean;
}

interface AuthCtx {
  user: User|null;
  loading: boolean;
  logout: () => void;
  refetch: () => Promise<void>;
}

const Ctx = createContext<AuthCtx|null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User|null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = getToken();

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await api.get('/api/auth/me');

      console.log("AUTH RESPONSE:", res.data);

      const userData = res.data.user || res.data;

      if (!userData || !userData._id) {
        throw new Error("Invalid user data");
      }

      setUser(userData);

    } catch (err: any) {
      console.log("AUTH ERROR:", err);

      // ✅ ONLY CLEAR TOKEN IF UNAUTHORIZED
      if (err?.response?.status === 401) {
        clearToken();
        setUser(null);
      } else {
        // ⚠️ keep user (temporary error)
        console.log("Temporary error, not logging out");
      }

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {}

    clearToken();
    setUser(null);

    window.location.href = '/login';
  }, []);

  return (
    <Ctx.Provider value={{ user, loading, logout, refetch: fetchUser }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
};

export const getRoleRedirect = (role: string|null): string =>
  ({
    admin: '/dashboard/admin',
    organizer: '/dashboard/organizer',
    team_owner: '/dashboard/team-owner',
    viewer: '/dashboard/viewer'
  }[role || ''] || '/auctions');
