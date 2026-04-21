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
import { Mail, Instagram, ShoppingCart } from "lucide-react"; // ✅ ONLY ADDITION

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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ===== EVERYTHING ABOVE IS SAME (NO CHANGE) ===== */}

      {/* ── FOOTER (ONLY THIS PART UPDATED) ── */}
      <footer className="border-t border-border/30 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

          {/* LEFT (UNCHANGED) */}
          <div className="flex items-center gap-3">
            <BeastLogo size={28} href="/"/>
            <span className="font-heading text-sm uppercase tracking-[0.15em] text-gradient-gold">
              Beast Cricket Auction
            </span>
          </div>

          {/* CENTER (UNCHANGED) */}
          <div className="flex items-center gap-6 text-xs font-heading uppercase tracking-wider text-muted-foreground">
            <Link href="/auctions" className="hover:text-primary transition-colors">Auctions</Link>
            <Link href="/login" className="hover:text-primary transition-colors">Login</Link>
            <Link href="/register" className="hover:text-primary transition-colors">Register</Link>
          </div>

          {/* RIGHT (NEW ICONS ONLY) */}
          <div className="flex items-center gap-5">

            <a
              href="mailto:beastcricketofficialauction@gmail.com"
              title="Email"
              className="text-muted-foreground hover:text-primary transition"
            >
              <Mail size={18} />
            </a>

            <a
              href="https://instagram.com/beastcricketofficial"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram"
              className="text-muted-foreground hover:text-primary transition"
            >
              <Instagram size={18} />
            </a>

            <a
              href="https://beastcricket.com/"
              target="_blank"
              rel="noopener noreferrer"
              title="Shop"
              className="text-muted-foreground hover:text-primary transition"
            >
              <ShoppingCart size={18} />
            </a>

          </div>
        </div>

        {/* COPYRIGHT (UNCHANGED) */}
        <p className="text-center font-display text-muted-foreground text-xs mt-4">
          © {new Date().getFullYear()} Beast Cricket Auction.
        </p>
      </footer>

    </div>
  );
}
