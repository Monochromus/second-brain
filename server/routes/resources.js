const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');

const router = express.Router();

router.use(requireAuth);

// Get all resources
// PARA: Resources are thematic collections, linked to multiple Projects (n:m), NOT to Areas
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { include_archived, category, search, project_id } = req.query;

  let query = 'SELECT * FROM resources WHERE user_id = ?';
  const params = [userId];

  if (include_archived !== 'true') {
    query += ' AND is_archived = 0';
  }

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  // Filter by project using junction table
  if (project_id) {
    query += ' AND id IN (SELECT resource_id FROM project_resources WHERE project_id = ?)';
    params.push(project_id);
  }

  if (search) {
    query += ' AND (title LIKE ? OR content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';

  const resources = db.prepare(query).all(...params);

  // Get linked projects for each resource
  const parsed = resources.map(r => {
    const linkedProjects = db.prepare(`
      SELECT p.id, p.name, p.color
      FROM projects p
      JOIN project_resources pr ON p.id = pr.project_id
      WHERE pr.resource_id = ?
    `).all(r.id);

    return {
      ...r,
      tags: JSON.parse(r.tags || '[]'),
      projects: linkedProjects
    };
  });

  res.json(parsed);
}));

// Get resource categories
router.get('/categories', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const categories = db.prepare(`
    SELECT category, COUNT(*) as count
    FROM resources
    WHERE user_id = ? AND is_archived = 0 AND category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
  `).all(userId);

  res.json(categories);
}));

// Get single resource
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const resource = db.prepare('SELECT * FROM resources WHERE id = ? AND user_id = ?').get(id, userId);

  if (!resource) {
    return res.status(404).json({ error: 'Ressource nicht gefunden' });
  }

  res.json({
    ...resource,
    tags: JSON.parse(resource.tags || '[]')
  });
}));

// Create resource
// PARA: Resources can be linked to multiple Projects (n:m), NOT to Areas
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { title, content, url, tags, category, project_ids } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Titel ist erforderlich' });
  }

  const result = db.prepare(`
    INSERT INTO resources (user_id, title, content, url, tags, category, position)
    VALUES (?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM resources WHERE user_id = ?))
  `).run(
    userId,
    title.trim(),
    content || null,
    url || null,
    JSON.stringify(tags || []),
    category || null,
    userId
  );

  const resourceId = result.lastInsertRowid;

  // Link to projects using junction table
  if (project_ids && Array.isArray(project_ids) && project_ids.length > 0) {
    const insertLink = db.prepare('INSERT OR IGNORE INTO project_resources (project_id, resource_id) VALUES (?, ?)');
    for (const projectId of project_ids) {
      insertLink.run(projectId, resourceId);
    }
  }

  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(resourceId);

  // Get linked projects
  const linkedProjects = db.prepare(`
    SELECT p.id, p.name, p.color
    FROM projects p
    JOIN project_resources pr ON p.id = pr.project_id
    WHERE pr.resource_id = ?
  `).all(resourceId);

  res.status(201).json({
    ...resource,
    tags: JSON.parse(resource.tags || '[]'),
    projects: linkedProjects
  });
}));

// Update resource
// PARA: Resources can be linked to multiple Projects (n:m), NOT to Areas
router.put('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { title, content, url, tags, category, project_ids, is_archived, position } = req.body;

  const existing = db.prepare('SELECT * FROM resources WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Ressource nicht gefunden' });
  }

  const updates = {};
  if (title !== undefined) updates.title = title.trim();
  if (content !== undefined) updates.content = content;
  if (url !== undefined) updates.url = url;
  if (tags !== undefined) updates.tags = JSON.stringify(tags);
  if (category !== undefined) updates.category = category;
  if (is_archived !== undefined) updates.is_archived = is_archived ? 1 : 0;
  if (position !== undefined) updates.position = position;

  if (Object.keys(updates).length > 0) {
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    db.prepare(`UPDATE resources SET ${setClause} WHERE id = ?`).run(...values, id);
  }

  // Update project links if provided
  if (project_ids !== undefined && Array.isArray(project_ids)) {
    // Remove existing links
    db.prepare('DELETE FROM project_resources WHERE resource_id = ?').run(id);
    // Add new links
    if (project_ids.length > 0) {
      const insertLink = db.prepare('INSERT OR IGNORE INTO project_resources (project_id, resource_id) VALUES (?, ?)');
      for (const projectId of project_ids) {
        insertLink.run(projectId, id);
      }
    }
  }

  const resource = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);

  // Get linked projects
  const linkedProjects = db.prepare(`
    SELECT p.id, p.name, p.color
    FROM projects p
    JOIN project_resources pr ON p.id = pr.project_id
    WHERE pr.resource_id = ?
  `).all(id);

  res.json({
    ...resource,
    tags: JSON.parse(resource.tags || '[]'),
    projects: linkedProjects
  });
}));

// Delete resource
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM resources WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Ressource nicht gefunden' });
  }

  // Remove project links (CASCADE should handle this but being explicit)
  db.prepare('DELETE FROM project_resources WHERE resource_id = ?').run(id);
  db.prepare('DELETE FROM resources WHERE id = ?').run(id);
  res.json({ success: true });
}));

// Reorder resources
router.post('/reorder', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { updates } = req.body;

  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates array ist erforderlich' });
  }

  const stmt = db.prepare('UPDATE resources SET position = ? WHERE id = ? AND user_id = ?');
  for (const { id, position } of updates) {
    stmt.run(position, id, userId);
  }

  res.json({ success: true });
}));

module.exports = router;
