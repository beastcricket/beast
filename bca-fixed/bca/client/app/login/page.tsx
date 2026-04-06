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
  const [loading,setLoading]=useState(false);
  const [selectedRole,setSelectedRole]=useState('');
  const [formError,setFormError]=useState<any>(null);
  const { register,handleSubmit,formState:{errors}}=useForm<F>();

  const onSubmit=async(d:F)=>{
    if(!selectedRole){setFormError({text:'Please select your role first.'});return;}
    setFormError(null);setLoading(true);

    try{
      const res=await api.post('/api/auth/login',{   // ✅ FIXED
        email:d.email.trim().toLowerCase(),
        password:d.password,
        role:selectedRole
      });

      if(res.data.token) saveToken(res.data.token);

      const role=res.data.user?.role || selectedRole;

      const pathMap:any={   // ✅ FIXED
        organizer:'/organizer/dashboard',
        team_owner:'/team/dashboard',
        viewer:'/auctions',
        admin:'/bca-admin-x7k2'
      };

      window.location.href=pathMap[role] || '/auctions';

    }catch(e:any){
      setFormError(mapError(e.response?.data?.error||''));
      setLoading(false);
    }
  };

  const chosen=ROLES.find(r=>r.id===selectedRole);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage:"url('/stadium-bg.jpg')" }}/>
      <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at center,transparent 20%,hsl(222 47% 6% / 0.95) 70%)' }}/>
      <GoldParticles/><FireSparkles/>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="flex justify-center mb-5">
          <BeastLogo size={100} glow float3d href="/"/>
        </div>

        {chosen && (
          <div className="flex justify-center mb-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${chosen.color}`}>
              <span>{chosen.icon}</span>
              <span>{chosen.label}</span>
            </div>
          </div>
        )}

        <div className="bg-glass-premium rounded-xl p-7 gold-edge">
          <h2 className="text-center mb-4">Welcome Back</h2>

          <div className="grid grid-cols-3 gap-2 mb-5">
            {ROLES.map(r=>(
              <button key={r.id} onClick={()=>setSelectedRole(r.id)}>
                {r.icon} {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <input {...register('email')} className="input-beast"/>
            <input {...register('password')} type="password" className="input-beast"/>

            <div className="text-right mt-1">
              <Link href="/forgot-password">Forgot password?</Link>
            </div>

            {formError && <p>{formError.text}</p>}

            <button type="submit">{loading?'Signing In...':'Login'}</button>
          </form>

          <p className="mt-4 text-center">
            No account? <Link href="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
