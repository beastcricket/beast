const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers?.authorization?.replace('Bearer ', '');

    if (!token)
      return res.status(401).json({ error: 'Login required. Please sign in.' });

    const decoded = verifyToken(token);

    // Reject refresh tokens used as access tokens
    if (decoded.type && decoded.type !== 'access')
      return res.status(401).json({ error: 'Invalid token type.' });

    const user = await User.findById(decoded.userId);

    if (!user)
      return res.status(401).json({ error: 'Account not found. Please register.' });
    if (user.isBlocked)
      return res.status(403).json({ error: 'Account blocked. Contact admin.' });

    req.user      = user;
    req.user.role = user.role || decoded.role;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ error: 'Invalid session. Please log in again.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  const userRole = req.user?.role;
  if (!roles.includes(userRole)) {
    console.warn(`Permission denied: role="${userRole}", need: [${roles.join(',')}] — ${req.method} ${req.url}`);
    return res.status(403).json({
      error: `Permission denied. You are logged in as "${userRole || 'unknown'}". Required: ${roles.join(' or ')}.`,
    });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers?.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = verifyToken(token);
      const user    = await User.findById(decoded.userId);
      if (user && !user.isBlocked) {
        req.user      = user;
        req.user.role = user.role || decoded.role;
      }
    }
  } catch { /* anonymous request — fine */ }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
