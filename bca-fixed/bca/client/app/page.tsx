'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth, getRoleRedirect } from '@/hooks/useAuth';
import { fmt } from '@/lib/utils';
import BeastLogo from '@/components/beast/BeastLogo';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import { format } from 'date-fns';
import { Mail, Instagram, ShoppingCart } from "lucide-react"; // ✅ ONLY ADDED

export default function HomePage() {
  const { user, loading } = useAuth();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, players: 0, teams: 0 });

  useEffect(() => {
    api.get('/auctions')
      .then(r => {
        const list: any[] = r.data.auctions || [];
        setAuctions(list.slice(0, 6));
        setStats({
          total: list.length,
          active: list.filter((a: any) => a.status === 'active').length,
          players: list.reduce((s: number, a: any) => s + (a.playerCount || 0), 0),
          teams: list.reduce((s: number, a: any) => s + (a.teamCount || 0), 0),
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && user) {
      window.location.href = getRoleRedirect(user.role || '');
    }
  }, [user, loading]);

  const STATS = [
    { icon: '🏏', label: 'Total Auctions', value: stats.total || '—' },
    { icon: '🔴', label: 'Live Now',        value: stats.active || '—' },
    { icon: '👤', label: 'Players Listed',  value: stats.players || '—' },
    { icon: '🏆', label: 'Teams Competing', value: stats.teams || '—' },
  ];

  const FEATURES = [
    { icon: '⚡', title: 'Real-Time Bidding', desc: 'Live socket-powered auctions with instant bid updates across all devices.' },
    { icon: '🎯', title: 'RTM System', desc: 'Right-to-Match cards let teams retain players by matching the winning bid.' },
    { icon: '📊', title: 'Live Leaderboard', desc: 'Track purse, squad size, and spending for every team in real time.' },
    { icon: '🔒', title: 'Role-Based Access', desc: 'Organizer, Team Owner, and Viewer roles with tailored dashboards.' },
    { icon: '📱', title: 'Multi-Device', desc: 'Works seamlessly on desktop, tablet, and mobile simultaneously.' },
    { icon: '🏟️', title: 'IPL-Style Experience', desc: 'Cinematic broadcast UI with countdown timers and sold animations.' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── HERO ── */}
      <div className="relative min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{ backgroundImage: "url('/stadium-bg.jpg')" }}/>
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 40%, hsla(222,47%,12%,0.4) 0%, hsl(222 47% 6% / 0.85) 70%)' }}/>

        <GoldParticles/>
        <FireSparkles/>

        <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <BeastLogo size={40} glow href="/"/>
            <div>
              <div className="font-heading text-base uppercase tracking-[0.2em] text-gradient-gold leading-none">Beast Cricket</div>
              <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">Auction Platform</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auctions" className="px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all border border-border/40 hover:border-primary/30">
              Auctions
            </Link>

            {user ? (
              <Link href={getRoleRedirect(user.role || '')}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] transition-all">
                Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">
                  Login
                </Link>
                <Link href="/register" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] transition-all">
                  Register Free
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* HERO CONTENT */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <BeastLogo size={120} glow float3d href="/"/>
            <h1 className="font-heading text-5xl md:text-7xl text-foreground mb-4">Beast Cricket Auction</h1>
          </motion.div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <BeastLogo size={28} href="/"/>
            <span className="font-heading text-sm uppercase tracking-[0.15em] text-gradient-gold">
              Beast Cricket Auction
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-heading uppercase tracking-wider text-muted-foreground">
            <Link href="/auctions">Auctions</Link>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </div>

          {/* 🔥 ONLY CHANGE STARTS HERE */}
          <div className="flex flex-col items-center gap-3">

            <div className="flex items-center gap-5 text-muted-foreground">
              <a href="mailto:beastcricketofficialauction@gmail.com">
                <Mail size={18} />
              </a>

              <a href="https://instagram.com/beastcricketofficial" target="_blank">
                <Instagram size={18} />
              </a>

              <a href="https://beastcricket.com/" target="_blank">
                <ShoppingCart size={18} />
              </a>
            </div>

            <p className="font-display text-muted-foreground text-xs">
              © {new Date().getFullYear()} Beast Cricket Auction.
            </p>

          </div>
          {/* 🔥 ONLY CHANGE ENDS HERE */}

        </div>
      </footer>

    </div>
  );
}
