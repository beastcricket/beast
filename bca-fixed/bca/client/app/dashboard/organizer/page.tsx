'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import { fmt, roleColors, categoryColors, roleIcons } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Auction {
  _id: string;
  name: string;
  date: string;
  description?: string;
  status: 'upcoming' | 'live' | 'completed';
  bidTimer?: number;
  bidIncrement?: number;
  pursePerTeam?: number;
  maxTeams?: number;
  rtmEnabled?: boolean;
  rtmCount?: number;
  joinCode?: string;
}

interface Player {
  _id: string;
  name: string;
  role: string;
  category: string;
  basePrice: number;
  photo?: string;
  sold?: boolean;
  soldPrice?: number;
  currentBid?: number;
  status?: string;
  team?: { _id: string; name: string; shortName: string; primaryColor?: string } | null;
}

interface Team {
  _id: string;
  name: string;
  shortName: string;
  ownerName?: string;
  city?: string;
  primaryColor?: string;
  logo?: string;
  purse?: number;
  rtmRemaining?: number;
  players?: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  upcoming:  { label: 'Upcoming',  color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30',  dot: 'bg-amber-400' },
  live:      { label: 'LIVE',      color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',  dot: 'bg-green-400' },
  completed: { label: 'Completed', color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/30',  dot: 'bg-slate-400' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.upcoming;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-widest border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'live' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function EmptyState({ icon, title, subtitle, action }: { icon: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-1">{title}</h3>
      <p className="font-display text-muted-foreground text-sm mb-5">{subtitle}</p>
      {action}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrganizerDashboard() {
  const { user, logout } = useAuth();

  // Data state
  const [auctions, setAuctions]   = useState<Auction[]>([]);
  const [selAuction, setSelAuction] = useState<Auction | null>(null);
  const [players, setPlayers]     = useState<Player[]>([]);
  const [teams, setTeams]         = useState<Team[]>([]);

  // Loading / error state
  const [loadingAuctions, setLoadingAuctions] = useState(true);
  const [loadingDetails,  setLoadingDetails]  = useState(false);
  const [auctionError,    setAuctionError]    = useState('');
  const [detailError,     setDetailError]     = useState('');

  // Modal / form state
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [showEditAuction,   setShowEditAuction]   = useState(false);
  const [showAddPlayer,     setShowAddPlayer]     = useState(false);
  const [showAddTeam,       setShowAddTeam]       = useState(false);
  const [editAuctionData,   setEditAuctionData]   = useState<Auction | null>(null);

  // Auction form
  const [af, setAf] = useState({
    name: '', date: '', description: '',
    bidTimer: '30', bidIncrement: '100000',
    pursePerTeam: '10000000', maxTeams: '8',
    rtmEnabled: false, rtmCount: '2',
  });

  // Player form
  const [pf, setPf] = useState({
    name: '', role: 'Batsman', category: 'Gold',
    basePrice: '500000', country: 'India',
  });
  const [playerPhoto, setPlayerPhoto] = useState<File | null>(null);

  // Team form
  const [tf, setTf] = useState({
    name: '', shortName: '', ownerName: '', city: '',
    primaryColor: '#f59e0b', purse: '',
  });
  const [teamLogo, setTeamLogo] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // ── Fetch auctions ──────────────────────────────────────────────────────────
  const fetchAuctions = useCallback(async () => {
    setLoadingAuctions(true);
    setAuctionError('');
    try {
      const res = await api.get('/auctions/my');
      const list: Auction[] = res.data.auctions || [];
      setAuctions(list);
      if (list.length > 0 && !selAuction) {
        setSelAuction(list[0]);
      }
    } catch (err: any) {
      setAuctionError(err?.response?.data?.error || 'Failed to load auctions');
    } finally {
      setLoadingAuctions(false);
    }
  }, [selAuction]);

  // ── Fetch players + teams for selected auction ──────────────────────────────
  const fetchDetails = useCallback(async (auctionId: string) => {
    setLoadingDetails(true);
    setDetailError('');
    try {
      const [pRes, tRes] = await Promise.all([
        api.get(`/auctions/${auctionId}/players`),
        api.get(`/auctions/${auctionId}/teams`),
      ]);
      setPlayers(pRes.data.players || []);
      setTeams(tRes.data.teams || []);
    } catch (err: any) {
      setDetailError(err?.response?.data?.error || 'Failed to load auction details');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => { fetchAuctions(); }, []);
  useEffect(() => {
    if (selAuction?._id) fetchDetails(selAuction._id);
    else { setPlayers([]); setTeams([]); }
  }, [selAuction?._id]);

  // ── Create auction ──────────────────────────────────────────────────────────
  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!af.name || !af.date) return toast.error('Name and date are required');
    setSubmitting(true);
    try {
      await api.post('/auctions', {
        name: af.name,
        date: af.date,
        description: af.description,
        bidTimer: Number(af.bidTimer),
        bidIncrement: Number(af.bidIncrement),
        pursePerTeam: Number(af.pursePerTeam),
        maxTeams: Number(af.maxTeams),
        rtmEnabled: af.rtmEnabled,
        rtmCount: Number(af.rtmCount),
      });
      toast.success('🏏 Auction created!');
      setShowCreateAuction(false);
      setAf({ name: '', date: '', description: '', bidTimer: '30', bidIncrement: '100000', pursePerTeam: '10000000', maxTeams: '8', rtmEnabled: false, rtmCount: '2' });
      await fetchAuctions();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to create auction');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit auction ────────────────────────────────────────────────────────────
  const openEditAuction = (auction: Auction) => {
    setEditAuctionData(auction);
    setAf({
      name: auction.name,
      date: auction.date ? auction.date.slice(0, 10) : '',
      description: auction.description || '',
      bidTimer: String(auction.bidTimer ?? 30),
      bidIncrement: String(auction.bidIncrement ?? 100000),
      pursePerTeam: String(auction.pursePerTeam ?? 10000000),
      maxTeams: String(auction.maxTeams ?? 8),
      rtmEnabled: auction.rtmEnabled ?? false,
      rtmCount: String(auction.rtmCount ?? 2),
    });
    setShowEditAuction(true);
  };

  const handleEditAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAuctionData) return;
    setSubmitting(true);
    try {
      await api.put(`/auctions/${editAuctionData._id}`, {
        name: af.name,
        date: af.date,
        description: af.description,
        bidTimer: Number(af.bidTimer),
        bidIncrement: Number(af.bidIncrement),
        pursePerTeam: Number(af.pursePerTeam),
        maxTeams: Number(af.maxTeams),
        rtmEnabled: af.rtmEnabled,
        rtmCount: Number(af.rtmCount),
      });
      toast.success('✅ Auction updated!');
      setShowEditAuction(false);
      setEditAuctionData(null);
      await fetchAuctions();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update auction');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete auction ──────────────────────────────────────────────────────────
  const handleDeleteAuction = async (auction: Auction) => {
    if (!confirm(`Delete "${auction.name}" and ALL its data? This cannot be undone.`)) return;
    try {
      await api.delete(`/auctions/${auction._id}`);
      toast.success('Auction deleted');
      if (selAuction?._id === auction._id) setSelAuction(null);
      await fetchAuctions();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete auction');
    }
  };

  // ── Add player ──────────────────────────────────────────────────────────────
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selAuction) return;
    if (!pf.name) return toast.error('Player name is required');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', pf.name);
      fd.append('role', pf.role);
      fd.append('category', pf.category);
      fd.append('basePrice', pf.basePrice);
      fd.append('country', pf.country);
      if (playerPhoto) fd.append('photo', playerPhoto);
      await api.post(`/auctions/${selAuction._id}/players`, fd);
      toast.success('👤 Player added!');
      setShowAddPlayer(false);
      setPf({ name: '', role: 'Batsman', category: 'Gold', basePrice: '500000', country: 'India' });
      setPlayerPhoto(null);
      await fetchDetails(selAuction._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add player');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete player ───────────────────────────────────────────────────────────
  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!selAuction) return;
    if (!confirm(`Remove "${playerName}" from this auction?`)) return;
    try {
      await api.delete(`/auctions/${selAuction._id}/players/${playerId}`);
      toast.success('Player removed');
      await fetchDetails(selAuction._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to remove player');
    }
  };

  // ── Add team ────────────────────────────────────────────────────────────────
  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selAuction) return;
    if (!tf.name || !tf.shortName) return toast.error('Team name and short name are required');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', tf.name);
      fd.append('shortName', tf.shortName);
      fd.append('ownerName', tf.ownerName);
      fd.append('city', tf.city);
      fd.append('primaryColor', tf.primaryColor);
      if (tf.purse) fd.append('purse', tf.purse);
      if (teamLogo) fd.append('logo', teamLogo);
      await api.post(`/auctions/${selAuction._id}/teams`, fd);
      toast.success('🏆 Team added!');
      setShowAddTeam(false);
      setTf({ name: '', shortName: '', ownerName: '', city: '', primaryColor: '#f59e0b', purse: '' });
      setTeamLogo(null);
      await fetchDetails(selAuction._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to add team');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete team ─────────────────────────────────────────────────────────────
  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!selAuction) return;
    if (!confirm(`Remove "${teamName}" from this auction?`)) return;
    try {
      await api.delete(`/auctions/${selAuction._id}/teams/${teamId}`);
      toast.success('Team removed');
      await fetchDetails(selAuction._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to remove team');
    }
  };

  // ── Shared form field styles ────────────────────────────────────────────────
  const INP = 'input-beast text-sm';
  const LBL = 'block text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-1.5';
  const SEL = `${INP} cursor-pointer`;

  // ── Modal wrapper ───────────────────────────────────────────────────────────
  function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(4,4,10,0.85)', backdropFilter: 'blur(8px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-glass-premium border-gold-glow rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-5 border-b border-border/40">
            <h2 className="font-heading text-xl uppercase tracking-wider text-foreground">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all text-lg">✕</button>
          </div>
          <div className="p-5">{children}</div>
        </motion.div>
      </div>
    );
  }

  // ── Auction form fields (shared between create + edit) ──────────────────────
  function AuctionFormFields() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={LBL}>Auction Name *</label>
            <input className={INP} placeholder="e.g. BCA Premier League 2025" value={af.name} onChange={e => setAf(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className={LBL}>Date *</label>
            <input type="date" className={INP} value={af.date} onChange={e => setAf(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <label className={LBL}>Max Teams</label>
            <input type="number" className={INP} placeholder="8" value={af.maxTeams} onChange={e => setAf(p => ({ ...p, maxTeams: e.target.value }))} />
          </div>
          <div>
            <label className={LBL}>Bid Timer (seconds)</label>
            <input type="number" className={INP} placeholder="30" value={af.bidTimer} onChange={e => setAf(p => ({ ...p, bidTimer: e.target.value }))} />
          </div>
          <div>
            <label className={LBL}>Bid Increment (₹)</label>
            <input type="number" className={INP} placeholder="100000" value={af.bidIncrement} onChange={e => setAf(p => ({ ...p, bidIncrement: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className={LBL}>Purse Per Team (₹)</label>
            <input type="number" className={INP} placeholder="10000000" value={af.pursePerTeam} onChange={e => setAf(p => ({ ...p, pursePerTeam: e.target.value }))} />
          </div>
          <div className="col-span-2">
            <label className={LBL}>Description</label>
            <textarea className={`${INP} resize-none`} rows={3} placeholder="Optional description..." value={af.description} onChange={e => setAf(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <button type="button" onClick={() => setAf(p => ({ ...p, rtmEnabled: !p.rtmEnabled }))}
              className={`w-10 h-5 rounded-full transition-all relative ${af.rtmEnabled ? 'bg-primary' : 'bg-secondary'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${af.rtmEnabled ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-sm font-display text-foreground">RTM Enabled</span>
            {af.rtmEnabled && (
              <input type="number" className={`${INP} w-20`} placeholder="2" value={af.rtmCount} onChange={e => setAf(p => ({ ...p, rtmCount: e.target.value }))} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <AuthGuard roles={['organizer']}>
      <div className="min-h-screen" style={{ background: 'hsl(222 47% 4%)' }}>

        {/* Background texture */}
        <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "url('/bg-organizer.png')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.04 }} />
        <div className="fixed inset-0 pointer-events-none" style={{ background: 'hsl(222 47% 4% / 0.94)' }} />

        <div className="relative">

          {/* ── TOP NAV ─────────────────────────────────────────────────────── */}
          <header className="sticky top-0 z-30 border-b border-border/40" style={{ background: 'hsla(222,42%,6%,0.95)', backdropFilter: 'blur(20px)' }}>
            <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/beast-logo.png" alt="Beast Cricket" className="w-8 h-8 object-contain" />
                <div>
                  <div className="font-heading text-xs uppercase tracking-widest text-primary">Organizer</div>
                  <div className="font-display text-[10px] text-muted-foreground">Control Center</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="font-display text-sm font-semibold text-foreground">{user?.name}</div>
                  <div className="font-display text-[10px] text-muted-foreground">{user?.email}</div>
                </div>
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-black font-bold font-heading text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <button onClick={logout} className="px-3 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-red-400 hover:bg-red-400/8 border border-border/40 transition-all">
                  Sign Out
                </button>
              </div>
            </div>
          </header>

          <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-10">

            {/* ── HERO / STATS HEADER ─────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="font-heading text-4xl md:text-5xl uppercase tracking-[0.08em] text-foreground">
                  Welcome back, <span className="text-gradient-gold">{user?.name?.split(' ')[0]}</span>
                </h1>
                <p className="font-display text-muted-foreground mt-1">Manage your auctions, players, and teams from one place.</p>
              </div>

              {/* Quick stats */}
              <div className="flex gap-4 flex-wrap">
                {[
                  { label: 'Auctions', value: auctions.length, icon: '🏏', color: 'text-primary' },
                  { label: 'Players',  value: players.length,  icon: '👤', color: 'text-blue-400' },
                  { label: 'Teams',    value: teams.length,    icon: '🏆', color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="bg-glass-navy rounded-xl px-5 py-3 border border-border/40 text-center min-w-[90px]">
                    <div className="text-xl mb-0.5">{s.icon}</div>
                    <div className={`font-heading text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[9px] font-heading uppercase tracking-widest text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* ── AUCTIONS SECTION ────────────────────────────────────────── */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground">My <span className="text-gradient-gold">Auctions</span></h2>
                  <p className="font-display text-muted-foreground text-sm">{auctions.length} auction{auctions.length !== 1 ? 's' : ''} found</p>
                </div>
                <button
                  onClick={() => setShowCreateAuction(true)}
                  className="btn-beast flex items-center gap-2 px-5 py-2.5 text-sm"
                  style={{ background: 'linear-gradient(135deg, hsl(45,100%,51%), hsl(40,100%,38%))', color: 'hsl(222,47%,6%)' }}
                >
                  <span className="text-base">＋</span> Create Auction
                </button>
              </div>

              {loadingAuctions ? (
                <Spinner />
              ) : auctionError ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                  <p className="text-red-400 font-display">{auctionError}</p>
                  <button onClick={fetchAuctions} className="mt-3 px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-wider text-primary border border-primary/30 hover:bg-primary/10 transition-all">Retry</button>
                </div>
              ) : auctions.length === 0 ? (
                <div className="bg-glass-premium border-gold-subtle rounded-2xl">
                  <EmptyState
                    icon="🏏"
                    title="No Auctions Yet"
                    subtitle="Create your first auction to get started"
                    action={
                      <button onClick={() => setShowCreateAuction(true)} className="btn-beast px-6 py-2.5 text-sm" style={{ background: 'linear-gradient(135deg, hsl(45,100%,51%), hsl(40,100%,38%))', color: 'hsl(222,47%,6%)' }}>
                        Create Your First Auction
                      </button>
                    }
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {auctions.map((auction, i) => (
                    <motion.div
                      key={auction._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelAuction(auction)}
                      className={`group relative bg-glass-premium rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                        selAuction?._id === auction._id
                          ? 'border-gold-glow glow-gold'
                          : 'border-gold-subtle hover:border-gold'
                      }`}
                    >
                      {/* Selected indicator */}
                      {selAuction?._id === auction._id && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}

                      <div className="flex items-start justify-between mb-3">
                        <StatusBadge status={auction.status || 'upcoming'} />
                        {auction.joinCode && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-secondary/30 px-2 py-0.5 rounded">
                            #{auction.joinCode}
                          </span>
                        )}
                      </div>

                      <h3 className="font-heading text-xl uppercase tracking-wide text-foreground mb-1 group-hover:text-primary transition-colors line-clamp-1">
                        {auction.name}
                      </h3>
                      <p className="font-display text-muted-foreground text-sm mb-4">
                        📅 {auction.date ? format(new Date(auction.date), 'dd MMM yyyy') : '—'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-secondary/20 rounded-lg px-3 py-2 text-center">
                          <div className="font-heading text-lg text-blue-400">{players.length > 0 && selAuction?._id === auction._id ? players.length : '—'}</div>
                          <div className="text-[9px] font-heading uppercase tracking-widest text-muted-foreground">Players</div>
                        </div>
                        <div className="bg-secondary/20 rounded-lg px-3 py-2 text-center">
                          <div className="font-heading text-lg text-emerald-400">{teams.length > 0 && selAuction?._id === auction._id ? teams.length : '—'}</div>
                          <div className="text-[9px] font-heading uppercase tracking-widest text-muted-foreground">Teams</div>
                        </div>
                      </div>

                      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => openEditAuction(auction)}
                          className="flex-1 py-2 rounded-lg text-xs font-heading uppercase tracking-wider border border-primary/30 text-primary hover:bg-primary/10 transition-all"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAuction(auction)}
                          className="flex-1 py-2 rounded-lg text-xs font-heading uppercase tracking-wider border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          🗑 Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>

            {/* ── SELECTED AUCTION DETAILS ─────────────────────────────────── */}
            <AnimatePresence>
              {selAuction && (
                <motion.section
                  key={selAuction._id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ delay: 0.05 }}
                >
                  {/* Details panel */}
                  <div className="bg-glass-premium border-gold-glow rounded-2xl p-6 mb-8 glow-gold">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <StatusBadge status={selAuction.status || 'upcoming'} />
                          {selAuction.joinCode && (
                            <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                              Join Code: <strong>{selAuction.joinCode}</strong>
                            </span>
                          )}
                        </div>
                        <h2 className="font-heading text-3xl uppercase tracking-wider text-foreground">{selAuction.name}</h2>
                        <p className="font-display text-muted-foreground mt-1">
                          📅 {selAuction.date ? format(new Date(selAuction.date), 'EEEE, dd MMMM yyyy') : '—'}
                        </p>
                        {selAuction.description && (
                          <p className="font-display text-muted-foreground text-sm mt-2 max-w-xl">{selAuction.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openEditAuction(selAuction)} className="px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-wider border border-primary/30 text-primary hover:bg-primary/10 transition-all">
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDeleteAuction(selAuction)} className="px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-wider border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">
                          🗑 Delete
                        </button>
                      </div>
                    </div>

                    {/* Settings grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { label: 'Bid Timer',    value: `${selAuction.bidTimer ?? 30}s`,                icon: '⏱' },
                        { label: 'Bid Increment', value: fmt(selAuction.bidIncrement ?? 100000),        icon: '📈' },
                        { label: 'Purse / Team',  value: fmt(selAuction.pursePerTeam ?? 10000000),      icon: '💰' },
                        { label: 'Max Teams',     value: String(selAuction.maxTeams ?? 8),              icon: '🏆' },
                        { label: 'RTM',           value: selAuction.rtmEnabled ? `${selAuction.rtmCount ?? 2} per team` : 'Disabled', icon: '🎯' },
                        { label: 'Status',        value: selAuction.status ?? 'upcoming',               icon: '📊' },
                      ].map(item => (
                        <div key={item.label} className="bg-secondary/20 rounded-xl p-3 text-center">
                          <div className="text-lg mb-1">{item.icon}</div>
                          <div className="font-heading text-sm text-foreground font-semibold">{item.value}</div>
                          <div className="text-[9px] font-heading uppercase tracking-widest text-muted-foreground mt-0.5">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── PLAYERS SECTION ──────────────────────────────────── */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground">
                          Players <span className="text-gradient-gold">({players.length})</span>
                        </h2>
                        <p className="font-display text-muted-foreground text-sm">Manage players for {selAuction.name}</p>
                      </div>
                      <button
                        onClick={() => setShowAddPlayer(true)}
                        className="btn-beast flex items-center gap-2 px-5 py-2.5 text-sm"
                        style={{ background: 'linear-gradient(135deg, hsl(220,80%,55%), hsl(220,80%,40%))', color: 'white' }}
                      >
                        <span className="text-base">＋</span> Add Player
                      </button>
                    </div>

                    {loadingDetails ? (
                      <Spinner />
                    ) : detailError ? (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
                        <p className="text-red-400 font-display">{detailError}</p>
                      </div>
                    ) : players.length === 0 ? (
                      <div className="bg-glass-navy border border-border/40 rounded-2xl">
                        <EmptyState
                          icon="👤"
                          title="No Players Yet"
                          subtitle="Add players to this auction"
                          action={
                            <button onClick={() => setShowAddPlayer(true)} className="btn-beast px-5 py-2 text-sm" style={{ background: 'linear-gradient(135deg, hsl(220,80%,55%), hsl(220,80%,40%))', color: 'white' }}>
                              Add First Player
                            </button>
                          }
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {players.map((player, i) => {
                          const playerStatus = player.sold ? 'sold' : player.currentBid ? 'in-auction' : 'unsold';
                          const statusCfg = {
                            sold:       { label: 'Sold',       color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30' },
                            'in-auction': { label: 'In Auction', color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/30' },
                            unsold:     { label: 'Unsold',     color: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/30' },
                          }[playerStatus];

                          return (
                            <motion.div
                              key={player._id}
                              initial={{ opacity: 0, y: 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="group bg-glass-premium border-gold-subtle rounded-2xl overflow-hidden hover:border-gold hover:-translate-y-0.5 transition-all duration-200"
                            >
                              {/* Player image */}
                              <div className="relative h-32 bg-secondary/30 flex items-center justify-center overflow-hidden">
                                {player.photo ? (
                                  <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="text-5xl opacity-40">{roleIcons[player.role] || '👤'}</div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                {/* Status badge */}
                                <div className="absolute top-2 left-2">
                                  <span className={`text-[9px] font-heading uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusCfg?.bg} ${statusCfg?.color}`}>
                                    {statusCfg?.label}
                                  </span>
                                </div>
                                {/* Delete button */}
                                <button
                                  onClick={() => handleDeletePlayer(player._id, player.name)}
                                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                                >
                                  ✕
                                </button>
                              </div>

                              <div className="p-3">
                                <h4 className="font-heading text-sm uppercase tracking-wide text-foreground mb-2 truncate">{player.name}</h4>

                                <div className="flex gap-1.5 mb-2 flex-wrap">
                                  <span className={`text-[9px] font-heading uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleColors[player.role] || 'border-slate-500/30 bg-slate-500/10 text-slate-400'}`}>
                                    {roleIcons[player.role]} {player.role}
                                  </span>
                                  <span className={`text-[9px] font-heading uppercase tracking-wider px-2 py-0.5 rounded-full border ${categoryColors[player.category] || 'border-slate-500/30 bg-slate-500/10 text-slate-400'}`}>
                                    {player.category}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-[9px] font-heading uppercase tracking-widest text-muted-foreground">Base Price</div>
                                    <div className="font-heading text-sm text-primary">{fmt(player.basePrice)}</div>
                                  </div>
                                  {player.sold && player.soldPrice && (
                                    <div className="text-right">
                                      <div className="text-[9px] font-heading uppercase tracking-widest text-muted-foreground">Sold For</div>
                                      <div className="font-heading text-sm text-green-400">{fmt(player.soldPrice)}</div>
                                    </div>
                                  )}
                                </div>

                                {player.team && (
                                  <div className="mt-2 flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: player.team.primaryColor || '#888' }} />
                                    <span className="text-[10px] font-display text-muted-foreground truncate">{player.team.shortName || player.team.name}</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── TEAMS SECTION ────────────────────────────────────── */}
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground">
                          Teams <span className="text-gradient-gold">({teams.length})</span>
                        </h2>
                        <p className="font-display text-muted-foreground text-sm">Manage teams for {selAuction.name}</p>
                      </div>
                      <button
                        onClick={() => setShowAddTeam(true)}
                        className="btn-beast flex items-center gap-2 px-5 py-2.5 text-sm"
                        style={{ background: 'linear-gradient(135deg, hsl(150,60%,40%), hsl(150,60%,28%))', color: 'white' }}
                      >
                        <span className="text-base">＋</span> Add Team
                      </button>
                    </div>

                    {loadingDetails ? (
                      <Spinner />
                    ) : teams.length === 0 ? (
                      <div className="bg-glass-navy border border-border/40 rounded-2xl">
                        <EmptyState
                          icon="🏆"
                          title="No Teams Yet"
                          subtitle="Add teams to this auction"
                          action={
                            <button onClick={() => setShowAddTeam(true)} className="btn-beast px-5 py-2 text-sm" style={{ background: 'linear-gradient(135deg, hsl(150,60%,40%), hsl(150,60%,28%))', color: 'white' }}>
                              Add First Team
                            </button>
                          }
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {teams.map((team, i) => (
                          <motion.div
                            key={team._id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="group bg-glass-premium border-gold-subtle rounded-2xl overflow-hidden hover:border-gold hover:-translate-y-0.5 transition-all duration-200"
                          >
                            {/* Team color banner */}
                            <div className="h-2 w-full" style={{ background: team.primaryColor || 'hsl(45,100%,51%)' }} />

                            <div className="p-4">
                              <div className="flex items-start gap-3 mb-3">
                                {/* Logo or initials */}
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-border/40"
                                  style={{ background: team.primaryColor ? `${team.primaryColor}22` : 'hsl(222,30%,16%)' }}>
                                  {team.logo ? (
                                    <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                                  ) : (
                                    <span className="font-heading text-lg font-bold" style={{ color: team.primaryColor || 'hsl(45,100%,51%)' }}>
                                      {team.shortName?.slice(0, 2) || team.name?.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-heading text-sm uppercase tracking-wide text-foreground truncate">{team.name}</h4>
                                  <p className="font-display text-[10px] text-muted-foreground">{team.shortName}</p>
                                </div>
                              </div>

                              <div className="space-y-1.5 mb-3">
                                {team.ownerName && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-display text-muted-foreground">
                                    <span>👤</span> {team.ownerName}
                                  </div>
                                )}
                                {team.city && (
                                  <div className="flex items-center gap-1.5 text-[10px] font-display text-muted-foreground">
                                    <span>📍</span> {team.city}
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-1.5 mb-3">
                                <div className="bg-secondary/20 rounded-lg p-2 text-center">
                                  <div className="font-heading text-xs text-primary">{fmt(team.purse)}</div>
                                  <div className="text-[8px] font-heading uppercase tracking-widest text-muted-foreground">Purse</div>
                                </div>
                                <div className="bg-secondary/20 rounded-lg p-2 text-center">
                                  <div className="font-heading text-xs text-blue-400">{team.players?.length ?? 0}</div>
                                  <div className="text-[8px] font-heading uppercase tracking-widest text-muted-foreground">Players</div>
                                </div>
                                <div className="bg-secondary/20 rounded-lg p-2 text-center">
                                  <div className="font-heading text-xs text-amber-400">{team.rtmRemaining ?? '—'}</div>
                                  <div className="text-[8px] font-heading uppercase tracking-widest text-muted-foreground">RTM</div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteTeam(team._id, team.name)}
                                className="w-full py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider border border-red-500/20 text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                🗑 Remove Team
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Prompt to select an auction if none selected */}
            {!selAuction && !loadingAuctions && auctions.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <div className="text-4xl mb-3">👆</div>
                <p className="font-display text-muted-foreground">Select an auction above to manage its players and teams</p>
              </motion.div>
            )}

          </div>
        </div>

        {/* ── MODALS ──────────────────────────────────────────────────────────── */}
        <AnimatePresence>

          {/* Create Auction Modal */}
          {showCreateAuction && (
            <Modal title="Create New Auction" onClose={() => setShowCreateAuction(false)}>
              <form onSubmit={handleCreateAuction} className="space-y-5">
                <AuctionFormFields />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateAuction(false)} className="flex-1 py-2.5 rounded-lg text-sm font-heading uppercase tracking-wider border border-border/40 text-muted-foreground hover:text-foreground transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 btn-beast py-2.5 text-sm" style={{ background: 'linear-gradient(135deg, hsl(45,100%,51%), hsl(40,100%,38%))', color: 'hsl(222,47%,6%)' }}>
                    {submitting ? 'Creating…' : '🏏 Create Auction'}
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {/* Edit Auction Modal */}
          {showEditAuction && (
            <Modal title="Edit Auction" onClose={() => { setShowEditAuction(false); setEditAuctionData(null); }}>
              <form onSubmit={handleEditAuction} className="space-y-5">
                <AuctionFormFields />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowEditAuction(false); setEditAuctionData(null); }} className="flex-1 py-2.5 rounded-lg text-sm font-heading uppercase tracking-wider border border-border/40 text-muted-foreground hover:text-foreground transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 btn-beast py-2.5 text-sm" style={{ background: 'linear-gradient(135deg, hsl(45,100%,51%), hsl(40,100%,38%))', color: 'hsl(222,47%,6%)' }}>
                    {submitting ? 'Saving…' : '✅ Save Changes'}
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {/* Add Player Modal */}
          {showAddPlayer && (
            <Modal title="Add Player" onClose={() => setShowAddPlayer(false)}>
              <form onSubmit={handleAddPlayer} className="space-y-4">
                <div>
                  <label className={LBL}>Player Name *</label>
                  <input className={INP} placeholder="e.g. Virat Kohli" value={pf.name} onChange={e => setPf(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LBL}>Role</label>
                    <select className={SEL} value={pf.role} onChange={e => setPf(p => ({ ...p, role: e.target.value }))} style={{ background: 'hsl(222 30% 16%)' }}>
                      <option value="Batsman">🏏 Batsman</option>
                      <option value="Bowler">🎯 Bowler</option>
                      <option value="AllRounder">⭐ All-Rounder</option>
                      <option value="WicketKeeper">🧤 Wicket-Keeper</option>
                      <option value="Other">🏅 Other</option>
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>Category</label>
                    <select className={SEL} value={pf.category} onChange={e => setPf(p => ({ ...p, category: e.target.value }))} style={{ background: 'hsl(222 30% 16%)' }}>
                      <option value="Elite">⚡ Elite</option>
                      <option value="Gold">🥇 Gold</option>
                      <option value="Silver">🥈 Silver</option>
                      <option value="Emerging">🌱 Emerging</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LBL}>Base Price (₹)</label>
                    <input type="number" className={INP} placeholder="500000" value={pf.basePrice} onChange={e => setPf(p => ({ ...p, basePrice: e.target.value }))} />
                  </div>
                  <div>
                    <label className={LBL}>Country</label>
                    <input className={INP} placeholder="India" value={pf.country} onChange={e => setPf(p => ({ ...p, country: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className={LBL}>Player Photo (optional)</label>
                  <input type="file" accept="image/*" className={INP} onChange={e => setPlayerPhoto(e.target.files?.[0] || null)} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddPlayer(false)} className="flex-1 py-2.5 rounded-lg text-sm font-heading uppercase tracking-wider border border-border/40 text-muted-foreground hover:text-foreground transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 btn-beast py-2.5 text-sm" style={{ background: 'linear-gradient(135deg, hsl(220,80%,55%), hsl(220,80%,40%))', color: 'white' }}>
                    {submitting ? 'Adding…' : '👤 Add Player'}
                  </button>
                </div>
              </form>
            </Modal>
          )}

          {/* Add Team Modal */}
          {showAddTeam && (
            <Modal title="Add Team" onClose={() => setShowAddTeam(false)}>
              <form onSubmit={handleAddTeam} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={LBL}>Team Name *</label>
                    <input className={INP} placeholder="e.g. Mumbai Indians" value={tf.name} onChange={e => setTf(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className={LBL}>Short Name *</label>
                    <input className={INP} placeholder="e.g. MI" maxLength={5} value={tf.shortName} onChange={e => setTf(p => ({ ...p, shortName: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <label className={LBL}>City</label>
                    <input className={INP} placeholder="e.g. Mumbai" value={tf.city} onChange={e => setTf(p => ({ ...p, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className={LBL}>Owner Name</label>
                    <input className={INP} placeholder="Owner's name" value={tf.ownerName} onChange={e => setTf(p => ({ ...p, ownerName: e.target.value }))} />
                  </div>
                  <div>
                    <label className={LBL}>Starting Purse (₹)</label>
                    <input type="number" className={INP} placeholder="Leave blank for default" value={tf.purse} onChange={e => setTf(p => ({ ...p, purse: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className={LBL}>Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={tf.primaryColor} onChange={e => setTf(p => ({ ...p, primaryColor: e.target.value }))} className="w-10 h-10 rounded-lg border border-border/40 cursor-pointer bg-transparent" />
                      <div className="flex gap-2 flex-wrap">
                        {['#dc2626','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#be185d','#f59e0b'].map(c => (
                          <button key={c} type="button" onClick={() => setTf(p => ({ ...p, primaryColor: c }))}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${tf.primaryColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                            style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className={LBL}>Team Logo (optional)</label>
                    <input type="file" accept="image/*" className={INP} onChange={e => setTeamLogo(e.target.files?.[0] || null)} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddTeam(false)} className="flex-1 py-2.5 rounded-lg text-sm font-heading uppercase tracking-wider border border-border/40 text-muted-foreground hover:text-foreground transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="flex-1 btn-beast py-2.5 text-sm" style={{ background: 'linear-gradient(135deg, hsl(150,60%,40%), hsl(150,60%,28%))', color: 'white' }}>
                    {submitting ? 'Adding…' : '🏆 Add Team'}
                  </button>
                </div>
              </form>
            </Modal>
          )}

        </AnimatePresence>
      </div>
    </AuthGuard>
  );
}
