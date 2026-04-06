'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api, { saveToken } from '@/lib/api';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';

type F = { email: string; password: string };

const ROLES = [
  { id:'organizer',  icon:'🎬', label:'Organizer',  color:'from-amber-500/30 to-yellow-600/10', tagline:'Command Center Access' },
  { id:'team_owner', icon:'🏆', label:'Team Owner', color:'from-blue-500/30 to-cyan-600/10',   tagline:'War Room Access' },
  { id:'viewer',     icon:'👁️', label:'Viewer',     color:'from-emerald-500/30 to-green-600/10',tagline:'Live Arena Access' },
];

function mapError(msg: string) {
  if (msg.includes('No account') || msg.includes('not found'))
    return { text:'No account with this email.', hint:'Check spelling or register first.', link:{ label:'Register →', href:'/register' } };
  if (msg.includes('not verified') || msg.includes('verify'))
    return { text:'Email not verified.', hint:'Check your inbox for the link.' };
  if (msg.includes('Incorrect') || msg.includes('password'))
    return { text:'Wrong password.', hint:'Check caps lock or reset below.', link:{ label:'Forgot password →', href:'/forgot-password' } };
  return { text: msg || 'Login failed.', hint:'' };
}

export default function LoginPage() {
  const [loading,      setLoading]      = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [formError,    setFormError]    = useState<any>(null);
  const { register, handleSubmit, formState:{ errors } } = useForm<F>();

  const onSubmit = async (d: F) => {
    if (!selectedRole) { setFormError({ text:'Please select your role first.' }); return; }
    setFormError(null); setLoading(true);

    try {
      const res = await api.post('/api/auth/login', {   // ✅ FIXED
        email: d.email.trim().toLowerCase(),
        password: d.password,
        role: selectedRole
      });

      if (res.data.token) saveToken(res.data.token);

      const actualRole = res.data.user?.role || selectedRole;

      // ✅ FINAL FIX (based on your structure)
      const pathMap: Record<string,string> = {
        organizer:'/dashboard',
        team_owner:'/dashboard',
        viewer:'/auctions',
        admin:'/bca-admin-x7k2'
      };

      window.location.href = pathMap[actualRole] || '/auctions';

    } catch (e: any) {
      setFormError(mapError(e.response?.data?.error || ''));
      setLoading(false);
    }
  };

  const chosen = ROLES.find(r => r.id === selectedRole);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage:"url('/stadium-bg.jpg')" }}/>
      <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at center,transparent 20%,hsl(222 47% 6% / 0.95) 70%)' }}/>
      {[{ left:'10%', rotate:'-12deg' },{ left:'90%', rotate:'12deg' }].map((b,i)=>(
        <div key={i} className="absolute top-0 pointer-events-none" style={{ left:b.left,width:120,height:'60vh',background:'linear-gradient(180deg,hsla(45,100%,90%,0.8) 0%,transparent 100%)',transform:`rotate(${b.rotate})`,transformOrigin:'top center',filter:'blur(25px)',opacity:0.06 }}/>
      ))}
      <GoldParticles/><FireSparkles/>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="flex justify-center mb-5 opacity-0 animate-slide-up" style={{ animationDelay:'0.1s' }}>
          <BeastLogo size={100} glow float3d href="/"/>
        </div>

        {chosen && (
          <div className="flex justify-center mb-4 opacity-0 animate-slide-up" style={{ animationDelay:'0.15s' }}>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${chosen.color} border-gold-subtle`}>
              <span className="text-lg">{chosen.icon}</span>
              <span className="font-heading text-sm uppercase tracking-[0.15em] text-primary">{chosen.label}</span>
              <span className="text-muted-foreground text-xs font-display">— {chosen.tagline}</span>
            </div>
          </div>
        )}

        <div className="bg-glass-premium rounded-xl p-7 gold-edge opacity-0 animate-slide-up" style={{ animationDelay:'0.2s' }}>
          <h2 className="font-heading text-2xl uppercase tracking-wider text-center mb-1 text-foreground">Welcome Back</h2>
          <p className="text-center text-muted-foreground text-sm mb-5 font-display">Select your role to continue</p>

          <div className="grid grid-cols-3 gap-2 mb-5">
            {ROLES.map(r => (
              <button key={r.id} type="button" onClick={() => { setSelectedRole(r.id); setFormError(null); }}
                className={`relative rounded-lg p-3 text-center transition-all duration-300 overflow-hidden group ${selectedRole===r.id?'border-gold glow-gold':'border-gold-subtle hover:border-gold'}`}
                style={{ background:selectedRole===r.id?'linear-gradient(135deg,hsla(45,100%,51%,0.15),hsla(45,100%,51%,0.05))':'hsla(222,30%,16%,0.5)' }}>
                {selectedRole===r.id && <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background:'linear-gradient(90deg,transparent,hsla(45,100%,51%,0.7) 50%,transparent)' }}/>}
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{r.icon}</div>
                <div className={`font-heading text-[10px] uppercase tracking-wider ${selectedRole===r.id?'text-primary':'text-muted-foreground'}`}>{r.label}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
              <input {...register('email',{ required:'Email is required' })} type="email" placeholder="you@email.com" autoComplete="email" className="input-beast"/>
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Password</label>
              <input {...register('password',{ required:'Password is required' })} type="password" placeholder="••••••••" autoComplete="current-password" className="input-beast"/>
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
              <div className="text-right mt-1">
                <Link href="/forgot-password" className="text-[11px] font-heading text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.97] disabled:opacity-40 glow-gold group relative overflow-hidden">
              <span className="relative z-10">{loading?'Signing In...':(chosen?`${chosen.icon} Sign In as ${chosen.label}`:'Select a Role Above')}</span>
            </button>

            <AnimatePresence>
              {formError && (
                <motion.div initial={{ opacity:0,y:-6 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
                  className="rounded-lg p-3.5" style={{ background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.3)' }}>
                  <p className="text-destructive font-heading text-sm">{formError.text}</p>
                  {formError.hint && <p className="text-muted-foreground text-xs mt-0.5">{formError.hint}</p>}
                  {formError.link && <Link href={formError.link.href} className="text-primary text-xs hover:underline mt-1 block">{formError.link.label}</Link>}
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-center text-sm text-muted-foreground">
              No account? <Link href="/register" className="text-primary hover:underline font-medium">Register free</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
