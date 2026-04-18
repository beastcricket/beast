'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';

type F = { name: string; email: string; password: string; confirm: string; role: string };

const ROLES = [
  { id: 'organizer',  icon: '🎬', label: 'Organizer',  desc: 'Create & manage auctions' },
  { id: 'team_owner', icon: '🏆', label: 'Team Owner', desc: 'Join auctions & bid live' },
  { id: 'viewer',     icon: '👁️', label: 'Viewer',     desc: 'Watch live auctions' },
];

export default function RegisterPage() {
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm<F>();
  const pwd = watch('password', '');

  const onSubmit = async (d: F) => {
    if (!selectedRole) { setError('Please select your role'); return; }
    if (d.password !== d.confirm) { setError('Passwords do not match'); return; }

    setLoading(true);
    setError('');

    try {
      // ✅ FIXED API ROUTE
      await api.post('/auth/register', {
        name:     d.name,
        email:    d.email.trim().toLowerCase(),
        password: d.password,
        role:     selectedRole,
      });

      setSuccess(true);
      setTimeout(() => { window.location.href = '/login'; }, 2500);

    } catch (e: any) {
      setError(e.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center p-10">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="font-heading text-3xl uppercase tracking-wider text-foreground mb-2">Account Created!</h2>
          <p className="font-display text-muted-foreground mb-1">Check your email to verify your account.</p>
          <p className="font-display text-muted-foreground text-sm">Redirecting to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden py-10">
      <div className="absolute inset-0 bg-cover bg-center opacity-15"
        style={{ backgroundImage: "url('/stadium-bg.jpg')" }}/>
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center,transparent 20%,hsl(222 47% 6% / 0.95) 70%)' }}/>
      {[{ left: '10%', rotate: '-12deg' }, { left: '90%', rotate: '12deg' }].map((b, i) => (
        <div key={i} className="absolute top-0 pointer-events-none"
          style={{ left: b.left, width: 120, height: '60vh',
            background: 'linear-gradient(180deg,hsla(45,100%,90%,0.8) 0%,transparent 100%)',
            transform: `rotate(${b.rotate})`, transformOrigin: 'top center',
            filter: 'blur(25px)', opacity: 0.06 }}/>
      ))}
      <GoldParticles/><FireSparkles/>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="flex justify-center mb-5 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <BeastLogo size={90} glow float3d href="/"/>
        </div>

        <div className="bg-glass-premium rounded-xl p-7 gold-edge opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-heading text-2xl uppercase tracking-wider text-center mb-1 text-foreground">Create Account</h2>
          <p className="text-center text-muted-foreground text-sm mb-5 font-display">Join Beast Cricket Auction</p>

          {/* Role selector */}
          <div className="mb-5">
            <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-2">
              Select Your Role *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button key={r.id} type="button"
                  onClick={() => { setSelectedRole(r.id); setError(''); }}
                  className={`relative rounded-lg p-3 text-center transition-all duration-300 overflow-hidden ${
                    selectedRole === r.id ? 'border-gold glow-gold' : 'border-gold-subtle hover:border-gold'
                  }`}
                  style={{ background: selectedRole === r.id
                    ? 'linear-gradient(135deg,hsla(45,100%,51%,0.15),hsla(45,100%,51%,0.05))'
                    : 'hsla(222,30%,16%,0.5)' }}>
                  <div className="text-2xl mb-1">{r.icon}</div>
                  <div className="font-heading text-[10px] uppercase tracking-wider">
                    {r.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground/70 mt-0.5 font-display">
                    {r.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input {...register('name')} placeholder="Name" className="input-beast" />
            <input {...register('email')} placeholder="Email" className="input-beast" />
            <input {...register('password')} type="password" placeholder="Password" className="input-beast" />
            <input {...register('confirm')} type="password" placeholder="Confirm Password" className="input-beast" />

            <button type="submit" className="w-full py-3 bg-primary rounded">
              {loading ? 'Creating...' : 'Create Account'}
            </button>

            {error && <p className="text-red-500">{error}</p>}
          </form>

          <div className="mt-4 text-center">
            <Link href="/login">Already have an account? Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
