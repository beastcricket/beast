'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';
import { useAuth, getRoleRedirect } from '@/hooks/useAuth';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import BeastLogo from '@/components/beast/BeastLogo';
import { format } from 'date-fns';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, players: 0, teams: 0 });
  const [auctionsLoading, setAuctionsLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    api.get('/auctions')
      .then(r => {
        const list: any[] = r.data.auctions || [];
        setAuctions(list.slice(0, 6));
        setStats({
          total: list.length,
          active: list.filter(a => a.status === 'active').length,
          players: list.reduce((s, a) => s + (a.playersCount || 0), 0),
          teams: list.reduce((s, a) => s + (a.teamsCount || 0), 0),
        });
      })
      .catch(() => {})
      .finally(() => setAuctionsLoading(false));
  }, []);

  const FEATURES = [
    { icon: '🏏', title: 'Live Bidding', desc: 'Real-time IPL-style auctions with countdown timers and instant bid updates across all devices.' },
    { icon: '🎯', title: 'RTM System', desc: 'Right To Match cards let teams retain their favourite players by matching the highest bid.' },
    { icon: '📊', title: 'Smart Analytics', desc: 'Track purse usage, player stats, team composition and auction history in real time.' },
    { icon: '🔒', title: 'Secure & Fast', desc: 'JWT-authenticated sessions, role-based access, and sub-second socket updates.' },
    { icon: '📱', title: 'Any Device', desc: 'Fully responsive — bid from your phone, tablet or desktop without missing a moment.' },
    { icon: '🏆', title: 'Multi-Role', desc: 'Organizers, team owners and viewers each get a tailored experience built for their needs.' },
  ];

  const ROLES = [
    { icon: '🎬', role: 'Organizer', color: 'from-amber-500/20 to-yellow-600/5', border: 'border-amber-500/30', text: 'text-amber-400', desc: 'Create auctions, add players & teams, control the live event.', href: '/register' },
    { icon: '🏆', role: 'Team Owner', color: 'from-blue-500/20 to-cyan-600/5', border: 'border-blue-500/30', text: 'text-blue-400', desc: 'Join with a code, build your squad, bid in real time.', href: '/register' },
    { icon: '👁️', role: 'Viewer', color: 'from-emerald-500/20 to-green-600/5', border: 'border-emerald-500/30', text: 'text-emerald-400', desc: 'Watch live auctions, follow bids and see results unfold.', href: '/auctions' },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── STICKY NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-glass-navy shadow-lg' : 'bg-transparent'}`}
        style={{ borderBottom: scrolled ? '1px solid hsla(45,100%,51%,0.1)' : 'none' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BeastLogo size={38} href="/" />
            <span className="font-heading text-lg uppercase tracking-[0.2em] text-gradient-gold hidden sm:block">Beast Cricket</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auctions" className="text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors hidden md:block">Auctions</Link>
            {!loading && user ? (
              <>
                <Link href={getRoleRedirect(user.role)}
                  className="px-5 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="px-5 py-2 rounded-lg border border-primary/30 text-xs font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all">
                  Sign In
                </Link>
                <Link href="/register" className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-heading uppercase tracking-wider hover:scale-[1.03] active:scale-95 transition-all glow-gold">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/stadium-bg.jpg')" }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 120% 80% at 50% 60%, transparent 20%, hsl(222 47% 6% / 0.97) 70%)' }} />
        {/* Light beams */}
        {[{ left: '8%', rotate: '-14deg' }, { left: '92%', rotate: '14deg' }, { left: '50%', rotate: '0deg' }].map((b, i) => (
          <div key={i} className="absolute top-0 pointer-events-none" style={{ left: b.left, width: 100, height: '70vh', background: 'linear-gradient(180deg,hsla(45,100%,90%,0.7) 0%,transparent 100%)', transform: `rotate(${b.rotate}) translateX(-50%)`, transformOrigin: 'top center', filter: 'blur(30px)', opacity: 0.05 }} />
        ))}
        <GoldParticles />
        <FireSparkles />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-24 pb-16">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/25 mb-8">
            {stats.active > 0 && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
            <span className="font-heading text-xs uppercase tracking-[0.2em] text-primary">
              {stats.active > 0 ? `${stats.active} Live Auction${stats.active > 1 ? 's' : ''} Now` : 'IPL-Style Cricket Auctions'}
            </span>
          </motion.div>

          {/* Logo */}
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-8">
            <BeastLogo size={120} glow float3d />
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="font-heading text-5xl md:text-7xl xl:text-8xl uppercase tracking-[0.08em] text-foreground mb-4 leading-none">
            Beast <span className="text-gradient-gold">Cricket</span>
            <br />
            <span className="text-4xl md:text-5xl xl:text-6xl text-muted-foreground/80">Auction Platform</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="font-display text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Run professional IPL-style cricket player auctions with real-time bidding, RTM cards, live timers and multi-device support.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="flex flex-wrap gap-4 justify-center mb-16">
            {!loading && user ? (
              <Link href={getRoleRedirect(user.role)}
                className="px-10 py-4 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.03] active:scale-95 transition-all">
                🏏 Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/register"
                  className="px-10 py-4 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.03] active:scale-95 transition-all">
                  🚀 Get Started Free
                </Link>
                <Link href="/login"
                  className="px-10 py-4 rounded-xl border border-primary/40 text-primary font-heading uppercase tracking-wider text-sm hover:bg-primary/10 transition-all">
                  Sign In
                </Link>
              </>
            )}
            <Link href="/auctions"
              className="px-10 py-4 rounded-xl border border-border text-muted-foreground font-heading uppercase tracking-wider text-sm hover:border-primary/40 hover:text-primary transition-all">
              Browse Auctions
            </Link>
          </motion.div>

          {/* Live Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { label: 'Total Auctions', value: stats.total, icon: '🏏' },
              { label: 'Live Now', value: stats.active, icon: '🔴', highlight: stats.active > 0 },
              { label: 'Players', value: stats.players, icon: '👤' },
              { label: 'Teams', value: stats.teams, icon: '🏆' },
            ].map((s, i) => (
              <div key={i} className={`bg-glass-premium rounded-xl p-4 text-center border-gold-subtle ${s.highlight ? 'border-green-500/30 bg-green-500/5' : ''}`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className={`font-heading text-2xl font-bold ${s.highlight ? 'text-green-400' : 'text-gradient-gold'}`}>{s.value}</div>
                <div className="font-display text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="font-display text-xs text-muted-foreground uppercase tracking-widest">Scroll</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="w-5 h-8 rounded-full border border-primary/30 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-primary/60" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 50%, hsla(45,100%,51%,0.03), transparent)' }} />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-heading uppercase tracking-[0.2em] mb-4">Platform Features</span>
            <h2 className="font-heading text-4xl md:text-5xl uppercase tracking-[0.1em] text-foreground mb-3">
              Everything You <span className="text-gradient-gold">Need</span>
            </h2>
            <p className="font-display text-muted-foreground max-w-xl mx-auto">A complete auction platform built for cricket enthusiasts who want the real IPL experience.</p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="bg-glass-premium rounded-xl p-6 border-gold-subtle hover:border-gold transition-all duration-300 group hover:scale-[1.02]">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
                <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-2">{f.title}</h3>
                <p className="font-display text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent, hsla(222,40%,8%,0.5), transparent)' }} />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-heading uppercase tracking-[0.2em] mb-4">Choose Your Role</span>
            <h2 className="font-heading text-4xl md:text-5xl uppercase tracking-[0.1em] text-foreground mb-3">
              Your <span className="text-gradient-gold">Arena</span> Awaits
            </h2>
            <p className="font-display text-muted-foreground max-w-xl mx-auto">Three distinct roles, each with a purpose-built experience.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {ROLES.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`bg-gradient-to-br ${r.color} rounded-2xl p-7 border ${r.border} hover:scale-[1.03] transition-all duration-300 group`}>
                <div className="text-5xl mb-5 group-hover:scale-110 transition-transform duration-300">{r.icon}</div>
                <h3 className={`font-heading text-2xl uppercase tracking-wider mb-2 ${r.text}`}>{r.role}</h3>
                <p className="font-display text-muted-foreground text-sm leading-relaxed mb-6">{r.desc}</p>
                <Link href={r.href}
                  className={`inline-block px-6 py-2.5 rounded-lg border ${r.border} ${r.text} text-xs font-heading uppercase tracking-wider hover:bg-white/5 transition-all`}>
                  Get Started →
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED AUCTIONS ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-heading uppercase tracking-[0.2em] mb-3">Live & Upcoming</span>
              <h2 className="font-heading text-4xl md:text-5xl uppercase tracking-[0.1em] text-foreground">
                Featured <span className="text-gradient-gold">Auctions</span>
              </h2>
            </div>
            <Link href="/auctions" className="px-6 py-2.5 rounded-lg border border-primary/30 text-primary text-xs font-heading uppercase tracking-wider hover:bg-primary/10 transition-all">
              View All →
            </Link>
          </div>

          {auctionsLoading ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-glass-premium rounded-xl h-52 animate-pulse border-gold-subtle" />
              ))}
            </div>
          ) : auctions.length === 0 ? (
            <div className="text-center py-20 bg-glass-premium rounded-2xl border-gold-subtle">
              <div className="text-5xl mb-4">🏏</div>
              <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-2">No Auctions Yet</h3>
              <p className="font-display text-muted-foreground text-sm mb-6">Be the first to create a Beast Cricket auction!</p>
              <Link href="/register" className="inline-block px-8 py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold">
                Create Auction
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {auctions.map((a, i) => (
                <motion.div key={a._id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  className="bg-glass-premium rounded-xl overflow-hidden border-gold-subtle hover:border-gold transition-all duration-300 hover:scale-[1.02] group">
                  <div className="h-1" style={{ background: a.status === 'active' ? 'linear-gradient(90deg,hsl(142 70% 45%),hsl(142 70% 55%))' : 'linear-gradient(90deg,hsl(45 100% 51%),hsl(40 100% 38%))' }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-heading text-xl uppercase tracking-[0.08em] text-foreground flex-1 pr-3 leading-tight">{a.name}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider border flex-shrink-0 ${a.status === 'active' ? 'border-green-500/30 bg-green-500/10 text-green-400' : a.status === 'completed' ? 'border-muted bg-muted/20 text-muted-foreground' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
                        {a.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1" />}
                        {a.status}
                      </span>
                    </div>
                    {a.description && <p className="font-display text-muted-foreground text-xs mb-3 leading-relaxed line-clamp-2">{a.description}</p>}
                    <div className="space-y-1 text-xs font-display text-muted-foreground mb-4">
                      <div>📅 {format(new Date(a.date), 'dd MMM yyyy')}</div>
                      <div>💰 {fmt(a.totalPursePerTeam)} per team · ⏱ {a.bidTimer}s timer</div>
                      <div>by {a.organizerId?.name || 'Organizer'}</div>
                    </div>
                    <Link href={`/auctions/${a._id}`}
                      className={`block text-center py-2.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${a.status === 'active' ? 'bg-primary text-primary-foreground glow-gold hover:scale-[1.02]' : 'border border-primary/30 text-primary hover:bg-primary/10'}`}>
                      {a.status === 'active' ? '🔴 Watch Live' : '👁 View Auction'}
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent, hsla(222,40%,8%,0.6), transparent)' }} />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-heading uppercase tracking-[0.2em] mb-4">Simple Process</span>
            <h2 className="font-heading text-4xl md:text-5xl uppercase tracking-[0.1em] text-foreground mb-3">
              How It <span className="text-gradient-gold">Works</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { step: '01', icon: '📝', title: 'Register & Choose Role', desc: 'Sign up as an Organizer, Team Owner, or Viewer. Each role unlocks a different experience.' },
              { step: '02', icon: '🏏', title: 'Create or Join Auction', desc: 'Organizers create auctions with players & teams. Team owners join using a 6-character code.' },
              { step: '03', icon: '🔴', title: 'Bid Live', desc: 'When the auction goes live, team owners bid in real time with countdown timers and instant updates.' },
              { step: '04', icon: '🏆', title: 'Build Your Squad', desc: 'Win players, use RTM cards, manage your purse and build the ultimate cricket squad.' },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-glass-premium rounded-xl p-6 border-gold-subtle flex gap-5 hover:border-gold transition-all duration-300">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="font-heading text-primary text-sm font-bold">{s.step}</span>
                  </div>
                </div>
                <div>
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-1">{s.title}</h3>
                  <p className="font-display text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden text-center p-12 md:p-16"
            style={{ background: 'linear-gradient(135deg, hsla(222,40%,12%,0.9), hsla(222,47%,8%,0.95))', border: '1px solid hsla(45,100%,51%,0.2)', boxShadow: '0 0 80px hsla(45,100%,51%,0.08)' }}>
            {/* Glow orbs */}
            <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, hsla(45,100%,51%,0.08), transparent 70%)', filter: 'blur(40px)' }} />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, hsla(45,100%,51%,0.06), transparent 70%)', filter: 'blur(40px)' }} />
            <div className="relative z-10">
              <div className="text-5xl mb-6">🏏</div>
              <h2 className="font-heading text-4xl md:text-5xl uppercase tracking-[0.1em] text-foreground mb-4">
                Ready to <span className="text-gradient-gold">Auction?</span>
              </h2>
              <p className="font-display text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Join thousands of cricket fans running their own IPL-style auctions. Free to start, no credit card required.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/register"
                  className="px-10 py-4 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.03] active:scale-95 transition-all">
                  🚀 Start for Free
                </Link>
                <Link href="/auctions"
                  className="px-10 py-4 rounded-xl border border-primary/40 text-primary font-heading uppercase tracking-wider text-sm hover:bg-primary/10 transition-all">
                  Browse Auctions
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/40 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BeastLogo size={32} />
            <span className="font-heading text-sm uppercase tracking-[0.2em] text-gradient-gold">Beast Cricket Auction</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auctions" className="text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">Auctions</Link>
            <Link href="/login" className="text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">Login</Link>
            <Link href="/register" className="text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">Register</Link>
          </div>
          <p className="font-display text-xs text-muted-foreground">© {new Date().getFullYear()} Beast Cricket Auction. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
