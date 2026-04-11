'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import api from '@/lib/api';
import { fmt, roleColors, categoryColors, roleIcons } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Auction {
  _id: string; name: string; description?: string; date: string; status: string;
  bidTimer?: number; totalPursePerTeam?: number; organizerId?: any;
  playersCount?: number; teamsCount?: number;
}
interface Team {
  _id: string; name: string; shortName: string; primaryColor?: string; logo?: string;
  purse?: number; initialPurse?: number; playersCount?: number; maxPlayers?: number;
  ownerName?: string; city?: string;
}
interface Player {
  _id: string; name: string; role: string; category: string; basePrice: number;
  photo?: string; sold?: boolean; soldPrice?: number; team?: any;
}

const statusStyle = (s: string) =>
  s === 'active'    ? 'border-green-500/30 bg-green-500/10 text-green-400' :
  s === 'completed' ? 'border-muted/40 bg-muted/10 text-muted-foreground' :
                      'border-amber-500/30 bg-amber-500/10 text-amber-400';

export default function ViewerDashboard() {
  const { user, logout } = useAuth();

  const [auctions, setAuctions]       = useState<Auction[]>([]);
  const [sel, setSel]                 = useState<Auction | null>(null);
  const [teams, setTeams]             = useState<Team[]>([]);
  const [players, setPlayers]         = useState<Player[]>([]);
  const [filter, setFilter]           = useState<'all' | 'active' | 'draft' | 'completed'>('all');
  const [loading, setLoading]         = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Live auction state (socket)
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [currentBid, setCurrentBid]       = useState(0);
  const [currentBidFmt, setCurrentBidFmt] = useState('');
  const [leadingTeamName, setLeadingTeamName] = useState('');
  const [leadingTeamColor, setLeadingTeamColor] = useState('hsl(45,100%,51%)');
  const [timer, setTimer]                 = useState(0);
  const [bidHistory, setBidHistory]       = useState<any[]>([]);
  const [auctionStatus, setAuctionStatus] = useState('draft');
  const [connected, setConnected]         = useState(false);
  const [soldData, setSoldData]           = useState<any>(null);
  const [playerHistory, setPlayerHistory] = useState<any[]>([]);

  // Fetch all auctions
  useEffect(() => {
    api.get('/auctions')
      .then(r => setAuctions(r.data.auctions || []))
      .catch(() => toast.error('Failed to load auctions'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch details when auction selected
  const selectAuction = async (a: Auction) => {
    setSel(a);
    setDetailLoading(true);
    setSoldData(null); setCurrentPlayer(null); setBidHistory([]); setPlayerHistory([]);
    try {
      const [pr, tr] = await Promise.all([
        api.get(`/auctions/${a._id}/players`),
        api.get(`/auctions/${a._id}/teams`),
      ]);
      setPlayers(pr.data.players || []);
      setTeams(tr.data.teams || []);
    } catch { toast.error('Failed to load auction details'); }
    finally { setDetailLoading(false); }
  };

  // Socket for live auction
  useEffect(() => {
    if (!sel?._id) return;
    const socket = getSocket();
    setConnected(socket.connected);
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.emit('joinAuction', { auctionId: sel._id });

    socket.on('auctionState', (s: any) => {
      setTeams(s.teams || []);
      setCurrentPlayer(s.currentPlayer);
      setCurrentBid(s.currentBid || 0);
      setCurrentBidFmt(s.currentBidFormatted || '');
      setLeadingTeamName(s.leadingTeamName || '');
      setLeadingTeamColor(s.leadingTeamColor || 'hsl(45,100%,51%)');
      setTimer(s.timer || 0);
      setBidHistory(s.bidHistory || []);
      setAuctionStatus(s.status || 'draft');
    });
    socket.on('auctionStarted',   () => { setAuctionStatus('active'); toast.success('🏏 Auction started!'); });
    socket.on('auctionPaused',    () => { setAuctionStatus('paused'); toast('⏸ Paused'); });
    socket.on('auctionResumed',   () => { setAuctionStatus('active'); toast('▶️ Resumed'); });
    socket.on('nextPlayer', (d: any) => {
      setCurrentPlayer(d.player); setCurrentBid(d.basePrice); setCurrentBidFmt(d.basePriceFormatted);
      setLeadingTeamName(''); setLeadingTeamColor('hsl(45,100%,51%)');
      setTimer(d.timer); setBidHistory([]); setSoldData(null);
    });
    socket.on('timerTick', ({ timer: t }: any) => setTimer(t));
    socket.on('bidUpdate', (d: any) => {
      setCurrentBid(d.currentBid); setCurrentBidFmt(d.currentBidFormatted);
      setLeadingTeamName(d.leadingTeamName); setLeadingTeamColor(d.leadingTeamColor);
      setTimer(d.timer);
      setBidHistory(prev => [d.bidEntry, ...prev].slice(0, 20));
    });
    socket.on('playerSold', (d: any) => {
      setSoldData(d);
      if (d.teams) setTeams(d.teams);
      setPlayerHistory(prev => [{ ...d.player, soldTo: d.soldTo, soldPrice: d.soldPrice }, ...prev].slice(0, 15));
    });
    socket.on('playerUnsold', (d: any) => { setSoldData({ unsold: true, player: d.player }); });
    socket.on('auctionCompleted', () => { setAuctionStatus('completed'); setCurrentPlayer(null); toast.success('🏆 Auction complete!'); });
    socket.on('teamJoined', (d: any) => { if (d.teams) setTeams(d.teams); });

    return () => {
      ['auctionState','auctionStarted','auctionPaused','auctionResumed','nextPlayer','timerTick',
       'bidUpdate','playerSold','playerUnsold','auctionCompleted','teamJoined'].forEach(e => socket.off(e));
    };
  }, [sel?._id]);

  const filtered = filter === 'all' ? auctions : auctions.filter(a => a.status === filter);
  const timerColor = timer <= 5 ? '#ef4444' : timer <= 10 ? '#f97316' : 'hsl(45,100%,51%)';
  const bidConfig = { bidTimer: sel?.bidTimer || 30 };
  const timerPct = bidConfig.bidTimer > 0 ? (timer / bidConfig.bidTimer) * 100 : 0;

  return (
    <AuthGuard roles={['viewer']}>
      <div className="min-h-screen relative" style={{ background: 'hsl(222 47% 6%)' }}>
        {/* Background */}
        <div style={{ position: 'fixed', inset: 0, backgroundImage: "url('/stadium-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.12, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(180deg,hsl(222 40% 6% / 0.5) 0%,hsl(222 47% 5% / 0.8) 100%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── NAV ── */}
        <div className="bg-glass-navy sticky top-0 z-30" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/beast-logo.png" alt="Beast Cricket" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
              <span className="font-heading text-lg uppercase tracking-[0.15em] hidden sm:block" style={{ color: 'hsl(45 100% 51%)' }}>Beast Cricket</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-glass-premium rounded-full px-4 py-2 border-gold-subtle">
                <span className="text-emerald-400 text-sm">👁️</span>
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
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-heading uppercase tracking-[0.2em] mb-3">Viewer Dashboard</span>
            <h1 className="font-heading text-4xl md:text-5xl uppercase tracking-[0.08em] text-foreground mb-1">
              Welcome, <span className="text-gradient-gold">{user?.name?.split(' ')[0]}</span>
            </h1>
            <p className="font-display text-muted-foreground">Watch live auctions in real time. No bidding — pure spectator experience.</p>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { label: 'Total Auctions', value: auctions.length, icon: '🏏' },
                { label: 'Live Now', value: auctions.filter(a => a.status === 'active').length, icon: '🔴', green: true },
                { label: 'Completed', value: auctions.filter(a => a.status === 'completed').length, icon: '✅' },
                { label: 'Upcoming', value: auctions.filter(a => a.status === 'draft').length, icon: '📅' },
              ].map((s, i) => (
                <div key={i} className={`bg-glass-premium rounded-xl p-4 border-gold-subtle ${s.green && s.value > 0 ? 'border-green-500/20' : ''}`}>
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <div className={`font-heading text-2xl font-bold ${s.green && s.value > 0 ? 'text-green-400' : 'text-gradient-gold'}`}>{s.value}</div>
                  <div className="font-display text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid xl:grid-cols-3 gap-8">

            {/* ── LEFT: AUCTIONS LIST ── */}
            <div className="xl:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-xl uppercase tracking-wider text-foreground">Auctions</h2>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1.5 mb-4 flex-wrap">
                {(['all', 'active', 'draft', 'completed'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-heading uppercase tracking-wider transition-all ${filter === f ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:border-primary/40 hover:text-primary'}`}>
                    {f === 'all' ? `All (${auctions.length})` : `${f} (${auctions.filter(a => a.status === f).length})`}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="bg-glass-premium rounded-xl h-24 animate-pulse border-gold-subtle" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 bg-glass-premium rounded-xl border-gold-subtle">
                  <div className="text-3xl mb-2">🏏</div>
                  <p className="font-display text-muted-foreground text-sm">No auctions found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((a, i) => (
                    <motion.div key={a._id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      onClick={() => selectAuction(a)}
                      className={`bg-glass-premium rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] ${sel?._id === a._id ? 'border-gold glow-gold' : 'border-gold-subtle hover:border-gold'}`}>
                      <div className="h-0.5" style={{ background: a.status === 'active' ? 'linear-gradient(90deg,hsl(142 70% 45%),hsl(142 70% 55%))' : 'linear-gradient(90deg,hsl(45 100% 51%),hsl(40 100% 38%))' }} />
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-heading text-sm uppercase tracking-wider text-foreground flex-1 leading-tight">{a.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-heading uppercase tracking-wider border flex-shrink-0 ${statusStyle(a.status)}`}>
                            {a.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1" />}
                            {a.status}
                          </span>
                        </div>
                        <div className="text-[10px] font-display text-muted-foreground space-y-0.5">
                          <div>📅 {format(new Date(a.date), 'dd MMM yyyy')}</div>
                          <div>by {a.organizerId?.name || 'Organizer'}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* ── RIGHT: AUCTION DETAILS ── */}
            <div className="xl:col-span-2">
              <AnimatePresence mode="wait">
                {!sel ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-center py-24 bg-glass-premium rounded-2xl border-gold-subtle">
                    <div className="text-5xl mb-4">👁️</div>
                    <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-2">Select an Auction</h3>
                    <p className="font-display text-muted-foreground text-sm">Click any auction on the left to watch it live.</p>
                  </motion.div>
                ) : detailLoading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-center py-24 bg-glass-premium rounded-2xl border-gold-subtle">
                    <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
                    <p className="font-display text-muted-foreground">Loading auction...</p>
                  </motion.div>
                ) : (
                  <motion.div key={sel._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                    {/* Auction header */}
                    <div className="bg-glass-premium rounded-2xl overflow-hidden border-gold-subtle">
                      <div className="h-1" style={{ background: sel.status === 'active' ? 'linear-gradient(90deg,hsl(142 70% 45%),hsl(142 70% 55%))' : 'linear-gradient(90deg,hsl(45 100% 51%),hsl(40 100% 38%))' }} />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="font-heading text-2xl uppercase tracking-wider text-foreground">{sel.name}</h2>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider border ${statusStyle(sel.status)}`}>
                                {sel.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1" />}
                                {sel.status}
                              </span>
                            </div>
                            {sel.description && <p className="font-display text-muted-foreground text-sm">{sel.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${connected ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                              {connected ? 'LIVE' : 'OFF'}
                            </div>
                            <Link href={`/auctions/${sel._id}`}
                              className={`px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${sel.status === 'active' ? 'bg-primary text-primary-foreground glow-gold' : 'border border-primary/30 text-primary hover:bg-primary/10'}`}>
                              {sel.status === 'active' ? '🔴 Full View' : '👁 View'}
                            </Link>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            ['📅', format(new Date(sel.date), 'dd MMM yyyy'), 'Date'],
                            ['💰', fmt(sel.totalPursePerTeam), 'Purse/Team'],
                            ['⏱', `${sel.bidTimer}s`, 'Timer'],
                          ].map(([ic, val, label], i) => (
                            <div key={i} className="bg-secondary/20 rounded-xl p-3 text-center border border-border/30">
                              <div className="text-base mb-1">{ic}</div>
                              <div className="font-heading text-sm text-gradient-gold">{val}</div>
                              <div className="font-display text-[9px] text-muted-foreground uppercase">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── LIVE STAGE (active auctions) ── */}
                    {sel.status === 'active' && (
                      <div className="bg-glass-premium rounded-2xl overflow-hidden border-gold-subtle">
                        <div className="h-1" style={{ background: 'linear-gradient(90deg,hsl(142 70% 45%),hsl(142 70% 55%))' }} />
                        <div className="p-5">
                          <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-4">🔴 Live Stage</h3>

                          {/* Sold overlay */}
                          <AnimatePresence>
                            {soldData && !soldData.unsold && (
                              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                className="rounded-xl p-6 text-center mb-4"
                                style={{ background: 'linear-gradient(135deg,hsla(45,100%,51%,0.08),hsla(45,100%,51%,0.03))', border: '1px solid hsla(45,100%,51%,0.25)' }}>
                                <div className="text-4xl mb-2">🔨</div>
                                <div className="font-heading text-3xl text-gradient-gold mb-1">SOLD!</div>
                                <div className="font-heading text-xl text-foreground">{soldData.player?.name}</div>
                                <div className="font-heading text-2xl mt-1" style={{ color: soldData.soldTo?.teamColor || 'hsl(45,100%,51%)' }}>{soldData.soldPriceFormatted}</div>
                                <div className="font-display text-sm text-muted-foreground mt-1">to <span className="font-bold" style={{ color: soldData.soldTo?.teamColor }}>{soldData.soldTo?.teamName}</span></div>
                              </motion.div>
                            )}
                            {soldData?.unsold && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="rounded-xl p-4 text-center mb-4 bg-secondary/20 border border-border/40">
                                <div className="text-3xl mb-1">😔</div>
                                <div className="font-heading text-xl text-muted-foreground">UNSOLD</div>
                                <div className="font-display text-sm text-muted-foreground">{soldData.player?.name}</div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Current player */}
                          {currentPlayer && (
                            <div className="flex gap-4 mb-4">
                              <div className="relative w-24 h-32 rounded-xl overflow-hidden flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,hsl(222,35%,12%),hsl(222,47%,8%))', border: '2px solid hsla(45,100%,51%,0.3)' }}>
                                {currentPlayer.imageUrl
                                  ? <img src={currentPlayer.imageUrl} alt={currentPlayer.name} className="w-full h-full object-cover object-top" />
                                  : <div className="w-full h-full flex items-center justify-center text-3xl">{roleIcons[currentPlayer.role] || '🏅'}</div>}
                                <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.9),transparent)' }} />
                                <div className="absolute bottom-1 left-0 right-0 text-center">
                                  <div className="font-heading text-[10px] text-foreground truncate px-1">{currentPlayer.name}</div>
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex gap-1.5 mb-2 flex-wrap">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-heading uppercase tracking-wider border ${roleColors[currentPlayer.role] || ''}`}>{currentPlayer.role}</span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-heading uppercase tracking-wider border ${categoryColors[currentPlayer.category] || ''}`}>{currentPlayer.category}</span>
                                </div>
                                <h4 className="font-heading text-lg uppercase tracking-wider text-foreground mb-2">{currentPlayer.name}</h4>
                                {/* Bid display */}
                                <div className="rounded-xl p-3" style={{ background: 'hsla(222,35%,10%,0.9)', border: `2px solid ${leadingTeamName ? leadingTeamColor + '60' : 'hsla(45,100%,51%,0.3)'}` }}>
                                  <div className="text-[9px] font-heading uppercase tracking-widest text-muted-foreground mb-1">{leadingTeamName ? 'Highest Bid' : 'Base Price'}</div>
                                  <div className="font-heading text-2xl font-bold" style={{ color: leadingTeamName ? leadingTeamColor : 'hsl(45,100%,51%)' }}>
                                    {currentBidFmt || fmt(currentPlayer.basePrice)}
                                  </div>
                                  {leadingTeamName && <div className="font-display text-xs mt-0.5" style={{ color: leadingTeamColor }}>👑 {leadingTeamName}</div>}
                                </div>
                                {/* Timer */}
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-secondary/30 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerColor }} />
                                  </div>
                                  <span className="font-heading text-sm font-bold flex-shrink-0" style={{ color: timerColor }}>{timer}s</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {!currentPlayer && auctionStatus === 'active' && (
                            <div className="text-center py-8">
                              <div className="text-3xl mb-2">⏳</div>
                              <p className="font-display text-muted-foreground text-sm">Waiting for next player...</p>
                            </div>
                          )}

                          {auctionStatus === 'paused' && (
                            <div className="text-center py-6 rounded-xl bg-amber-500/5 border border-amber-500/20">
                              <div className="text-3xl mb-2">⏸</div>
                              <p className="font-heading text-amber-400 uppercase tracking-wider text-sm">Auction Paused</p>
                            </div>
                          )}

                          {/* Bid history */}
                          {bidHistory.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-heading text-xs uppercase tracking-widest text-muted-foreground mb-2">Bid History</h4>
                              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {bidHistory.slice(0, 8).map((b: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary/20 border border-border/30">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.teamColor || 'hsl(45,100%,51%)' }} />
                                      <span className="font-display text-xs text-foreground">{b.teamName || b.teamShortName}</span>
                                    </div>
                                    <span className="font-heading text-xs text-gradient-gold">{b.bidAmountFormatted || fmt(b.bidAmount)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── TEAMS ── */}
                    {teams.length > 0 && (
                      <div className="bg-glass-premium rounded-2xl border-gold-subtle overflow-hidden">
                        <div className="p-5">
                          <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-4">Teams ({teams.length})</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {teams.map(t => (
                              <div key={t._id} className="rounded-xl p-3 border border-border/30 bg-secondary/10"
                                style={{ borderColor: `${t.primaryColor || 'hsla(45,100%,51%,0.2)'}30` }}>
                                <div className="flex items-center gap-2 mb-2">
                                  {t.logo
                                    ? <img src={t.logo} alt={t.name} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                    : <div className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-bold text-xs flex-shrink-0 font-heading"
                                        style={{ background: `linear-gradient(135deg,${t.primaryColor || '#dc2626'},${t.primaryColor || '#dc2626'}88)` }}>
                                        {t.shortName?.slice(0, 2)}
                                      </div>}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-heading text-xs uppercase tracking-wider text-foreground truncate">{t.name}</div>
                                    <div className="font-display text-[9px] text-muted-foreground">{t.ownerName}</div>
                                  </div>
                                </div>
                                <div className="flex justify-between text-[10px]">
                                  <span className="font-heading text-gradient-gold">{fmt(t.purse ?? t.initialPurse ?? 0)}</span>
                                  <span className="font-display text-muted-foreground">{t.playersCount || 0}/{t.maxPlayers || '—'}</span>
                                </div>
                                {t.initialPurse && t.purse !== undefined && (
                                  <div className="w-full h-1 rounded-full bg-secondary/30 mt-1.5 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${(t.purse / t.initialPurse) * 100}%`, background: t.primaryColor || 'hsl(45,100%,51%)' }} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── PLAYERS ── */}
                    {players.length > 0 && (
                      <div className="bg-glass-premium rounded-2xl border-gold-subtle overflow-hidden">
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-heading text-lg uppercase tracking-wider text-foreground">Players ({players.length})</h3>
                            <div className="flex gap-2 text-[10px] font-display text-muted-foreground">
                              <span className="text-green-400">{players.filter(p => p.sold).length} sold</span>
                              <span>·</span>
                              <span className="text-amber-400">{players.filter(p => !p.sold).length} available</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {players.map(p => (
                              <div key={p._id} className="rounded-xl overflow-hidden border border-border/30 bg-secondary/10">
                                <div className="relative h-20" style={{ background: 'linear-gradient(135deg,hsl(222,35%,12%),hsl(222,47%,8%))' }}>
                                  {p.photo
                                    ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover object-top" />
                                    : <div className="w-full h-full flex items-center justify-center text-2xl">{roleIcons[p.role] || '🏅'}</div>}
                                  <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.8),transparent)' }} />
                                  <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-heading uppercase tracking-wider border ${p.sold ? 'border-green-500/40 bg-green-500/20 text-green-400' : 'border-amber-500/40 bg-amber-500/20 text-amber-400'}`}>
                                    {p.sold ? 'Sold' : 'Avail'}
                                  </div>
                                </div>
                                <div className="p-2">
                                  <div className="font-heading text-[11px] uppercase tracking-wider text-foreground truncate">{p.name}</div>
                                  <div className="flex gap-1 mt-1">
                                    <span className={`px-1 py-0.5 rounded text-[8px] font-heading uppercase border ${roleColors[p.role] || 'border-border text-muted-foreground'}`}>{p.role}</span>
                                  </div>
                                  <div className="font-heading text-[10px] text-gradient-gold mt-1">{p.sold ? fmt(p.soldPrice) : fmt(p.basePrice)}</div>
                                  {p.sold && p.team && (
                                    <div className="font-display text-[9px] text-muted-foreground truncate">{p.team.shortName || p.team.name}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── SOLD HISTORY ── */}
                    {playerHistory.length > 0 && (
                      <div className="bg-glass-premium rounded-2xl border-gold-subtle overflow-hidden">
                        <div className="p-5">
                          <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-4">Recent Sales</h3>
                          <div className="space-y-2">
                            {playerHistory.map((p, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/20 border border-border/30">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{roleIcons[p.role] || '🏅'}</span>
                                  <div>
                                    <div className="font-heading text-xs uppercase tracking-wider text-foreground">{p.name}</div>
                                    <div className="font-display text-[10px] text-muted-foreground">{p.role}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-heading text-sm text-gradient-gold">{fmt(p.soldPrice)}</div>
                                  <div className="font-display text-[10px]" style={{ color: p.soldTo?.teamColor || 'hsl(45,100%,51%)' }}>{p.soldTo?.teamName}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
