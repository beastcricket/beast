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

// ── SINGLE ADMIN EMAIL ─────────────────────────────────────────
// Only this email can ever be admin
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase();

const setRole = (userId, role) =>
  User.updateOne({ _id: userId }, { $set: { role } });

// ── REGISTER ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim())       return res.status(400).json({ error: 'Please enter your full name.' });
    if (!email?.trim())      return res.status(400).json({ error: 'Please enter your email address.' });
    if (!password)           return res.status(400).json({ error: 'Please create a password.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (name.trim().length > 100) return res.status(400).json({ error: 'Name too long.' });

    const emailClean = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(emailClean))
      return res.status(400).json({ error: 'Please enter a valid email address.' });

    const existing = await User.findOne({ email: emailClean });
    if (existing)
      return res.status(400).json({ error: 'An account with this email already exists.' });

    const emailReady = isEmailConfigured();
    const rawToken   = crypto.randomBytes(32).toString('hex');

    // Admin email always gets admin role
    const assignedRole = emailClean === ADMIN_EMAIL ? 'admin' : 'viewer';

    const user = new User({
      name:              name.trim(),
      email:             emailClean,
      password,
      role:              assignedRole,
      isVerified:        !emailReady,
      verificationToken: emailReady ? rawToken : null,
      verificationTokenExpiry: emailReady ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
    });

    await user.save();
    await log('register', req, { userId:user._id, userName:user.name, userEmail:user.email, details:`New ${assignedRole} registered` });
    console.log(`✅ Registered: ${emailClean} as ${assignedRole}`);

    if (emailReady) {
      try {
        await sendVerificationEmail(emailClean, name.trim(), rawToken);
        return res.status(201).json({ success: true, requiresVerification: true });
      } catch (emailErr) {
        console.error('❌ Email failed:', emailErr.message);
        await User.updateOne({ _id: user._id }, { $set: { isVerified: true }, $unset: { verificationToken: 1, verificationTokenExpiry: 1 } });
      }
    }
    return res.status(201).json({ success: true, requiresVerification: false });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ error: 'That email is already registered.' });
    console.error('Register error:', err.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── VERIFY EMAIL ──────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token missing.' });

    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ error: 'This link has already been used or expired.', alreadyVerified: true });
    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date())
      return res.status(400).json({ error: 'This verification link has expired.' });

    await User.updateOne({ _id: user._id }, { $set: { isVerified: true }, $unset: { verificationToken: 1, verificationTokenExpiry: 1 } });
    await log('verify_email', req, { userId:user._id, userName:user.name, userEmail:user.email, details:'Email verified successfully' });

    return res.json({ success: true, message: 'Email verified! You can now log in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ── RESEND VERIFICATION ───────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'Email required.' });

    const user = await User.findOne({ email });
    if (!user || user.isVerified) return res.json({ success: true });

    const rawToken = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ _id: user._id }, {
      $set: { verificationToken: rawToken, verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    });
    try { await sendVerificationEmail(user.email, user.name, rawToken); } catch {}
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed. Please try again.' });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Please enter your email address.' });
    if (!password)      return res.status(400).json({ error: 'Please enter your password.' });
    if (!role || !['organizer','team_owner','viewer','admin'].includes(role))
      return res.status(400).json({ error: 'Please select a role to continue.' });

    const emailClean = email.toLowerCase().trim();

    // Block admin login from non-admin email silently
    if (role === 'admin' && emailClean !== ADMIN_EMAIL) {
      await log('login_failed', req, { userEmail:emailClean, details:'Non-admin tried admin login' });
      return res.status(403).json({ error: 'Access denied.' });
    }

    const user = await User.findOne({ email: emailClean });
    if (!user) {
      await log('login_failed', req, { userEmail:emailClean, details:'Email not found' });
      return res.status(401).json({ error: 'No account found with this email. Please register first.' });
    }

    if (user.isLocked()) {
      await log('account_locked', req, { userId:user._id, userName:user.name, userEmail:emailClean, details:'Login blocked - account locked' });
      return res.status(429).json({ error: 'Account temporarily locked after too many failed attempts. Try again in 30 minutes.' });
    }

    // Auto-verify in dev mode
    if (!user.isVerified) {
      if (!isEmailConfigured()) {
        await User.updateOne({ _id: user._id }, { $set: { isVerified: true }, $unset: { verificationToken: 1 } });
      } else {
        return res.status(401).json({ error: 'Email not verified. Check your inbox for the verification link.', notVerified: true, email: emailClean });
      }
    }

    if (user.isBlocked) {
      await log('account_blocked', req, { userId:user._id, userName:user.name, userEmail:emailClean, details:'Blocked account login attempt' });
      return res.status(403).json({ error: 'Account blocked. Contact admin.' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      await user.incLoginAttempts();
      await log('login_failed', req, { userId:user._id, userName:user.name, userEmail:emailClean, details:`Wrong password (attempt ${user.loginAttempts + 1})` });
      return res.status(401).json({ error: 'Incorrect password. Try again or use Forgot Password.' });
    }

    // Reset lockout
    if (user.loginAttempts > 0 || user.lockUntil) {
      await User.updateOne({ _id: user._id }, { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
    }

    // Admin email always gets admin role, never overwritten
    const effectiveRole = emailClean === ADMIN_EMAIL ? 'admin' : role;
    if (emailClean !== ADMIN_EMAIL) await setRole(user._id, role);
    else if (user.role !== 'admin') await setRole(user._id, 'admin');

    // Issue tokens
    const accessToken   = generateAccessToken(user._id, effectiveRole);
    const refreshToken  = generateRefreshToken();
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await User.updateOne({ _id: user._id }, { $set: { refreshToken: hashedRefresh, refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });

    await log('login_success', req, { userId:user._id, userName:user.name, userEmail:emailClean, userRole:effectiveRole, details:`Logged in as ${effectiveRole}` });
    console.log(`✅ Login: ${emailClean} as ${effectiveRole}`);

    const updatedUser = await User.findById(user._id);
    return setCookieAndRespond(res, accessToken, refreshToken, updatedUser);
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── REFRESH TOKEN ─────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token missing.' });

    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const user = await User.findOne({ refreshToken: hashedToken, refreshTokenExpiry: { $gt: new Date() } });
    if (!user) return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    if (user.isBlocked) return res.status(403).json({ error: 'Account blocked.' });

    const newRefreshToken = generateRefreshToken();
    const newRefreshHash  = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await User.updateOne({ _id: user._id }, { $set: { refreshToken: newRefreshHash, refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });

    const accessToken = generateAccessToken(user._id, user.role);
    return setCookieAndRespond(res, accessToken, newRefreshToken, user);
  } catch (err) {
    return res.status(500).json({ error: 'Token refresh failed.' });
  }
});

// ── ME ────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) =>
  res.json({ success: true, user: req.user })
);

// ── LOGOUT ───────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    await log('logout', req, { userId:req.user._id, userName:req.user.name, userEmail:req.user.email, userRole:req.user.role, details:'User logged out' });
    await User.updateOne({ _id: req.user._id }, { $unset: { refreshToken: 1, refreshTokenExpiry: 1 } });
  } catch {}
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie('token',        { httpOnly:true, secure:isProd, sameSite:isProd?'none':'lax' });
  res.clearCookie('refreshToken', { httpOnly:true, secure:isProd, sameSite:isProd?'none':'lax', path:'/api/auth/refresh' });
  return res.json({ success: true });
});

