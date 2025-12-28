const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');

const router = express.Router();

router.use(requireAuth);

// Get all archived items
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;

  // Get archived projects
  const projects = db.prepare(`
    SELECT id, name as title, 'project' as type, color, updated_at
    FROM projects
    WHERE user_id = ? AND status = 'archived'
    ORDER BY updated_at DESC
  `).all(userId);

  // Get archived todos
  const todos = db.prepare(`
    SELECT id, title, 'todo' as type, status, updated_at
    FROM todos
    WHERE user_id = ? AND is_archived = 1
    ORDER BY updated_at DESC
  `).all(userId);

  // Get archived notes
  const notes = db.prepare(`
    SELECT id, title, 'note' as type, color, updated_at
    FROM notes
    WHERE user_id = ? AND is_archived = 1
    ORDER BY updated_at DESC
  `).all(userId);

  // Get archived areas
  const areas = db.prepare(`
    SELECT id, name as title, 'area' as type, color, icon, updated_at
    FROM areas
    WHERE user_id = ? AND is_archived = 1
    ORDER BY updated_at DESC
  `).all(userId);

  // Get archived resources
  const resources = db.prepare(`
    SELECT id, title, 'resource' as type, category, updated_at
    FROM resources
    WHERE user_id = ? AND is_archived = 1
    ORDER BY updated_at DESC
  `).all(userId);

  res.json({
    projects,
    todos,
    notes,
    areas,
    resources,
    total: projects.length + todos.length + notes.length + areas.length + resources.length
  });
}));

// Archive an item
router.post('/:type/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { type, id } = req.params;

  let table, column, check;

  switch (type) {
    case 'project':
      table = 'projects';
      column = 'status';
      check = 'archived';
      break;
    case 'todo':
      table = 'todos';
      column = 'is_archived';
      check = 1;
      break;
    case 'note':
      table = 'notes';
      column = 'is_archived';
      check = 1;
      break;
    case 'area':
      table = 'areas';
      column = 'is_archived';
      check = 1;
      break;
    case 'resource':
      table = 'resources';
      column = 'is_archived';
      check = 1;
      break;
    default:
      return res.status(400).json({ error: 'Ungültiger Typ' });
  }

  const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Element nicht gefunden' });
  }

  db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`).run(check, id);

  res.json({ success: true, message: 'Element archiviert' });
}));

// Restore an item from archive
router.post('/:type/:id/restore', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { type, id } = req.params;

  let table, column, value;

  switch (type) {
    case 'project':
      table = 'projects';
      column = 'status';
      value = 'active';
      break;
    case 'todo':
      table = 'todos';
      column = 'is_archived';
      value = 0;
      break;
    case 'note':
      table = 'notes';
      column = 'is_archived';
      value = 0;
      break;
    case 'area':
      table = 'areas';
      column = 'is_archived';
      value = 0;
      break;
    case 'resource':
      table = 'resources';
      column = 'is_archived';
      value = 0;
      break;
    default:
      return res.status(400).json({ error: 'Ungültiger Typ' });
  }

  const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Element nicht gefunden' });
  }

  db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`).run(value, id);

  res.json({ success: true, message: 'Element wiederhergestellt' });
}));

// Permanently delete an archived item
router.delete('/:type/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { type, id } = req.params;

  const tables = {
    project: 'projects',
    todo: 'todos',
    note: 'notes',
    area: 'areas',
    resource: 'resources'
  };

  const table = tables[type];
  if (!table) {
    return res.status(400).json({ error: 'Ungültiger Typ' });
  }

  const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?`).get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Element nicht gefunden' });
  }

  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);

  res.json({ success: true, message: 'Element gelöscht' });
}));

module.exports = router;
