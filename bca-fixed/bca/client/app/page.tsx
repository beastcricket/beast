'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth, getRoleRedirect } from '@/hooks/useAuth';
import BeastLogo from '@/components/beast/BeastLogo';
import GoldParticles from '@/components/beast/GoldParticles';
import FireSparkles from '@/components/beast/FireSparkles';
import { format } from 'date-fns';
import { Mail, Instagram, ShoppingCart } from "lucide-react"; // ✅ icons

export default function HomePage() {
  const { user, loading } = useAuth();
  const [auctions, setAuctions] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/auctions')
      .then(r => setAuctions((r.data.auctions || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && user) {
      window.location.href = getRoleRedirect(user.role || '');
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* HERO */}
      <div className="relative min-h-screen flex flex-col overflow-hidden">

        {/* BACKGROUND */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: "url('/stadium-bg.jpg')" }}
        />

        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.4), rgba(0,0,0,0.9))' }}/>

        <GoldParticles/>
        <FireSparkles/>

        {/* NAV */}
        <nav className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <BeastLogo size={40} href="/"/>
            <span className="text-white font-bold">Beast Cricket</span>
          </div>

          <div className="flex gap-4 items-center">

            <Link href="/auctions" className="text-white">Auctions</Link>

            {/* SHOP IN NAV (BONUS) */}
            <a
              href="https://beastcricket.com/"
              target="_blank"
              className="text-yellow-400 font-semibold"
            >
              Shop
            </a>

            {user ? (
              <Link href={getRoleRedirect(user.role || '')} className="text-white">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-white">Login</Link>
                <Link href="/register" className="text-white">Register</Link>
              </>
            )}
          </div>
        </nav>

        {/* HERO CONTENT */}
        <div className="flex-1 flex items-center justify-center text-center text-white px-4">
          <div>
            <h1 className="text-5xl md:text-6xl mb-4 font-bold">
              Beast Cricket Auction
            </h1>
            <p className="mb-6 text-lg">
              IPL-style live auction platform
            </p>
            <Link href="/register" className="bg-yellow-500 px-8 py-3 rounded text-black font-semibold">
              Get Started
            </Link>
          </div>
        </div>
      </div>

      {/* AUCTIONS */}
      <div className="p-6 max-w-6xl mx-auto">
        <h2 className="text-2xl mb-4 text-white">Live Auctions</h2>

        <div className="grid md:grid-cols-3 gap-4">
          {auctions.map(a => (
            <div key={a._id} className="bg-gray-800 p-4 rounded text-white">
              <h3 className="font-semibold">{a.name}</h3>
              <p className="text-sm text-gray-400">
                {a.date && format(new Date(a.date), 'dd MMM yyyy')}
              </p>
              <Link href={`/auctions/${a._id}`} className="text-blue-400">
                View
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-gray-700 py-8 px-6 text-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">

          {/* LEFT */}
          <div className="flex items-center gap-3">
            <BeastLogo size={28} href="/"/>
            <span className="text-sm">Beast Cricket Auction</span>
          </div>

          {/* CENTER */}
          <div className="flex gap-6 text-sm">
            <Link href="/auctions">Auctions</Link>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </div>

          {/* RIGHT ICONS */}
          <div className="flex items-center gap-5">

            {/* EMAIL */}
            <a href="mailto:beastcricketofficialauction@gmail.com" title="Email">
              <Mail size={20} />
            </a>

            {/* INSTAGRAM */}
            <a href="https://instagram.com/beastcricketofficial" target="_blank" title="Instagram">
              <Instagram size={20} />
            </a>

            {/* SHOP */}
            <a href="https://beastcricket.com/" target="_blank" title="Shop">
              <ShoppingCart size={20} />
            </a>

          </div>
        </div>

        <p className="text-center text-xs mt-4 text-gray-400">
          © {new Date().getFullYear()} Beast Cricket Auction.
        </p>
      </footer>

    </div>
  );
}
