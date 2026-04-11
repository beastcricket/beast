'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

export default function OrganizerDashboard() {

  const { user, loading } = useAuth();

  const [auctions, setAuctions] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);

  // ✅ redirect safely
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  // ✅ fetch auctions
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        const res = await api.get('/auctions/my');
        console.log("AUCTIONS:", res.data);

        const list = res.data?.auctions || [];
        setAuctions(list);

        if (list.length > 0) setSel(list[0]);

      } catch (err) {
        console.log("ERROR:", err);
      }
    };

    load();
  }, [user]);

  if (loading || !user) {
    return <div className="text-white p-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">

      <h1 className="text-2xl mb-6">Organizer Dashboard</h1>

      {/* EMPTY STATE */}
      {auctions.length === 0 ? (
        <div className="bg-gray-800 p-6 rounded text-center">
          <p className="mb-4">No auctions found</p>

          <button
            className="bg-blue-500 px-4 py-2 rounded"
            onClick={() => alert('Create Auction')}
          >
            + Create Auction
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {auctions.map(a => (
            <div
              key={a._id}
              onClick={() => setSel(a)}
              className="bg-gray-800 p-4 rounded cursor-pointer"
            >
              <h3>{a.name}</h3>
              <p className="text-sm text-gray-400">
                {format(new Date(a.date), 'dd MMM yyyy')}
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
