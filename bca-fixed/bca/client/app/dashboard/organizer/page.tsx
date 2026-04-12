'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { fmt, roleColors, categoryColors, roleIcons } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Tab = 'auctions' | 'create' | 'players' | 'teams';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('auctions');
  const [auctions, setAuctions] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPF, setShowPF] = useState(false);
  const [showTF, setShowTF] = useState(false);
  const [editAuction, setEditAuction] = useState<any>(null);
  const [editTeam, setEditTeam] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string>('');

  const [aForm, setAForm] = useState({ name:'', description:'', date:'', bidTimer:'30', bidIncrement:'500000', totalPursePerTeam:'100000000', maxTeams:'10', rtmPerTeam:'2', rtmEnabled:true });
  const [pForm, setPForm] = useState({ name:'', role:'Batsman', category:'Gold', nationality:'Indian', age:'', basePrice:'1000000', matches:'0', runs:'0', wickets:'0', average:'0', strikeRate:'0', economy:'0' });
  const [tForm, setTForm] = useState({ name:'', shortName:'', ownerName:'', city:'', primaryColor:'#f59e0b', maxPlayers:'15' });
  const [pImg, setPImg] = useState<File|null>(null);
  const [tLogo, setTLogo] = useState<File|null>(null);

  // ✅ DEBUGGING
  useEffect(() => {
    console.log('🔍 Environment Check:');
    console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('Socket URL:', process.env.NEXT_PUBLIC_SOCKET_URL);
    console.log('Current User:', user);
    console.log('User Role:', user?.role);
  }, [user]);

  useEffect(() => { 
    if (user) {
      console.log('📡 Fetching auctions...');
      fetchAuctions(); 
    }
  }, [user]);

  useEffect(() => { 
    if (sel) { 
      console.log('📡 Selected auction:', sel._id);
      fetchPlayers(); 
      fetchTeams(); 
      subscribeSocket(); 
    } 
  }, [sel?._id]);

  const fetchAuctions = async () => {
    setFetchError('');
    try {
      console.log('🔄 Calling /api/auctions/my...');
      const r = await api.get('/api/auctions/my');
      console.log('✅ Auctions response:', r.data);
      
      const list = r.data.auctions || [];
      setAuctions(list);
      if (list.length && !sel) setSel(list[0]);
    } catch (err: any) {
      console.error('❌ Fetch auctions error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load auctions';
      setFetchError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const fetchPlayers = async () => {
    if (!sel) return;
    try {
      console.log('🔄 Fetching players for auction:', sel._id);
      const r = await api.get(`/api/auctions/${sel._id}/players`);
      console.log('✅ Players response:', r.data);
      setPlayers(r.data.players || []);
    } catch (err: any) {
      console.error('❌ Fetch players error:', err);
      toast.error('Failed to load players');
    }
  };

  const fetchTeams = async () => {
    if (!sel) return;
    try {
      console.log('🔄 Fetching teams for auction:', sel._id);
      const r = await api.get(`/api/auctions/${sel._id}/teams`);
      console.log('✅ Teams response:', r.data);
      setTeams(r.data.teams || []);
    } catch (err: any) {
      console.error('❌ Fetch teams error:', err);
      toast.error('Failed to load teams');
    }
  };

  const subscribeSocket = useCallback(() => {
    if (!sel) return;
    try {
      const s = getSocket();
      s.emit('joinAuction', { auctionId: sel._id });
      s.on('bidUpdate', () => fetchTeams());
      s.on('playerSold', (d: any) => { if (d.teams) setTeams(d.teams); fetchPlayers(); });
      s.on('teamJoined', (d: any) => { if (d.teams) setTeams(d.teams); else fetchTeams(); toast.success('A team just joined!'); });
      return () => { s.off('bidUpdate'); s.off('playerSold'); s.off('teamJoined'); };
    } catch (err) {
      console.error('❌ Socket connection error:', err);
    }
  }, [sel?._id]);

  const saveAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editAuction) {
        const r = await api.put(`/api/auctions/${editAuction._id}`, aForm);
        setAuctions(p => p.map(a => a._id === editAuction._id ? r.data.auction : a));
        if (sel?._id === editAuction._id) setSel(r.data.auction);
        toast.success('Updated!');
        setEditAuction(null);
      } else {
        const r = await api.post('/api/auctions', aForm);
        setAuctions(p => [r.data.auction, ...p]);
        setSel(r.data.auction);
        toast.success('Auction created! 🏏');
      }
      setTab('players');
      setAForm({ name:'', description:'', date:'', bidTimer:'30', bidIncrement:'500000', totalPursePerTeam:'100000000', maxTeams:'10', rtmPerTeam:'2', rtmEnabled:true });
    } catch (e: any) {
      console.error('❌ Save auction error:', e);
      toast.error(e.response?.data?.error || 'Failed to save auction');
    } finally {
      setLoading(false);
    }
  };

  const deleteAuction = async (id: string) => {
    if (!confirm('Delete this auction and ALL its data?')) return;
    try {
      await api.delete(`/api/auctions/${id}`);
      setAuctions(p => p.filter(a => a._id !== id));
      if (sel?._id === id) { setSel(null); setPlayers([]); setTeams([]); }
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const startEdit = (a: any) => {
    setEditAuction(a);
    setAForm({ name:a.name, description:a.description||'', date:a.date?new Date(a.date).toISOString().slice(0,16):'', bidTimer:String(a.bidTimer), bidIncrement:String(a.bidIncrement), totalPursePerTeam:String(a.totalPursePerTeam), maxTeams:String(a.maxTeams||10), rtmPerTeam:String(a.rtmPerTeam||2), rtmEnabled:a.rtmEnabled!==false });
    setTab('create');
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(pForm).forEach(([k,v]) => fd.append(k,v));
      if (pImg) fd.append('image', pImg);
      const r = await api.post(`/api/auctions/${sel._id}/players`, fd);
      setPlayers(p => [...p, r.data.player]);
      toast.success('Player added!');
      setPForm({ name:'', role:'Batsman', category:'Gold', nationality:'Indian', age:'', basePrice:'1000000', matches:'0', runs:'0', wickets:'0', average:'0', strikeRate:'0', economy:'0' });
      setPImg(null);
      setShowPF(false);
    } catch (e: any) {
      console.error('❌ Add player error:', e);
      toast.error(e.response?.data?.error || 'Failed to add player');
    } finally {
      setLoading(false);
    }
  };

  const deletePlayer = async (pid: string) => {
    if (!sel || !confirm('Delete this player?')) return;
    try {
      await api.delete(`/api/auctions/${sel._id}/players/${pid}`);
      setPlayers(p => p.filter(x => x._id !== pid));
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const saveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    setLoading(true);
    try {
      if (editTeam) {
        const r = await api.put(`/api/auctions/${sel._id}/teams/${editTeam._id}`, tForm);
        setTeams(p => p.map(t => t._id === editTeam._id ? r.data.team : t));
        toast.success('Updated!');
        setEditTeam(null);
      } else {
        const fd = new FormData();
        Object.entries(tForm).forEach(([k,v]) => fd.append(k,v));
        if (tLogo) fd.append('logo', tLogo);
        const r = await api.post(`/api/auctions/${sel._id}/teams`, fd);
        setTeams(p => [...p, r.data.team]);
        toast.success('Team created!');
      }
      setTForm({ name:'', shortName:'', ownerName:'', city:'', primaryColor:'#f59e0b', maxPlayers:'15' });
      setTLogo(null);
      setShowTF(false);
    } catch (e: any) {
      console.error('❌ Save team error:', e);
      toast.error(e.response?.data?.error || 'Failed to save team');
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (tid: string) => {
    if (!sel || !confirm('Delete this team?')) return;
    try {
      await api.delete(`/api/auctions/${sel._id}/teams/${tid}`);
      setTeams(p => p.filter(t => t._id !== tid));
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const startEditTeam = (team: any) => {
    setEditTeam(team);
    setTForm({ name:team.name, shortName:team.shortName, ownerName:team.ownerName||'', city:team.city||'', primaryColor:team.primaryColor||'#f59e0b', maxPlayers:String(team.maxPlayers||15) });
    setShowTF(true);
  };

  const INP = "input-beast";
  const LBL = "block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5";

  return (
    <AuthGuard roles={['organizer','admin']}>
      <div className="flex h-screen overflow-hidden bg-background">

        {/* ERROR DEBUG BOX */}
        {fetchError && (
          <div className="fixed top-4 right-4 z-50 bg-red-500/20 border border-red-500 rounded-lg p-4 max-w-md">
            <div className="font-bold text-red-400 mb-2">⚠️ API Error</div>
            <div className="text-sm text-white">{fetchError}</div>
            <div className="text-xs text-gray-300 mt-2">
              API URL: {process.env.NEXT_PUBLIC_API_URL || 'NOT SET'}
            </div>
            <button 
              onClick={() => {setFetchError(''); fetchAuctions();}}
              className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* SIDEBAR */}
        <div className="w-56 flex-shrink-0 flex flex-col h-full border-r" style={{ background:'hsl(222 40% 8%)', borderColor:'hsla(45,100%,51%,0.12)' }}>
          <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor:'hsla(45,100%,51%,0.1)' }}>
            <Link href="/"><img src="/beast-logo.png" alt="Beast" className="w-9 h-9 object-contain" style={{ filter:'drop-shadow(0 0 8px hsla(45,100%,51%,0.5))' }}/></Link>
            <div>
              <div className="font-heading text-sm uppercase tracking-[0.15em] text-gradient-gold leading-none">Beast Cricket</div>
              <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mt-0.5">Organizer</div>
            </div>
          </div>

          {user && (
            <div className="mx-3 mt-3 p-3 rounded-lg bg-glass-navy">
              <div className="text-[9px] font-heading uppercase tracking-wider text-muted-foreground mb-0.5">Organizer</div>
              <div className="font-display font-semibold text-foreground text-sm truncate">{user.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
            </div>
          )}

          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {([
              { id:'auctions', icon:'🏏', label:'My Auctions' },
              { id:'create', icon: editAuction ? '✏️':'➕', label: editAuction ? 'Edit Auction':'Create Auction' },
              { id:'players', icon:'👤', label:'Players' },
              { id:'teams', icon:'🏆', label:'Teams' },
            ] as any[]).map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); if (n.id!=='create') setEditAuction(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-semibold transition-all text-left ${tab===n.id?'bg-primary/15 text-primary border border-primary/20':'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}>
                <span>{n.icon}</span><span>{n.label}</span>
              </button>
            ))}

            {auctions.length > 0 && (
              <div className="pt-3">
                <p className="text-[9px] font-heading uppercase tracking-widest text-muted-foreground px-3 mb-1.5">Active Auction</p>
                <select value={sel?._id||''} onChange={e => setSel(auctions.find(a => a._id===e.target.value))}
                  className="input-beast text-xs py-2" style={{ background:'hsl(222 30% 16%)' }}>
                  {auctions.map(a => <option key={a._id} value={a._id} style={{ background:'hsl(222 30% 16%)' }}>{a.name}</option>)}
                </select>
              </div>
            )}

            <div className="pt-2 space-y-0.5 border-t border-border/30 mt-2">
              {sel && (
                <Link href={`/auctions/${sel._id}`}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all"
                  style={{ background:'hsla(45,100%,51%,0.12)', border:'1px solid hsla(45,100%,51%,0.25)', color:'hsl(45 100% 51%)' }}>
                  🔴 Go Live
                </Link>
              )}
              <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-semibold text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all">
                <span>👤</span><span>Profile</span>
              </Link>
              <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-semibold text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all">
                <span>🏠</span><span>Home</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* MAIN CONTENT - REST OF THE CODE STAYS THE SAME */}
        <div className="flex-1 overflow-auto relative">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:"url('/bg-organizer.png')", backgroundSize:'cover', backgroundPosition:'center', opacity:0.07 }}/>
          <div className="absolute inset-0 pointer-events-none" style={{ background:'linear-gradient(180deg,hsl(222 47% 6%/0.6) 0%,hsl(222 47% 5%/0.85) 100%)' }}/>
          <div className="relative p-7">

            {/* REST OF YOUR CODE STAYS EXACTLY THE SAME */}
            {/* I'm keeping it short here - your auctions, create, players, teams tabs remain unchanged */}
            
            {/* MY AUCTIONS TAB */}
            {tab==='auctions' && (
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
                {/* ... your existing auctions tab code ... */}
              </motion.div>
            )}

            {/* ... rest of your tabs ... */}

          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
