const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { syncCalendar } = require('../services/sync');

const router = express.Router();

router.use(requireAuth);

router.get('/events', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { start_date, end_date, source } = req.query;

  let query = 'SELECT * FROM calendar_events WHERE user_id = ?';
  const params = [userId];

  if (start_date) {
    query += ' AND start_time >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND start_time <= ?';
    params.push(end_date + 'T23:59:59');
  }

  if (source && source !== 'all') {
    query += ' AND calendar_source = ?';
    params.push(source);
  }

  query += ' ORDER BY start_time ASC';

  const events = db.prepare(query).all(...params);

  res.json({
    events: events.map(e => ({
      ...e,
      is_all_day: Boolean(e.is_all_day)
    }))
  });
}));

router.get('/events/:id', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;

  const event = db.prepare('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!event) {
    return res.status(404).json({ error: 'Termin nicht gefunden.' });
  }

  const links = db.prepare(`
    SELECT * FROM item_links
    WHERE (source_type = 'event' AND source_id = ?)
    OR (target_type = 'event' AND target_id = ?)
  `).all(id, id);

  res.json({
    event: {
      ...event,
      is_all_day: Boolean(event.is_all_day)
    },
    links
  });
}));

router.post('/events', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { title, description, start_time, end_time, location, is_all_day, project_id, calendar_source } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Titel ist erforderlich.' });
  }

  if (!start_time || !end_time) {
    return res.status(400).json({ error: 'Start- und Endzeit sind erforderlich.' });
  }

  const result = db.prepare(`
    INSERT INTO calendar_events (user_id, title, description, start_time, end_time, location, is_all_day, project_id, calendar_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    title.trim(),
    description || null,
    start_time,
    end_time,
    location || null,
    is_all_day ? 1 : 0,
    project_id || null,
    calendar_source || 'local'
  );

  const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    event: {
      ...event,
      is_all_day: Boolean(event.is_all_day)
    },
    message: 'Termin erstellt.'
  });
}));

router.put('/events/:id', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;
  const { title, description, start_time, end_time, location, is_all_day, project_id } = req.body;

  const existing = db.prepare('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Termin nicht gefunden.' });
  }

  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title.trim());
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (start_time !== undefined) {
    updates.push('start_time = ?');
    params.push(start_time);
  }
  if (end_time !== undefined) {
    updates.push('end_time = ?');
    params.push(end_time);
  }
  if (location !== undefined) {
    updates.push('location = ?');
    params.push(location);
  }
  if (is_all_day !== undefined) {
    updates.push('is_all_day = ?');
    params.push(is_all_day ? 1 : 0);
  }
  if (project_id !== undefined) {
    updates.push('project_id = ?');
    params.push(project_id);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben.' });
  }

  params.push(id, userId);

  db.prepare(`UPDATE calendar_events SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
    .run(...params);

  const event = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id);

  res.json({
    event: {
      ...event,
      is_all_day: Boolean(event.is_all_day)
    },
    message: 'Termin aktualisiert.'
  });
}));

router.delete('/events/:id', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM calendar_events WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Termin nicht gefunden.' });
  }

  db.prepare('DELETE FROM item_links WHERE (source_type = ? AND source_id = ?) OR (target_type = ? AND target_id = ?)')
    .run('event', id, 'event', id);

  db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);

  res.json({ message: 'Termin gelöscht.' });
}));

router.get('/connections', asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  const connections = db.prepare('SELECT id, provider, calendar_url, is_active, last_sync FROM calendar_connections WHERE user_id = ?')
    .all(userId);

  res.json({
    connections: connections.map(c => ({
      ...c,
      is_active: Boolean(c.is_active)
    }))
  });
}));

router.post('/connections', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { provider, calendar_url, username, password } = req.body;

  if (!provider || !calendar_url) {
    return res.status(400).json({ error: 'Provider und Kalender-URL sind erforderlich.' });
  }

  if (!['outlook', 'icloud'].includes(provider)) {
    return res.status(400).json({ error: 'Ungültiger Provider. Erlaubt: outlook, icloud.' });
  }

  const credentials = username && password
    ? JSON.stringify({ username, password })
    : null;

  const existing = db.prepare('SELECT id FROM calendar_connections WHERE user_id = ? AND provider = ?')
    .get(userId, provider);

  if (existing) {
    db.prepare(`
      UPDATE calendar_connections
      SET calendar_url = ?, credentials = ?, is_active = 1
      WHERE id = ?
    `).run(calendar_url, credentials, existing.id);

    return res.json({ message: 'Kalenderverbindung aktualisiert.' });
  }

  db.prepare(`
    INSERT INTO calendar_connections (user_id, provider, calendar_url, credentials)
    VALUES (?, ?, ?, ?)
  `).run(userId, provider, calendar_url, credentials);

  res.status(201).json({ message: 'Kalenderverbindung hinzugefügt.' });
}));

router.delete('/connections/:id', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM calendar_connections WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Kalenderverbindung nicht gefunden.' });
  }

  db.prepare('DELETE FROM calendar_connections WHERE id = ?').run(id);

  res.json({ message: 'Kalenderverbindung entfernt.' });
}));

router.post('/sync', asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  try {
    const result = await syncCalendar(userId);
    res.json(result);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Synchronisation fehlgeschlagen.' });
  }
}));

module.exports = router;
