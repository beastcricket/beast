'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import api, { saveToken } from '@/lib/api';

type F = { email: string; password: string };

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [error, setError] = useState('');

  const { register, handleSubmit } = useForm<F>();

  const onSubmit = async (d: F) => {
    if (!selectedRole) {
      setError('Please select role');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/api/auth/login', {
        email: d.email.trim().toLowerCase(),
        password: d.password,
        role: selectedRole
      });

      // ✅ Save token if present
      if (res.data?.token) {
        saveToken(res.data.token);
      }

      const role = res.data?.user?.role || selectedRole;

      // ✅ Correct routes
      const pathMap: Record<string, string> = {
        organizer: '/dashboard/organizer',
        team_owner: '/dashboard/team-owner',
        viewer: '/auctions',
        admin: '/bca-admin-x7k2'
      };

      // ✅ Use router instead of reload
      router.push(pathMap[role] || '/auctions');

    } catch (e: any) {
      setError(e?.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Login</h2>

      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setSelectedRole('organizer')}>Organizer</button>
        <button onClick={() => setSelectedRole('team_owner')}>Team Owner</button>
        <button onClick={() => setSelectedRole('viewer')}>Viewer</button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <input placeholder="Email" {...register('email')} />
        <br /><br />
        <input placeholder="Password" type="password" {...register('password')} />
        <br /><br />
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
