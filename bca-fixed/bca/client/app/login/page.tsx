'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import api, { saveToken } from '@/lib/api';

type F = { email: string; password: string };

const ROLES = [
  { id: 'organizer',  label: 'Organizer',   icon: '🏏' },
  { id: 'team_owner', label: 'Team Owner',   icon: '🏆' },
  { id: 'viewer',     label: 'Viewer',       icon: '👁️' },
];

const PATH_MAP: Record<string, string> = {
  organizer:  '/dashboard/organizer',
  team_owner: '/dashboard/team-owner',
  viewer:     '/auctions',
  admin:      '/bca-admin-x7k2',
};

export default function LoginPage() {
  const [loading,      setLoading]      = useState(false);
  const [redirecting,  setRedirecting]  = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [error,        setError]        = useState('');

  const { register, handleSubmit } = useForm<F>();

  const onSubmit = async (d: F) => {
    if (!selectedRole) {
      setError('Please select your role to continue.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/auth/login', {
        email:    d.email.trim().toLowerCase(),
        password: d.password,
        role:     selectedRole,
      });

      if (res.data?.token) {
        saveToken(res.data.token);
      }

      const role = res.data?.user?.role || selectedRole;

      // Use a full page navigation so AuthProvider re-initialises with the
      // freshly-saved token, preventing the AuthGuard redirect loop.
      setRedirecting(true);
      window.location.href = PATH_MAP[role] || '/auctions';

    } catch (e: any) {
      setError(e?.response?.data?.error || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  // Show a minimal loading screen while the browser navigates away
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-slide-up">
          <div className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="font-heading text-sm uppercase tracking-widest text-muted-foreground animate-pulse">
            Entering the arena…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">

      {/* Ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, hsla(45,100%,51%,0.07) 0%, transparent 70%), ' +
            'radial-gradient(ellipse 60% 40% at 80% 100%, hsla(222,60%,20%,0.4) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-slide-up">

        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 mb-4 glow-gold">
            <span className="text-3xl">🏏</span>
          </div>
          <h1 className="font-heading text-3xl uppercase tracking-[0.15em] text-foreground">
            Beast <span className="text-gradient-gold">Cricket</span>
          </h1>
          <p className="font-display text-muted-foreground text-sm mt-1 tracking-wide">
            Auction Platform — Sign In
          </p>
        </div>

        {/* Card */}
        <div className="bg-glass-premium rounded-2xl p-8 border-gold-subtle">

          {/* Role selector */}
          <div className="mb-6">
            <p className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-3">
              Select Your Role
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setSelectedRole(r.id); setError(''); }}
                  className={[
                    'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-200 font-heading text-[10px] uppercase tracking-wider',
                    selectedRole === r.id
                      ? 'border-primary bg-primary/15 text-primary glow-gold'
                      : 'border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/5',
                  ].join(' ')}
                >
                  <span className="text-xl">{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">
                Email Address
              </label>
              <input
                {...register('email', { required: true })}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="input-beast"
              />
            </div>

            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">
                Password
              </label>
              <input
                {...register('password', { required: true })}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="input-beast"
              />
              <div className="text-right mt-1.5">
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-primary/70 hover:text-primary transition-colors font-display"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                <span className="text-destructive text-sm mt-0.5">⚠</span>
                <p className="text-destructive text-xs font-display leading-snug">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-beast w-full bg-primary text-primary-foreground glow-gold hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing In…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer link */}
          <p className="text-center text-xs text-muted-foreground font-display mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:text-primary/80 transition-colors font-semibold">
              Create one
            </Link>
          </p>
        </div>

        {/* Admin link */}
        <p className="text-center mt-4">
          <Link
            href="/bca-admin-x7k2/login"
            className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors font-heading uppercase tracking-widest"
          >
            Admin Access
          </Link>
        </p>
      </div>
    </div>
  );
}
