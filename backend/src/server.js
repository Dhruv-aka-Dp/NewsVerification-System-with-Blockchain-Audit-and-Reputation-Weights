require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db');
const { initSocket } = require('./services/socketService');
const { initCron } = require('./services/cronService');

// Validate required environment variables at startup
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable is not set');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const newsRoutes = require('./routes/news');
const votesRoutes = require('./routes/votes');
const decisionsRoutes = require('./routes/decisions');
const adminRoutes = require('./routes/admin');
const blockchainRoutes = require('./routes/blockchain');

const app = express();
const PORT = process.env.PORT || 3001;

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  // Redirect HTTP to HTTPS
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });

  // Add HSTS header
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// CORS — allow all 3 frontend ports
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:5173', 'http://127.0.0.1:5173',
      'http://localhost:5174', 'http://127.0.0.1:5174',
      'http://localhost:5175', 'http://127.0.0.1:5175',
    ];
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Request size limit to prevent DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/votes', votesRoutes);
app.use('/api/decisions', decisionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 404 catch-all
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Global error handler — never expose error details to client
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: 'Internal server error' });
});

const seedData = require('./scripts/seed');

connectDB().then(async () => {
  await seedData();
  const server = http.createServer(app);

  // Initialize Socket.io
  const io = socketIo(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  initSocket(io);

  // Make io available globally for other modules
  global.io = io;

  server.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
    console.log(`WebSocket server initialized`);
    initCron();
  });
});
