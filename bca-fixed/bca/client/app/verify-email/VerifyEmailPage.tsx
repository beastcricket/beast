'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

type Status = 'loading' | 'success' | 'already-verified' | 'expired' | 'error';

export default function VerifyEmailPage({ token }: { token: string | null }) {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus('success'))
      .catch((e) => {
        const data = e.response?.data;
        if (data?.alreadyVerified) setStatus('already-verified');
        else if (data?.error?.includes('expired')) setStatus('expired');
        else setStatus('error');
      });
  }, [token]);

  return (
    <div style={{ padding: 20 }}>
      {status === 'loading' && <p>Verifying...</p>}

      {status === 'success' && (
        <>
          <h2>Email Verified ✅</h2>
          <Link href="/login">Go to Login</Link>
        </>
      )}

      {status === 'already-verified' && (
        <>
          <h2>Already Verified</h2>
          <Link href="/login">Login</Link>
        </>
      )}

      {status === 'expired' && (
        <>
          <h2>Link Expired</h2>
          <Link href="/register">Register Again</Link>
        </>
      )}

      {status === 'error' && (
        <h2>Invalid Link ❌</h2>
      )}
    </div>
  );
}
