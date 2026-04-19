const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const User     = require('../models/User');

const {
  generateAccessToken,
  generateRefreshToken,
  setCookieAndRespond,
} = require('../utils/jwt');

const { authenticate } = require('../middleware/auth');
const { isEmailConfigured, sendVerificationEmail } = require('../utils/email');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase();

const setRole = (userId, role) =>
  User.updateOne({ _id: userId }, { $set: { role } });


// ── REGISTER ─────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const emailClean = email.toLowerCase().trim();

    const existing = await User.findOne({ email: emailClean });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const isAdmin = emailClean === ADMIN_EMAIL;
    const role    = isAdmin ? 'admin' : 'viewer';

    // Generate a secure verification token (raw hex, store hashed)
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = new User({
      name,
      email: emailClean,
      password,
      role,
      // Admin accounts are auto-verified; everyone else must verify email
      isVerified:              isAdmin,
      verificationToken:       isAdmin ? null : hashedToken,
      verificationTokenExpiry: isAdmin ? null : new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await user.save();

    // Send verification email (non-blocking — don't fail registration if email fails)
    if (!isAdmin && isEmailConfigured()) {
      try {
        await sendVerificationEmail(emailClean, name, rawToken);
      } catch (emailErr) {
        console.error('⚠️  Verification email failed to send:', emailErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: isAdmin
        ? 'Admin account created.'
        : 'Account created. Please check your email to verify your account.',
      emailSent: !isAdmin && isEmailConfigured(),
    });

  } catch (err) {
    console.log("REGISTER ERROR:", err);
    return res.status(500).json({ error: 'Register failed.' });
  }
});


// ── VERIFY EMAIL ──────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      verificationToken:       hashedToken,
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification link. Please request a new one.' });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set:   { isVerified: true },
        $unset: { verificationToken: 1, verificationTokenExpiry: 1 },
      }
    );

    return res.json({ success: true, message: 'Email verified successfully. You can now log in.' });

  } catch (err) {
    console.log("VERIFY EMAIL ERROR:", err);
    return res.status(500).json({ error: 'Verification failed.' });
  }
});


// ── RESEND VERIFICATION EMAIL ─────────────────────────
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const emailClean = email.toLowerCase().trim();
    const user = await User.findOne({ email: emailClean });

    // Always return success to prevent email enumeration
    if (!user || user.isVerified) {
      return res.json({ success: true, message: 'If that email exists and is unverified, a new link has been sent.' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Email service is not configured. Please contact support.' });
    }

    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          verificationToken:       hashedToken,
          verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      }
    );

    await sendVerificationEmail(emailClean, user.name, rawToken);

    return res.json({ success: true, message: 'Verification email resent. Check your inbox.' });

  } catch (err) {
    console.log("RESEND VERIFICATION ERROR:", err);
    return res.status(500).json({ error: 'Failed to resend verification email.' });
  }
});


// ── LOGIN ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const emailClean = email.toLowerCase().trim();

    const user = await User.findOne({ email: emailClean });

    if (!user) {
      return res.status(401).json({ error: 'No account found.' });
    }

    const ok = await user.comparePassword(password);

    if (!ok) {
      return res.status(401).json({ error: 'Wrong password.' });
    }

    // Block login if email is not verified
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Email not verified. Please check your inbox and verify your email before logging in.',
        notVerified: true,
      });
    }

    const finalRole = emailClean === ADMIN_EMAIL ? 'admin' : role;

    if (emailClean !== ADMIN_EMAIL) {
      await setRole(user._id, role);
    }

    const accessToken  = generateAccessToken(user._id, finalRole);
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


// ── ME (🔥 FINAL CORRECT VERSION) ─────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isVerified: req.user.isVerified
      }
    });

  } catch (err) {
    console.log("ME ERROR:", err);
    return res.status(500).json({ error: 'Server error' });
  }
});


// ── LOGOUT ───────────────────────────────────────────
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
