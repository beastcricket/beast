'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export default function OrganizerDashboard() {

  const { user, loading } = useAuth();

  const [auctions, setAuctions] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  // ✅ AUTH HANDLING
  if (loading) {
    return <div className="text-white p-10">Loading...</div>;
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  // ✅ FETCH AUCTIONS
  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const res = await api.get('/auctions/my');
        console.log("AUCTIONS:", res.data);

        const list = res.data.auctions || [];

        setAuctions(list);

        if (list.length > 0) {
          setSel(list[0]);
        }

      } catch (err) {
        console.log("AUCTION ERROR:", err);
      }
    };

    fetchAuctions();
  }, []);

  // ✅ FETCH PLAYERS + TEAMS
  useEffect(() => {
    if (!sel?._id) return;

    const fetchData = async () => {
      try {
        const p = await api.get(`/auctions/${sel._id}/players`);
        const t = await api.get(`/auctions/${sel._id}/teams`);

        setPlayers(p.data.players || []);
        setTeams(t.data.teams || []);

      } catch (err) {
        console.log("DETAIL ERROR:", err);
      }
    };

    fetchData();
  }, [sel]);

  return (
    <div className="min-h-screen bg-black text-white p-6">

      <h1 className="text-2xl mb-6 font-bold">
        Organizer Dashboard
      </h1>

      {/* AUCTIONS */}
      <h2 className="mb-3 text-lg">My Auctions</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {auctions.map(a => (
          <div
            key={a._id}
            onClick={() => setSel(a)}
            className="bg-gray-800 p-4 rounded cursor-pointer hover:bg-gray-700"
          >
            <h3 className="font-semibold">{a.name}</h3>
            <p className="text-sm text-gray-400">
              {format(new Date(a.date), 'dd MMM yyyy')}
            </p>
          </div>
        ))}
      </div>

      {/* PLAYERS */}
      {sel && (
        <>
          <h2 className="text-lg mb-2">Players</h2>
          <div className="grid grid-cols-4 gap-3 mb-6">
            {players.map(p => (
              <div key={p._id} className="bg-gray-800 p-3 rounded">
                <p>{p.name}</p>
                <p className="text-xs text-gray-400">{p.role}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* TEAMS */}
      {sel && (
        <>
          <h2 className="text-lg mb-2">Teams</h2>
          <div className="grid grid-cols-4 gap-3">
            {teams.map(t => (
              <div key={t._id} className="bg-gray-800 p-3 rounded">
                <p>{t.name}</p>
                <p className="text-xs text-gray-400">{t.ownerName}</p>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}
