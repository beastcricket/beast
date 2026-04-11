'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function HomePage() {

  const { user, loading } = useAuth();

  if (loading) {
    return <div className="text-white p-10">Loading...</div>;
  }

  // ✅ Organizer / Admin
  if (user?.role === 'organizer' || user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">

        <h1 className="text-3xl mb-6">Welcome {user.name}</h1>

        <Link
          href="/dashboard/organizer"
          className="bg-yellow-500 px-6 py-3 rounded"
        >
          Go to Organizer Dashboard
        </Link>

      </div>
    );
  }

  // ✅ Team Owner
  if (user?.role === 'team_owner') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">

        <h1 className="text-3xl mb-6">Welcome {user.name}</h1>

        <Link
          href="/dashboard/team-owner"
          className="bg-blue-500 px-6 py-3 rounded"
        >
          Go to Team Dashboard
        </Link>

      </div>
    );
  }

  // ✅ Viewer
  if (user?.role === 'viewer') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">

        <h1 className="text-3xl mb-6">Welcome Viewer</h1>

        <Link
          href="/auctions"
          className="bg-green-500 px-6 py-3 rounded"
        >
          View Auctions
        </Link>

      </div>
    );
  }

  // ✅ Public
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">

      <h1 className="text-4xl mb-6">Beast Cricket Auction</h1>

      <div className="flex gap-4">
        <Link href="/login" className="bg-yellow-500 px-6 py-3 rounded">
          Login
        </Link>

        <Link href="/register" className="bg-blue-500 px-6 py-3 rounded">
          Register
        </Link>
      </div>

    </div>
  );
}
