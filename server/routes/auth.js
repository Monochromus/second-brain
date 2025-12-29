const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateEmail } = require('../utils/helpers');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Creates sample data for new users to demonstrate the app's capabilities
 */
function createSampleDataForUser(userId) {
  // Create Areas (typical life areas everyone has)
  const areas = [
    { name: 'Arbeit', description: 'Berufliche Projekte und Aufgaben', icon: 'briefcase', color: '#3B82F6' },
    { name: 'Schule', description: 'Schulische Aufgaben und Lernen', icon: 'graduation', color: '#6366F1' },
    { name: 'Gesundheit', description: 'Fitness, Ernährung und Wohlbefinden', icon: 'heart', color: '#EF4444' },
    { name: 'Familie & Freunde', description: 'Beziehungen und soziale Aktivitäten', icon: 'users', color: '#10B981' },
    { name: 'Finanzen', description: 'Budget, Sparen und Investitionen', icon: 'dollar', color: '#F59E0B' },
    { name: 'Hobbys', description: 'Freizeitaktivitäten und Interessen', icon: 'gamepad', color: '#EC4899' },
    { name: 'Selbstoptimierung', description: 'Lernen, Wachstum und persönliche Ziele', icon: 'sparkles', color: '#8B5CF6' }
  ];

  const areaIds = {};
  areas.forEach((area, index) => {
    const result = db.prepare(`
      INSERT INTO areas (user_id, name, description, icon, color, position)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, area.name, area.description, area.icon, area.color, index + 1);
    areaIds[area.name] = result.lastInsertRowid;
  });

  // Create a sample project (assigned to "Familie & Freunde" area)
  const projectResult = db.prepare(`
    INSERT INTO projects (user_id, name, description, color, area_id, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    'Sommerurlaub planen',
    'Planung für den nächsten Familienurlaub – Recherche, Buchung und Packliste',
    '#10B981',
    areaIds['Familie & Freunde'],
    1
  );
  const projectId = projectResult.lastInsertRowid;

  // Create sample todos for the project
  const todos = [
    { title: 'Reiseziel recherchieren', description: 'Verschiedene Optionen vergleichen: Strand, Berge oder Städtetrip?', priority: 2 },
    { title: 'Unterkunft buchen', description: 'Hotel oder Ferienwohnung finden und reservieren', priority: 1 }
  ];

  todos.forEach((todo, index) => {
    db.prepare(`
      INSERT INTO todos (user_id, project_id, title, description, priority, position, area_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, projectId, todo.title, todo.description, todo.priority, index + 1, areaIds['Familie & Freunde']);
  });

  // Create a sample note (assigned to "Arbeit" area) - using HTML for TipTap editor
  db.prepare(`
    INSERT INTO notes (user_id, title, content, tags, color, is_pinned, position, area_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    'Meeting-Notizen Vorlage',
    `<h2>Meeting: [Titel]</h2><p><strong>Datum:</strong> [Datum]<br><strong>Teilnehmer:</strong> [Namen]</p><h3>Agenda</h3><ol><li>Punkt 1</li><li>Punkt 2</li></ol><h3>Notizen</h3><ul><li></li></ul><h3>Action Items</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="false">Aufgabe 1 (@Person)</li><li data-type="taskItem" data-checked="false">Aufgabe 2 (@Person)</li></ul><h3>Nächste Schritte</h3><ul><li></li></ul>`,
    JSON.stringify(['Vorlage', 'Meeting']),
    '#DBEAFE',
    1,
    1,
    areaIds['Arbeit']
  );

  // Create a sample resource (assigned to "Persönliche Entwicklung" area)
  db.prepare(`
    INSERT INTO resources (user_id, title, content, tags, category, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    'Die PARA-Methode erklärt',
    `## Was ist PARA?\n\nPARA ist ein Organisationssystem von Tiago Forte:\n\n- **P**rojekte: Aktive Vorhaben mit einem Enddatum\n- **A**reas: Dauerhafte Verantwortungsbereiche\n- **R**essourcen: Wissen und Referenzmaterial\n- **A**rchiv: Abgeschlossene oder inaktive Inhalte\n\n### Vorteile\n✓ Klare Struktur für alle Lebensbereiche\n✓ Schnelles Wiederfinden von Informationen\n✓ Reduzierter mentaler Aufwand`,
    JSON.stringify(['Produktivität', 'Organisation']),
    'Wissen',
    1
  );

  // Create a sample Webclip resource
  db.prepare(`
    INSERT INTO resources (user_id, title, content, url, tags, category, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    'Building a Second Brain – Tiago Forte',
    'Ein interessanter Artikel über das "Second Brain" Konzept. Später lesen und die wichtigsten Ideen zusammenfassen.',
    'https://fortelabs.com/blog/basboverview/',
    JSON.stringify(['Webclip', 'Später lesen']),
    'Webclips',
    2
  );
}

router.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Ungültige E-Mail-Adresse.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben.' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existingUser) {
    return res.status(409).json({ error: 'Diese E-Mail ist bereits registriert.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email.toLowerCase(), passwordHash, name || null);

  const newUserId = result.lastInsertRowid;

  // Create sample data for the new user
  try {
    createSampleDataForUser(newUserId);
  } catch (err) {
    console.error('Error creating sample data for user:', err);
    // Don't fail registration if sample data creation fails
  }

  req.session.userId = newUserId;

  const user = db.prepare('SELECT id, email, name, created_at, settings FROM users WHERE id = ?')
    .get(result.lastInsertRowid);

  const token = generateToken(user.id);

  res.status(201).json({
    message: 'Registrierung erfolgreich.',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      settings: JSON.parse(user.settings || '{}')
    }
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
  }

  req.session.userId = user.id;

  const token = generateToken(user.id);

  res.json({
    message: 'Login erfolgreich.',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      settings: JSON.parse(user.settings || '{}')
    }
  });
}));

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout fehlgeschlagen.' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout erfolgreich.' });
  });
});

router.get('/me', asyncHandler(async (req, res) => {
  const { requireAuth } = require('../middleware/auth');

  // Check JWT token first
  const authHeader = req.headers.authorization;
  let userId = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      // Token invalid
    }
  }

  // Fallback to session
  if (!userId && req.session.userId) {
    userId = req.session.userId;
  }

  if (!userId) {
    return res.status(401).json({ error: 'Nicht eingeloggt.' });
  }

  const user = db.prepare('SELECT id, email, name, created_at, settings FROM users WHERE id = ?')
    .get(userId);

  if (!user) {
    if (req.session) req.session.destroy();
    return res.status(401).json({ error: 'Benutzer nicht gefunden.' });
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      settings: JSON.parse(user.settings || '{}')
    }
  });
}));

router.put('/settings', asyncHandler(async (req, res) => {
  // Check JWT token first
  const authHeader = req.headers.authorization;
  let userId = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../middleware/auth');
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
    } catch (err) {
      // Token invalid
    }
  }

  // Fallback to session
  if (!userId && req.session && req.session.userId) {
    userId = req.session.userId;
  }

  if (!userId) {
    return res.status(401).json({ error: 'Nicht eingeloggt.' });
  }

  const { name, settings, currentPassword, newPassword } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Aktuelles Passwort erforderlich.' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Aktuelles Passwort ist falsch.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);
  }

  if (name !== undefined) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
  }

  if (settings !== undefined) {
    db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify(settings), userId);
  }

  const updatedUser = db.prepare('SELECT id, email, name, settings FROM users WHERE id = ?')
    .get(userId);

  res.json({
    message: 'Einstellungen aktualisiert.',
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      settings: JSON.parse(updatedUser.settings || '{}')
    }
  });
}));

module.exports = router;
