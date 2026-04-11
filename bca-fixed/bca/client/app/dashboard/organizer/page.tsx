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

  // ✅ SAFE REDIRECT
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  // ✅ FETCH AUCTIONS
  useEffect(() => {
    if (!user) return;

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
  }, [user]);

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

  // ✅ LOADING STATE
  if (loading || !user) {
    return <div className="text-white p-10">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">

      <h1 className="text-2xl mb-6 font-bold">
        Organizer Dashboard
      </h1>

      {/* AUCTIONS */}
      <h2 className="mb-3 text-lg">My Auctions</h2>

      {/* 🔥 EMPTY STATE FIX */}
      {auctions.length === 0 ? (
        <div className="bg-gray-800 p-6 rounded text-center mb-6">
          <p className="mb-4 text-gray-300">No auctions found</p>

          <button
            className="bg-blue-500 px-5 py-2 rounded hover:bg-blue-600"
            onClick={() => alert("Create Auction feature")}
          >
            + Create Auction
          </button>
        </div>
      ) : (
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
      )}

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
