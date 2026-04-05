'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import api from '@/lib/api';

type F = { name: string; email: string; password: string; confirm: string };

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState<'form' | 'check-email' | 'done'>('form');
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
        name: d.name,
        email: d.email.trim().toLowerCase(),
        password: d.password
      });

      console.log("REGISTER RESPONSE:", res.data);

      if (res.data?.success) {
        if (res.data.requiresVerification) {
          setScreen('check-email');
        } else {
          setScreen('done');
        }
      } else {
        setFormError('Something went wrong.');
      }

    } catch (e: any) {
      console.log("REGISTER ERROR:", e.response?.data);

      setFormError(
        e.response?.data?.error ||
        'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── SUCCESS SCREENS ──

  if (screen === 'check-email') {
    return (
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <h2>📧 Check your email</h2>
        <p>We sent a verification link.</p>
        <Link href="/login">Go to Login</Link>
      </div>
    );
  }

  if (screen === 'done') {
    return (
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <h2>✅ Account Created</h2>
        <Link href="/login">Login Now</Link>
      </div>
    );
  }

  // ── FORM ──

  return (
    <div style={{ maxWidth: 400, margin: '80px auto' }}>
      <h2>Create Account</h2>

      <form onSubmit={handleSubmit(onSubmit)}>

        <input
          {...register('name', { required: true })}
          placeholder="Name"
        />
        {errors.name && <p>Name required</p>}

        <input
          {...register('email', { required: true })}
          placeholder="Email"
        />
        {errors.email && <p>Email required</p>}

        <input
          type="password"
          {...register('password', { required: true })}
          placeholder="Password"
        />
        {errors.password && <p>Password required</p>}

        <input
          type="password"
          {...register('confirm', { required: true })}
          placeholder="Confirm Password"
        />
        {errors.confirm && <p>Confirm password required</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Account'}
        </button>

        {formError && <p style={{ color: 'red' }}>{formError}</p>}

      </form>

      <p>
        Already have account? <Link href="/login">Login</Link>
      </p>
    </div>
  );
}
