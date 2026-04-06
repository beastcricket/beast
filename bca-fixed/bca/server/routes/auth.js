const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const User     = require('../models/User');
const {
  generateAccessToken, generateRefreshToken, verifyToken, setCookieAndRespond,
} = require('../utils/jwt');
const { sendVerificationEmail, sendPasswordResetEmail, isEmailConfigured } = require('../utils/email');
const { authenticate } = require('../middleware/auth');
const { log } = require('../utils/logger');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase();

const setRole = (userId, role) =>
  User.updateOne({ _id: userId }, { $set: { role } });

// ── REGISTER ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const emailClean = email.toLowerCase().trim();
    const existing = await User.findOne({ email: emailClean });
    if (existing) return res.status(400).json({ error: 'Email already exists.' });

    const assignedRole = emailClean === ADMIN_EMAIL ? 'admin' : 'viewer';

    const user = new User({
      name,
      email: emailClean,
      password,
      role: assignedRole,
      isVerified: true
    });

    await user.save();

    return res.status(201).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Register failed.' });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const emailClean = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailClean });

    if (!user) return res.status(401).json({ error: 'No account found.' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Wrong password.' });

    const effectiveRole = emailClean === ADMIN_EMAIL ? 'admin' : role;

    if (emailClean !== ADMIN_EMAIL) {
      await setRole(user._id, role);
    }

    const accessToken  = generateAccessToken(user._id, effectiveRole);
    const refreshToken = generateRefreshToken();

    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken } }
    );

    const updatedUser = await User.findById(user._id);

    return setCookieAndRespond(res, accessToken, refreshToken, updatedUser);

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    return res.status(500).json({ error: 'Login failed.' });
  }
});

// ── ME (🔥 MOST IMPORTANT FIX) ────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isVerified: req.user.isVerified
    });

  } catch (err) {
    console.log("ME ERROR:", err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── LOGOUT ───────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $unset: { refreshToken: 1 } }
    );
  } catch {}

  res.clearCookie('token');
  res.clearCookie('refreshToken');

  return res.json({ success: true });
});

module.exports = router;
