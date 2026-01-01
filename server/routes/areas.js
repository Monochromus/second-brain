const express = require('express');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { upload, handleMulterError } = require('../middleware/upload');
const db = require('../config/database');

const router = express.Router();

// Ensure areas upload directory exists
const areasUploadDir = path.join(__dirname, '../../uploads/areas');
if (!fs.existsSync(areasUploadDir)) {
  fs.mkdirSync(areasUploadDir, { recursive: true });
}

router.use(requireAuth);

// Get all areas
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { include_archived } = req.query;

  let query = `
    SELECT a.*,
      (SELECT COUNT(*) FROM projects WHERE area_id = a.id AND status != 'archived') as project_count,
      (SELECT COUNT(*) FROM todos WHERE area_id = a.id AND is_archived = 0) as todo_count,
      (SELECT COUNT(*) FROM notes WHERE area_id = a.id AND is_archived = 0) as note_count,
      (SELECT COUNT(*) FROM resources WHERE area_id = a.id AND is_archived = 0) as resource_count
    FROM areas a
    WHERE a.user_id = ?
  `;

  if (include_archived !== 'true') {
    query += ' AND a.is_archived = 0';
  }

  query += ' ORDER BY a.position ASC, a.created_at DESC';

  const areas = db.prepare(query).all(userId);
  res.json(areas);
}));

// Get single area with items
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const area = db.prepare(`
    SELECT * FROM areas WHERE id = ? AND user_id = ?
  `).get(id, userId);

  if (!area) {
    return res.status(404).json({ error: 'Area nicht gefunden' });
  }

  // Get related items
  const projects = db.prepare(`
    SELECT * FROM projects WHERE area_id = ? AND user_id = ? AND status != 'archived'
    ORDER BY position ASC
  `).all(id, userId);

  const todos = db.prepare(`
    SELECT * FROM todos WHERE area_id = ? AND user_id = ? AND is_archived = 0
    ORDER BY priority ASC, due_date ASC NULLS LAST
  `).all(id, userId);

  const notes = db.prepare(`
    SELECT * FROM notes WHERE area_id = ? AND user_id = ? AND is_archived = 0
    ORDER BY is_pinned DESC, updated_at DESC
  `).all(id, userId).map(n => ({
    ...n,
    tags: JSON.parse(n.tags || '[]')
  }));

  const resources = db.prepare(`
    SELECT * FROM resources WHERE area_id = ? AND user_id = ? AND is_archived = 0
    ORDER BY position ASC, updated_at DESC
  `).all(id, userId).map(r => ({
    ...r,
    tags: JSON.parse(r.tags || '[]')
  }));

  res.json({ ...area, projects, todos, notes, resources });
}));

// Create area
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { name, description, icon, color } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name ist erforderlich' });
  }

  const result = db.prepare(`
    INSERT INTO areas (user_id, name, description, icon, color, position)
    VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM areas WHERE user_id = ?))
  `).run(userId, name.trim(), description || null, icon || 'folder', color || '#6366F1', userId);

  const area = db.prepare('SELECT * FROM areas WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(area);
}));

// Update area
router.put('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { name, description, icon, color, is_archived, position } = req.body;

  const existing = db.prepare('SELECT * FROM areas WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Area nicht gefunden' });
  }

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (icon !== undefined) updates.icon = icon;
  if (color !== undefined) updates.color = color;
  if (is_archived !== undefined) updates.is_archived = is_archived ? 1 : 0;
  if (position !== undefined) updates.position = position;

  if (Object.keys(updates).length > 0) {
    const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);
    db.prepare(`UPDATE areas SET ${setClause} WHERE id = ?`).run(...values, id);
  }

  const area = db.prepare('SELECT * FROM areas WHERE id = ?').get(id);
  res.json(area);
}));

// Delete area
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM areas WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Area nicht gefunden' });
  }

  // Unlink items (don't delete them)
  db.prepare('UPDATE projects SET area_id = NULL WHERE area_id = ?').run(id);
  db.prepare('UPDATE todos SET area_id = NULL WHERE area_id = ?').run(id);
  db.prepare('UPDATE notes SET area_id = NULL WHERE area_id = ?').run(id);
  db.prepare('UPDATE resources SET area_id = NULL WHERE area_id = ?').run(id);

  db.prepare('DELETE FROM areas WHERE id = ?').run(id);
  res.json({ success: true });
}));

// Reorder areas
router.post('/reorder', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { updates } = req.body;

  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Updates array ist erforderlich' });
  }

  const stmt = db.prepare('UPDATE areas SET position = ? WHERE id = ? AND user_id = ?');
  for (const { id, position } of updates) {
    stmt.run(position, id, userId);
  }

  res.json({ success: true });
}));

// Upload cover image for area
router.post('/:id/cover', upload.single('cover'), handleMulterError, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM areas WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Area nicht gefunden' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Kein Bild hochgeladen' });
  }

  // Delete old cover if exists
  if (existing.cover_image) {
    const oldPath = path.join(__dirname, '../../', existing.cover_image);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  // Save new cover image
  const ext = req.file.mimetype.split('/')[1];
  const filename = `area-${id}-${Date.now()}.${ext}`;
  const filepath = path.join(areasUploadDir, filename);
  fs.writeFileSync(filepath, req.file.buffer);

  const cover_image = `/uploads/areas/${filename}`;

  db.prepare('UPDATE areas SET cover_image = ? WHERE id = ?').run(cover_image, id);

  const area = db.prepare('SELECT * FROM areas WHERE id = ?').get(id);
  res.json(area);
}));

// Delete cover image
router.delete('/:id/cover', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM areas WHERE id = ? AND user_id = ?').get(id, userId);
  if (!existing) {
    return res.status(404).json({ error: 'Area nicht gefunden' });
  }

  if (existing.cover_image) {
    const oldPath = path.join(__dirname, '../../', existing.cover_image);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
    db.prepare('UPDATE areas SET cover_image = NULL WHERE id = ?').run(id);
  }

  const area = db.prepare('SELECT * FROM areas WHERE id = ?').get(id);
  res.json(area);
}));

module.exports = router;
