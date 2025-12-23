const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { project_id, tags, search, limit } = req.query;

  let query = 'SELECT * FROM notes WHERE user_id = ?';
  const params = [userId];

  if (project_id) {
    if (project_id === 'null') {
      query += ' AND project_id IS NULL';
    } else {
      query += ' AND project_id = ?';
      params.push(parseInt(project_id));
    }
  }

  if (search) {
    query += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY is_pinned DESC, position ASC, updated_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }

  let notes = db.prepare(query).all(...params);

  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    notes = notes.filter(note => {
      const noteTags = JSON.parse(note.tags || '[]').map(t => t.toLowerCase());
      return tagList.some(tag => noteTags.includes(tag));
    });
  }

  notes = notes.map(note => ({
    ...note,
    tags: JSON.parse(note.tags || '[]'),
    is_pinned: Boolean(note.is_pinned)
  }));

  res.json({ notes });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const note = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!note) {
    return res.status(404).json({ error: 'Notiz nicht gefunden.' });
  }

  const links = db.prepare(`
    SELECT * FROM item_links
    WHERE (source_type = 'note' AND source_id = ?)
    OR (target_type = 'note' AND target_id = ?)
  `).all(id, id);

  res.json({
    note: {
      ...note,
      tags: JSON.parse(note.tags || '[]'),
      is_pinned: Boolean(note.is_pinned)
    },
    links
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { title, content, tags, color, is_pinned, project_id, position } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Titel ist erforderlich.' });
  }

  const maxPosition = db.prepare('SELECT MAX(position) as max FROM notes WHERE user_id = ?')
    .get(userId);
  const newPosition = position !== undefined ? position : (maxPosition.max || 0) + 1;

  const result = db.prepare(`
    INSERT INTO notes (user_id, title, content, tags, color, is_pinned, project_id, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    title.trim(),
    content || null,
    JSON.stringify(tags || []),
    color || null,
    is_pinned ? 1 : 0,
    project_id || null,
    newPosition
  );

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    note: {
      ...note,
      tags: JSON.parse(note.tags || '[]'),
      is_pinned: Boolean(note.is_pinned)
    },
    message: 'Notiz erstellt.'
  });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { title, content, tags, color, is_pinned, project_id, position } = req.body;

  const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Notiz nicht gefunden.' });
  }

  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title.trim());
  }
  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content);
  }
  if (tags !== undefined) {
    updates.push('tags = ?');
    params.push(JSON.stringify(tags));
  }
  if (color !== undefined) {
    updates.push('color = ?');
    params.push(color);
  }
  if (is_pinned !== undefined) {
    updates.push('is_pinned = ?');
    params.push(is_pinned ? 1 : 0);
  }
  if (project_id !== undefined) {
    updates.push('project_id = ?');
    params.push(project_id);
  }
  if (position !== undefined) {
    updates.push('position = ?');
    params.push(position);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben.' });
  }

  params.push(id, userId);

  db.prepare(`UPDATE notes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
    .run(...params);

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);

  res.json({
    note: {
      ...note,
      tags: JSON.parse(note.tags || '[]'),
      is_pinned: Boolean(note.is_pinned)
    },
    message: 'Notiz aktualisiert.'
  });
}));

router.put('/:id/pin', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Notiz nicht gefunden.' });
  }

  const newPinned = existing.is_pinned ? 0 : 1;

  db.prepare('UPDATE notes SET is_pinned = ? WHERE id = ?').run(newPinned, id);

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);

  res.json({
    note: {
      ...note,
      tags: JSON.parse(note.tags || '[]'),
      is_pinned: Boolean(note.is_pinned)
    },
    message: newPinned ? 'Notiz angepinnt.' : 'Notiz nicht mehr angepinnt.'
  });
}));

router.put('/reorder', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items-Array erforderlich.' });
  }

  const stmt = db.prepare('UPDATE notes SET position = ? WHERE id = ? AND user_id = ?');
  const updateMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.position, item.id, userId);
    }
  });

  updateMany(items);

  res.json({ message: 'Reihenfolge aktualisiert.' });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Notiz nicht gefunden.' });
  }

  db.prepare('DELETE FROM item_links WHERE (source_type = ? AND source_id = ?) OR (target_type = ? AND target_id = ?)')
    .run('note', id, 'note', id);

  db.prepare('DELETE FROM notes WHERE id = ?').run(id);

  res.json({ message: 'Notiz gelöscht.' });
}));

module.exports = router;
