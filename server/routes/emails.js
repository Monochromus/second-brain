const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const emailSync = require('../services/emailSync');
const imapService = require('../services/imap');

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * GET /api/emails
 * List emails with filters
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const {
    account_id,
    folder = 'INBOX',
    category,
    unread,
    starred,
    limit = 50,
    offset = 0,
    search
  } = req.query;

  // Build query
  let query = `
    SELECT
      e.id, e.account_id, e.uid, e.message_id, e.thread_id, e.folder,
      e.from_address, e.from_name, e.to_addresses, e.subject, e.snippet,
      e.date, e.is_read, e.is_starred, e.has_attachments, e.category,
      ea.email as account_email, ea.display_name as account_name, ea.color as account_color
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE ea.user_id = ?
  `;
  const params = [userId];

  if (account_id) {
    query += ' AND e.account_id = ?';
    params.push(account_id);
  }

  if (folder) {
    query += ' AND e.folder = ?';
    params.push(folder);
  }

  if (category) {
    query += ' AND e.category = ?';
    params.push(category);
  }

  if (unread === 'true') {
    query += ' AND e.is_read = 0';
  }

  if (starred === 'true') {
    query += ' AND e.is_starred = 1';
  }

  if (search) {
    query += ' AND (e.subject LIKE ? OR e.from_name LIKE ? OR e.from_address LIKE ? OR e.snippet LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  query += ' ORDER BY e.date DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const emails = db.prepare(query).all(...params);

  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE ea.user_id = ?
  `;
  const countParams = [userId];

  if (account_id) {
    countQuery += ' AND e.account_id = ?';
    countParams.push(account_id);
  }
  if (folder) {
    countQuery += ' AND e.folder = ?';
    countParams.push(folder);
  }
  if (category) {
    countQuery += ' AND e.category = ?';
    countParams.push(category);
  }
  if (unread === 'true') {
    countQuery += ' AND e.is_read = 0';
  }
  if (starred === 'true') {
    countQuery += ' AND e.is_starred = 1';
  }

  const { total } = db.prepare(countQuery).get(...countParams);

  res.json({
    emails,
    total,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
}));

/**
 * GET /api/emails/stats
 * Get email statistics for the user
 */
router.get('/stats', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
      SUM(CASE WHEN is_starred = 1 THEN 1 ELSE 0 END) as starred
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE ea.user_id = ? AND e.folder = 'INBOX'
  `).get(userId);

  res.json(stats);
}));

/**
 * GET /api/emails/:id
 * Get single email with body
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  // Check ownership
  const email = db.prepare(`
    SELECT e.*, ea.user_id
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE e.id = ?
  `).get(id);

  if (!email || email.user_id !== userId) {
    return res.status(404).json({ error: 'E-Mail nicht gefunden.' });
  }

  // Load body if not cached
  try {
    const fullEmail = await emailSync.loadEmailBody(id);

    // Get attachments
    const attachments = db.prepare(
      'SELECT id, filename, content_type, size, is_inline FROM email_attachments WHERE email_id = ?'
    ).all(id);

    res.json({
      ...fullEmail,
      attachments
    });
  } catch (error) {
    res.status(500).json({ error: `Fehler beim Laden der E-Mail: ${error.message}` });
  }
}));

/**
 * GET /api/emails/:id/thread
 * Get all emails in a thread
 */
router.get('/:id/thread', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  // Check ownership
  const email = db.prepare(`
    SELECT e.*, ea.user_id
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE e.id = ?
  `).get(id);

  if (!email || email.user_id !== userId) {
    return res.status(404).json({ error: 'E-Mail nicht gefunden.' });
  }

  try {
    const thread = await emailSync.getEmailThread(id);
    res.json(thread);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}));

/**
 * PUT /api/emails/:id/read
 * Mark email as read/unread
 */
