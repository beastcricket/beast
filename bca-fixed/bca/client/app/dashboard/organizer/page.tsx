'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import api from '@/lib/api';
import { fmt, roleColors, categoryColors, roleIcons } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────
interface Auction {
  _id: string; name: string; description?: string; date: string; status: string;
  joinCode?: string; bidTimer: number; bidIncrement: number; totalPursePerTeam: number;
  maxTeams?: number; rtmEnabled?: boolean; rtmPerTeam?: number;
  playersCount?: number; teamsCount?: number;
}
interface Player {
  _id: string; name: string; role: string; category: string; basePrice: number;
  photo?: string; sold?: boolean; soldPrice?: number; team?: any;
}
interface Team {
  _id: string; name: string; shortName: string; ownerName?: string; city?: string;
  primaryColor?: string; logo?: string; purse?: number; initialPurse?: number;
  playersCount?: number; maxPlayers?: number; rtmTotal?: number; rtmUsed?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const INP = 'input-beast';
const LBL = 'block text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-1.5';
const statusStyle = (s: string) =>
  s === 'active'    ? 'border-green-500/30 bg-green-500/10 text-green-400' :
  s === 'completed' ? 'border-muted/40 bg-muted/10 text-muted-foreground' :
                      'border-amber-500/30 bg-amber-500/10 text-amber-400';

// ── Modal wrapper ──────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'hsla(222,47%,4%,0.85)', backdropFilter: 'blur(8px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
          className="bg-glass-premium rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border-gold-subtle"
          style={{ boxShadow: '0 0 60px hsla(45,100%,51%,0.1)' }}>
          <div className="flex items-center justify-between p-6 border-b border-border/40">
            <h3 className="font-heading text-xl uppercase tracking-wider text-foreground">{title}</h3>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all">✕</button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function OrganizerDashboard() {
  const { user, logout } = useAuth();

  // Data
  const [auctions, setAuctions]   = useState<Auction[]>([]);
  const [sel, setSel]             = useState<Auction | null>(null);
  const [players, setPlayers]     = useState<Player[]>([]);
  const [teams, setTeams]         = useState<Team[]>([]);

  // Loading states
  const [aLoading, setALoading]   = useState(true);
  const [pLoading, setPLoading]   = useState(false);
  const [tLoading, setTLoading]   = useState(false);
  const [saving, setSaving]       = useState(false);

  // Modals
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [showEditAuction,   setShowEditAuction]   = useState(false);
  const [showAddPlayer,     setShowAddPlayer]     = useState(false);
  const [showAddTeam,       setShowAddTeam]       = useState(false);

  // Forms
  const defaultAF = { name: '', description: '', date: '', bidTimer: 30, bidIncrement: 500000, totalPursePerTeam: 10000000, maxTeams: 8, rtmEnabled: true, rtmPerTeam: 1 };
  const [af, setAf] = useState({ ...defaultAF });

  const defaultPF = { name: '', role: 'Batsman', category: 'Gold', basePrice: 500000, nationality: 'Indian', age: '' };
  const [pf, setPf] = useState({ ...defaultPF });
  const [playerPhoto, setPlayerPhoto] = useState<File | null>(null);

  const defaultTF = { name: '', shortName: '', ownerName: '', city: '', primaryColor: '#dc2626' };
  const [tf, setTf] = useState({ ...defaultTF });
  const [teamLogo, setTeamLogo] = useState<File | null>(null);

  const COLOR_PRESETS = ['#dc2626','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#be185d','#ca8a04','#65a30d','#7c3aed'];

  // ── Fetch auctions ──────────────────────────────────────────────────────
  const fetchAuctions = async () => {
    setALoading(true);
    try {
      const res = await api.get('/auctions/my');
      const list: Auction[] = res.data.auctions || [];
      setAuctions(list);
      if (!sel && list.length > 0) setSel(list[0]);
    } catch { toast.error('Failed to load auctions'); }
    finally { setALoading(false); }
  };

  // ── Fetch players + teams for selected auction ──────────────────────────
  const fetchDetails = async (auctionId: string) => {
    setPLoading(true); setTLoading(true);
    try {
      const [pr, tr] = await Promise.all([
        api.get(`/auctions/${auctionId}/players`),
        api.get(`/auctions/${auctionId}/teams`),
      ]);
      setPlayers(pr.data.players || []);
      setTeams(tr.data.teams || []);
    } catch { toast.error('Failed to load auction details'); }
    finally { setPLoading(false); setTLoading(false); }
  };

