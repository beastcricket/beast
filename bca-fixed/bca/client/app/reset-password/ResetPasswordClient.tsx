'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ResetPasswordClient() {
  const params = useSearchParams();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = params.get('token');
    setToken(t);
  }, [params]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Reset Password</h1>
      <p>Token: {token}</p>

      {/* 👉 Put your existing UI here later */}
    </div>
  );
}
