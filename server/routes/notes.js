const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.use(requireAuth);

// PARA: Notes can belong to ONE of: Project, Area, or Resource (exclusive)
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { project_id, area_id, resource_id, tags, search, limit } = req.query;

  let query = `
    SELECT n.*,
           p.name as project_name, p.color as project_color,
           a.name as area_name, a.color as area_color,
           r.title as resource_name, r.category as resource_category
    FROM notes n
    LEFT JOIN projects p ON n.project_id = p.id
    LEFT JOIN areas a ON n.area_id = a.id
    LEFT JOIN resources r ON n.resource_id = r.id
    WHERE n.user_id = ? AND n.is_archived = 0
  `;
  const params = [userId];

  if (project_id) {
    if (project_id === 'null') {
      query += ' AND n.project_id IS NULL';
    } else {
      query += ' AND n.project_id = ?';
      params.push(parseInt(project_id));
    }
  }

  if (area_id) {
    if (area_id === 'null') {
      query += ' AND n.area_id IS NULL';
    } else {
      query += ' AND n.area_id = ?';
      params.push(parseInt(area_id));
    }
  }

  if (resource_id) {
    if (resource_id === 'null') {
      query += ' AND n.resource_id IS NULL';
    } else {
      query += ' AND n.resource_id = ?';
      params.push(parseInt(resource_id));
    }
  }

  if (search) {
    query += ' AND (n.title LIKE ? OR n.content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY n.is_pinned DESC, n.created_at DESC';

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

// PARA: Notes belong to exactly ONE container (Project, Area, or Resource)
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { title, content, tags, color, is_pinned, project_id, area_id, resource_id, position } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Titel ist erforderlich.' });
  }

  // PARA: Ensure exclusive container assignment
  const containers = [project_id, area_id, resource_id].filter(Boolean);
  if (containers.length > 1) {
    return res.status(400).json({ error: 'Eine Notiz kann nur einem Container (Projekt, Area oder Ressource) zugeordnet werden.' });
  }

  const maxPosition = db.prepare('SELECT MAX(position) as max FROM notes WHERE user_id = ?')
    .get(userId);
  const newPosition = position !== undefined ? position : (maxPosition.max || 0) + 1;

  const result = db.prepare(`
    INSERT INTO notes (user_id, title, content, tags, color, is_pinned, project_id, area_id, resource_id, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    title.trim(),
    content || null,
    JSON.stringify(tags || []),
    color || null,
    is_pinned ? 1 : 0,
    project_id || null,
    area_id || null,
    resource_id || null,
    newPosition
  );

  // Fetch note with joined names for immediate UI update
  const note = db.prepare(`
    SELECT n.*,
           p.name as project_name, p.color as project_color,
           a.name as area_name, a.color as area_color,
           r.title as resource_name, r.category as resource_category
    FROM notes n
    LEFT JOIN projects p ON n.project_id = p.id
    LEFT JOIN areas a ON n.area_id = a.id
    LEFT JOIN resources r ON n.resource_id = r.id
    WHERE n.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({
    note: {
      ...note,
      tags: JSON.parse(note.tags || '[]'),
      is_pinned: Boolean(note.is_pinned)
    },
    message: 'Notiz erstellt.'
  });
}));

// PARA: Notes belong to exactly ONE container (Project, Area, or Resource)
router.put('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { title, content, tags, color, is_pinned, project_id, area_id, resource_id, position } = req.body;

  const existing = db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Notiz nicht gefunden.' });
  }

  // PARA: Ensure exclusive container assignment when updating
  const newProjectId = project_id !== undefined ? project_id : existing.project_id;
  const newAreaId = area_id !== undefined ? area_id : existing.area_id;
  const newResourceId = resource_id !== undefined ? resource_id : existing.resource_id;
  const containers = [newProjectId, newAreaId, newResourceId].filter(Boolean);
  if (containers.length > 1) {
    return res.status(400).json({ error: 'Eine Notiz kann nur einem Container (Projekt, Area oder Ressource) zugeordnet werden.' });
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
  if (area_id !== undefined) {
    updates.push('area_id = ?');
    params.push(area_id);
  }
  if (resource_id !== undefined) {
    updates.push('resource_id = ?');
    params.push(resource_id);
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

  // Fetch note with joined names for immediate UI update
  const note = db.prepare(`
    SELECT n.*,
           p.name as project_name, p.color as project_color,
           a.name as area_name, a.color as area_color,
           r.title as resource_name, r.category as resource_category
    FROM notes n
    LEFT JOIN projects p ON n.project_id = p.id
    LEFT JOIN areas a ON n.area_id = a.id
    LEFT JOIN resources r ON n.resource_id = r.id
    WHERE n.id = ?
  `).get(id);

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

  // Fetch note with joined names for immediate UI update
  const note = db.prepare(`
    SELECT n.*,
           p.name as project_name, p.color as project_color,
           a.name as area_name, a.color as area_color,
           r.title as resource_name, r.category as resource_category
    FROM notes n
    LEFT JOIN projects p ON n.project_id = p.id
    LEFT JOIN areas a ON n.area_id = a.id
    LEFT JOIN resources r ON n.resource_id = r.id
    WHERE n.id = ?
  `).get(id);

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
