'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import api, { getToken } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { fmt, roleColors, categoryColors, roleIcons } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ❌ REMOVED AuthGuard & useAuth (causing redirect loop)

export default function OrganizerDashboard() {

  // ✅ MANUAL AUTH FIX
  useEffect(() => {
    const token = localStorage.getItem('bca_token');
    const role = localStorage.getItem('role');

    console.log("TOKEN:", token);
    console.log("ROLE:", role);

    if (!token) {
      window.location.href = '/login';
      return;
    }

    if (role !== 'organizer' && role !== 'admin') {
      window.location.href = '/login';
    }
  }, []);

  const [auctions, setAuctions] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAuctions = async () => {
    try {
      const r = await api.get('/auctions/my');
      setAuctions(r.data.auctions);
      if (r.data.auctions.length && !sel) setSel(r.data.auctions[0]);
    } catch {}
  };

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchPlayers = async () => {
    if (!sel?._id) return;
    try {
      const r = await api.get(`/auctions/${sel._id}/players`);
      setPlayers(r.data.players);
    } catch {}
  };

  const fetchTeams = async () => {
    if (!sel?._id) return;
    try {
      const r = await api.get(`/auctions/${sel._id}/teams`);
      setTeams(r.data.teams);
    } catch {}
  };

  useEffect(() => {
    if (sel) {
      fetchPlayers();
      fetchTeams();
    }
  }, [sel?._id]);

  return (
    <div className="min-h-screen bg-background relative">

      {/* Background */}
      <div className="fixed inset-0" style={{
        backgroundImage: "url('/bg-organizer.png')",
        backgroundSize: "cover"
      }}/>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-sm bg-black/70">
        <div className="max-w-7xl mx-auto px-7 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Organizer Dashboard</h1>

          <button
            onClick={() => {
              localStorage.removeItem('bca_token');
              localStorage.removeItem('role');
              window.location.href = '/login';
            }}
            className="text-red-400"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-7 py-6">

        {/* Auctions */}
        <h2 className="text-xl mb-4 text-white">My Auctions</h2>

        <div className="grid grid-cols-3 gap-4">
          {auctions.map(a => (
            <div key={a._id}
              onClick={() => setSel(a)}
              className="bg-black/60 p-4 rounded cursor-pointer"
            >
              <h3 className="text-white">{a.name}</h3>
              <p className="text-gray-400 text-sm">
                {format(new Date(a.date), 'dd MMM yyyy')}
              </p>
            </div>
          ))}
        </div>

        {/* Players */}
        {sel && (
          <>
            <h2 className="text-xl mt-6 text-white">Players</h2>
            <div className="grid grid-cols-4 gap-3">
              {players.map(p => (
                <div key={p._id} className="bg-black/60 p-3 rounded">
                  <p className="text-white">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.role}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Teams */}
        {sel && (
          <>
            <h2 className="text-xl mt-6 text-white">Teams</h2>
            <div className="grid grid-cols-4 gap-3">
              {teams.map(t => (
                <div key={t._id} className="bg-black/60 p-3 rounded">
                  <p className="text-white">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.ownerName}</p>
                </div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
