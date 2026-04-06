'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import api from '@/lib/api';

type F = { name: string; email: string; password: string; confirm: string };

export default function RegisterPage() {
  const [loading,   setLoading]   = useState(false);
  const [screen,    setScreen]    = useState<'form' | 'check-email' | 'done'>('form');
  const [formError, setFormError] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<F>();
  const pwd = watch('password', '');

  const onSubmit = async (d: F) => {
    if (d.password !== d.confirm) {
      setFormError('Passwords do not match.');
      return;
    }

    setFormError('');
    setLoading(true);

    try {
      const res = await api.post('/api/auth/register', {
        name:     d.name,
        email:    d.email.trim().toLowerCase(),
        password: d.password,
      });

      if (res.data?.success) {
        setScreen(res.data.requiresVerification ? 'check-email' : 'done');
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } catch (e: any) {
      setFormError(
        e.response?.data?.error || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── SUCCESS: CHECK EMAIL ──────────────────────────────────────────────────

  if (screen === 'check-email') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, hsla(45,100%,51%,0.07) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 w-full max-w-md text-center animate-slide-up">
          <div className="bg-glass-premium rounded-2xl p-10 border-gold-subtle">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 mb-6 glow-gold mx-auto">
              <span className="text-4xl">📧</span>
            </div>
            <h2 className="font-heading text-2xl uppercase tracking-[0.12em] text-foreground mb-3">
              Check Your <span className="text-gradient-gold">Email</span>
            </h2>
            <p className="font-display text-muted-foreground text-sm leading-relaxed mb-8">
              We&apos;ve sent a verification link to your inbox. Click it to activate your account and start bidding.
            </p>
            <Link
              href="/login"
              className="btn-beast inline-block bg-primary text-primary-foreground glow-gold hover:scale-[1.02] active:scale-[0.98]"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── SUCCESS: DONE ─────────────────────────────────────────────────────────

  if (screen === 'done') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
        <div
          className="pointer-events-none fixed inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, hsla(45,100%,51%,0.07) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 w-full max-w-md text-center animate-slide-up">
          <div className="bg-glass-premium rounded-2xl p-10 border-gold-subtle">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 mb-6 glow-gold mx-auto">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="font-heading text-2xl uppercase tracking-[0.12em] text-foreground mb-3">
              Account <span className="text-gradient-gold">Created</span>
            </h2>
            <p className="font-display text-muted-foreground text-sm leading-relaxed mb-8">
              Your Beast Cricket account is ready. Sign in to join the auction.
            </p>
            <Link
              href="/login"
              className="btn-beast inline-block bg-primary text-primary-foreground glow-gold hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── REGISTRATION FORM ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">

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
            Auction Platform — Create Account
          </p>
        </div>

        {/* Card */}
        <div className="bg-glass-premium rounded-2xl p-8 border-gold-subtle">

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Full Name */}
            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">
                Full Name
              </label>
              <input
                {...register('name', { required: true })}
                type="text"
                placeholder="Your name"
                autoComplete="name"
                className="input-beast"
              />
              {errors.name && (
                <p className="text-destructive text-[11px] font-display mt-1">Name is required.</p>
              )}
            </div>

            {/* Email */}
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
              {errors.email && (
                <p className="text-destructive text-[11px] font-display mt-1">Email is required.</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">
                Password
              </label>
              <input
                {...register('password', { required: true, minLength: 6 })}
                type="password"
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                className="input-beast"
              />
              {errors.password && (
                <p className="text-destructive text-[11px] font-display mt-1">
                  {errors.password.type === 'minLength'
                    ? 'Password must be at least 6 characters.'
                    : 'Password is required.'}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">
                Confirm Password
              </label>
              <input
                {...register('confirm', {
                  required: true,
                  validate: v => v === pwd || 'Passwords do not match.',
                })}
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                className="input-beast"
              />
              {errors.confirm && (
                <p className="text-destructive text-[11px] font-display mt-1">
                  {errors.confirm.message || 'Please confirm your password.'}
                </p>
              )}
            </div>

            {/* Server error */}
            {formError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                <span className="text-destructive text-sm mt-0.5">⚠</span>
                <p className="text-destructive text-xs font-display leading-snug">{formError}</p>
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
                  Creating Account…
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Footer link */}
          <p className="text-center text-xs text-muted-foreground font-display mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
