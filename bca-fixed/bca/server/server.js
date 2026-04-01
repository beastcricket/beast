require('dotenv').config();

const fs           = require('fs');
const path         = require('path');
const express      = require('express');
const http         = require('http');
const { Server }   = require('socket.io');
const mongoose     = require('mongoose');
const cookieParser = require('cookie-parser');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const ioStore      = require('./socket/io');

// ── Uploads dir ───────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app    = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === 'production';

// ── CORS origins ──────────────────────────────────────────────
// In dev: allow ALL origins (localhost on any port, any IP)
// In prod: only configured CLIENT_URL(s)
const allowedOrigins = isProd
  ? (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean)
  : null; // null = allow all in dev

const corsOptions = {
  origin: (origin, cb) => {
    // Always allow no-origin requests (Postman, mobile apps, same-origin)
    if (!origin) return cb(null, true);
    // Dev mode: allow everything
    if (!isProd) return cb(null, true);
    // Prod: check allowlist
    if (allowedOrigins && allowedOrigins.includes(origin)) return cb(null, true);
    console.warn(`CORS blocked: ${origin}`);
    cb(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
};

// ── Socket.io ─────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: isProd ? allowedOrigins : true, // true = allow all origins in dev
    methods: ['GET','POST'],
    credentials: true,
  },
  transports: ['websocket','polling'],
  maxHttpBufferSize: 1e6,
  pingTimeout: 60000,
  pingInterval: 25000,
  // Performance: connection state recovery
  connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000, skipMiddlewares: true },
});
ioStore.setIO(io);

// ── Trust proxy (Railway/Render/Vercel) ───────────────────────
app.set('trust proxy', 1);

// ── Security headers (Helmet) ─────────────────────────────────
// Only in production — helmet causes issues with dev hot-reload
if (isProd) {
  app.use(helmet({
    contentSecurityPolicy: false,    // CSP handled by Next.js
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  }));
}
app.disable('x-powered-by');

// ── CORS (must come before all routes) ───────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight for all routes

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// ── Rate limits ───────────────────────────────────────────────
const createLimiter = (max, windowMin, msg) => rateLimit({
  windowMs: windowMin * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: msg },
  skip: () => !isProd, // skip rate limiting in dev mode
});

const globalLimiter = createLimiter(500, 15, 'Too many requests. Try again later.');
const authLimiter   = createLimiter(30,  15, 'Too many auth attempts. Try again later.');
const bidLimiter    = createLimiter(60,   1, 'Bidding too fast. Slow down!');

app.use('/api', globalLimiter);

// ── Static files ──────────────────────────────────────────────
app.use('/uploads', express.static(uploadsDir, {
  maxAge: isProd ? '1d' : 0,
  etag: true,
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*'); // images accessible cross-origin
  },
}));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, require('./routes/auth'));
app.use('/api/auctions', require('./routes/auctions'));
app.use('/api/admin',    require('./routes/admin'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({
  ok:      true,
  env:     process.env.NODE_ENV || 'development',
  time:    new Date().toISOString(),
  cors:    isProd ? 'strict' : 'open (dev)',
  email:   process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your_email')
           ? '✅ configured' : '⚠️ not configured (auto-verify on)',
}));

// ── Error handlers ────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE')       return res.status(400).json({ error: 'File too large. Max 5MB.' });
  if (err?.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'Unexpected file field.' });
  if (err?.message?.includes('not allowed')) return res.status(403).json({ error: 'CORS policy violation.' });
  next(err);
});

app.use((req, res) => res.status(404).json({ error: `${req.method} ${req.url} not found` }));

app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[${new Date().toISOString()}] ${status} ${req.method} ${req.url}:`, err.message);
  res.status(status).json({
    error: isProd ? 'Internal server error' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
});

// ── MongoDB + Start ───────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/beast-cricket-auction';
mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,           // Connection pool for concurrent users
  minPoolSize: 2,
}).then(() => {
  console.log('✅ MongoDB connected');
  // Ensure ActivityLog TTL index exists
  require('./models/ActivityLog');
  require('./socket/auctionEngine')(io);

  // ── Admin real-time room ──────────────────────────────────
  // Admin socket connects to 'admin-room' for live dashboard updates
  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase();
  const { verifyToken } = require('./utils/jwt');
  const User = require('./models/User');

  io.on('connection', (socket) => {
    socket.on('join-admin-room', async ({ token }) => {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId).select('email role');
        if (user?.role === 'admin' && user?.email === ADMIN_EMAIL) {
          socket.join('admin-room');
          socket.emit('admin-room-joined', { ok: true });
        }
      } catch {}
    });
  });
  const PORT = parseInt(process.env.PORT || '5000');
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Beast Cricket — ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Port   : ${PORT}`);
    console.log(`   CORS   : ${isProd ? 'strict — ' + allowedOrigins?.join(', ') : 'open (dev mode)'}`);
    console.log(`   Health : http://localhost:${PORT}/api/health\n`);
  });
}).catch(err => {
  console.error('❌ MongoDB failed:', err.message);
  process.exit(1);
});

module.exports = { app, io, server };
