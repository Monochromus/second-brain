const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateEmail } = require('../utils/helpers');

const router = express.Router();

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

  req.session.userId = result.lastInsertRowid;

  const user = db.prepare('SELECT id, email, name, created_at, settings FROM users WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json({
    message: 'Registrierung erfolgreich.',
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

  res.json({
    message: 'Login erfolgreich.',
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
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nicht eingeloggt.' });
  }

  const user = db.prepare('SELECT id, email, name, created_at, settings FROM users WHERE id = ?')
    .get(req.session.userId);

  if (!user) {
    req.session.destroy();
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
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nicht eingeloggt.' });
  }

  const { name, settings, currentPassword, newPassword } = req.body;
  const userId = req.session.userId;

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