// ── FORGOT PASSWORD ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true });
    const rawToken = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ _id: user._id }, { $set: { resetToken: rawToken, resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000) } });
    try { await sendPasswordResetEmail(user.email, user.name, rawToken); } catch {}
    await log('password_reset', req, { userId:user._id, userEmail:email, details:'Password reset requested' });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed. Please try again.' });
  }
});

// ── RESET PASSWORD ────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Reset link is invalid or expired.' });
    user.password = password;
    user.resetToken = null; user.resetTokenExpiry = null;
    user.loginAttempts = 0; user.lockUntil = null;
    await user.save();
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Reset failed. Please try again.' });
  }
});

// ── PROFILE ───────────────────────────────────────────────────
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email } = req.body;
    const updates = {};
    if (name?.trim()) updates.name = name.trim().slice(0, 100);
    if (email?.trim() && email.toLowerCase().trim() !== req.user.email) {
      const taken = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: req.user._id } });
      if (taken) return res.status(400).json({ error: 'That email is already used.' });
      // Don't allow changing admin email
      if (req.user.email === ADMIN_EMAIL)
        return res.status(400).json({ error: 'Admin email cannot be changed.' });
      updates.email = email.toLowerCase().trim();
    }
    if (!Object.keys(updates).length) return res.json({ success: true, user: req.user });
    await User.updateOne({ _id: req.user._id }, { $set: updates });
    const updated = await User.findById(req.user._id);
    return res.json({ success: true, user: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Update failed.' });
  }
});

// ── CHANGE PASSWORD ───────────────────────────────────────────
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required.' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Min 6 characters.' });
    const user = await User.findById(req.user._id);
    if (!await user.comparePassword(currentPassword)) return res.status(401).json({ error: 'Current password is incorrect.' });
    user.password = newPassword;
    await user.save();
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: 'Failed.' }); }
});

// ── DELETE ACCOUNT ────────────────────────────────────────────
router.delete('/account', authenticate, async (req, res) => {
  try {
    if (req.user.email === ADMIN_EMAIL)
      return res.status(400).json({ error: 'Admin account cannot be deleted.' });
    await User.findByIdAndDelete(req.user._id);
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('token',        { httpOnly:true, secure:isProd, sameSite:isProd?'none':'lax' });
    res.clearCookie('refreshToken', { httpOnly:true, secure:isProd, sameSite:isProd?'none':'lax', path:'/api/auth/refresh' });
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: 'Failed.' }); }
});

module.exports = router;
