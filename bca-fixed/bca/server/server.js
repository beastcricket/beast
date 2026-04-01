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

const app    = express();
const server = http.createServer(app);
const isProd = process.env.NODE_ENV === 'production';

/* ────────────────────────────────────────────────────────────
   ✅ 1. HEALTH ROUTE (VERY IMPORTANT — MUST BE FIRST)
──────────────────────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: "OK",
    time: new Date().toISOString()
  });
});

/* ────────────────────────────────────────────────────────────
   Uploads folder
──────────────────────────────────────────────────────────── */
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

/* ────────────────────────────────────────────────────────────
   CORS
──────────────────────────────────────────────────────────── */
const allowedOrigins = isProd
  ? (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean)
  : null;

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (!isProd) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} not allowed`));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

/* ────────────────────────────────────────────────────────────
   Security
──────────────────────────────────────────────────────────── */
if (isProd) {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  }));
}
app.disable('x-powered-by');

/* ────────────────────────────────────────────────────────────
   Body + Cookies
──────────────────────────────────────────────────────────── */
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ────────────────────────────────────────────────────────────
   Rate Limit (AFTER health route)
──────────────────────────────────────────────────────────── */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 500 : 10000,
});

app.use('/api', limiter);

/* ────────────────────────────────────────────────────────────
   Static
──────────────────────────────────────────────────────────── */
app.use('/uploads', express.static(uploadsDir));

/* ────────────────────────────────────────────────────────────
   Routes
──────────────────────────────────────────────────────────── */
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/auctions', require('./routes/auctions'));
app.use('/api/admin',    require('./routes/admin'));

/* ────────────────────────────────────────────────────────────
   Socket.IO
──────────────────────────────────────────────────────────── */
const io = new Server(server, {
  cors: {
    origin: isProd ? allowedOrigins : true,
    credentials: true,
  }
});
ioStore.setIO(io);

/* ────────────────────────────────────────────────────────────
   Error Handling
──────────────────────────────────────────────────────────── */
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

/* ────────────────────────────────────────────────────────────
   ✅ START SERVER FIRST (CRITICAL FIX)
──────────────────────────────────────────────────────────── */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

/* ────────────────────────────────────────────────────────────
   MongoDB (NON-BLOCKING)
──────────────────────────────────────────────────────────── */
const MONGO_URI = process.env.MONGODB_URI;

console.log('🔍 MONGODB_URI:', MONGO_URI ? 'set ✅' : 'NOT SET ⚠️');

if (!MONGO_URI) {
  console.warn('⚠️  MONGODB_URI is not set — skipping MongoDB connection. Some features will be unavailable.');
} else {
  mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => {
      console.log('✅ MongoDB connected');
      require('./models/ActivityLog');
      require('./socket/auctionEngine')(io);
    })
    .catch(err => {
      console.error('❌ MongoDB failed:', err.message);
      // DO NOT STOP SERVER
    });
}

module.exports = { app, server, io };
