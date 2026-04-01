'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';

type F = { password: string; confirm: string };

export default function ResetPasswordPage({ token }: { token: string | null }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, watch, formState:{ errors } } = useForm<F>();
  const pwd = watch('password','');

  const onSubmit = async (d: F) => {
    if (d.password !== d.confirm) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset link');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', { token, password: d.password });
      setDone(true);
    } catch (e:any) {
      setError(e.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {done ? (
        <>
          <h2>Password Reset Successful</h2>
          <Link href="/login">Go to Login</Link>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <input
            {...register('password',{ required:true })}
            type="password"
            placeholder="New password"
          />

          <input
            {...register('confirm',{ required:true })}
            type="password"
            placeholder="Confirm password"
          />

          {error && <p>{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
}
