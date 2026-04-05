require('dotenv').config();

const fs           = require('fs');
const path         = require('path');
const express      = require('express');
const cors         = require('cors');
const http         = require('http');
const { Server }   = require('socket.io');
const mongoose     = require('mongoose');
const cookieParser = require('cookie-parser');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const ioStore      = require('./socket/io');

// ── Uploads dir ─────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const app    = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === 'production';

// ── CORS (FINAL FIX) ─────────────────────
const corsOptions = {
  origin: true,        // ✅ allow all origins (fixes your issue)
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Socket.io ───────────────────────────
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET','POST'],
    credentials: true,
  }
});
ioStore.setIO(io);

// ── Security ────────────────────────────
app.set('trust proxy', 1);

if (isProd) {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  }));
}

app.disable('x-powered-by');

// ── Body parsing ────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rate limits ─────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 500 : 1000,
});
app.use('/api', limiter);

// ── Static files ────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ── Routes ──────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auctions', require('./routes/auctions'));
app.use('/api/admin', require('./routes/admin'));

// ── Health check ────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// ── 404 handler ─────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `${req.method} ${req.url} not found` });
});

// ── Error handler ───────────────────────
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Server error' });
});

// ── MongoDB + Start ─────────────────────
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB connected');

  require('./socket/auctionEngine')(io);

  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('❌ MongoDB failed:', err.message);
  process.exit(1);
});
