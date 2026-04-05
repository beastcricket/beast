'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';

type F = { name: string; email: string; password: string; confirm: string };

export default function RegisterPage() {
  const [loading, setLoading]     = useState(false);
  const [screen, setScreen]       = useState<'form'|'check-email'|'done'>('form');
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
      const res = await api.post('/api/auth/register', {   // ✅ FIXED HERE
        name: d.name,
        email: d.email.trim().toLowerCase(),
        password: d.password
      });

      setScreen(res.data.requiresVerification ? 'check-email' : 'done');
    } catch (e: any) {
      setFormError(e.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (screen === 'check-email') return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <GoldParticles/><FireSparkles/>
      <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className="bg-glass-premium rounded-xl p-10 text-center max-w-sm">
        <div className="text-6xl mb-5">📧</div>
        <h2 className="text-2xl mb-3">Check Your Email</h2>
        <p className="mb-6">We sent a verification link.</p>
        <Link href="/login">Go to Login</Link>
      </motion.div>
    </div>
  );

  if (screen === 'done') return (
    <div className="relative min-h-screen flex items-center justify-center bg-background">
      <GoldParticles/><FireSparkles/>
      <div className="bg-glass-premium rounded-xl p-10 text-center max-w-sm">
        <div className="text-6xl mb-5">✅</div>
        <h2 className="text-2xl mb-3">Account Ready!</h2>
        <Link href="/login">Login Now</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-6">
        <BeastLogo size={80} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input {...register('name', { required: true })} placeholder="Name" />
          <input {...register('email', { required: true })} placeholder="Email" />
          <input {...register('password', { required: true })} type="password" placeholder="Password" />
          <input {...register('confirm', { required: true })} type="password" placeholder="Confirm Password" />

          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>

          {formError && <p>{formError}</p>}
        </form>

        <Link href="/login">Already have account?</Link>
      </div>
    </div>
  );
}
