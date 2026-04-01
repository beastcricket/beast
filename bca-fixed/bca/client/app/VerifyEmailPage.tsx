'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';
import confetti from 'canvas-confetti';

type Status = 'loading' | 'success' | 'already-verified' | 'expired' | 'error';

export default function VerifyEmailPage({ token }: { token: string | null }) {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus('success');
        setTimeout(() => confetti({ particleCount: 150, spread: 80 }), 300);
      })
      .catch((e) => {
        const data = e.response?.data;
        if (data?.alreadyVerified) setStatus('already-verified');
        else if (data?.error?.includes('expired')) setStatus('expired');
        else setStatus('error');
      });
  }, [token]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <GoldParticles />
      <FireSparkles />

      <div className="relative z-10 w-full max-w-md mx-4 text-center">
        <div className="mb-6">
          <BeastLogo size={60} href="/" />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-glass-premium p-8 rounded-xl gold-edge">

          {status === 'loading' && <p>Verifying...</p>}

          {status === 'success' && (
            <>
              <h2 className="text-xl mb-4">✅ Email Verified</h2>
              <Link href="/login">Go to Login</Link>
            </>
          )}

          {status === 'already-verified' && (
            <>
              <h2 className="text-xl mb-4">Already Verified</h2>
              <Link href="/login">Login</Link>
            </>
          )}

          {status === 'expired' && (
            <>
              <h2 className="text-xl mb-4">Link Expired</h2>
              <Link href="/login">Try Again</Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h2 className="text-xl mb-4">Invalid Link</h2>
            </>
          )}

        </motion.div>
      </div>
    </div>
  );
}
