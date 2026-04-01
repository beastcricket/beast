'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';
import confetti from 'canvas-confetti';

type Status = 'loading' | 'success' | 'already-verified' | 'expired' | 'error';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const [status,  setStatus]  = useState<Status>('loading');
  const [dots,    setDots]    = useState('');
  const [resent,  setResent]  = useState(false);
  const [resending, setResending] = useState(false);
  const [email,   setEmail]   = useState('');

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }

    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus('success');
        setTimeout(() => confetti({
          particleCount: 150, spread: 80, origin: { y: 0.6 },
          colors: ['#f59e0b','#fcd34d','#fff','#d97706','#10b981'],
        }), 300);
        setTimeout(() => confetti({ particleCount: 80, spread: 120, origin: { y: 0.4 } }), 700);
      })
      .catch((e) => {
        const data = e.response?.data;
        if (data?.alreadyVerified) setStatus('already-verified');
        else if (data?.error?.includes('expired')) setStatus('expired');
        else setStatus('error');
      });
  }, [params]);

  const resendVerification = async () => {
    if (!email.trim()) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: email.trim() });
      setResent(true);
    } catch {}
    setResending(false);
  };

  const BG = (
    <>
      <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage:"url('/stadium-bg.jpg')" }}/>
      <div className="absolute inset-0" style={{ background:'radial-gradient(ellipse at center, transparent 20%, hsl(222 47% 6% / 0.95) 70%)' }}/>
      <GoldParticles/><FireSparkles/>
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20"><BeastLogo size={40} href="/"/></div>
    </>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {BG}
      <AnimatePresence mode="wait">

        {/* LOADING */}
        {status === 'loading' && (
          <motion.div key="load" initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="relative z-10 text-center px-6">
            <motion.div animate={{ rotate:360 }} transition={{ duration:1.2, repeat:Infinity, ease:'linear' }}
              className="text-6xl mb-6 inline-block">🏏</motion.div>
            <h1 className="font-heading text-3xl uppercase tracking-[0.15em] text-foreground mb-2">Verifying{dots}</h1>
            <p className="font-display text-muted-foreground text-sm mb-6">Please wait while we activate your account...</p>
            <div className="w-48 h-1 bg-secondary rounded-full mx-auto overflow-hidden">
              <motion.div className="h-full rounded-full bg-primary" animate={{ x:['-100%','100%'] }}
                transition={{ duration:1.2, repeat:Infinity, ease:'easeInOut' }}/>
            </div>
          </motion.div>
        )}

        {/* SUCCESS */}
        {status === 'success' && (
          <motion.div key="ok" initial={{ opacity:0, scale:0.8, y:30 }} animate={{ opacity:1, scale:1, y:0 }}
            transition={{ type:'spring', stiffness:200, damping:20 }} className="relative z-10 w-full max-w-md mx-5">
            <div className="bg-glass-premium rounded-xl overflow-hidden gold-edge" style={{ border:'1px solid rgba(16,185,129,0.3)' }}>
              <div className="h-1.5" style={{ background:'linear-gradient(90deg,#10b981,#059669,#10b981)' }}/>
              <div className="p-10 text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:0.2, type:'spring', stiffness:300 }}
                    className="w-full h-full rounded-full flex items-center justify-center text-4xl"
                    style={{ background:'linear-gradient(135deg,#10b981,#059669)' }}>✓</motion.div>
                  {[0,0.3,0.6].map((d,i) => (
                    <motion.div key={i} className="absolute inset-0 rounded-full border-2 border-green-500"
                      initial={{ scale:1, opacity:0.8 }} animate={{ scale:2.5, opacity:0 }}
                      transition={{ duration:1.5, repeat:Infinity, delay:d, ease:'easeOut' }}/>
                  ))}
                </div>
                <h2 className="font-heading text-3xl uppercase tracking-wider text-foreground mb-2">
                  Email <span className="text-gradient-gold">Verified!</span>
                </h2>
                <p className="font-display text-muted-foreground mb-8 text-sm leading-relaxed">
                  Your account is now active. Log in and choose your role to start bidding!
                </p>
                <Link href="/login"
                  className="block w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm text-center glow-gold hover:scale-[1.02] transition-all">
                  🏏 Login Now
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* ALREADY VERIFIED */}
        {status === 'already-verified' && (
          <motion.div key="already" initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
            className="relative z-10 w-full max-w-md mx-5">
            <div className="bg-glass-premium rounded-xl overflow-hidden gold-edge border-gold-subtle">
              <div className="h-1.5" style={{ background:'linear-gradient(90deg,hsl(45,100%,51%),hsl(40,100%,38%))' }}/>
              <div className="p-10 text-center">
                <div className="text-6xl mb-6">✅</div>
                <h2 className="font-heading text-3xl uppercase tracking-wider text-foreground mb-2">
                  Already <span className="text-gradient-gold">Verified!</span>
                </h2>
                <p className="font-display text-muted-foreground mb-8 text-sm leading-relaxed">
                  Your email is already verified. You can log in right now.
                </p>
                <Link href="/login"
                  className="block w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm text-center glow-gold hover:scale-[1.02] transition-all">
                  Go to Login
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* EXPIRED */}
        {status === 'expired' && (
          <motion.div key="expired" initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
            className="relative z-10 w-full max-w-md mx-5">
            <div className="bg-glass-premium rounded-xl overflow-hidden gold-edge" style={{ border:'1px solid rgba(239,68,68,0.3)' }}>
              <div className="h-1.5" style={{ background:'linear-gradient(90deg,#f97316,#ea580c)' }}/>
              <div className="p-10 text-center">
                <div className="text-6xl mb-6">⏰</div>
                <h2 className="font-heading text-3xl uppercase tracking-wider text-foreground mb-2">
                  Link <span style={{ color:'#f97316' }}>Expired</span>
                </h2>
                <p className="font-display text-muted-foreground mb-6 text-sm leading-relaxed">
                  This verification link has expired (links are valid for 24 hours). Enter your email to get a new one.
                </p>
                {!resent ? (
                  <div className="space-y-3">
                    <input value={email} onChange={e => setEmail(e.target.value)}
                      type="email" placeholder="your@email.com" className="input-beast text-center"/>
                    <button onClick={resendVerification} disabled={resending || !email.trim()}
                      className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">
                      {resending ? 'Sending...' : '📧 Send New Link'}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg" style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)' }}>
                    <p className="text-green-400 font-heading text-sm">✓ New link sent! Check your inbox.</p>
                  </div>
                )}
                <Link href="/login" className="block text-center text-xs font-heading text-muted-foreground hover:text-primary transition-colors mt-4">Already verified? Login</Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* ERROR / INVALID */}
        {status === 'error' && (
          <motion.div key="err" initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
            className="relative z-10 w-full max-w-md mx-5">
            <div className="bg-glass-premium rounded-xl overflow-hidden gold-edge" style={{ border:'1px solid rgba(239,68,68,0.3)' }}>
              <div className="h-1.5" style={{ background:'linear-gradient(90deg,#ef4444,#dc2626,#ef4444)' }}/>
              <div className="p-10 text-center">
                <motion.div initial={{ scale:0, rotate:-180 }} animate={{ scale:1, rotate:0 }} transition={{ type:'spring' }}
                  className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"
                  style={{ background:'linear-gradient(135deg,#ef4444,#dc2626)' }}>✕</motion.div>
                <h2 className="font-heading text-3xl uppercase tracking-wider text-foreground mb-2">
                  Invalid <span className="text-destructive">Link</span>
                </h2>
                <p className="font-display text-muted-foreground mb-6 text-sm leading-relaxed">
                  This link is invalid or has already been used. Enter your email to get a fresh verification link.
                </p>
                {!resent ? (
                  <div className="space-y-3">
                    <input value={email} onChange={e => setEmail(e.target.value)}
                      type="email" placeholder="your@email.com" className="input-beast text-center"/>
                    <button onClick={resendVerification} disabled={resending || !email.trim()}
                      className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 mb-3">
                      {resending ? 'Sending...' : '📧 Resend Verification'}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg mb-3" style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)' }}>
                    <p className="text-green-400 font-heading text-sm">✓ New verification link sent! Check your inbox.</p>
                  </div>
                )}
                <Link href="/register" className="block text-center text-xs font-heading text-muted-foreground hover:text-primary transition-colors">
                  No account yet? Register free
                </Link>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
