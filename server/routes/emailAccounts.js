const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { encrypt } = require('../services/encryption');
const { getProvider, getProviderList, isValidProvider } = require('../config/emailProviders');
const imapService = require('../services/imap');
const smtpService = require('../services/smtp');
const emailSync = require('../services/emailSync');

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * GET /api/email-accounts
 * List all email accounts for the authenticated user
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const accounts = db.prepare(`
    SELECT
      id, email, display_name, provider,
      imap_host, imap_port, smtp_host, smtp_port,
      color, is_active, last_sync, last_sync_status, sync_error,
      created_at, updated_at
    FROM email_accounts
    WHERE user_id = ?
    ORDER BY created_at ASC
  `).all(userId);

  // Get unread counts for each account
  const accountsWithStats = accounts.map(account => {
    const stats = emailSync.getFolderStats(account.id);
    return {
      ...account,
      unread_count: stats.INBOX ? stats.INBOX.unread : 0,
      total_count: stats.INBOX ? stats.INBOX.total : 0
    };
  });

  res.json(accountsWithStats);
}));

/**
 * GET /api/email-accounts/providers
 * Get list of available email providers
 */
router.get('/providers', asyncHandler(async (req, res) => {
  res.json(getProviderList());
}));

/**
 * POST /api/email-accounts
 * Add a new email account
 */
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { email, password, displayName, provider, color } = req.body;

  // Validation
  if (!email || !password || !provider) {
    return res.status(400).json({
      error: 'E-Mail, Passwort und Provider sind erforderlich.'
    });
  }

  if (!isValidProvider(provider)) {
    return res.status(400).json({
      error: 'Ungültiger E-Mail-Provider.'
    });
  }

  // Check if account already exists
  const existing = db.prepare(
    'SELECT id FROM email_accounts WHERE user_id = ? AND email = ?'
  ).get(userId, email);

  if (existing) {
    return res.status(409).json({
      error: 'Dieser E-Mail-Account ist bereits verbunden.'
    });
  }

  // Get provider config
  const providerConfig = getProvider(provider);

  // Test connection before saving
  try {
    await imapService.testConnection({
      email,
      password,
      imapHost: providerConfig.imap.host,
      imapPort: providerConfig.imap.port
    });
  } catch (imapError) {
    return res.status(400).json({
      error: `IMAP-Verbindung fehlgeschlagen: ${imapError.message}`,
      hint: 'Bitte prüfe deine E-Mail-Adresse und das App-spezifische Passwort.'
    });
  }

  // Encrypt password
  const { encrypted, iv, authTag } = encrypt(password);

  // Insert account
  const result = db.prepare(`
    INSERT INTO email_accounts (
      user_id, email, display_name, provider,
      encrypted_password, encryption_iv, encryption_auth_tag,
      imap_host, imap_port, smtp_host, smtp_port,
      color, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    userId,
    email,
    displayName || email.split('@')[0],
    provider,
    encrypted,
    iv,
    authTag,
    providerConfig.imap.host,
    providerConfig.imap.port,
    providerConfig.smtp.host,
    providerConfig.smtp.port,
    color || '#3B82F6'
  );

  const account = db.prepare(`
    SELECT id, email, display_name, provider, color, is_active, created_at
    FROM email_accounts WHERE id = ?
  `).get(result.lastInsertRowid);

  // Trigger initial sync in background
  emailSync.syncAccount(account.id, { limit: 50 }).catch(err => {
    console.error('Initial sync error:', err.message);
  });

  res.status(201).json({
    account,
    message: 'E-Mail-Account erfolgreich verbunden. Die Synchronisierung läuft im Hintergrund.'
  });
}));

/**
 * PUT /api/email-accounts/:id
 * Update an email account
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { displayName, color, isActive, password } = req.body;

  // Check ownership
  const account = db.prepare(
    'SELECT * FROM email_accounts WHERE id = ? AND user_id = ?'
  ).get(id, userId);

  if (!account) {
    return res.status(404).json({ error: 'Account nicht gefunden.' });
  }

  const updates = [];
  const params = [];

  if (displayName !== undefined) {
    updates.push('display_name = ?');
    params.push(displayName);
  }

  if (color !== undefined) {
    updates.push('color = ?');
    params.push(color);
  }

  if (isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(isActive ? 1 : 0);
  }

  // If password is updated, re-encrypt
  if (password) {
    // Test connection with new password first
    try {
      await imapService.testConnection({
        email: account.email,
        password,
        imapHost: account.imap_host,
        imapPort: account.imap_port
      });
    } catch (imapError) {
      return res.status(400).json({
        error: `IMAP-Verbindung fehlgeschlagen: ${imapError.message}`
      });
    }

    const { encrypted, iv, authTag } = encrypt(password);
    updates.push('encrypted_password = ?');
    params.push(encrypted);
    updates.push('encryption_iv = ?');
    params.push(iv);
    updates.push('encryption_auth_tag = ?');
    params.push(authTag);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben.' });
  }

  params.push(id);

  db.prepare(`
    UPDATE email_accounts SET ${updates.join(', ')} WHERE id = ?
  `).run(...params);

  const updated = db.prepare(`
    SELECT id, email, display_name, provider, color, is_active,
           last_sync, last_sync_status, sync_error
    FROM email_accounts WHERE id = ?
  `).get(id);

  res.json({ account: updated, message: 'Account aktualisiert.' });
}));

/**
 * DELETE /api/email-accounts/:id
 * Remove an email account
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const account = db.prepare(
    'SELECT id FROM email_accounts WHERE id = ? AND user_id = ?'
  ).get(id, userId);

  if (!account) {
    return res.status(404).json({ error: 'Account nicht gefunden.' });
  }

  // Delete account (cascade will delete emails)
  db.prepare('DELETE FROM email_accounts WHERE id = ?').run(id);

  res.json({ message: 'Account und alle zugehörigen E-Mails wurden gelöscht.' });
}));

/**
 * POST /api/email-accounts/:id/test
 * Test connection for an existing account
 */
router.post('/:id/test', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const account = db.prepare(
    'SELECT * FROM email_accounts WHERE id = ? AND user_id = ?'
  ).get(id, userId);

  if (!account) {
    return res.status(404).json({ error: 'Account nicht gefunden.' });
  }

  const results = { imap: false, smtp: false, errors: [] };

  // Test IMAP
  try {
    const connection = await imapService.createConnection(account);
    imapService.closeConnection(connection);
    results.imap = true;
  } catch (error) {
    results.errors.push(`IMAP: ${error.message}`);
  }

  // Test SMTP
  try {
    const { decrypt } = require('../services/encryption');
    const password = decrypt(
      account.encrypted_password,
      account.encryption_iv,
      account.encryption_auth_tag
    );

    await smtpService.testConnection({
      email: account.email,
      password,
      smtpHost: account.smtp_host,
      smtpPort: account.smtp_port
    });
    results.smtp = true;
  } catch (error) {
    results.errors.push(`SMTP: ${error.message}`);
  }

  if (results.imap && results.smtp) {
    res.json({ success: true, message: 'Verbindung erfolgreich.' });
  } else {
    res.status(400).json({
      success: false,
      errors: results.errors,
      imap: results.imap,
      smtp: results.smtp
    });
  }
}));

/**
 * POST /api/email-accounts/:id/sync
 * Trigger manual sync for an account
 */
router.post('/:id/sync', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { full } = req.body;

  const account = db.prepare(
    'SELECT id FROM email_accounts WHERE id = ? AND user_id = ?'
  ).get(id, userId);

  if (!account) {
    return res.status(404).json({ error: 'Account nicht gefunden.' });
  }

  try {
    const result = await emailSync.syncAccount(id, { full, limit: 100 });
    res.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      message: `${result.synced} neue E-Mails synchronisiert.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

module.exports = router;
