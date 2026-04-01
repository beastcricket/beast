const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Auction = require('../models/Auction');
const Player = require('../models/Player');
const Team = require('../models/Team');
const Bid = require('../models/Bid');
const RTM = require('../models/RTM');
const User = require('../models/User');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const { getMulterStorage, getImageUrl } = require('../utils/cloudinary');
const _storage = getMulterStorage(multer, path.join(__dirname, '../uploads'));
const upload = multer({ storage: _storage, limits: { fileSize: 5*1024*1024 } });

// ─── PUBLIC ────────────────────────────────────────────────────

// All auctions
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = req.user?.role === 'admin' ? {} : { isPublic: true };
    const auctions = await Auction.find(filter).populate('organizerId','name email').sort({ createdAt: -1 });
    res.json({ success: true, auctions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Join auction by code (team owners)
router.post('/join-by-code', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Join code required' });
    const auction = await Auction.findOne({ joinCode: code.toUpperCase().trim() });
    if (!auction) return res.status(404).json({ error: 'Invalid join code. Check with your organizer.' });
    if (auction.status === 'completed') return res.status(400).json({ error: 'This auction has already ended.' });
    // Check team count
    const teamCount = await Team.countDocuments({ auctionId: auction._id });
    if (teamCount >= auction.maxTeams) return res.status(400).json({ error: 'Auction is full. Max teams reached.' });
    // Check if user already has a team in this auction
    const existing = await Team.findOne({ auctionId: auction._id, ownerId: req.user._id });
    if (existing) return res.json({ success: true, auction, team: existing, alreadyJoined: true });
    res.json({ success: true, auction, alreadyJoined: false });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// My auctions
router.get('/my', authenticate, authorize('organizer','admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { organizerId: req.user._id };
    const auctions = await Auction.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, auctions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Single auction
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id).populate('organizerId','name email').populate('currentPlayerId');
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    res.json({ success: true, auction });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create auction
router.post('/', authenticate, authorize('organizer','admin'), upload.single('bannerImage'), async (req, res) => {
  try {
    const { name, description, date, bidTimer, bidIncrement, totalPursePerTeam, maxTeams, rtmEnabled, rtmPerTeam } = req.body;
    const auction = new Auction({
      organizerId: req.user._id, name, description, date,
      bidTimer: parseInt(bidTimer)||30,
      bidIncrement: parseInt(bidIncrement)||500000,
      totalPursePerTeam: parseInt(totalPursePerTeam)||100000000,
      maxTeams: parseInt(maxTeams)||10,
      rtmEnabled: rtmEnabled !== 'false',
      rtmPerTeam: parseInt(rtmPerTeam)||2,
      bannerImage: getImageUrl(req.file),
    });
    await auction.save();
    res.status(201).json({ success: true, auction });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', authenticate, authorize('organizer','admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, organizerId: req.user._id };
    const auction = await Auction.findOneAndUpdate(filter, req.body, { new: true });
    if (!auction) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, auction });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, authorize('organizer','admin'), async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, organizerId: req.user._id };
    await Auction.findOneAndDelete(filter);
    await Player.deleteMany({ auctionId: req.params.id });
    await Team.deleteMany({ auctionId: req.params.id });
    await Bid.deleteMany({ auctionId: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PLAYERS ────────────────────────────────────────────────────

router.get('/:id/players', optionalAuth, async (req, res) => {
  try {
    const catOrder = { Elite:0, Gold:1, Silver:2, Emerging:3 };
    const players = await Player.find({ auctionId: req.params.id }).populate('teamId','name shortName primaryColor logo');
    players.sort((a,b) => catOrder[a.category]-catOrder[b.category] || b.basePrice-a.basePrice);
    res.json({ success: true, players });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/players', authenticate, authorize('organizer','admin'), upload.single('image'), async (req, res) => {
  try {
    const { name, role, category, nationality, age, basePrice, matches, runs, wickets, average, strikeRate, economy } = req.body;
    const player = new Player({
      auctionId: req.params.id, name, role, category,
      nationality: nationality||'Indian', age: age?parseInt(age):undefined,
      basePrice: parseInt(basePrice),
      imageUrl: getImageUrl(req.file),
      stats: { matches:parseInt(matches)||0, runs:parseInt(runs)||0, wickets:parseInt(wickets)||0, average:parseFloat(average)||0, strikeRate:parseFloat(strikeRate)||0, economy:parseFloat(economy)||0 }
    });
    await player.save();
    res.status(201).json({ success: true, player });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/players/:playerId', authenticate, authorize('organizer','admin'), async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.playerId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── TEAMS ────────────────────────────────────────────────────

router.get('/:id/teams', optionalAuth, async (req, res) => {
  try {
    const teams = await Team.find({ auctionId: req.params.id }).populate('ownerId','name email');
    res.json({ success: true, teams });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Team owner creates their own team after joining via code
router.post('/:id/teams/self-register', authenticate, upload.single('logo'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    if (auction.status === 'completed') return res.status(400).json({ error: 'Auction already completed' });
    // Check if already has team
    const existing = await Team.findOne({ auctionId: req.params.id, ownerId: req.user._id });
    if (existing) return res.status(400).json({ error: 'You already have a team in this auction', team: existing });
    // Check max teams
    const count = await Team.countDocuments({ auctionId: req.params.id });
    if (count >= auction.maxTeams) return res.status(400).json({ error: 'Auction is full' });

    const { name, shortName, ownerName, city, primaryColor } = req.body;
    const team = new Team({
      auctionId: req.params.id,
      ownerId: req.user._id,
      name, shortName: shortName.toUpperCase().slice(0,4),
      ownerName: ownerName || req.user.name,
      city: city || '',
      primaryColor: primaryColor || '#f59e0b',
      purse: auction.totalPursePerTeam,
      initialPurse: auction.totalPursePerTeam,
      rtmTotal: auction.rtmPerTeam,
      logo: getImageUrl(req.file),
    });
    await team.save();
    // Broadcast new team to everyone in the auction room instantly
    try {
      const io = require('../socket/io').getIO();
      if (io) {
        const allTeams = await Team.find({ auctionId: req.params.id });
        io.to(req.params.id).emit('teamJoined', { team, teams: allTeams });
      }
    } catch (e) { /* socket not critical */ }
    res.status(201).json({ success: true, team, auction });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Organizer creates team manually
router.post('/:id/teams', authenticate, authorize('organizer','admin'), upload.single('logo'), async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    const { name, shortName, ownerName, city, primaryColor, maxPlayers } = req.body;
    const team = new Team({
      auctionId: req.params.id,
      name, shortName: shortName.toUpperCase().slice(0,4),
      ownerName: ownerName || '',
      city: city || '',
      primaryColor: primaryColor || '#f59e0b',
      purse: auction.totalPursePerTeam,
      initialPurse: auction.totalPursePerTeam,
      maxPlayers: parseInt(maxPlayers)||15,
      rtmTotal: auction.rtmPerTeam,
      logo: getImageUrl(req.file),
    });
    await team.save();
    res.status(201).json({ success: true, team });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/teams/:teamId', authenticate, authorize('organizer','admin'), upload.single('logo'), async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) update.logo = `/uploads/${req.file.filename}`;
    const team = await Team.findByIdAndUpdate(req.params.teamId, update, { new: true }).populate('ownerId','name email');
    res.json({ success: true, team });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/teams/:teamId', authenticate, authorize('organizer','admin'), async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.teamId);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// My team in this auction
router.get('/:id/my-team', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({ auctionId: req.params.id, ownerId: req.user._id });
    if (!team) return res.status(404).json({ error: 'No team found' });
    const players = await Player.find({ teamId: team._id, status: 'sold' });
    res.json({ success: true, team, players });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── BIDS ────────────────────────────────────────────────────

router.get('/:id/bids', optionalAuth, async (req, res) => {
  try {
    const filter = { auctionId: req.params.id };
    if (req.query.playerId) filter.playerId = req.query.playerId;
    const bids = await Bid.find(filter).sort({ timestamp: -1 }).limit(50);
    res.json({ success: true, bids });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── RTM ────────────────────────────────────────────────────

// Team owner triggers RTM on a player just sold to another team
router.post('/:id/rtm', authenticate, authorize('team_owner'), async (req, res) => {
  try {
    const { playerId } = req.body;
    const team = await Team.findOne({ auctionId: req.params.id, ownerId: req.user._id });
    if (!team) return res.status(404).json({ error: 'No team found' });
    if (team.rtmUsed >= team.rtmTotal) return res.status(400).json({ error: 'No RTM cards remaining' });
    const player = await Player.findById(playerId);
    if (!player || player.status !== 'sold') return res.status(400).json({ error: 'Player not eligible for RTM' });
    // Cannot RTM your own auction player or the player already in your team
    if (player.teamId?.toString() === team._id.toString()) return res.status(400).json({ error: 'This player is already in your team' });

    const rtm = new RTM({
      auctionId: req.params.id,
      playerId, teamId: team._id,
      originalBid: player.soldPrice,
      expiresAt: new Date(Date.now() + 20000), // 20 second window
    });
    await rtm.save();
    res.json({ success: true, rtm, team });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

// Get auction final results (all teams + their players)
router.get('/:id/results', optionalAuth, async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) return res.status(404).json({ error: 'Auction not found' });
    const teams = await Team.find({ auctionId: req.params.id }).populate('ownerId','name email');
    const players = await Player.find({ auctionId: req.params.id }).populate('teamId','name shortName primaryColor');
    // Group players by team
    const teamResults = teams.map(team => ({
      ...team.toObject(),
      players: players.filter(p => p.teamId?._id?.toString() === team._id.toString()),
      spent: team.initialPurse - team.purse,
    }));
    res.json({ success: true, auction, teams: teamResults, players });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
