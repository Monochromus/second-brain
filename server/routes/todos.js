const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { status, project_id, priority, due_before, limit } = req.query;

  let query = 'SELECT * FROM todos WHERE user_id = ?';
  const params = [userId];

  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (project_id) {
    if (project_id === 'null') {
      query += ' AND project_id IS NULL';
    } else {
      query += ' AND project_id = ?';
      params.push(parseInt(project_id));
    }
  }

  if (priority) {
    query += ' AND priority = ?';
    params.push(parseInt(priority));
  }

  if (due_before) {
    query += ' AND due_date <= ?';
    params.push(due_before);
  }

  query += ' ORDER BY created_at DESC';

  if (limit) {
    query += ' LIMIT ?';
    params.push(parseInt(limit));
  }

  const todos = db.prepare(query).all(...params);

  res.json({ todos });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!todo) {
    return res.status(404).json({ error: 'Todo nicht gefunden.' });
  }

  const links = db.prepare(`
    SELECT * FROM item_links
    WHERE (source_type = 'todo' AND source_id = ?)
    OR (target_type = 'todo' AND target_id = ?)
  `).all(id, id);

  res.json({ todo, links });
}));

router.post('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { title, description, priority, status, due_date, due_time, project_id, position } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Titel ist erforderlich.' });
  }

  const maxPosition = db.prepare('SELECT MAX(position) as max FROM todos WHERE user_id = ?')
    .get(userId);
  const newPosition = position !== undefined ? position : (maxPosition.max || 0) + 1;

  const result = db.prepare(`
    INSERT INTO todos (user_id, title, description, priority, status, due_date, due_time, project_id, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    title.trim(),
    description || null,
    priority || 3,
    status || 'open',
    due_date || null,
    due_time || null,
    project_id || null,
    newPosition
  );

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ todo, message: 'Todo erstellt.' });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { title, description, priority, status, due_date, due_time, project_id, position } = req.body;

  const existing = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Todo nicht gefunden.' });
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
  if (priority !== undefined) {
    updates.push('priority = ?');
    params.push(priority);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (due_date !== undefined) {
    updates.push('due_date = ?');
    params.push(due_date);
  }
  if (due_time !== undefined) {
    updates.push('due_time = ?');
    params.push(due_time);
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

  db.prepare(`UPDATE todos SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
    .run(...params);

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);

  res.json({ todo, message: 'Todo aktualisiert.' });
}));

router.put('/:id/complete', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Todo nicht gefunden.' });
  }

  const newStatus = existing.status === 'done' ? 'open' : 'done';

  db.prepare('UPDATE todos SET status = ? WHERE id = ?').run(newStatus, id);

  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(id);

  let projectCompleted = false;

  // Auto-complete project if all todos are done
  if (newStatus === 'done' && existing.project_id) {
    const projectTodos = db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed
      FROM todos WHERE project_id = ?
    `).get(existing.project_id);

    // All todos in project are done
    if (projectTodos.total > 0 && projectTodos.total === projectTodos.completed) {
      const project = db.prepare('SELECT status FROM projects WHERE id = ?').get(existing.project_id);
      // Only auto-complete if project is currently active
      if (project && project.status === 'active') {
        db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('completed', existing.project_id);
        projectCompleted = true;
      }
    }
  }

  // Re-open project if a todo is reopened
  if (newStatus === 'open' && existing.project_id) {
    const project = db.prepare('SELECT status FROM projects WHERE id = ?').get(existing.project_id);
    if (project && project.status === 'completed') {
      db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('active', existing.project_id);
    }
  }

  res.json({
    todo,
    projectCompleted,
    message: newStatus === 'done' ? 'Todo abgeschlossen.' : 'Todo wieder geöffnet.'
  });
}));

router.put('/reorder', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items-Array erforderlich.' });
  }

  const stmt = db.prepare('UPDATE todos SET position = ? WHERE id = ? AND user_id = ?');
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

  const existing = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    return res.status(404).json({ error: 'Todo nicht gefunden.' });
  }

  db.prepare('DELETE FROM item_links WHERE (source_type = ? AND source_id = ?) OR (target_type = ? AND target_id = ?)')
    .run('todo', id, 'todo', id);

  db.prepare('DELETE FROM todos WHERE id = ?').run(id);

  res.json({ message: 'Todo gelöscht.' });
}));

module.exports = router;
