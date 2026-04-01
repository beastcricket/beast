'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import BeastSidebar from '@/components/beast/BeastSidebar';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { fmt, roleColors, categoryColors, roleIcons } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Activity logging function for admin dashboard
const logActivityToAdmin = async (type: string, title: string, data?: any) => {
  try {
    await fetch('http://localhost:3001/api/activity-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        title,
        userId: data?.userId || 'organizer',
        data
      })
    });
    console.log('📢 Activity logged to admin:', title);
  } catch (error) {
    console.log('Failed to log activity to admin:', error);
  }
};

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [sel, setSel]       = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams,   setTeams]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPF, setShowPF]   = useState(false);
  const [showTF, setShowTF]   = useState(false);
  const [editAuction, setEditAuction] = useState<any>(null);
  const [auctionStep, setAuctionStep] = useState<'form'|'players'|'teams'|'complete'>('form');
  const [tempAuction, setTempAuction] = useState<any>(null);
  const [editTeam,    setEditTeam]    = useState<any>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const createFormRef = useRef<HTMLDivElement>(null);

  const [aForm, setAForm] = useState({ name:'', description:'', date:'', bidTimer:'30', bidIncrement:'500000', totalPursePerTeam:'100000000', maxTeams:'10', rtmPerTeam:'2', rtmEnabled:true });
  const [pForm, setPForm] = useState({ name:'', role:'Batsman', category:'Gold', nationality:'Indian', age:'', basePrice:'1000000', matches:'0', runs:'0', wickets:'0', average:'0', strikeRate:'0', economy:'0' });
  const [tForm, setTForm] = useState({ name:'', shortName:'', ownerName:'', city:'', primaryColor:'#f59e0b', maxPlayers:'15' });
  const [pImg, setPImg]   = useState<File|null>(null);
  const [tLogo, setTLogo] = useState<File|null>(null);

  useEffect(() => { fetchAuctions(); }, []);
  useEffect(() => { if (sel) { fetchPlayers(); fetchTeams(); subscribeSocket(); } }, [sel?._id]);
  useEffect(() => { if (tempAuction) { fetchPlayers(); fetchTeams(); } }, [tempAuction?._id]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAuctions = async () => {
    try { const r = await api.get('/auctions/my'); setAuctions(r.data.auctions); if (r.data.auctions.length && !sel) setSel(r.data.auctions[0]); } catch {}
  };
  const fetchPlayers = async () => { 
    const currentAuction = tempAuction || sel;
    if (!currentAuction || !currentAuction._id || currentAuction._id === 'undefined') return; 
    try { const r = await api.get(`/auctions/${currentAuction._id}/players`); setPlayers(r.data.players); } catch {} 
  };
  const fetchTeams   = async () => { 
    const currentAuction = tempAuction || sel;
    if (!currentAuction || !currentAuction._id || currentAuction._id === 'undefined') return; 
    try { const r = await api.get(`/auctions/${currentAuction._id}/teams`); setTeams(r.data.teams); } catch {} 
  };

  const subscribeSocket = useCallback(() => {
    if (!sel || !sel._id || sel._id === 'undefined') return;
    const s = getSocket();
    s.emit('joinAuction', { auctionId: sel._id });
    s.on('bidUpdate',    () => fetchTeams());
    s.on('playerSold',   (d:any) => { if (d.teams) setTeams(d.teams); fetchPlayers(); });
    s.on('playerUnsold', () => fetchPlayers());
    s.on('teamJoined',   (d:any) => { if (d.teams) setTeams(d.teams); else fetchTeams(); toast.success('A team just joined!'); });
    return () => { s.off('bidUpdate'); s.off('playerSold'); s.off('playerUnsold'); s.off('teamJoined'); };
  }, [sel?._id]);

  // Smooth scroll function
  const scrollToCreateForm = () => {
    setEditAuction({});
    setAuctionStep('form');
    setTempAuction(null);
    
    // Small delay to ensure the form is rendered before scrolling
    setTimeout(() => {
      createFormRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  const completeAuctionSetup = async () => {
    if (!tempAuction) return;
    setLoading(true);
    try {
      // Update auction to make it active - teams will join automatically via join code
      const r = await api.put(`/auctions/${tempAuction._id}`, { ...tempAuction, status: 'active' });
      setAuctions(p => [r.data.auction, ...p]);
      setSel(r.data.auction);
      setTempAuction(null);
      setAuctionStep('complete');
      toast.success(`🏏 Auction "${r.data.auction.name}" is ready! Join code: ${r.data.auction.joinCode}`);
      
      // Log activity to admin
      await logActivityToAdmin('auction_start', `Auction started: ${r.data.auction.name}`, {
        auctionId: r.data.auction._id,
        auctionName: r.data.auction.name,
        joinCode: r.data.auction.joinCode,
        organizerId: user?._id
      });
      
      // Refresh data for the new auction
      setTimeout(async () => {
        await fetchPlayers();
        await fetchTeams();
        
        // Auto-scroll to show join code
        const auctionCard = document.querySelector(`[data-auction-id="${r.data.auction._id}"]`);
        if (auctionCard) auctionCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    } catch (e:any) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const saveAuction = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      if (editAuction && editAuction._id && editAuction._id !== 'undefined') {
        const r = await api.put(`/auctions/${editAuction._id}`, aForm);
        setAuctions(p => p.map(a => a._id === editAuction._id ? r.data.auction : a));
        if (sel?._id === editAuction._id) setSel(r.data.auction);
        toast.success('Auction updated!'); 
        setEditAuction(null);
        
        // Log activity to admin
        await logActivityToAdmin('auction_update', `Auction updated: ${r.data.auction.name}`, {
          auctionId: r.data.auction._id,
          auctionName: r.data.auction.name,
          organizerId: user?._id
        });
      } else {
        // Step 1: Save auction details temporarily
        const fd = new FormData(); Object.entries(aForm).forEach(([k,v]) => fd.append(k, String(v)));
        const r = await api.post('/auctions', fd);
        setTempAuction(r.data.auction);
        setAuctionStep('players');
        toast.success('Auction details saved! Now add players.');
        
        // Log activity to admin
        await logActivityToAdmin('auction_create', `Auction created: ${r.data.auction.name}`, {
          auctionId: r.data.auction._id,
          auctionName: r.data.auction.name,
          organizerId: user?._id
        });
      }
      setAForm({ name:'', description:'', date:'', bidTimer:'30', bidIncrement:'500000', totalPursePerTeam:'100000000', maxTeams:'10', rtmPerTeam:'2', rtmEnabled:true });
    } catch (e:any) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const deleteAuction = async (id: string) => {
    if (!id || id === 'undefined') {
      toast.error('Invalid auction ID');
      return;
    }
    if (!confirm('Delete this auction and ALL its data?')) return;
    try { await api.delete(`/auctions/${id}`); setAuctions(p => p.filter(a => a._id !== id)); if (sel?._id === id) { setSel(null); setPlayers([]); setTeams([]); } toast.success('Deleted'); } catch { toast.error('Failed'); }
  };

  const startEdit = (a: any) => {
    if (!a || !a._id || a._id === 'undefined') {
      toast.error('Invalid auction data');
      return;
    }
    setEditAuction(a);
    setAForm({ name:a.name, description:a.description||'', date:a.date?new Date(a.date).toISOString().slice(0,16):'', bidTimer:String(a.bidTimer), bidIncrement:String(a.bidIncrement), totalPursePerTeam:String(a.totalPursePerTeam), maxTeams:String(a.maxTeams||10), rtmPerTeam:String(a.rtmPerTeam||2), rtmEnabled:a.rtmEnabled!==false });
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault(); 
    const currentAuction = tempAuction || sel;
    if (!currentAuction || !currentAuction._id || currentAuction._id === 'undefined') return; 
    setLoading(true);
    try {
      const fd = new FormData(); Object.entries(pForm).forEach(([k,v]) => fd.append(k,v));
      if (pImg) fd.append('image', pImg);
      const r = await api.post(`/auctions/${currentAuction._id}/players`, fd);
      setPlayers(p => [...p, r.data.player]); 
      toast.success('Player added!');
      setPForm({ name:'', role:'Batsman', category:'Gold', nationality:'Indian', age:'', basePrice:'1000000', matches:'0', runs:'0', wickets:'0', average:'0', strikeRate:'0', economy:'0' });
      setPImg(null); 
      
      // Log activity to admin
      await logActivityToAdmin('player_register', `Player registered: ${r.data.player.name}`, {
        playerId: r.data.player._id,
        playerName: r.data.player.name,
        playerRole: r.data.player.role,
        playerCategory: r.data.player.category,
        basePrice: r.data.player.basePrice,
        auctionId: currentAuction._id,
        auctionName: currentAuction.name,
        organizerId: user?._id
      });
      
      if (tempAuction) {
        setShowPF(false); // Keep form open for adding more players
      } else {
        setShowPF(false);
      }
    } catch (e:any) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const deletePlayer = async (pid: string) => {
    if (!sel || !sel._id || sel._id === 'undefined' || !confirm('Delete this player?')) return;
    try { await api.delete(`/auctions/${sel._id}/players/${pid}`); setPlayers(p => p.filter(x => x._id !== pid)); toast.success('Deleted'); } catch { toast.error('Failed'); }
  };

  const saveTeam = async (e: React.FormEvent) => {
    e.preventDefault(); 
    const currentAuction = tempAuction || sel;
    if (!currentAuction || !currentAuction._id || currentAuction._id === 'undefined') return; 
    setLoading(true);
    try {
      const fd = new FormData(); Object.entries(tForm).forEach(([k,v]) => fd.append(k,v));
      if (tLogo) fd.append('logo', tLogo);
      if (editTeam && editTeam._id && editTeam._id !== 'undefined') {
        const r = await api.put(`/auctions/${currentAuction._id}/teams/${editTeam._id}`, tForm);
        setTeams(p => p.map(t => t._id === editTeam._id ? r.data.team : t)); 
        toast.success('Updated!'); 
        setEditTeam(null);
        
        // Log activity to admin
        await logActivityToAdmin('team_update', `Team updated: ${r.data.team.name}`, {
          teamId: r.data.team._id,
          teamName: r.data.team.name,
          teamShortName: r.data.team.shortName,
          ownerName: r.data.team.ownerName,
          auctionId: currentAuction._id,
          auctionName: currentAuction.name,
          organizerId: user?._id
        });
      } else {
        const r = await api.post(`/auctions/${currentAuction._id}/teams`, fd);
        setTeams(p => [...p, r.data.team]); 
        toast.success('Team created!');
        
        // Log activity to admin
        await logActivityToAdmin('team_create', `Team created: ${r.data.team.name}`, {
          teamId: r.data.team._id,
          teamName: r.data.team.name,
          teamShortName: r.data.team.shortName,
          ownerName: r.data.team.ownerName,
          auctionId: currentAuction._id,
          auctionName: currentAuction.name,
          organizerId: user?._id
        });
      }
      setTForm({ name:'', shortName:'', ownerName:'', city:'', primaryColor:'#f59e0b', maxPlayers:'15' }); setTLogo(null); 
      if (tempAuction) {
        setShowTF(false); // Keep form open for adding more teams
      } else {
        setShowTF(false);
      }
    } catch (e:any) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const deleteTeam = async (tid: string) => {
    if (!sel || !sel._id || sel._id === 'undefined' || !confirm('Delete this team?')) return;
    try { await api.delete(`/auctions/${sel._id}/teams/${tid}`); setTeams(p => p.filter(t => t._id !== tid)); toast.success('Deleted'); } catch { toast.error('Failed'); }
  };

  const startEditTeam = (team: any) => {
    if (!team || !team._id || team._id === 'undefined') {
      toast.error('Invalid team data');
      return;
    }
    setEditTeam(team);
    setTForm({ name:team.name, shortName:team.shortName, ownerName:team.ownerName||'', city:team.city||'', primaryColor:team.primaryColor||'#f59e0b', maxPlayers:String(team.maxPlayers||15) });
    setShowTF(true);
  };

  const INP = "input-beast";
  const LBL = "block text-[10px] font-heading uppercase tracking-wider text-foreground mb-1.5";

  const sidebarItems = [
    { icon:'🏏', label:'My Auctions',    href:'' },
    { icon:'➕', label: editAuction ? 'Edit Auction' : 'Create Auction', href:'' },
    { icon:'👤', label:'Players',        href:'' },
    { icon:'🏆', label:'Teams',          href:'' },
  ];

  return (
    <AuthGuard roles={['organizer','admin']}>
      <div className="min-h-screen bg-background relative">
        {/* Full-screen background image */}
        <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage:"url('/bg-organizer.png')", backgroundSize:"cover", backgroundPosition:"center", backgroundAttachment:"fixed" }}/>
        <div className="fixed inset-0 pointer-events-none" style={{ background:"linear-gradient(180deg,hsl(222 47% 6% / 0.3) 0%,hsl(222 47% 5% / 0.5) 100%)" }}/>
        
        {/* Scrollable content container */}
        <div className="relative z-10 min-h-screen">
          {/* Header with logo and navigation */}
          <div className="sticky top-0 z-20 backdrop-blur-sm" style={{ background:'hsla(222 35% 9% / 0.95)' }}>
            <div className="max-w-7xl mx-auto px-7 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <img src="/beast-logo.png" alt="Beast Cricket" className="h-10 w-auto" />
                  <h1 className="font-heading text-2xl uppercase tracking-wider text-foreground">Organizer Dashboard</h1>
                </div>
                <div className="flex gap-2 items-center">
                  {sel && sel._id && sel._id !== 'undefined' && (
                    <Link href={`/auctions/${sel._id}`} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all">
                      🎬 Go Live
                    </Link>
                  )}
                  
                  {/* Profile Dropdown */}
                  <div className="relative" ref={profileDropdownRef}>
                    <button 
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-xs hover:bg-primary/10 transition-all"
                    >
                      <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                        {user?.name?.charAt(0)?.toUpperCase() || 'O'}
                      </span>
                      <span className="hidden sm:block">{user?.name || 'Organizer'}</span>
                      <span className="text-primary">▼</span>
                    </button>
                    
                    {showProfileDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-glass-premium rounded-xl border border-primary/20 shadow-lg overflow-hidden z-50">
                        <div className="p-3 border-b border-primary/10">
                          <div className="font-heading text-sm text-foreground">{user?.name || 'Organizer'}</div>
                          <div className="text-xs text-muted-foreground">{user?.email || 'organizer@beastcricket.com'}</div>
                        </div>
                        <div className="py-1">
                          <a href="/profile" className="block px-3 py-2 text-xs text-foreground hover:bg-primary/10 transition-colors">
                            👤 Edit Profile
                          </a>
                          <div className="border-t border-primary/10 mt-1 pt-1">
                            <button onClick={() => { window.location.href = '/login'; }} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                              🚪 Logout
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button onClick={() => window.location.href = '/'} className="px-3 py-2 rounded-lg text-xs font-heading uppercase tracking-wider text-foreground hover:text-primary hover:bg-primary/10 transition-all border border-border/40 hover:border-primary/30">← Home</button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main content */}
          <div className="max-w-7xl mx-auto px-7 py-6">
            {/* Auction selector when there are auctions */}
            {auctions.length > 0 && (
              <div className="flex justify-center mb-6">
                <select value={sel?._id && sel._id !== 'undefined' ? sel._id : ''} onChange={e => setSel(auctions.find(a => a._id === e.target.value))}
                  className="px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-wider text-foreground bg-glass-premium border border-border/40">
                  <option value="">Select an auction</option>
                  {auctions.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
            )}
            
            {/* Content container */}
            <div className="space-y-6 pb-20">
              {/* ── AUCTIONS ── */}
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
                <div className="flex items-center justify-center mb-4">
                  <div className="text-center">
                    <h2 className="font-heading text-3xl uppercase tracking-[0.12em] text-foreground">My <span className="text-gradient-gold">Auctions</span></h2>
                    <p className="font-display text-foreground text-xs mt-0.5">{auctions.length} tournament{auctions.length!==1?'s':''}</p>
                  </div>
                  <div className="absolute right-7">
                    <button onClick={scrollToCreateForm} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all">+ Create</button>
                  </div>
                </div>
                {auctions.length === 0 ? (
                  <div className="text-center">
                    <button onClick={scrollToCreateForm} className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold">Create First Auction</button>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 w-full max-w-6xl">
                    {auctions.map(a => (
                      <div key={a._id} className={`bg-glass-premium rounded-xl overflow-hidden group border-gold-subtle hover:border-gold transition-all duration-300 cursor-pointer ${sel?._id===a._id?'border-gold glow-gold':''}`}
                          onClick={() => { setSel(a); toast.success(`Selected: ${a.name}`); }}
                          style={{border:'1px solid rgba(255,255,255,0.08)'}}>
                        <div className="h-1" style={{ background:'linear-gradient(90deg,hsl(45 100% 51%),hsl(40 100% 38%))' }}/>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-heading text-lg uppercase tracking-[0.1em] text-foreground">{a.name}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider border ${a.status==='active'?'border-green-500/30 bg-green-500/10 text-green-400':'border-muted bg-muted/20 text-foreground'}`}>
                              {a.status==='active'&&<span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1"/>}{a.status}
                            </span>
                          </div>
                          <div className="text-foreground text-xs font-display space-y-0.5 mb-2">
                            <div>📅 {format(new Date(a.date),'dd MMM yyyy, hh:mm a')}</div>
                            <div>⏱ {a.bidTimer}s · {fmt(a.bidIncrement)} increment · {fmt(a.totalPursePerTeam)}/team</div>
                          </div>
                          {/* Join code */}
                          <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-3" style={{ background:'hsla(45,100%,51%,0.08)', border:'1px solid hsla(45,100%,51%,0.2)' }}>
                            <div>
                              <div className="text-primary text-[9px] font-heading uppercase tracking-widest">Join Code</div>
                              <div className="text-foreground font-heading font-bold tracking-[4px] text-2xl">{a.joinCode}</div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(a.joinCode); toast.success(`Code ${a.joinCode} copied!`); }}
                              className="px-3 py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all border border-primary/20">📋 Copy</button>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setSel(a); }} className="flex-1 py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider transition-all" style={{ background:'hsla(45,100%,51%,0.1)', border:'1px solid hsla(45,100%,51%,0.25)', color:'hsl(45 100% 51%)' }}>⚙️ Manage</button>
                            <Link href={`/auctions/${a._id}`} className="flex-1 py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider text-center transition-all" style={{ background:'hsla(142,70%,45%,0.1)', border:'1px solid hsla(142,70%,45%,0.25)', color:'hsl(142 70% 55%)' }}>🔴 Live</Link>
                            <button onClick={(e) => { e.stopPropagation(); startEdit(a); }} className="px-2.5 py-1.5 rounded-lg text-[10px] font-heading uppercase transition-all" style={{ background:'hsla(210,100%,55%,0.1)', border:'1px solid hsla(210,100%,55%,0.25)', color:'hsl(210 100% 65%)' }}>✏️</button>
                            <button onClick={(e) => { e.stopPropagation(); a._id && deleteAuction(a._id); }} className="px-2.5 py-1.5 rounded-lg text-[10px] font-heading uppercase transition-all" style={{ background:'hsla(0,84%,60%,0.1)', border:'1px solid hsla(0,84%,60%,0.25)', color:'hsl(0 84% 65%)' }}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* ── CREATE/EDIT AUCTION FORM ── */}
              {editAuction && (
                <motion.div ref={createFormRef} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
                  <div className="text-center mb-4">
                    <h2 className="font-heading text-3xl uppercase tracking-[0.12em] text-foreground">
                      {auctionStep === 'form' && 'Create Auction Details'}
                      {auctionStep === 'players' && 'Add Players'}
                      {auctionStep === 'complete' && 'Auction Ready!'}
                      <span className="text-gradient-gold"></span>
                    </h2>
                  </div>
                  <div className="flex justify-center">
                    <div className="max-w-md w-full bg-glass-premium rounded-xl p-2.5 gold-edge border-gold-subtle">
                      
                      {auctionStep === 'form' && (
                        <form onSubmit={saveAuction} className="space-y-4">
                          <div className="grid grid-cols-1 gap-2.5">
                            <div className="col-span-2"><label className={LBL}>Auction Name *</label><input value={aForm.name} onChange={e=>setAForm(p=>({...p,name:e.target.value}))} className={INP} placeholder="IPL 2026 Season" required/></div>
                            <div className="col-span-2"><label className={LBL}>Description</label><textarea value={aForm.description} onChange={e=>setAForm(p=>({...p,description:e.target.value}))} className={INP+' resize-none'} rows={2}/></div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div><label className={LBL}>Date & Time *</label><input type="datetime-local" value={aForm.date} onChange={e=>setAForm(p=>({...p,date:e.target.value}))} className={INP} required/></div>
                              <div><label className={LBL}>Bid Timer (sec)</label><input type="number" value={aForm.bidTimer} onChange={e=>setAForm(p=>({...p,bidTimer:e.target.value}))} className={INP} min="10" max="120"/></div>
                              <div><label className={LBL}>Bid Increment (₹)</label><input type="number" value={aForm.bidIncrement} onChange={e=>setAForm(p=>({...p,bidIncrement:e.target.value}))} className={INP}/></div>
                              <div><label className={LBL}>Purse Per Team (₹)</label><input type="number" value={aForm.totalPursePerTeam} onChange={e=>setAForm(p=>({...p,totalPursePerTeam:e.target.value}))} className={INP}/></div>
                              <div><label className={LBL}>Max Teams</label><input type="number" value={aForm.maxTeams} onChange={e=>setAForm(p=>({...p,maxTeams:e.target.value}))} className={INP}/></div>
                              <div><label className={LBL}>RTM Cards / Team</label><input type="number" value={aForm.rtmPerTeam} onChange={e=>setAForm(p=>({...p,rtmPerTeam:e.target.value}))} className={INP} min="0" max="5"/></div>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg" style={{ background:'hsla(222,30%,16%,0.5)', border:'1px solid hsl(222 30% 22%)' }}>
                            <input type="checkbox" checked={aForm.rtmEnabled} onChange={e=>setAForm(p=>({...p,rtmEnabled:e.target.checked}))} className="w-4 h-4 accent-primary"/>
                            <div><div className="font-heading text-sm uppercase tracking-wider text-foreground">Enable RTM (Right to Match)</div><div className="text-xs font-display mt-0.5">Teams can match winning bid to retain a player</div></div>
                          </label>
                          <div className="flex gap-2">
                            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">
                              {loading ? 'Saving...' : '🏏 Save & Continue'}
                            </button>
                            <button type="button" onClick={() => { setEditAuction(null); setAuctionStep('form'); setTempAuction(null); }} className="px-4 py-2.5 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-sm hover:bg-primary/10 transition-all">Cancel</button>
                          </div>
                        </form>
                      )}

                      {auctionStep === 'players' && (
                        <div className="text-center py-8">
                          <p className="text-foreground mb-4">Add players to your auction pool</p>
                          <div className="flex justify-center gap-4 mb-6">
                            <button onClick={() => setShowPF(true)} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all">
                              + Add Players
                            </button>
                            <button onClick={completeAuctionSetup} disabled={loading || players.length === 0} className="px-6 py-2.5 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-sm hover:bg-primary/10 transition-all disabled:opacity-50">
                              {loading ? 'Finalizing...' : '🏏 Complete Setup'}
                            </button>
                          </div>
                          {players.length > 0 && (
                            <div className="text-sm text-foreground">
                              <p>✅ {players.length} players added</p>
                            </div>
                          )}
                        </div>
                      )}

                      {auctionStep === 'teams' && (
                        <div className="text-center py-8">
                          <p className="text-foreground mb-4">Add teams to participate in the auction</p>
                          <div className="flex justify-center gap-4 mb-6">
                            <button onClick={() => setShowTF(true)} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all">
                              + Add Teams
                            </button>
                            <button onClick={completeAuctionSetup} disabled={loading || teams.length === 0} className="px-6 py-2.5 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-sm hover:bg-primary/10 transition-all disabled:opacity-50">
                              {loading ? 'Finalizing...' : '🏏 Complete Setup'}
                            </button>
                          </div>
                          {teams.length > 0 && (
                            <div className="text-sm text-foreground">
                              <p>✅ {teams.length} teams added</p>
                            </div>
                          )}
                        </div>
                      )}

                      {auctionStep === 'complete' && tempAuction && (
                        <div className="text-center py-8">
                          <div className="mb-6">
                            <span style={{fontSize:'60px',marginBottom:'16px'}}>🏆</span>
                          </div>
                          <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-2">
                            Auction Ready!
                          </h3>
                          <div className="bg-glass-premium rounded-xl p-6 border-gold-subtle">
                            <div className="text-center mb-4">
                              <div className="text-5xl font-bold text-gradient-gold mb-2" style={{fontFamily:'Oswald,sans-serif',letterSpacing:'4px'}}>
                                {tempAuction.joinCode}
                              </div>
                              <p className="text-sm text-foreground">Share this code with team owners</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <h4 className="font-heading text-lg text-foreground mb-1">{tempAuction.name}</h4>
                                <p className="text-sm text-foreground">{tempAuction.description}</p>
                              </div>
                              <div>
                                <p className="text-sm text-foreground">Purse: {fmt(tempAuction.totalPursePerTeam)}</p>
                                <p className="text-sm text-foreground">Teams: {tempAuction.maxTeams}</p>
                                <p className="text-sm text-foreground">Timer: {tempAuction.bidTimer}s</p>
                              </div>
                            </div>
                            <button onClick={() => { setAuctionStep('form'); setTempAuction(null); }} className="w-full px-6 py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] transition-all">
                              Create Another Auction
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── PLAYERS ── */}
              <motion.div id="players-section" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
                <div className="flex items-center justify-center mb-4">
                  <div className="text-center">
                    <h2 className="font-heading text-3xl uppercase tracking-[0.12em] text-foreground">Manage <span className="text-gradient-gold">Players</span></h2>
                    {sel && <p className="font-display text-foreground text-xs mt-0.5">{sel.name} · {players.length} players</p>}
                  </div>
                  {sel && <div className="absolute right-7"><button onClick={() => setShowPF(v=>!v)} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all">{showPF ? '✕ Cancel' : '+ Add Player'}</button></div>}
                </div>
                {!sel && <div className="text-center py-16 text-foreground font-display">Select an auction first to manage players</div>}

                {(sel || tempAuction) && (
                  <>
                    <AnimatePresence>
                      {showPF && (
                        <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="overflow-hidden mb-6">
                          <div className="bg-glass-premium rounded-xl p-6 gold-edge border-gold-subtle">
                            <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-5">Add Player</h3>
                            <form onSubmit={addPlayer}>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                <div className="col-span-2 md:col-span-1"><label className={LBL}>Name *</label><input value={pForm.name} onChange={e=>setPForm(p=>({...p,name:e.target.value}))} className={INP} placeholder="Player name" required/></div>
                                <div><label className={LBL}>Role *</label><select value={pForm.role} onChange={e=>setPForm(p=>({...p,role:e.target.value}))} className={INP} style={{ background:'hsl(222 30% 16%)' }}>{['Batsman','Bowler','AllRounder','WicketKeeper','Other'].map(r=><option key={r} value={r} style={{ background:'hsl(222 30% 16%)' }}>{r}</option>)}</select></div>
                                <div><label className={LBL}>Category *</label><select value={pForm.category} onChange={e=>setPForm(p=>({...p,category:e.target.value}))} className={INP} style={{ background:'hsl(222 30% 16%)' }}>{['Gold','Silver','Bronze'].map(c=><option key={c} value={c} style={{ background:'hsl(222 30% 16%)' }}>{c}</option>)}</select></div>
                                <div><label className={LBL}>Nationality</label><input value={pForm.nationality} onChange={e=>setPForm(p=>({...p,nationality:e.target.value}))} className={INP} placeholder="Indian"/></div>
                                <div><label className={LBL}>Age</label><input type="number" value={pForm.age} onChange={e=>setPForm(p=>({...p,age:e.target.value}))} className={INP} placeholder="24"/></div>
                                <div><label className={LBL}>Base Price (₹) *</label><input type="number" value={pForm.basePrice} onChange={e=>setPForm(p=>({...p,basePrice:e.target.value}))} className={INP} required/></div>
                                <div><label className={LBL}>Matches</label><input type="number" value={pForm.matches} onChange={e=>setPForm(p=>({...p,matches:e.target.value}))} className={INP}/></div>
                                <div><label className={LBL}>Runs</label><input type="number" value={pForm.runs} onChange={e=>setPForm(p=>({...p,runs:e.target.value}))} className={INP}/></div>
                                <div><label className={LBL}>Wickets</label><input type="number" value={pForm.wickets} onChange={e=>setPForm(p=>({...p,wickets:e.target.value}))} className={INP}/></div>
                                <div><label className={LBL}>Average</label><input type="number" step="0.01" value={pForm.average} onChange={e=>setPForm(p=>({...p,average:e.target.value}))} className={INP}/></div>
                                <div><label className={LBL}>Strike Rate</label><input type="number" step="0.01" value={pForm.strikeRate} onChange={e=>setPForm(p=>({...p,strikeRate:e.target.value}))} className={INP}/></div>
                                <div><label className={LBL}>Photo</label><input type="file" accept="image/*" onChange={e=>setPImg(e.target.files?.[0]||null)} className="w-full text-foreground text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-heading file:text-xs file:uppercase file:tracking-wider cursor-pointer hover:file:bg-primary/20"/></div>
                              </div>
                              <button type="submit" disabled={loading} className="px-7 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">{loading?'Adding...':'+ Add Player'}</button>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-center">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 w-full max-w-6xl">
                      {players.map(p => (
                        <div key={p._id} className="bg-glass-premium rounded-xl overflow-hidden group border-gold-subtle hover:border-gold transition-all">
                          <div className="relative overflow-hidden" style={{ height:120, background:'hsl(222 40% 10%)' }}>
                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover object-top"/> : <div className="w-full h-full flex items-center justify-center text-4xl">{roleIcons[p.role]}</div>}
                            <div className="absolute inset-0" style={{ background:'linear-gradient(to top, rgba(0,0,0,0.85), transparent 50%)' }}/>
                            <div className="absolute top-2 right-2"><span className={`text-[9px] px-2 py-0.5 rounded-full font-heading uppercase tracking-wider border ${p.status==='sold'?'border-green-500/40 bg-green-500/20 text-green-400':p.status==='active'?'border-yellow-500/40 bg-yellow-500/20 text-yellow-400':'border-muted bg-muted/20 text-foreground'}`}>{p.status}</span></div>
                            <button onClick={() => deletePlayer(p._id)} className="absolute top-2 left-2 w-6 h-6 bg-destructive/80 rounded-full text-white flex items-center justify-center text-xs transition-opacity">✕</button>
                          </div>
                          <div className="p-2">
                            <div className="text-foreground text-xs font-display font-bold truncate mb-1">{p.name}</div>
                            <div className="flex gap-1 flex-wrap mb-0.5">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-heading uppercase tracking-wider ${roleColors[p.role]||''}`}>{p.role}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-heading uppercase tracking-wider ${categoryColors[p.category]||''}`}>{p.category}</span>
                            </div>
                            <div className="text-gradient-gold font-heading font-bold text-sm">{fmt(p.basePrice)}</div>
                          </div>
                        </div>
                      ))}
                      {players.length===0&&<div className="col-span-full text-center py-12 text-foreground font-display">No players added yet.</div>}
                    </div>
                  </div>
                  </>
                )}
              </motion.div>

              {/* ── TEAMS ── */}
              <motion.div id="teams-section" initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
                <div className="flex items-center justify-center mb-4">
                  <div className="text-center">
                    <h2 className="font-heading text-3xl uppercase tracking-[0.12em] text-foreground">Manage <span className="text-gradient-gold">Teams</span></h2>
                    {sel && <p className="font-display text-foreground text-xs mt-0.5">{sel.name} · {teams.length} teams</p>}
                  </div>
                  {sel && <div className="absolute right-7"><button onClick={() => { setEditTeam(null); setTForm({ name:'',shortName:'',ownerName:'',city:'',primaryColor:'#f59e0b',maxPlayers:'15' }); setShowTF(v=>!v); }} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all">{showTF&&!editTeam?'✕ Cancel':'+ Add Team'}</button></div>}
                </div>
                {!sel && <div className="text-center py-16 text-foreground font-display">Select an auction first to manage teams</div>}

                {(sel || tempAuction) && (
                  <>
                    <AnimatePresence>
                      {showTF && (
                        <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="overflow-hidden mb-6">
                          <div className="bg-glass-premium rounded-xl p-6 gold-edge border-gold-subtle">
                            <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-5">{editTeam ? '✏️ Edit Team' : 'Create Team'}</h3>
                            <form onSubmit={saveTeam}>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                <div className="col-span-2 md:col-span-1"><label className={LBL}>Team Name *</label><input value={tForm.name} onChange={e=>setTForm(p=>({...p,name:e.target.value}))} className={INP} placeholder="Mumbai Indians" required/></div>
                                <div><label className={LBL}>Short Code *</label><input value={tForm.shortName} onChange={e=>setTForm(p=>({...p,shortName:e.target.value.toUpperCase().slice(0,4)}))} className={INP} placeholder="MI" maxLength={4} required/></div>
                                <div><label className={LBL}>Owner Name</label><input value={tForm.ownerName} onChange={e=>setTForm(p=>({...p,ownerName:e.target.value}))} className={INP} placeholder="Owner name"/></div>
                                <div><label className={LBL}>City</label><input value={tForm.city} onChange={e=>setTForm(p=>({...p,city:e.target.value}))} className={INP} placeholder="Mumbai"/></div>
                                <div><label className={LBL}>Primary Color</label><input type="color" value={tForm.primaryColor} onChange={e=>setTForm(p=>({...p,primaryColor:e.target.value}))} className="w-full h-10 rounded cursor-pointer"/></div>
                                <div><label className={LBL}>Max Players</label><input type="number" value={tForm.maxPlayers} onChange={e=>setTForm(p=>({...p,maxPlayers:e.target.value}))} className={INP} min="15" max="25"/></div>
                              </div>
                              <div className="flex gap-3">
                                <button type="submit" disabled={loading} className="px-7 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">{loading?'Saving...':editTeam?'✏️ Update Team':'+ Add Team'}</button>
                                {editTeam && <button type="button" onClick={() => { setEditTeam(null); setShowTF(false); }} className="px-6 py-2.5 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-xs hover:bg-primary/10 transition-all">Cancel</button>}
                              </div>
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex justify-center">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full max-w-6xl">
                      {teams.map(t => (
                        <div key={t._id} className="bg-glass-premium rounded-xl p-4 border-gold-subtle hover:border-gold transition-all group">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg" style={{ background:t.primaryColor||'#f59e0b' }}>{t.shortName?.slice(0,2)?.toUpperCase()}</div>
                              <div>
                                <h3 className="font-heading text-lg uppercase tracking-wider text-foreground">{t.name}</h3>
                                <p className="text-foreground text-xs font-display">{t.ownerName||'No owner'} · {t.city||'No city'}</p>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditTeam(t)} className="w-6 h-6 bg-primary/20 rounded text-primary flex items-center justify-center text-xs hover:bg-primary/30">✏️</button>
                              <button onClick={() => deleteTeam(t._id)} className="w-6 h-6 bg-destructive/20 rounded text-destructive flex items-center justify-center text-xs hover:bg-destructive/30">🗑️</button>
                            </div>
                          </div>
                          <div className="text-foreground text-xs font-display space-y-0.5">
                            <div>👥 {t.players?.length||0}/{t.maxPlayers||15} players</div>
                            <div>💰 {fmt(t.purse||0)} purse</div>
                            <div>🎯 {t.points||0} points</div>
                          </div>
                        </div>
                      ))}
                      {teams.length===0&&<div className="col-span-full text-center py-12 text-foreground font-display">No teams yet.</div>}
                    </div>
                  </div>
                  </>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