router.put('/:id/read', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { is_read } = req.body;

  // Check ownership
  const email = db.prepare(`
    SELECT e.*, ea.user_id, ea.encrypted_password, ea.encryption_iv, ea.encryption_auth_tag,
           ea.imap_host, ea.imap_port, ea.email as account_email
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE e.id = ?
  `).get(id);

  if (!email || email.user_id !== userId) {
    return res.status(404).json({ error: 'E-Mail nicht gefunden.' });
  }

  // Update in database
  db.prepare('UPDATE emails SET is_read = ? WHERE id = ?').run(is_read ? 1 : 0, id);

  // Update on IMAP server (async, don't wait)
  (async () => {
    try {
      const connection = await imapService.createConnection({
        email: email.account_email,
        encrypted_password: email.encrypted_password,
        encryption_iv: email.encryption_iv,
        encryption_auth_tag: email.encryption_auth_tag,
        imap_host: email.imap_host,
        imap_port: email.imap_port
      });

      if (is_read) {
        await imapService.markAsRead(connection, email.folder, [email.uid]);
      } else {
        await imapService.markAsUnread(connection, email.folder, [email.uid]);
      }

      imapService.closeConnection(connection);
    } catch (err) {
      console.error('Error updating read status on IMAP:', err.message);
    }
  })();

  res.json({ success: true, is_read: is_read ? 1 : 0 });
}));

/**
 * PUT /api/emails/:id/star
 * Toggle star on email
 */
router.put('/:id/star', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { is_starred } = req.body;

  // Check ownership
  const email = db.prepare(`
    SELECT e.*, ea.user_id, ea.encrypted_password, ea.encryption_iv, ea.encryption_auth_tag,
           ea.imap_host, ea.imap_port, ea.email as account_email
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE e.id = ?
  `).get(id);

  if (!email || email.user_id !== userId) {
    return res.status(404).json({ error: 'E-Mail nicht gefunden.' });
  }

  // Update in database
  db.prepare('UPDATE emails SET is_starred = ? WHERE id = ?').run(is_starred ? 1 : 0, id);

  // Update on IMAP server (async, don't wait)
  (async () => {
    try {
      const connection = await imapService.createConnection({
        email: email.account_email,
        encrypted_password: email.encrypted_password,
        encryption_iv: email.encryption_iv,
        encryption_auth_tag: email.encryption_auth_tag,
        imap_host: email.imap_host,
        imap_port: email.imap_port
      });

      await imapService.setStarred(connection, email.folder, email.uid, is_starred);
      imapService.closeConnection(connection);
    } catch (err) {
      console.error('Error updating star status on IMAP:', err.message);
    }
  })();

  res.json({ success: true, is_starred: is_starred ? 1 : 0 });
}));

/**
 * PUT /api/emails/:id/move
 * Move email to another folder
 */
router.put('/:id/move', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { folder } = req.body;

  if (!folder) {
    return res.status(400).json({ error: 'Zielordner ist erforderlich.' });
  }

  // Check ownership
  const email = db.prepare(`
    SELECT e.*, ea.user_id, ea.encrypted_password, ea.encryption_iv, ea.encryption_auth_tag,
           ea.imap_host, ea.imap_port, ea.email as account_email
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE e.id = ?
  `).get(id);

  if (!email || email.user_id !== userId) {
    return res.status(404).json({ error: 'E-Mail nicht gefunden.' });
  }

  try {
    const connection = await imapService.createConnection({
      email: email.account_email,
      encrypted_password: email.encrypted_password,
      encryption_iv: email.encryption_iv,
      encryption_auth_tag: email.encryption_auth_tag,
      imap_host: email.imap_host,
      imap_port: email.imap_port
    });

    await imapService.moveEmail(connection, email.uid, email.folder, folder);
    imapService.closeConnection(connection);

    // Update in database
    db.prepare('UPDATE emails SET folder = ? WHERE id = ?').run(folder, id);

    res.json({ success: true, folder });
  } catch (error) {
    res.status(500).json({ error: `Fehler beim Verschieben: ${error.message}` });
  }
}));

