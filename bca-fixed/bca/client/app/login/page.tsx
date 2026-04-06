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

// ✅ ONLY FIX IS HERE (PATHS)
const PATH_MAP: Record<string, string> = {
  organizer:  '/organizer/dashboard',
  team_owner: '/team/dashboard',
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

      setRedirecting(true);
      window.location.href = PATH_MAP[role] || '/auctions';

    } catch (e: any) {
      setError(e?.response?.data?.error || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

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

      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, hsla(45,100%,51%,0.07) 0%, transparent 70%), ' +
            'radial-gradient(ellipse 60% 40% at 80% 100%, hsla(222,60%,20%,0.4) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-slide-up">

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

        <div className="bg-glass-premium rounded-2xl p-8 border-gold-subtle">

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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            <input {...register('email')} placeholder="Email" className="input-beast" />
            <input {...register('password')} type="password" placeholder="Password" className="input-beast" />

            {error && <p className="text-destructive text-xs">{error}</p>}

            <button type="submit" disabled={loading} className="btn-beast w-full">
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs mt-6">
            <Link href="/register">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
