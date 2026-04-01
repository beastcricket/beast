'use client';
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import api, { saveToken, clearToken, getToken } from '@/lib/api';

export interface User {
  _id: string; name: string; email: string;
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
  const [user,    setUser]    = useState<User|null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        // Try to refresh the token
        try {
          const r = await api.post('/auth/refresh');
          if (r.data.token) saveToken(r.data.token);
          setUser(r.data.user);
        } catch {
          clearToken();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, []);

  // Auto-refresh token 2 min before expiry (access token is 15 min)
  useEffect(() => {
    const iv = setInterval(async () => {
      if (!getToken()) return;
      try {
        const r = await api.post('/auth/refresh');
        if (r.data.token) saveToken(r.data.token);
      } catch { /* silent — user will be logged out on next request */ }
    }, 12 * 60 * 1000); // every 12 min
    return () => clearInterval(iv);
  }, []);

  const logout = useCallback(async () => {
    // Log activity to admin before logging out
    if (user) {
      try {
        await fetch('http://localhost:3001/api/activity-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'logout',
            title: `User logged out: ${user.name || 'Unknown User'}`,
            userId: user._id,
            data: {
              userEmail: user.email,
              userRole: user.role,
              userName: user.name,
              logoutTime: new Date().toISOString()
            }
          })
        });
        console.log('📢 Logout activity logged to admin');
      } catch (error) {
        console.log('Failed to log logout activity to admin:', error);
      }
    }
    
    clearToken();
    api.post('/auth/logout').catch(() => {});
    setUser(null);
    window.location.href = '/';
  }, [user]);

  return React.createElement(
    Ctx.Provider,
    { value: { user, loading, logout, refetch: fetchUser } },
    children
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
};

export const getRoleRedirect = (role: string|null): string =>
  ({ admin:'/dashboard/admin', organizer:'/dashboard/organizer', team_owner:'/dashboard/team-owner' }[role||''] || '/auctions');