/**
 * DELETE /api/emails/:id
 * Delete email (move to trash)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  // Check ownership
  const email = db.prepare(`
    SELECT e.*, ea.user_id, ea.provider
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE e.id = ?
  `).get(id);

  if (!email || email.user_id !== userId) {
    return res.status(404).json({ error: 'E-Mail nicht gefunden.' });
  }

  // Determine trash folder based on provider
  const trashFolders = {
    icloud: 'Deleted Messages',
    gmail: '[Gmail]/Trash',
    outlook: 'Deleted'
  };
  const trashFolder = trashFolders[email.provider] || 'Trash';

  // If already in trash, permanently delete from database
  if (email.folder.toLowerCase().includes('trash') ||
      email.folder.toLowerCase().includes('deleted')) {
    db.prepare('DELETE FROM emails WHERE id = ?').run(id);
    return res.json({ success: true, message: 'E-Mail permanent gelöscht.' });
  }

  // Move to trash folder
  db.prepare('UPDATE emails SET folder = ? WHERE id = ?').run(trashFolder, id);

  res.json({ success: true, message: 'E-Mail in Papierkorb verschoben.' });
}));

/**
 * POST /api/emails/search
 * Search emails
 */
router.post('/search', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { query, account_id, folder, limit = 50 } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Suchbegriff ist erforderlich.' });
  }

  let sql = `
    SELECT
      e.id, e.account_id, e.folder, e.from_address, e.from_name,
      e.subject, e.snippet, e.date, e.is_read, e.is_starred,
      ea.email as account_email, ea.color as account_color
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE ea.user_id = ?
      AND (e.subject LIKE ? OR e.from_name LIKE ? OR e.from_address LIKE ? OR e.snippet LIKE ? OR e.body_text LIKE ?)
  `;
  const searchTerm = `%${query}%`;
  const params = [userId, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];

  if (account_id) {
    sql += ' AND e.account_id = ?';
    params.push(account_id);
  }

  if (folder) {
    sql += ' AND e.folder = ?';
    params.push(folder);
  }

  sql += ' ORDER BY e.date DESC LIMIT ?';
  params.push(parseInt(limit));

  const results = db.prepare(sql).all(...params);

  res.json({ results, query });
}));

/**
 * POST /api/emails/bulk
 * Bulk operations on emails
 */
router.post('/bulk', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { ids, action, value } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Keine E-Mails ausgewählt.' });
  }

  if (!action) {
    return res.status(400).json({ error: 'Keine Aktion angegeben.' });
  }

  // Verify ownership of all emails
  const placeholders = ids.map(() => '?').join(',');
  const emails = db.prepare(`
    SELECT e.id FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE e.id IN (${placeholders}) AND ea.user_id = ?
  `).all(...ids, userId);

  if (emails.length !== ids.length) {
    return res.status(403).json({ error: 'Zugriff verweigert.' });
  }

  switch (action) {
    case 'mark_read':
      db.prepare(`UPDATE emails SET is_read = 1 WHERE id IN (${placeholders})`).run(...ids);
      break;

    case 'mark_unread':
      db.prepare(`UPDATE emails SET is_read = 0 WHERE id IN (${placeholders})`).run(...ids);
      break;

    case 'star':
      db.prepare(`UPDATE emails SET is_starred = 1 WHERE id IN (${placeholders})`).run(...ids);
      break;

    case 'unstar':
      db.prepare(`UPDATE emails SET is_starred = 0 WHERE id IN (${placeholders})`).run(...ids);
      break;

    case 'move':
      if (!value) {
        return res.status(400).json({ error: 'Zielordner ist erforderlich.' });
      }
      db.prepare(`UPDATE emails SET folder = ? WHERE id IN (${placeholders})`).run(value, ...ids);
      break;

    case 'delete':
      db.prepare(`DELETE FROM emails WHERE id IN (${placeholders})`).run(...ids);
      break;

    default:
      return res.status(400).json({ error: 'Ungültige Aktion.' });
  }

  res.json({ success: true, affected: ids.length });
}));

module.exports = router;
