'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { useAuth, getRoleRedirect } from '@/hooks/useAuth';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import StadiumBg from '@/components/beast/StadiumBg';
import BeastLogo from '@/components/beast/BeastLogo';
import SectionDivider from '@/components/beast/SectionDivider';

// ─── Stat counter ────────────────────────────────────────────
function useCountUp(target: number, duration = 1800) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  const start = () => {
    if (started.current) return;
    started.current = true;
    const steps = 60; let step = 0;
    const iv = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setVal(Math.round(eased * target));
      if (step >= steps) clearInterval(iv);
    }, duration / steps);
  };
  return { val, start };
}

function StatCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { val, start } = useCountUp(value);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) start(); }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="text-center">
      <div className="font-heading text-3xl md:text-4xl lg:text-5xl text-shimmer-gold tracking-wider">{val}{suffix}</div>
      <div className="text-[11px] font-heading uppercase tracking-[0.25em] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

// ─── Role-specific homepages ─────────────────────────────────
function OrganizerHome({ user, logout }: any) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <StadiumBg/>
      <GoldParticles/>
      <FireSparkles/>
      {/* Nav */}
      <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-3">
          <BeastLogo size={40} glow={false}/>
          <span className="font-heading text-lg uppercase tracking-[0.2em] text-gradient-gold hidden sm:block">Beast Cricket</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auctions" className="px-5 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">Live Auctions</Link>
          <Link href="/profile" className="px-5 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">Profile</Link>
          <button onClick={logout} className="px-4 py-2 rounded-lg text-xs font-heading uppercase text-muted-foreground hover:text-destructive transition-all">Sign Out</button>
        </div>
      </nav>
      {/* Hero */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 pt-20">
        <div className="relative mb-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <BeastLogo size={224} glow float3d/>
        </div>
        <div className="flex items-center gap-2 mb-3 opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <span className="px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-heading uppercase tracking-wider">🎬 Organizer · Command Center</span>
        </div>
        <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl uppercase tracking-[0.12em] mb-1 opacity-0 animate-slide-up text-center" style={{ animationDelay: '0.25s' }}>
          <span className="text-foreground">Welcome back,</span>
        </h1>
        <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl uppercase tracking-[0.15em] mb-5 opacity-0 animate-slide-up text-center" style={{ animationDelay: '0.35s' }}>
          <span className="text-shimmer-gold">{user?.name}</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-slide-up mb-8" style={{ animationDelay: '0.45s' }}>
          <Link href="/auctions" className="group relative px-14 py-4 rounded-lg font-heading text-base uppercase tracking-[0.2em] font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] overflow-hidden bg-primary text-primary-foreground glow-gold-strong">
            <span className="relative z-10">Enter Auction</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"/>
          </Link>
          <Link href="/dashboard/organizer" className="group relative px-14 py-4 rounded-lg font-heading text-base uppercase tracking-[0.2em] font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] overflow-hidden border-2 border-primary/60 bg-background/40 text-foreground hover:bg-primary/10" style={{ boxShadow: '0 0 30px hsla(45,100%,51%,0.15), inset 0 1px 0 hsla(45,100%,51%,0.2)' }}>
            <span className="relative z-10">Enter Dashboard</span>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full max-w-2xl opacity-0 animate-slide-up" style={{ animationDelay: '0.55s' }}>
          {[
            { icon: '🏏', label: 'Create Auction', href: '/dashboard/organizer' },
            { icon: '👤', label: 'Add Players', href: '/dashboard/organizer' },
            { icon: '🏆', label: 'Manage Teams', href: '/dashboard/organizer' },
          ].map(c => (
            <Link key={c.label} href={c.href} className="bg-glass-premium rounded-xl p-4 text-center gold-edge border-gold-subtle hover:border-gold transition-all hover:scale-[1.03] group">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{c.icon}</div>
              <div className="font-heading text-xs uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">{c.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamOwnerHome({ user, logout }: any) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <StadiumBg/>
      <GoldParticles/>
      <FireSparkles/>
      <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-3">
          <BeastLogo size={40}/>
          <span className="font-heading text-lg uppercase tracking-[0.2em] text-gradient-gold hidden sm:block">Beast Cricket</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auctions" className="px-5 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">Live Auctions</Link>
          <Link href="/profile" className="px-5 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">Profile</Link>
          <button onClick={logout} className="px-4 py-2 rounded-lg text-xs font-heading uppercase text-muted-foreground hover:text-destructive transition-all">Sign Out</button>
        </div>
      </nav>
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 pt-20">
        <div className="relative mb-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <BeastLogo size={224} glow float3d/>
        </div>
        <div className="flex items-center gap-2 mb-3 opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <span className="px-4 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-heading uppercase tracking-wider">🏆 Team Owner · War Room</span>
        </div>
        <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl uppercase tracking-[0.12em] mb-1 opacity-0 animate-slide-up text-center" style={{ animationDelay: '0.25s' }}>
          <span className="text-foreground">Welcome,</span>
        </h1>
        <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl uppercase tracking-[0.15em] mb-5 opacity-0 animate-slide-up text-center" style={{ animationDelay: '0.35s' }}>
          <span className="text-shimmer-gold">{user?.name}</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-slide-up mb-8" style={{ animationDelay: '0.45s' }}>
          <Link href="/auctions" className="group relative px-14 py-4 rounded-lg font-heading text-base uppercase tracking-[0.2em] font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] overflow-hidden bg-primary text-primary-foreground glow-gold-strong">
            <span className="relative z-10">Enter Auction</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"/>
          </Link>
          <Link href="/dashboard/team-owner" className="group relative px-14 py-4 rounded-lg font-heading text-base uppercase tracking-[0.2em] font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] border-2 border-primary/60 bg-background/40 text-foreground hover:bg-primary/10" style={{ boxShadow: '0 0 30px hsla(45,100%,51%,0.15), inset 0 1px 0 hsla(45,100%,51%,0.2)' }}>
            <span className="relative z-10">My Teams</span>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 w-full max-w-2xl opacity-0 animate-slide-up" style={{ animationDelay: '0.55s' }}>
          {[
            { icon: '🎯', label: 'Join via Code', href: '/dashboard/team-owner' },
            { icon: '💰', label: 'My Squad', href: '/dashboard/team-owner' },
            { icon: '👤', label: 'My Profile', href: '/profile' },
          ].map(c => (
            <Link key={c.label} href={c.href} className="bg-glass-premium rounded-xl p-4 text-center gold-edge border-gold-subtle hover:border-gold transition-all hover:scale-[1.03] group">
              <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">{c.icon}</div>
              <div className="font-heading text-xs uppercase tracking-wider text-foreground group-hover:text-primary transition-colors">{c.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ViewerHome({ user, logout }: any) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <StadiumBg/>
      <GoldParticles/>
      <FireSparkles/>
      <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-3">
          <BeastLogo size={40}/>
          <span className="font-heading text-lg uppercase tracking-[0.2em] text-gradient-gold hidden sm:block">Beast Cricket</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auctions" className="px-5 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">Live Auctions</Link>
          <Link href="/profile" className="px-5 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">Profile</Link>
          <button onClick={logout} className="px-4 py-2 rounded-lg text-xs font-heading uppercase text-muted-foreground hover:text-destructive transition-all">Sign Out</button>
        </div>
      </nav>
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 pt-20">
        <div className="relative mb-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <BeastLogo size={200} glow float3d/>
        </div>
        <div className="flex items-center gap-2 mb-3 opacity-0 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <span className="px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-heading uppercase tracking-wider">👁️ Viewer · Live Arena</span>
        </div>
        <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl uppercase tracking-[0.15em] mb-5 opacity-0 animate-slide-up text-center" style={{ animationDelay: '0.35s' }}>
          <span className="text-shimmer-gold">Watch Live Auctions</span>
        </h2>
        <Link href="/auctions" className="group relative px-14 py-4 rounded-lg font-heading text-base uppercase tracking-[0.2em] font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] overflow-hidden bg-primary text-primary-foreground glow-gold-strong opacity-0 animate-slide-up" style={{ animationDelay: '0.45s' }}>
          <span className="relative z-10">Watch Now</span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"/>
        </Link>
      </div>
    </div>
  );
}

// ─── Public homepage ─────────────────────────────────────────
export default function HomePage() {
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOp = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  useEffect(() => setMounted(true), []);

  if (user?.role === 'organizer' || user?.role === 'admin') return <OrganizerHome user={user} logout={logout}/>;
  if (user?.role === 'team_owner') return <TeamOwnerHome user={user} logout={logout}/>;
  if (user?.role === 'viewer') return <ViewerHome user={user} logout={logout}/>;

  const features = [
    { icon: '⚡', title: 'Real-Time Bidding', desc: 'Experience the thrill of live auctions with instant bid updates as teams compete for top players.' },
    { icon: '🏏', title: 'Player Analytics', desc: 'Deep dive into player stats, performance trends, and historical auction data for smarter decisions.' },
    { icon: '💰', title: 'Purse Management', desc: 'Strategically manage your team budget with real-time purse tracking and spend alerts.' },
    { icon: '🔴', title: 'Live Broadcast', desc: 'Viewers get a front-row seat with live commentary, team compositions, and auction leaderboards.' },
    { icon: '📊', title: 'Smart Dashboard', desc: 'Comprehensive control panel with auction history, player pools, and customizable analytics.' },
    { icon: '🎯', title: 'RTM Cards', desc: 'Right to Match — teams can match the winning bid to retain their target players.' },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">

      {/* ═══════ HERO ═══════ */}
      <section ref={heroRef} className="relative min-h-screen overflow-hidden">
        <motion.div style={{ opacity: heroOp }} className="absolute inset-0">
          {/* Stadium bg — brighter, more visible */}
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage:"url('/stadium-bg.jpg')", opacity: 0.8 }}/>
          <div className="absolute inset-0"
            style={{ background:'linear-gradient(180deg, hsl(222 47% 6% / 0.2) 0%, hsl(222 47% 6% / 0.1) 30%, hsl(222 47% 6% / 0.4) 65%, hsl(222 47% 6% / 0.8) 100%)' }}/>
          <div className="absolute inset-0"
            style={{ background:'radial-gradient(ellipse 70% 55% at center 30%, hsl(222 47% 6% / 0.3) 20%, hsl(222 47% 6% / 0.7) 70%)' }}/>
          {/* Floodlight beams */}
          {[{ left:'5%', rotate:'-18deg' }, { left:'95%', rotate:'18deg' }].map((b,i) => (
            <div key={i} className="absolute top-0 pointer-events-none" style={{ left:b.left, width:180, height:'75vh',
              background:'linear-gradient(180deg, hsla(45,100%,90%,0.9) 0%, hsla(45,100%,51%,0.25) 25%, hsl(222 47% 6%) 100%)',
              transform:`rotate(${b.rotate})`, transformOrigin:'top center', filter:'blur(35px)', opacity:1 }}/>
          ))}
          {/* Horizon glow line */}
          <div className="absolute top-[62%] left-0 right-0 h-[2px] pointer-events-none"
            style={{ background:'linear-gradient(90deg, transparent 5%, hsla(45,100%,51%,0.5) 25%, hsla(45,100%,70%,0.9) 50%, hsla(45,100%,51%,0.5) 75%, transparent 95%)' }}/>
        </motion.div>
        <GoldParticles/>
        <FireSparkles/>

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 py-5">
          <div className="flex items-center gap-3">
            <BeastLogo size={40}/>
            <span className="font-heading text-lg uppercase tracking-[0.2em] text-gradient-gold hidden sm:block">Beast Cricket</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auctions" className="text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors hidden md:block">Live Auctions</Link>
            <Link href="/login" className="px-5 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all active:scale-95">Sign In</Link>
            <a href="#get-started" className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-heading uppercase tracking-wider hover:scale-[1.03] active:scale-95 transition-all glow-gold">Get Started</a>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-4 pt-20">
          <div className="relative mb-6 opacity-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <BeastLogo size={192} glow float3d/>
          </div>

          <div className="w-48 h-[2px] mb-5 opacity-0 animate-slide-up" style={{ animationDelay: '0.25s',
            background: 'linear-gradient(90deg, transparent, hsl(45 100% 51%), hsl(45 100% 70%), hsl(45 100% 51%), transparent)' }}/>

          <h1 className="font-heading text-center text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl tracking-[0.18em] uppercase mb-2 opacity-0 animate-slide-up" style={{ animationDelay: '0.35s' }}>
            <span className="text-foreground">The Ultimate </span>
            <span className="text-shimmer-gold">Cricket Auction</span>
          </h1>
          <h2 className="font-heading text-center text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.25em] uppercase mb-4 opacity-0 animate-slide-up" style={{ animationDelay: '0.45s' }}>
            <span className="text-gradient-gold">Platform</span>
          </h2>
          <p className="font-display text-muted-foreground text-sm sm:text-base md:text-lg tracking-wider mb-10 text-center max-w-xl opacity-0 animate-slide-up" style={{ animationDelay: '0.55s' }}>
            Build your dream squad. Bid in real-time. Win the championship.<br className="hidden sm:block"/>
            The most immersive cricket auction experience ever built.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16 opacity-0 animate-slide-up" style={{ animationDelay: '0.65s' }}>
            <a href="#get-started" className="group relative px-10 py-4 rounded-lg font-heading text-sm uppercase tracking-[0.2em] font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] overflow-hidden bg-primary text-primary-foreground glow-gold-strong">
              <span className="relative z-10">Enter the Arena</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"/>
            </a>
            <a href="#how-it-works" className="px-10 py-4 rounded-lg font-heading text-sm uppercase tracking-[0.2em] font-bold transition-all duration-300 hover:scale-[1.04] active:scale-[0.97] border-2 border-primary/50 bg-background/40 text-foreground hover:bg-primary/10"
              style={{ boxShadow: '0 0 30px hsla(45,100%,51%,0.1), inset 0 1px 0 hsla(45,100%,51%,0.15)' }}>
              How It Works
            </a>
          </div>

          <div className="absolute bottom-8 flex flex-col items-center gap-2 opacity-0 animate-slide-up" style={{ animationDelay: '1s' }}>
            <span className="text-[10px] font-heading uppercase tracking-[0.3em] text-muted-foreground">Scroll</span>
            <div className="w-[1px] h-8" style={{ background: 'linear-gradient(to bottom, hsla(45,100%,51%,0.6), transparent)' }}/>
          </div>
        </div>
      </section>

      {/* ═══════ STATS ═══════ */}
      <section className="relative py-20 overflow-hidden">
        <SectionDivider/>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, hsl(222 47% 6%) 0%, hsl(222 40% 9%) 50%, hsl(222 47% 6%) 100%)' }}/>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, hsl(222 47% 6%) 0%, hsl(222 47% 6%) 70%)' }}/>
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
            {[{ v:100, s:'+', l:'Live Auctions' },{ v:500, s:'+', l:'Players Auctioned' },{ v:50, s:'+', l:'Active Teams' },{ v:200, s:'+', l:'Crore Bids' }].map(s => (
              <StatCard key={s.l} value={s.v} suffix={s.s} label={s.l}/>
            ))}
          </div>
        </div>
        <SectionDivider flip/>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(0deg, hsl(222 47% 6%) 0px, hsl(222 47% 6%) 1px, hsl(222 47% 6%) 60px)' }}/>
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-heading uppercase tracking-[0.2em] mb-4">Platform Features</span>
            <h2 className="font-heading text-3xl md:text-5xl uppercase tracking-[0.1em] text-foreground">
              Everything You Need to <span className="text-gradient-gold">Dominate</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title} className="group bg-glass-premium rounded-xl p-6 border-gold-subtle hover:border-gold transition-all duration-500 hover:scale-[1.02] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>
                <div className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(90deg, transparent, hsl(45 100% 51%) 50%, transparent)' }}/>
                <div className="relative z-10">
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform duration-500 inline-block">{f.icon}</div>
                  <h3 className="font-heading text-lg uppercase tracking-[0.12em] text-foreground group-hover:text-primary transition-colors duration-300 mb-2">{f.title}</h3>
                  <p className="font-display text-sm text-muted-foreground leading-relaxed tracking-wide">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ HOW IT WORKS ═══════ */}
      <section id="how-it-works" className="relative py-24 overflow-hidden">
        <SectionDivider/>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, hsl(222 47% 6%) 0%, hsl(222 38% 8%) 50%, hsl(222 47% 6%) 100%)' }}/>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/stadium-bg.jpg')" }}/>
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-heading uppercase tracking-[0.2em] mb-4">How It Works</span>
            <h2 className="font-heading text-3xl md:text-5xl uppercase tracking-[0.1em] text-foreground">
              From Registration to <span className="text-shimmer-gold">Championship</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-[16.5%] right-[16.5%] h-[1px] pointer-events-none" style={{ background: 'linear-gradient(90deg, hsl(45 100% 51%) 0%, hsl(45 100% 51%) 50%, hsl(45 100% 51%) 100%)' }}/>
            {[
              { step: '01', title: 'Register', desc: 'Create your account. Choose Organizer, Team Owner, or Viewer when you log in.' },
              { step: '02', title: 'Join the Auction', desc: 'Organizer creates the event and shares a 6-char join code. Teams enter it to register.' },
              { step: '03', title: 'Bid & Win', desc: 'When the gavel drops, it\'s war. Outbid rivals, use RTM cards, build your dream squad.' },
            ].map(item => (
              <div key={item.step} className="relative bg-glass-premium rounded-xl p-6 border-gold-subtle gold-edge text-center group hover:scale-[1.02] transition-transform duration-300">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center font-heading text-xl font-bold relative border-gold glow-gold"
                  style={{ background: 'linear-gradient(135deg, hsl(45 100% 51%) 0%, hsl(45 100% 51%) 100%)' }}>
                  <span className="text-primary relative z-10">{item.step}</span>
                  <div className="absolute inset-0 rounded-full animate-pulse-glow" style={{ background: 'radial-gradient(circle, hsl(45 100% 51%) 0%, transparent 70%)' }}/>
                </div>
                <h3 className="font-heading text-base uppercase tracking-[0.12em] text-foreground mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
                <p className="font-display text-sm text-muted-foreground leading-relaxed tracking-wide">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <SectionDivider flip/>
      </section>

      {/* ═══════ GET STARTED ═══════ */}
      <section id="get-started" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/stadium-bg.jpg')" }}/>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, hsl(222 47% 6%) 0%, hsl(222 47% 6%) 30%, hsl(222 47% 6%) 70%, hsl(222 47% 6%) 100%)' }}/>
        {[{ left: '5%', rotate: '-15deg' }, { left: '95%', rotate: '15deg' }].map((b, i) => (
          <div key={i} className="absolute top-0 pointer-events-none" style={{ left: b.left, width: 130, height: '70vh', background: 'linear-gradient(180deg, hsl(222 47% 6%) 0%, hsl(222 47% 6%) 100%)', transform: `rotate(${b.rotate})`, transformOrigin: 'top center', filter: 'blur(25px)', opacity:1 }}/>
        ))}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-heading uppercase tracking-[0.2em] mb-5">Choose Your Role</span>
          <h2 className="font-heading text-3xl md:text-5xl uppercase tracking-[0.1em] text-foreground mb-3">
            Ready to Enter the <span className="text-shimmer-gold">Arena?</span>
          </h2>
          <p className="font-display text-muted-foreground text-base md:text-lg tracking-wide mb-12 max-w-xl mx-auto">
            Select your role to begin. Each path offers a unique perspective on the most electrifying cricket auction on the planet.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { key: 'organizer', icon: '🎬', label: 'Organizer', desc: 'Create & manage auctions', gradient: 'from-amber-500/20 to-yellow-600/10', href: '/login' },
              { key: 'team-owner', icon: '🏆', label: 'Team Owner', desc: 'Build your dream squad', gradient: 'from-blue-500/20 to-cyan-600/10', href: '/login' },
              { key: 'viewer', icon: '👁️', label: 'Viewer', desc: 'Watch live auctions', gradient: 'from-emerald-500/20 to-green-600/10', href: '/login' },
            ].map(role => (
              <Link key={role.key} href={role.href}
                className={`group relative bg-glass-premium rounded-xl p-7 text-center cursor-pointer transition-all duration-500 hover:scale-[1.06] active:scale-[0.97] border-gold-subtle hover:border-gold overflow-hidden`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}/>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"/>
                <div className="absolute top-0 left-0 right-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(90deg, transparent, hsla(45,100%,51%,0.6) 50%, transparent)' }}/>
                <div className="relative z-10">
                  <div className="text-5xl mb-4 group-hover:scale-125 transition-transform duration-500">{role.icon}</div>
                  <div className="font-heading text-xl uppercase tracking-[0.15em] text-foreground group-hover:text-primary transition-colors duration-300 mb-2">{role.label}</div>
                  <div className="text-xs text-muted-foreground font-display mb-5">{role.desc}</div>
                  <div className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-heading uppercase tracking-wider group-hover:bg-primary/20 transition-all">Get Started →</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="relative py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BeastLogo size={32}/>
            <span className="font-heading text-sm uppercase tracking-[0.2em] text-muted-foreground">Beast Cricket Auction</span>
          </div>
          <p className="text-[11px] font-display tracking-wider text-muted-foreground">The ultimate platform for real-time cricket player auctions.</p>
          <div className="flex items-center gap-5">
            {['Live Auctions', 'Login', 'Register'].map(l => (
              <Link key={l} href={l === 'Live Auctions' ? '/auctions' : `/${l.toLowerCase()}`}
                className="text-[11px] font-heading uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
