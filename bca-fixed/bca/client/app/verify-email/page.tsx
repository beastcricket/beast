'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';

function VerifyEmailContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. No token found.');
      return;
    }

    api.post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      })
      .catch((e: any) => {
        setStatus('error');
        setMessage(e.response?.data?.error || 'Verification failed. The link may have expired.');
      });
  }, [params]);

  if (status === 'loading') {
    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"/>
        <p className="font-display text-muted-foreground text-sm">Verifying your email...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">
          Email <span className="text-gradient-gold">Verified!</span>
        </h2>
        <p className="font-display text-muted-foreground text-sm mb-6">
          Your account is now active. You can log in and select your role to get started.
        </p>
        <Link
          href="/login"
          className="block w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm text-center glow-gold hover:scale-[1.02] transition-all"
        >
          Login Now
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-6xl mb-4">❌</div>
      <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">
        Verification <span className="text-destructive">Failed</span>
      </h2>
      <p className="font-display text-muted-foreground text-sm mb-6">{message}</p>
      <div className="space-y-3">
        <Link
          href="/register"
          className="block w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm text-center glow-gold hover:scale-[1.02] transition-all"
        >
          Register Again
        </Link>
        <Link
          href="/login"
          className="block w-full py-3 rounded-lg border-gold-subtle font-heading text-xs uppercase tracking-wider text-muted-foreground hover:text-primary transition-all text-center"
          style={{ background: 'hsla(222,30%,16%,0.5)' }}
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-15"
        style={{ backgroundImage: "url('/stadium-bg.jpg')" }}/>
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 20%, hsl(222 47% 6% / 0.95) 70%)' }}/>
      <GoldParticles/><FireSparkles/>
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="flex justify-center mb-6">
          <BeastLogo size={80} glow href="/"/>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-glass-premium rounded-xl p-8 gold-edge border-gold-subtle"
        >
          <Suspense fallback={
            <div className="text-center py-8">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3"/>
              <p className="font-display text-muted-foreground text-sm">Loading...</p>
            </div>
          }>
            <VerifyEmailContent/>
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}
