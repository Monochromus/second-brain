const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { status } = req.query;

  let query = `
    SELECT p.*, a.name as area_name, a.color as area_color, a.icon as area_icon
    FROM projects p
    LEFT JOIN areas a ON p.area_id = a.id
    WHERE p.user_id = ?
  `;
  const params = [userId];

  if (status && status !== 'all') {
    query += ' AND p.status = ?';
    params.push(status);
  }

  query += ' ORDER BY p.position ASC, p.created_at DESC';

  const projects = db.prepare(query).all(...params);

  const projectsWithStats = projects.map(project => {
    const todoStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
      FROM todos WHERE project_id = ?
    `).get(project.id);

    const noteCount = db.prepare('SELECT COUNT(*) as count FROM notes WHERE project_id = ?')
      .get(project.id).count;

    return {
      ...project,
      stats: {
        totalTodos: todoStats.total || 0,
        completedTodos: todoStats.completed || 0,
        progress: todoStats.total > 0 ? Math.round((todoStats.completed / todoStats.total) * 100) : 0,
        noteCount
      }
    };
  });

  res.json({ projects: projectsWithStats });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const project = db.prepare(`
    SELECT p.*, a.name as area_name, a.color as area_color, a.icon as area_icon
    FROM projects p
    LEFT JOIN areas a ON p.area_id = a.id
    WHERE p.id = ? AND p.user_id = ?
  `).get(id, userId);

  if (!project) {
    return res.status(404).json({ error: 'Projekt nicht gefunden.' });
  }

  const todos = db.prepare(`
    SELECT * FROM todos WHERE project_id = ?
    ORDER BY status ASC, priority ASC, position ASC
  `).all(id);

  const notes = db.prepare(`
    SELECT * FROM notes WHERE project_id = ?
    ORDER BY is_pinned DESC, position ASC, updated_at DESC
  `).all(id).map(note => ({
    ...note,
    tags: JSON.parse(note.tags || '[]'),
    is_pinned: Boolean(note.is_pinned)
  }));

  const events = db.prepare(`
    SELECT * FROM calendar_events WHERE project_id = ?
    ORDER BY start_time ASC
  `).all(id);

  const todoStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
    FROM todos WHERE project_id = ?
  `).get(id);

  res.json({
    project: {
      ...project,
      stats: {
        totalTodos: todoStats.total || 0,
        completedTodos: todoStats.completed || 0,
        progress: todoStats.total > 0 ? Math.round((todoStats.completed / todoStats.total) * 100) : 0,
        noteCount: notes.length,
        eventCount: events.length
      }
    },
    todos,
    notes,
    events
  });
}));

router.post('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { name, description, color, status, deadline, position, area_id } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Projektname ist erforderlich.' });
  }

  // Validate area_id if provided
  if (area_id) {
    const area = db.prepare('SELECT id FROM areas WHERE id = ? AND user_id = ?').get(area_id, userId);
    if (!area) {
      return res.status(400).json({ error: 'Bereich nicht gefunden.' });
    }
  }

  const maxPosition = db.prepare('SELECT MAX(position) as max FROM projects WHERE user_id = ?')
    .get(userId);
  const newPosition = position !== undefined ? position : (maxPosition.max || 0) + 1;

  const result = db.prepare(`
    INSERT INTO projects (user_id, name, description, color, status, deadline, position, area_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    name.trim(),
    description || null,
    color || '#D97706',
    status || 'active',
    deadline || null,
    newPosition,
    area_id || null
  );

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    project: {
      ...project,
      stats: {
        totalTodos: 0,
        completedTodos: 0,
        progress: 0,
        noteCount: 0
      }
    },
    message: 'Projekt erstellt.'
  });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { name, description, color, status, deadline, position, area_id } = req.body;

  const existing = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Projekt nicht gefunden.' });
  }

  // Validate area_id if provided
  if (area_id !== undefined && area_id !== null) {
    const area = db.prepare('SELECT id FROM areas WHERE id = ? AND user_id = ?').get(area_id, userId);
    if (!area) {
      return res.status(400).json({ error: 'Bereich nicht gefunden.' });
    }
  }

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (color !== undefined) {
    updates.push('color = ?');
    params.push(color);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (deadline !== undefined) {
    updates.push('deadline = ?');
    params.push(deadline);
  }
  if (position !== undefined) {
    updates.push('position = ?');
    params.push(position);
  }
  if (area_id !== undefined) {
    updates.push('area_id = ?');
    params.push(area_id);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben.' });
  }

  params.push(id, userId);

  db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
    .run(...params);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);

  const todoStats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
    FROM todos WHERE project_id = ?
  `).get(id);

  const noteCount = db.prepare('SELECT COUNT(*) as count FROM notes WHERE project_id = ?')
    .get(id).count;

  res.json({
    project: {
      ...project,
      stats: {
        totalTodos: todoStats.total || 0,
        completedTodos: todoStats.completed || 0,
        progress: todoStats.total > 0 ? Math.round((todoStats.completed / todoStats.total) * 100) : 0,
        noteCount
      }
    },
    message: 'Projekt aktualisiert.'
  });
}));

router.put('/reorder', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items-Array erforderlich.' });
  }

  const stmt = db.prepare('UPDATE projects SET position = ? WHERE id = ? AND user_id = ?');
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

  const existing = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Projekt nicht gefunden.' });
  }

  db.prepare('UPDATE todos SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('UPDATE notes SET project_id = NULL WHERE project_id = ?').run(id);
  db.prepare('UPDATE calendar_events SET project_id = NULL WHERE project_id = ?').run(id);

  db.prepare('DELETE FROM item_links WHERE target_type = ? AND target_id = ?')
    .run('project', id);

  db.prepare('DELETE FROM projects WHERE id = ?').run(id);

  res.json({ message: 'Projekt gelöscht.' });
}));

module.exports = router;
