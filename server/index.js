require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

require('./config/database');

const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const todosRoutes = require('./routes/todos');
const notesRoutes = require('./routes/notes');
const projectsRoutes = require('./routes/projects');
const calendarRoutes = require('./routes/calendar');
const agentRoutes = require('./routes/agent');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS only needed for development (different ports)
// In production, frontend and backend are served from same origin
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177'],
    credentials: true
  }));
}

app.use(express.json({ limit: '10mb' }));

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

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🧠 Second Brain Server                                      ║
║                                                               ║
║   Server running on http://localhost:${PORT}                    ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(12)}                            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
