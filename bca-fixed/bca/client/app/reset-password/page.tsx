'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

export default function Page() {
  const params = useSearchParams();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(params.get('token'));
  }, [params]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Reset Password</h2>
      <p>Token: {token}</p>
    </div>
  );
}
