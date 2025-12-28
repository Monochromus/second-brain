const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');

const router = express.Router();

router.use(requireAuth);

// Search across todos, notes, and projects
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { q, limit = 10 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json({ results: [] });
  }

  const searchTerm = `%${q.trim()}%`;
  const resultLimit = Math.min(parseInt(limit) || 10, 20);

  // Search todos
  const todos = db.prepare(`
    SELECT id, title, 'todo' as type, status, priority
    FROM todos
    WHERE user_id = ? AND (title LIKE ? OR description LIKE ?)
    ORDER BY
      CASE WHEN title LIKE ? THEN 0 ELSE 1 END,
      priority ASC
    LIMIT ?
  `).all(userId, searchTerm, searchTerm, searchTerm, resultLimit);

  // Search notes
  const notes = db.prepare(`
    SELECT id, title, 'note' as type, is_pinned
    FROM notes
    WHERE user_id = ? AND (title LIKE ? OR content LIKE ?)
    ORDER BY
      CASE WHEN title LIKE ? THEN 0 ELSE 1 END,
      is_pinned DESC,
      updated_at DESC
    LIMIT ?
  `).all(userId, searchTerm, searchTerm, searchTerm, resultLimit);

  // Search projects
  const projects = db.prepare(`
    SELECT id, name as title, 'project' as type, color, status
    FROM projects
    WHERE user_id = ? AND (name LIKE ? OR description LIKE ?)
    ORDER BY
      CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
      position ASC
    LIMIT ?
  `).all(userId, searchTerm, searchTerm, searchTerm, resultLimit);

  // Combine and limit results
  const results = [
    ...projects.map(p => ({ ...p, category: 'Projekte' })),
    ...todos.map(t => ({ ...t, category: 'Todos' })),
    ...notes.map(n => ({ ...n, category: 'Notizen' }))
  ].slice(0, resultLimit);

  res.json({ results });
}));

module.exports = router;
