'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import api from '@/lib/api';

type F = { name:string; email:string; password:string; confirm:string };

export default function RegisterPage() {
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const {register,handleSubmit,watch}=useForm<F>();
  const pwd=watch('password','');

  const onSubmit=async(d:F)=>{
    if(d.password!==d.confirm){setError('Passwords not match');return;}

    setLoading(true);setError('');
    try{
      await api.post('/auth/register',{   // ✅ FIXED
        name:d.name,
        email:d.email,
        password:d.password
      });

      window.location.href='/login';

    }catch(e:any){
      setError(e.response?.data?.error||'Register failed');
    }finally{
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register('name')} placeholder="Name"/>
        <input {...register('email')} placeholder="Email"/>
        <input {...register('password')} type="password"/>
        <input {...register('confirm')} type="password"/>
        <button type="submit">{loading?'Loading':'Register'}</button>
      </form>
      {error && <p>{error}</p>}
    </div>
  );
}