  useEffect(() => { fetchAuctions(); }, []);
  useEffect(() => { if (sel?._id) fetchDetails(sel._id); }, [sel?._id]);

  // ── Create Auction ──────────────────────────────────────────────────────
  const createAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!af.name || !af.date) return toast.error('Name and date are required');
    setSaving(true);
    try {
      await api.post('/auctions', af);
      toast.success('🏏 Auction created!');
      setShowCreateAuction(false);
      setAf({ ...defaultAF });
      await fetchAuctions();
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to create auction'); }
    finally { setSaving(false); }
  };

  // ── Edit Auction ────────────────────────────────────────────────────────
  const openEditAuction = () => {
    if (!sel) return;
    setAf({
      name: sel.name, description: sel.description || '', date: sel.date?.slice(0, 16) || '',
      bidTimer: sel.bidTimer, bidIncrement: sel.bidIncrement, totalPursePerTeam: sel.totalPursePerTeam,
      maxTeams: sel.maxTeams || 8, rtmEnabled: sel.rtmEnabled ?? true, rtmPerTeam: sel.rtmPerTeam ?? 1,
    });
    setShowEditAuction(true);
  };

  const editAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    setSaving(true);
    try {
      const res = await api.put(`/auctions/${sel._id}`, af);
      toast.success('✅ Auction updated!');
      setShowEditAuction(false);
      const updated = res.data.auction || { ...sel, ...af };
      setAuctions(prev => prev.map(a => a._id === sel._id ? updated : a));
      setSel(updated);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to update'); }
    finally { setSaving(false); }
  };

  // ── Delete Auction ──────────────────────────────────────────────────────
  const deleteAuction = async (id: string) => {
    if (!confirm('Delete this auction? This cannot be undone.')) return;
    try {
      await api.delete(`/auctions/${id}`);
      toast.success('Auction deleted');
      setAuctions(prev => prev.filter(a => a._id !== id));
      if (sel?._id === id) { setSel(null); setPlayers([]); setTeams([]); }
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to delete'); }
  };

  // ── Add Player ──────────────────────────────────────────────────────────
  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel || !pf.name) return toast.error('Player name required');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(pf).forEach(([k, v]) => fd.append(k, String(v)));
      if (playerPhoto) fd.append('photo', playerPhoto);
      await api.post(`/auctions/${sel._id}/players`, fd);
      toast.success('✅ Player added!');
      setShowAddPlayer(false);
      setPf({ ...defaultPF }); setPlayerPhoto(null);
      await fetchDetails(sel._id);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to add player'); }
    finally { setSaving(false); }
  };

  // ── Delete Player ───────────────────────────────────────────────────────
  const deletePlayer = async (playerId: string) => {
    if (!sel || !confirm('Remove this player?')) return;
    try {
      await api.delete(`/auctions/${sel._id}/players/${playerId}`);
      toast.success('Player removed');
      setPlayers(prev => prev.filter(p => p._id !== playerId));
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to remove player'); }
  };

  // ── Add Team ────────────────────────────────────────────────────────────
  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel || !tf.name || !tf.shortName) return toast.error('Team name and short code required');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(tf).forEach(([k, v]) => fd.append(k, String(v)));
      if (teamLogo) fd.append('logo', teamLogo);
      await api.post(`/auctions/${sel._id}/teams`, fd);
      toast.success('✅ Team added!');
      setShowAddTeam(false);
      setTf({ ...defaultTF }); setTeamLogo(null);
      await fetchDetails(sel._id);
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to add team'); }
    finally { setSaving(false); }
  };

  // ── Delete Team ─────────────────────────────────────────────────────────
  const deleteTeam = async (teamId: string) => {
    if (!sel || !confirm('Remove this team?')) return;
    try {
      await api.delete(`/auctions/${sel._id}/teams/${teamId}`);
      toast.success('Team removed');
      setTeams(prev => prev.filter(t => t._id !== teamId));
    } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to remove team'); }
  };

  // ── Auction Form ────────────────────────────────────────────────────────
  const AuctionForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={LBL}>Auction Name *</label>
        <input value={af.name} onChange={e => setAf(p => ({ ...p, name: e.target.value }))} className={INP} placeholder="e.g. IPL 2025 Mega Auction" required />
      </div>
      <div>
        <label className={LBL}>Description</label>
        <textarea value={af.description} onChange={e => setAf(p => ({ ...p, description: e.target.value }))} className={INP} rows={2} placeholder="Brief description..." style={{ resize: 'none' }} />
      </div>
      <div>
        <label className={LBL}>Date & Time *</label>
        <input type="datetime-local" value={af.date} onChange={e => setAf(p => ({ ...p, date: e.target.value }))} className={INP} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LBL}>Bid Timer (seconds)</label>
          <input type="number" value={af.bidTimer} onChange={e => setAf(p => ({ ...p, bidTimer: +e.target.value }))} className={INP} min={5} max={120} />
        </div>
        <div>
          <label className={LBL}>Bid Increment (₹)</label>
          <input type="number" value={af.bidIncrement} onChange={e => setAf(p => ({ ...p, bidIncrement: +e.target.value }))} className={INP} min={10000} />
        </div>
        <div>
          <label className={LBL}>Purse Per Team (₹)</label>
          <input type="number" value={af.totalPursePerTeam} onChange={e => setAf(p => ({ ...p, totalPursePerTeam: +e.target.value }))} className={INP} min={1000000} />
        </div>
        <div>
          <label className={LBL}>Max Teams</label>
          <input type="number" value={af.maxTeams} onChange={e => setAf(p => ({ ...p, maxTeams: +e.target.value }))} className={INP} min={2} max={20} />
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/40">
        <input type="checkbox" id="rtm" checked={af.rtmEnabled} onChange={e => setAf(p => ({ ...p, rtmEnabled: e.target.checked }))} className="w-4 h-4 accent-primary" />
        <label htmlFor="rtm" className="text-sm font-display text-foreground cursor-pointer">Enable RTM (Right To Match)</label>
        {af.rtmEnabled && (
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Cards/team:</label>
            <input type="number" value={af.rtmPerTeam} onChange={e => setAf(p => ({ ...p, rtmPerTeam: +e.target.value }))} className="w-16 px-2 py-1 rounded bg-secondary/40 border border-border text-foreground text-sm text-center" min={1} max={5} />
          </div>
        )}
      </div>
      <button type="submit" disabled={saving}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <AuthGuard roles={['organizer']}>
      <div className="min-h-screen relative" style={{ background: 'hsl(222 47% 6%)' }}>
        {/* Background */}
        <div style={{ position: 'fixed', inset: 0, backgroundImage: "url('/bg-organizer.png')", backgroundSize: 'cover', backgroundPosition: 'center top', opacity: 0.5, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg,hsl(222 40% 6% / 0.3) 0%,hsl(222 47% 5% / 0.6) 60%,hsl(222 47% 5% / 0.85) 100%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── NAV ── */}
        <div className="bg-glass-navy sticky top-0 z-30" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/beast-logo.png" alt="Beast Cricket" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
              <span className="font-heading text-lg uppercase tracking-[0.15em] hidden sm:block" style={{ color: 'hsl(45 100% 51%)' }}>Beast Cricket</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/auctions" className="text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors hidden md:block">Auctions</Link>
              <div className="hidden sm:flex items-center gap-2 bg-glass-premium rounded-full px-4 py-2 border-gold-subtle">
                <span className="text-primary text-sm">🎬</span>
                <span className="text-foreground text-xs font-semibold font-display">{user?.name}</span>
              </div>
              <Link href="/profile" className="text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors border border-border/40 px-3 py-2 rounded-lg">Profile</Link>
              <button onClick={logout} className="text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-lg border border-border/40">Sign Out</button>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

          {/* ── HERO ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-heading uppercase tracking-[0.2em] mb-3">Organizer Dashboard</span>
                <h1 className="font-heading text-4xl md:text-5xl uppercase tracking-[0.08em] text-foreground mb-1">
                  Welcome, <span className="text-gradient-gold">{user?.name?.split(' ')[0]}</span>
                </h1>
                <p className="font-display text-muted-foreground">Manage your auctions, players and teams from one place.</p>
              </div>
              <button onClick={() => { setAf({ ...defaultAF }); setShowCreateAuction(true); }}
                className="flex-shrink-0 px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] active:scale-95 transition-all">
                + Create Auction
              </button>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { label: 'My Auctions', value: auctions.length, icon: '🏏' },
                { label: 'Active', value: auctions.filter(a => a.status === 'active').length, icon: '🔴', green: true },
                { label: 'Total Players', value: players.length, icon: '👤' },
                { label: 'Total Teams', value: teams.length, icon: '🏆' },
              ].map((s, i) => (
                <div key={i} className={`bg-glass-premium rounded-xl p-4 border-gold-subtle ${s.green && s.value > 0 ? 'border-green-500/20' : ''}`}>
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className={`font-heading text-2xl font-bold ${s.green && s.value > 0 ? 'text-green-400' : 'text-gradient-gold'}`}>{s.value}</div>
                  <div className="font-display text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── AUCTIONS GRID ── */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground">My <span className="text-gradient-gold">Auctions</span></h2>
              <span className="font-display text-xs text-muted-foreground">{auctions.length} auction{auctions.length !== 1 ? 's' : ''}</span>
            </div>

            {aLoading ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => <div key={i} className="bg-glass-premium rounded-xl h-40 animate-pulse border-gold-subtle" />)}
              </div>
            ) : auctions.length === 0 ? (
              <div className="text-center py-16 bg-glass-premium rounded-2xl border-gold-subtle">
                <div className="text-5xl mb-4">🏏</div>
                <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-2">No Auctions Yet</h3>
                <p className="font-display text-muted-foreground text-sm mb-6">Create your first auction to get started.</p>
                <button onClick={() => setShowCreateAuction(true)} className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold">
                  + Create Auction
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {auctions.map((a, i) => (
                  <motion.div key={a._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => setSel(a)}
                    className={`bg-glass-premium rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] group ${sel?._id === a._id ? 'border-gold glow-gold' : 'border-gold-subtle hover:border-gold'}`}>
                    <div className="h-1" style={{ background: a.status === 'active' ? 'linear-gradient(90deg,hsl(142 70% 45%),hsl(142 70% 55%))' : 'linear-gradient(90deg,hsl(45 100% 51%),hsl(40 100% 38%))' }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-heading text-lg uppercase tracking-[0.08em] text-foreground flex-1 pr-2 leading-tight">{a.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-heading uppercase tracking-wider border flex-shrink-0 ${statusStyle(a.status)}`}>
                          {a.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1" />}
                          {a.status}
                        </span>
                      </div>
                      {a.description && <p className="font-display text-muted-foreground text-xs mb-3 line-clamp-1">{a.description}</p>}
                      <div className="space-y-1 text-xs font-display text-muted-foreground mb-4">
                        <div>📅 {format(new Date(a.date), 'dd MMM yyyy, hh:mm a')}</div>
                        <div>💰 {fmt(a.totalPursePerTeam)} · ⏱ {a.bidTimer}s · 🎯 RTM: {a.rtmEnabled ? `${a.rtmPerTeam}/team` : 'Off'}</div>
                        {a.joinCode && <div className="font-heading text-primary tracking-widest">Code: {a.joinCode}</div>}
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/auctions/${a._id}`} onClick={e => e.stopPropagation()}
                          className={`flex-1 text-center py-2 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${a.status === 'active' ? 'bg-primary text-primary-foreground glow-gold' : 'border border-primary/30 text-primary hover:bg-primary/10'}`}>
                          {a.status === 'active' ? '🔴 Live' : '👁 View'}
                        </Link>
                        <button onClick={e => { e.stopPropagation(); setSel(a); openEditAuction(); }}
                          className="px-3 py-2 rounded-lg border border-blue-500/30 text-blue-400 text-xs hover:bg-blue-500/10 transition-all">✏️</button>
                        <button onClick={e => { e.stopPropagation(); deleteAuction(a._id); }}
                          className="px-3 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-all">🗑️</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.section>

          {/* ── SELECTED AUCTION DETAILS ── */}
          <AnimatePresence>
            {sel && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-10">
                <div className="bg-glass-premium rounded-2xl overflow-hidden border-gold-subtle">
                  <div className="h-1" style={{ background: 'linear-gradient(90deg,hsl(45 100% 51%),hsl(40 100% 38%))' }} />
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground">{sel.name}</h2>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider border ${statusStyle(sel.status)}`}>
                            {sel.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1" />}
                            {sel.status}
                          </span>
                        </div>
                        {sel.description && <p className="font-display text-muted-foreground text-sm">{sel.description}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Link href={`/auctions/${sel._id}`}
                          className={`px-5 py-2.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${sel.status === 'active' ? 'bg-primary text-primary-foreground glow-gold' : 'border border-primary/30 text-primary hover:bg-primary/10'}`}>
                          {sel.status === 'active' ? '🔴 Go Live' : '👁 View'}
                        </Link>
                        <button onClick={openEditAuction} className="px-4 py-2.5 rounded-lg border border-blue-500/30 text-blue-400 text-xs font-heading uppercase tracking-wider hover:bg-blue-500/10 transition-all">✏️ Edit</button>
                        <button onClick={() => deleteAuction(sel._id)} className="px-4 py-2.5 rounded-lg border border-red-500/30 text-red-400 text-xs font-heading uppercase tracking-wider hover:bg-red-500/10 transition-all">🗑️ Delete</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                      {[
                        ['📅', 'Date', format(new Date(sel.date), 'dd MMM yyyy')],
                        ['⏱', 'Timer', `${sel.bidTimer}s`],
                        ['📈', 'Increment', fmt(sel.bidIncrement)],
                        ['💰', 'Purse/Team', fmt(sel.totalPursePerTeam)],
                        ['🏆', 'Max Teams', sel.maxTeams || '—'],
                        ['🎯', 'RTM', sel.rtmEnabled ? `${sel.rtmPerTeam}/team` : 'Off'],
                      ].map(([ic, label, val], i) => (
                        <div key={i} className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
                          <div className="text-lg mb-1">{ic}</div>
                          <div className="font-heading text-sm text-gradient-gold">{val}</div>
                          <div className="font-display text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
                        </div>
                      ))}
                    </div>
                    {sel.joinCode && (
                      <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3">
                        <span className="font-display text-sm text-muted-foreground">Join Code:</span>
                        <span className="font-heading text-xl tracking-[0.3em] text-primary">{sel.joinCode}</span>
                        <button onClick={() => { navigator.clipboard.writeText(sel.joinCode || ''); toast.success('Code copied!'); }}
                          className="ml-auto text-xs font-heading uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors">Copy</button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── PLAYERS SECTION ── */}
          {sel && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-10">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground">Players <span className="text-gradient-gold">Pool</span></h2>
                  <p className="font-display text-xs text-muted-foreground mt-0.5">{players.length} player{players.length !== 1 ? 's' : ''} in {sel.name}</p>
                </div>
                <button onClick={() => { setPf({ ...defaultPF }); setPlayerPhoto(null); setShowAddPlayer(true); }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all">
                  + Add Player
                </button>
              </div>

              {pLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => <div key={i} className="bg-glass-premium rounded-xl h-36 animate-pulse border-gold-subtle" />)}
                </div>
              ) : players.length === 0 ? (
                <div className="text-center py-14 bg-glass-premium rounded-2xl border-gold-subtle">
                  <div className="text-4xl mb-3">👤</div>
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-1">No Players Yet</h3>
                  <p className="font-display text-muted-foreground text-sm mb-5">Add players to this auction to get started.</p>
                  <button onClick={() => setShowAddPlayer(true)} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold">+ Add Player</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {players.map((p, i) => (
                    <motion.div key={p._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                      className="bg-glass-premium rounded-xl overflow-hidden border-gold-subtle hover:border-gold transition-all duration-300 group">
                      {/* Player photo */}
                      <div className="relative h-28 overflow-hidden" style={{ background: 'linear-gradient(135deg,hsl(222,35%,12%),hsl(222,47%,8%))' }}>
                        {p.photo
                          ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover object-top" />
                          : <div className="w-full h-full flex items-center justify-center text-4xl">{roleIcons[p.role] || '🏅'}</div>}
                        <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.8),transparent)' }} />
                        {/* Status badge */}
                        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-heading uppercase tracking-wider border ${p.sold ? 'border-green-500/40 bg-green-500/20 text-green-400' : 'border-amber-500/40 bg-amber-500/20 text-amber-400'}`}>
                          {p.sold ? 'Sold' : 'Available'}
                        </div>
                        {/* Delete button */}
                        <button onClick={() => deletePlayer(p._id)}
                          className="absolute top-2 left-2 w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40">✕</button>
                      </div>
                      <div className="p-3">
                        <h4 className="font-heading text-sm uppercase tracking-wider text-foreground truncate mb-1">{p.name}</h4>
                        <div className="flex gap-1 flex-wrap mb-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-heading uppercase tracking-wider border ${roleColors[p.role] || 'border-border text-muted-foreground'}`}>{p.role}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-heading uppercase tracking-wider border ${categoryColors[p.category] || 'border-border text-muted-foreground'}`}>{p.category}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-xs text-gradient-gold">{fmt(p.basePrice)}</span>
                          {p.sold && p.team && (
                            <span className="font-display text-[10px] text-muted-foreground truncate max-w-[80px]">{p.team.shortName || p.team.name}</span>
                          )}
                        </div>
                        {p.sold && p.soldPrice && (
                          <div className="mt-1 text-[10px] font-display text-green-400">Sold: {fmt(p.soldPrice)}</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          )}

          {/* ── TEAMS SECTION ── */}
          {sel && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground">Participating <span className="text-gradient-gold">Teams</span></h2>
                  <p className="font-display text-xs text-muted-foreground mt-0.5">{teams.length} team{teams.length !== 1 ? 's' : ''} in {sel.name}</p>
                </div>
                <button onClick={() => { setTf({ ...defaultTF }); setTeamLogo(null); setShowAddTeam(true); }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all">
                  + Add Team
                </button>
              </div>

              {tLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => <div key={i} className="bg-glass-premium rounded-xl h-36 animate-pulse border-gold-subtle" />)}
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-14 bg-glass-premium rounded-2xl border-gold-subtle">
                  <div className="text-4xl mb-3">🏆</div>
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-1">No Teams Yet</h3>
                  <p className="font-display text-muted-foreground text-sm mb-5">Add teams or share the join code with team owners.</p>
                  <button onClick={() => setShowAddTeam(true)} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold">+ Add Team</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {teams.map((t, i) => (
                    <motion.div key={t._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                      className="bg-glass-premium rounded-xl overflow-hidden border-gold-subtle hover:border-gold transition-all duration-300 group"
                      style={{ borderColor: `${t.primaryColor || 'hsla(45,100%,51%,0.2)'}30` }}>
                      <div className="h-1" style={{ background: `linear-gradient(90deg,${t.primaryColor || 'hsl(45,100%,51%)'},${t.primaryColor || 'hsl(45,100%,51%)'}80)` }} />
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          {t.logo
                            ? <img src={t.logo} alt={t.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                            : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-black font-bold text-sm flex-shrink-0 font-heading"
                                style={{ background: `linear-gradient(135deg,${t.primaryColor || '#dc2626'},${t.primaryColor || '#dc2626'}88)` }}>
                                {t.shortName?.slice(0, 2) || '??'}
                              </div>}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-heading text-sm uppercase tracking-wider text-foreground truncate">{t.name}</h4>
                            <p className="font-display text-xs text-muted-foreground truncate">{t.ownerName || 'No owner'}</p>
                          </div>
                          <button onClick={() => deleteTeam(t._id)}
                            className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-secondary/20 rounded-lg p-2">
                            <div className="font-heading text-xs text-gradient-gold">{fmt(t.purse ?? t.initialPurse ?? 0)}</div>
                            <div className="font-display text-[9px] text-muted-foreground uppercase">Purse</div>
                          </div>
                          <div className="bg-secondary/20 rounded-lg p-2">
                            <div className="font-heading text-xs text-foreground">{t.playersCount || 0}/{t.maxPlayers || '—'}</div>
                            <div className="font-display text-[9px] text-muted-foreground uppercase">Players</div>
                          </div>
                        </div>
                        {t.city && <p className="font-display text-[10px] text-muted-foreground mt-2 text-center">📍 {t.city}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>
          )}
        </div>

        {/* ── MODALS ── */}

        {/* Create Auction */}
        <Modal open={showCreateAuction} onClose={() => setShowCreateAuction(false)} title="Create Auction">
          <AuctionForm onSubmit={createAuction} submitLabel="🏏 Create Auction" />
        </Modal>

        {/* Edit Auction */}
        <Modal open={showEditAuction} onClose={() => setShowEditAuction(false)} title="Edit Auction">
          <AuctionForm onSubmit={editAuction} submitLabel="✅ Save Changes" />
        </Modal>

        {/* Add Player */}
        <Modal open={showAddPlayer} onClose={() => setShowAddPlayer(false)} title="Add Player">
          <form onSubmit={addPlayer} className="space-y-4">
            <div>
              <label className={LBL}>Player Name *</label>
              <input value={pf.name} onChange={e => setPf(p => ({ ...p, name: e.target.value }))} className={INP} placeholder="e.g. Virat Kohli" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LBL}>Role</label>
                <select value={pf.role} onChange={e => setPf(p => ({ ...p, role: e.target.value }))} className={INP}>
                  {['Batsman', 'Bowler', 'AllRounder', 'WicketKeeper', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={LBL}>Category</label>
                <select value={pf.category} onChange={e => setPf(p => ({ ...p, category: e.target.value }))} className={INP}>
                  {['Elite', 'Gold', 'Silver', 'Emerging'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={LBL}>Base Price (₹)</label>
                <input type="number" value={pf.basePrice} onChange={e => setPf(p => ({ ...p, basePrice: +e.target.value }))} className={INP} min={10000} />
              </div>
              <div>
                <label className={LBL}>Nationality</label>
                <input value={pf.nationality} onChange={e => setPf(p => ({ ...p, nationality: e.target.value }))} className={INP} placeholder="Indian" />
              </div>
              <div>
                <label className={LBL}>Age</label>
                <input type="number" value={pf.age} onChange={e => setPf(p => ({ ...p, age: e.target.value }))} className={INP} placeholder="25" min={15} max={50} />
              </div>
            </div>
            <div>
              <label className={LBL}>Player Photo (optional)</label>
              <input type="file" accept="image/*" onChange={e => setPlayerPhoto(e.target.files?.[0] || null)}
                className="w-full text-foreground text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-heading file:text-xs file:uppercase file:tracking-wider cursor-pointer hover:file:bg-primary/20" />
              {playerPhoto && <img src={URL.createObjectURL(playerPhoto)} alt="Preview" className="mt-2 w-16 h-20 rounded-lg object-cover border border-primary/20" />}
            </div>
            <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">
              {saving ? 'Adding...' : '👤 Add Player'}
            </button>
          </form>
        </Modal>

        {/* Add Team */}
        <Modal open={showAddTeam} onClose={() => setShowAddTeam(false)} title="Add Team">
          <form onSubmit={addTeam} className="space-y-4">
            <div>
              <label className={LBL}>Team Name *</label>
              <input value={tf.name} onChange={e => setTf(p => ({ ...p, name: e.target.value }))} className={INP} placeholder="e.g. Mumbai Mavericks" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LBL}>Short Code * (max 4)</label>
                <input value={tf.shortName} onChange={e => setTf(p => ({ ...p, shortName: e.target.value.toUpperCase().slice(0, 4) }))} className={INP} placeholder="MUM" maxLength={4} required />
              </div>
              <div>
                <label className={LBL}>Owner Name</label>
                <input value={tf.ownerName} onChange={e => setTf(p => ({ ...p, ownerName: e.target.value }))} className={INP} placeholder="Owner name" />
              </div>
              <div>
                <label className={LBL}>City</label>
                <input value={tf.city} onChange={e => setTf(p => ({ ...p, city: e.target.value }))} className={INP} placeholder="Mumbai" />
              </div>
            </div>
            <div>
              <label className={LBL}>Team Color</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {COLOR_PRESETS.map(c => (
                  <button key={c} type="button" onClick={() => setTf(p => ({ ...p, primaryColor: c }))}
                    className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${tf.primaryColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
                <input type="color" value={tf.primaryColor} onChange={e => setTf(p => ({ ...p, primaryColor: e.target.value }))}
                  className="w-8 h-8 rounded-lg cursor-pointer p-0.5 border border-border bg-transparent" />
              </div>
            </div>
            <div>
              <label className={LBL}>Team Logo (optional)</label>
              <input type="file" accept="image/*" onChange={e => setTeamLogo(e.target.files?.[0] || null)}
                className="w-full text-foreground text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-heading file:text-xs file:uppercase file:tracking-wider cursor-pointer hover:file:bg-primary/20" />
              {teamLogo && <img src={URL.createObjectURL(teamLogo)} alt="Preview" className="mt-2 w-16 h-16 rounded-lg object-cover border border-primary/20" />}
            </div>
            <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">
              {saving ? 'Adding...' : '🏆 Add Team'}
            </button>
          </form>
        </Modal>
      </div>
    </AuthGuard>
  );
}
