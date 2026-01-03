require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const jwt = require('jsonwebtoken');

require('./config/database');

const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const todosRoutes = require('./routes/todos');
const notesRoutes = require('./routes/notes');
const projectsRoutes = require('./routes/projects');
const calendarRoutes = require('./routes/calendar');
const agentRoutes = require('./routes/agent');
const searchRoutes = require('./routes/search');
const areasRoutes = require('./routes/areas');
const resourcesRoutes = require('./routes/resources');
const archiveRoutes = require('./routes/archive');
const customToolsRoutes = require('./routes/customTools');
const visionRoutes = require('./routes/vision');
const settingsRoutes = require('./routes/settings');
const captureRoutes = require('./routes/capture');
const emailAccountsRoutes = require('./routes/emailAccounts');
const emailsRoutes = require('./routes/emails');
const emailDraftsRoutes = require('./routes/emailDrafts');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Socket.io setup
let io;
try {
  const { Server } = require('socket.io');
  const corsOrigins = process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177']
    : [];

  io = new Server(server, {
    cors: {
      origin: corsOrigins,
      credentials: true
    }
  });

  // Socket.io authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
      const decoded = jwt.verify(token, jwtSecret);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log(`WebSocket connected: user ${socket.userId}`);

    // Join user's room for targeted broadcasts
    socket.join(`user:${socket.userId}`);

    // Handle tool subscription
    socket.on('tool:subscribe', (toolId) => {
      socket.join(`tool:${toolId}`);
      console.log(`User ${socket.userId} subscribed to tool:${toolId}`);
    });

    socket.on('tool:unsubscribe', (toolId) => {
      socket.leave(`tool:${toolId}`);
      console.log(`User ${socket.userId} unsubscribed from tool:${toolId}`);
    });

    socket.on('disconnect', () => {
      console.log(`WebSocket disconnected: user ${socket.userId}`);
    });
  });

  // Make io globally available for routes
  global.io = io;
  console.log('Socket.io initialized');
} catch (err) {
  console.warn('Socket.io not available:', err.message);
  global.io = null;
}

// CORS only needed for development (different ports)
// In production, frontend and backend are served from same origin
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
    credentials: true
  }));
}

app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'development-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/todos', todosRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/custom-tools', customToolsRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/capture', captureRoutes);
app.use('/api/email-accounts', emailAccountsRoutes);
app.use('/api/emails', emailsRoutes);
app.use('/api/email-drafts', emailDraftsRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 Pocket Assistent Server                                  ║
║                                                               ║
║   Server running on http://localhost:${PORT}                    ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(12)}                            ║
║   WebSocket: ${global.io ? 'enabled' : 'disabled'}                                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
