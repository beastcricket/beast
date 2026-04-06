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
  return { text: msg || 'Login failed', hint:'' };
}

export default function LoginPage() {
  const [loading,setLoading]=useState(false);
  const [selectedRole,setSelectedRole]=useState('');
  const [formError,setFormError]=useState<any>(null);

  const { register,handleSubmit,formState:{errors}}=useForm<F>();

  const onSubmit=async(d:F)=>{
    if(!selectedRole){setFormError({text:'Select role'});return;}
    setLoading(true);setFormError(null);

    try{
      const res=await api.post('/api/auth/login',{   // ✅ FIX
        email:d.email.trim().toLowerCase(),
        password:d.password,
        role:selectedRole
      });

      if(res.data.token) saveToken(res.data.token);

      const role=res.data.user?.role || selectedRole;

      // ✅ FIX PATHS
      const pathMap:any={
        organizer:'/organizer/dashboard',
        team_owner:'/team/dashboard',
        viewer:'/auctions'
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
      <GoldParticles/><FireSparkles/>

      <div className="relative z-10 w-full max-w-md mx-4">
        <BeastLogo size={100} glow href="/"/>

        <div className="bg-glass-premium rounded-xl p-7 gold-edge">

          <h2 className="text-center mb-4">Welcome Back</h2>

          {/* ROLE SELECT */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {ROLES.map(r=>(
              <button key={r.id} onClick={()=>setSelectedRole(r.id)}>
                {r.icon} {r.label}
              </button>
            ))}
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit(onSubmit)}>

            <input {...register('email')} placeholder="Email" className="input-beast"/>
            <input {...register('password')} type="password" placeholder="Password" className="input-beast"/>

            {/* ✅ RESTORED LINKS */}
            <div className="text-right mt-1">
              <Link href="/forgot-password">Forgot password?</Link>
            </div>

            {formError && <p>{formError.text}</p>}

            <button type="submit">{loading?'Loading':'Login'}</button>

          </form>

          {/* ✅ RESTORED REGISTER */}
          <p className="mt-4 text-center">
            No account? <Link href="/register">Register</Link>
          </p>

        </div>
      </div>
    </div>
  );
}
