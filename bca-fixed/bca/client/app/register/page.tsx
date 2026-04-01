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
    if (d.password !== d.confirm) { setFormError('Passwords do not match.'); return; }
    setFormError(''); setLoading(true);
    try {
      const res = await api.post('/auth/register', { name: d.name, email: d.email, password: d.password });
      setScreen(res.data.requiresVerification ? 'check-email' : 'done');
    } catch (e: any) { setFormError(e.response?.data?.error || 'Registration failed.'); }
    finally { setLoading(false); }
  };

  if (screen === 'check-email') return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: "url('/stadium-bg.jpg')" }}/>
      <GoldParticles/><FireSparkles/>
      <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className="relative z-10 bg-glass-premium rounded-xl p-10 text-center max-w-sm mx-5 gold-edge border-gold-subtle">
        <motion.div animate={{ y:[0,-10,0] }} transition={{ duration:2, repeat:Infinity }} className="text-6xl mb-5">📧</motion.div>
        <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Check Your <span className="text-gradient-gold">Email</span></h2>
        <p className="font-display text-muted-foreground text-sm mb-8 leading-relaxed">We sent a verification link. Click it to activate your account and start bidding!</p>
        <Link href="/login" className="block w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm text-center glow-gold">Go to Login</Link>
      </motion.div>
    </div>
  );

  if (screen === 'done') return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <GoldParticles/><FireSparkles/>
      <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className="relative z-10 bg-glass-premium rounded-xl p-10 text-center max-w-sm mx-5 gold-edge border-gold-subtle">
        <div className="text-6xl mb-5">✅</div>
        <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Account <span className="text-gradient-gold">Ready!</span></h2>
        <p className="font-display text-muted-foreground text-sm mb-8 leading-relaxed">Your account is created. Log in and choose your role to get started.</p>
        <Link href="/login" className="block w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm text-center glow-gold">Login Now</Link>
      </motion.div>
    </div>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center py-20 bg-background overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: "url('/stadium-bg.jpg')" }}/>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 20%, hsl(222 47% 6% / 0.95) 70%)' }}/>
      <GoldParticles/><FireSparkles/>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="flex justify-center mb-6 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <BeastLogo size={96} glow href="/"/>
        </div>

        <div className="bg-glass-premium rounded-xl p-8 gold-edge opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-heading text-2xl uppercase tracking-wider text-center mb-1 text-foreground">Create <span className="text-gradient-gold">Account</span></h2>
          <p className="text-center text-muted-foreground text-sm mb-1 font-display">Join Beast Cricket Auction</p>

          <div className="mt-4 mb-6 p-3.5 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-xs font-display text-muted-foreground leading-relaxed text-center">
              <span className="text-primary font-semibold">No role needed here.</span> Choose Organizer, Team Owner, or Viewer when you log in — same account works for all roles.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {[
              { f:'name',    label:'Full Name',         type:'text',     ph:'Your full name',   auto:'name' },
              { f:'email',   label:'Email Address',     type:'email',    ph:'you@email.com',    auto:'email' },
              { f:'password',label:'Password',          type:'password', ph:'Min 6 characters', auto:'new-password' },
              { f:'confirm', label:'Confirm Password',  type:'password', ph:'Repeat password',  auto:'new-password' },
            ].map(field => (
              <div key={field.f}>
                <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">{field.label}</label>
                <input {...register(field.f as keyof F, {
                  required: `${field.label} is required`,
                  ...(field.f==='password' && { minLength:{ value:6, message:'Min 6 characters' } }),
                  ...(field.f==='confirm' && { validate: v => v===pwd || 'Passwords do not match' }),
                  ...(field.f==='email' && { pattern:{ value:/^\S+@\S+\.\S+$/, message:'Enter a valid email' } }),
                })} type={field.type} placeholder={field.ph} autoComplete={field.auto} className="input-beast"/>
                {errors[field.f as keyof F] && <p className="text-destructive text-xs mt-1">{errors[field.f as keyof F]?.message}</p>}
              </div>
            ))}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40 glow-gold group relative overflow-hidden mt-2">
              <span className="relative z-10">{loading ? 'Creating Account...' : '🏏 Create Account'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"/>
            </button>

            <AnimatePresence>
              {formError && (
                <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                  className="rounded-lg p-3.5" style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)' }}>
                  <p className="text-destructive font-heading text-sm">{formError}</p>
                  {formError.includes('already exists') && <Link href="/login" className="text-primary text-xs hover:underline mt-1 block">Sign in instead →</Link>}
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Already have an account? <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
