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
    setFormError(null);
    setLoading(true);

    try {
      // ✅ FIXED HERE
      const res = await api.post('/api/auth/login', {
        email: d.email.trim().toLowerCase(),
        password: d.password,
        role: selectedRole
      });

      // ✅ SAVE TOKEN + ROLE
      if (res.data.token) {
        saveToken(res.data.token);
        localStorage.setItem('role', res.data.user.role);
      }

      const actualRole = res.data.user?.role || selectedRole;

      const pathMap: any = {
        organizer:'/dashboard/organizer',
        team_owner:'/dashboard/team-owner',
        viewer:'/auctions'
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
        <div className="flex justify-center mb-5">
          <BeastLogo size={100} glow float3d href="/"/>
        </div>

        <div className="bg-glass-premium rounded-xl p-7 gold-edge">
          <h2 className="text-2xl text-center mb-5">Welcome Back</h2>

          <div className="grid grid-cols-3 gap-2 mb-5">
            {ROLES.map(r => (
              <button key={r.id} type="button"
                onClick={() => setSelectedRole(r.id)}
                className={`p-3 rounded ${selectedRole===r.id ? 'bg-yellow-500' : 'bg-gray-700'}`}>
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input {...register('email')} placeholder="Email" className="input-beast"/>
            <input {...register('password')} type="password" placeholder="Password" className="input-beast"/>

            <button type="submit" className="w-full bg-primary py-3 rounded">
              {loading ? 'Signing In...' : 'Login'}
            </button>

            {formError && <p className="text-red-500">{formError.text}</p>}
          </form>

          <div className="mt-4 text-center">
            <Link href="/register">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
