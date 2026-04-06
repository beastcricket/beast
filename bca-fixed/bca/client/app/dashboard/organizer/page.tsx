'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';

export default function OrganizerDashboard() {

  const [auctions, setAuctions] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  // ✅ SIMPLE AUTH CHECK (NO AuthGuard)
  useEffect(() => {
    const token = localStorage.getItem('bca_token');

    if (!token) {
      window.location.href = '/login';
    }
  }, []);

  // ✅ LOAD AUCTIONS
  useEffect(() => {
    const fetch = async () => {
      try {
        const r = await api.get('/auctions/my');
        console.log("AUCTIONS:", r.data);

        setAuctions(r.data.auctions || []);
        if (r.data.auctions?.length) setSel(r.data.auctions[0]);
      } catch (e) {
        console.log("ERROR:", e);
      }
    };

    fetch();
  }, []);

  // ✅ LOAD PLAYERS + TEAMS
  useEffect(() => {
    if (!sel?._id) return;

    const load = async () => {
      try {
        const p = await api.get(`/auctions/${sel._id}/players`);
        const t = await api.get(`/auctions/${sel._id}/teams`);

        setPlayers(p.data.players || []);
        setTeams(t.data.teams || []);
      } catch (e) {
        console.log(e);
      }
    };

    load();
  }, [sel]);

  return (
    <div className="min-h-screen bg-black text-white p-6">

      <h1 className="text-2xl mb-4">Organizer Dashboard</h1>

      {/* Auctions */}
      <h2 className="mb-2">My Auctions</h2>
      <div className="grid grid-cols-3 gap-4">
        {auctions.map(a => (
          <div
            key={a._id}
            onClick={() => setSel(a)}
            className="bg-gray-800 p-4 rounded cursor-pointer"
          >
            <h3>{a.name}</h3>
            <p>{format(new Date(a.date), 'dd MMM yyyy')}</p>
          </div>
        ))}
      </div>

      {/* Players */}
      {sel && (
        <>
          <h2 className="mt-6">Players</h2>
          <div className="grid grid-cols-4 gap-3">
            {players.map(p => (
              <div key={p._id} className="bg-gray-800 p-2 rounded">
                {p.name}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Teams */}
      {sel && (
        <>
          <h2 className="mt-6">Teams</h2>
          <div className="grid grid-cols-4 gap-3">
            {teams.map(t => (
              <div key={t._id} className="bg-gray-800 p-2 rounded">
                {t.name}
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
