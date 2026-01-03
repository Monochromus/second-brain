const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');

const router = express.Router();

router.use(requireAuth);

// Search across todos, notes, projects, areas, resources, and calendar events
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { q, limit = 20 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json({ results: [] });
  }

  const searchTerm = `%${q.trim()}%`;
  const resultLimit = Math.min(parseInt(limit) || 20, 50);

  // Search todos with project info
  const todos = db.prepare(`
    SELECT
      t.id,
      t.title,
      'todo' as type,
      t.status,
      t.priority,
      t.project_id,
      p.name as project_name,
      p.color as project_color
    FROM todos t
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.user_id = ? AND t.is_archived = 0 AND (t.title LIKE ? OR t.description LIKE ?)
    ORDER BY
      CASE WHEN t.title LIKE ? THEN 0 ELSE 1 END,
      t.priority ASC
    LIMIT ?
  `).all(userId, searchTerm, searchTerm, searchTerm, resultLimit);

  // Search notes with project and area info
  const notes = db.prepare(`
    SELECT
      n.id,
      n.title,
      'note' as type,
      n.is_pinned,
      n.project_id,
      p.name as project_name,
      p.color as project_color,
      n.area_id,
      a.name as area_name,
      a.color as area_color
    FROM notes n
    LEFT JOIN projects p ON n.project_id = p.id
    LEFT JOIN areas a ON n.area_id = a.id
    WHERE n.user_id = ? AND n.is_archived = 0 AND (n.title LIKE ? OR n.content LIKE ?)
    ORDER BY
      CASE WHEN n.title LIKE ? THEN 0 ELSE 1 END,
      n.is_pinned DESC,
      n.updated_at DESC
    LIMIT ?
  `).all(userId, searchTerm, searchTerm, searchTerm, resultLimit);

  // Search projects (uses status instead of is_archived)
  const projects = db.prepare(`
    SELECT id, name as title, 'project' as type, color, status
    FROM projects
    WHERE user_id = ? AND status != 'archived' AND (name LIKE ? OR description LIKE ?)
    ORDER BY
      CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
      position ASC
    LIMIT ?
  `).all(userId, searchTerm, searchTerm, searchTerm, resultLimit);

  // Search areas
  const areas = db.prepare(`
    SELECT id, name as title, 'area' as type, color, icon
    FROM areas
    WHERE user_id = ? AND is_archived = 0 AND (name LIKE ? OR description LIKE ?)
    ORDER BY
      CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
      position ASC
    LIMIT ?
  `).all(userId, searchTerm, searchTerm, searchTerm, resultLimit);

  // Search resources
  const resources = db.prepare(`
    SELECT id, title, 'resource' as type, category, url
    FROM resources
    WHERE user_id = ? AND is_archived = 0 AND (title LIKE ? OR content LIKE ?)
    ORDER BY
      CASE WHEN title LIKE ? THEN 0 ELSE 1 END,
      updated_at DESC
    LIMIT ?
  `).all(userId, searchTerm, searchTerm, searchTerm, resultLimit);

  // Search calendar events with project info
  const events = db.prepare(`
    SELECT
      e.id,
      e.title,
      'event' as type,
      e.start_time,
      e.end_time,
      e.is_all_day,
      e.project_id,
      p.name as project_name,
      p.color as project_color
    FROM calendar_events e
    LEFT JOIN projects p ON e.project_id = p.id
    WHERE e.user_id = ? AND (e.title LIKE ? OR e.description LIKE ?)
    ORDER BY
      CASE WHEN e.title LIKE ? THEN 0 ELSE 1 END,
      e.start_time ASC
    LIMIT ?
  `).all(userId, searchTerm, searchTerm, searchTerm, resultLimit);

  // Combine and limit results
  const results = [
    ...projects.map(p => ({ ...p, category: 'Projekte' })),
    ...areas.map(a => ({ ...a, category: 'Areas' })),
    ...events.map(e => ({ ...e, category: 'Termine' })),
    ...resources.map(r => ({ ...r, category: 'Ressourcen' })),
    ...todos.map(t => ({ ...t, category: 'Todos' })),
    ...notes.map(n => ({ ...n, category: 'Notizen' }))
  ].slice(0, resultLimit);

  res.json({ results });
}));

module.exports = router;
