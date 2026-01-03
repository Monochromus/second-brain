const express = require('express');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const smtpService = require('../services/smtp');

const router = express.Router();

// Apply authentication to all routes
router.use(requireAuth);

/**
 * GET /api/email-drafts
 * List all drafts for the authenticated user
 */
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const drafts = db.prepare(`
    SELECT
      d.id, d.account_id, d.to_addresses, d.cc_addresses, d.bcc_addresses,
      d.subject, d.body_html, d.in_reply_to_id, d.created_at, d.updated_at,
      ea.email as account_email, ea.display_name as account_name, ea.color as account_color
    FROM email_drafts d
    LEFT JOIN email_accounts ea ON d.account_id = ea.id
    WHERE d.user_id = ?
    ORDER BY d.updated_at DESC
  `).all(userId);

  res.json(drafts);
}));

/**
 * GET /api/email-drafts/:id
 * Get a single draft
 */
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const draft = db.prepare(`
    SELECT
      d.*, ea.email as account_email, ea.display_name as account_name, ea.color as account_color
    FROM email_drafts d
    LEFT JOIN email_accounts ea ON d.account_id = ea.id
    WHERE d.id = ? AND d.user_id = ?
  `).get(id, userId);

  if (!draft) {
    return res.status(404).json({ error: 'Entwurf nicht gefunden.' });
  }

  // If this is a reply, get the original email info
  let originalEmail = null;
  if (draft.in_reply_to_id) {
    originalEmail = db.prepare(`
      SELECT id, from_address, from_name, subject, date
      FROM emails WHERE id = ?
    `).get(draft.in_reply_to_id);
  }

  res.json({ ...draft, originalEmail });
}));

/**
 * POST /api/email-drafts
 * Create a new draft
 */
router.post('/', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const {
    account_id,
    to_addresses,
    cc_addresses,
    bcc_addresses,
    subject,
    body_html,
    body_text,
    in_reply_to_id
  } = req.body;

  // Validate account if provided
  if (account_id) {
    const account = db.prepare(
      'SELECT id FROM email_accounts WHERE id = ? AND user_id = ?'
    ).get(account_id, userId);

    if (!account) {
      return res.status(400).json({ error: 'Ungültiger E-Mail-Account.' });
    }
  }

  // Validate reply target if provided
  if (in_reply_to_id) {
    const originalEmail = db.prepare(`
      SELECT e.id FROM emails e
      JOIN email_accounts ea ON e.account_id = ea.id
      WHERE e.id = ? AND ea.user_id = ?
    `).get(in_reply_to_id, userId);

    if (!originalEmail) {
      return res.status(400).json({ error: 'Original-E-Mail nicht gefunden.' });
    }
  }

  const result = db.prepare(`
    INSERT INTO email_drafts (
      user_id, account_id, to_addresses, cc_addresses, bcc_addresses,
      subject, body_html, body_text, in_reply_to_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    account_id || null,
    to_addresses ? JSON.stringify(to_addresses) : null,
    cc_addresses ? JSON.stringify(cc_addresses) : null,
    bcc_addresses ? JSON.stringify(bcc_addresses) : null,
    subject || '',
    body_html || '',
    body_text || '',
    in_reply_to_id || null
  );

  const draft = db.prepare('SELECT * FROM email_drafts WHERE id = ?')
    .get(result.lastInsertRowid);

  res.status(201).json({ draft, message: 'Entwurf gespeichert.' });
}));

/**
 * PUT /api/email-drafts/:id
 * Update a draft
 */
router.put('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const {
    account_id,
    to_addresses,
    cc_addresses,
    bcc_addresses,
    subject,
    body_html,
    body_text
  } = req.body;

  // Check ownership
  const draft = db.prepare(
    'SELECT id FROM email_drafts WHERE id = ? AND user_id = ?'
  ).get(id, userId);

  if (!draft) {
    return res.status(404).json({ error: 'Entwurf nicht gefunden.' });
  }

  const updates = [];
  const params = [];

  if (account_id !== undefined) {
    updates.push('account_id = ?');
    params.push(account_id);
  }

  if (to_addresses !== undefined) {
    updates.push('to_addresses = ?');
    params.push(to_addresses ? JSON.stringify(to_addresses) : null);
  }

  if (cc_addresses !== undefined) {
    updates.push('cc_addresses = ?');
    params.push(cc_addresses ? JSON.stringify(cc_addresses) : null);
  }

  if (bcc_addresses !== undefined) {
    updates.push('bcc_addresses = ?');
    params.push(bcc_addresses ? JSON.stringify(bcc_addresses) : null);
  }

  if (subject !== undefined) {
    updates.push('subject = ?');
    params.push(subject);
  }

  if (body_html !== undefined) {
    updates.push('body_html = ?');
    params.push(body_html);
  }

  if (body_text !== undefined) {
    updates.push('body_text = ?');
    params.push(body_text);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'Keine Änderungen angegeben.' });
  }

  params.push(id);

  db.prepare(`UPDATE email_drafts SET ${updates.join(', ')} WHERE id = ?`)
    .run(...params);

  const updated = db.prepare('SELECT * FROM email_drafts WHERE id = ?').get(id);

  res.json({ draft: updated, message: 'Entwurf aktualisiert.' });
}));

/**
 * DELETE /api/email-drafts/:id
 * Delete a draft
 */
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const draft = db.prepare(
    'SELECT id FROM email_drafts WHERE id = ? AND user_id = ?'
  ).get(id, userId);

  if (!draft) {
    return res.status(404).json({ error: 'Entwurf nicht gefunden.' });
  }

  db.prepare('DELETE FROM email_drafts WHERE id = ?').run(id);

  res.json({ message: 'Entwurf gelöscht.' });
}));

/**
 * POST /api/email-drafts/:id/send
 * Send a draft
 */
router.post('/:id/send', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  // Get draft with account info
  const draft = db.prepare(`
    SELECT d.*, ea.id as acc_id, ea.email as acc_email, ea.display_name,
           ea.encrypted_password, ea.encryption_iv, ea.encryption_auth_tag,
           ea.smtp_host, ea.smtp_port
    FROM email_drafts d
    LEFT JOIN email_accounts ea ON d.account_id = ea.id
    WHERE d.id = ? AND d.user_id = ?
  `).get(id, userId);

  if (!draft) {
    return res.status(404).json({ error: 'Entwurf nicht gefunden.' });
  }

  if (!draft.acc_id) {
    return res.status(400).json({ error: 'Bitte wähle einen Absender-Account aus.' });
  }

  // Parse addresses
  let toAddresses;
  try {
    toAddresses = draft.to_addresses ? JSON.parse(draft.to_addresses) : [];
  } catch {
    toAddresses = [draft.to_addresses];
  }

  if (!toAddresses || toAddresses.length === 0) {
    return res.status(400).json({ error: 'Bitte gib mindestens einen Empfänger an.' });
  }

  // Parse CC/BCC
  let ccAddresses, bccAddresses;
  try {
    ccAddresses = draft.cc_addresses ? JSON.parse(draft.cc_addresses) : null;
    bccAddresses = draft.bcc_addresses ? JSON.parse(draft.bcc_addresses) : null;
  } catch {
    ccAddresses = null;
    bccAddresses = null;
  }

  // Prepare email data
  const emailData = {
    to: toAddresses,
    cc: ccAddresses,
    bcc: bccAddresses,
    subject: draft.subject || '(Kein Betreff)',
    html: draft.body_html,
    text: draft.body_text
  };

  // If this is a reply, add In-Reply-To and References
  if (draft.in_reply_to_id) {
    const originalEmail = db.prepare(
      'SELECT message_id, references_header FROM emails WHERE id = ?'
    ).get(draft.in_reply_to_id);

    if (originalEmail) {
      emailData.inReplyTo = originalEmail.message_id;

      const references = [];
      if (originalEmail.references_header) {
        try {
          const parsed = JSON.parse(originalEmail.references_header);
          references.push(...(Array.isArray(parsed) ? parsed : [parsed]));
        } catch {
          references.push(originalEmail.references_header);
        }
      }
      if (originalEmail.message_id) {
        references.push(originalEmail.message_id);
      }
      if (references.length > 0) {
        emailData.references = references;
      }
    }
  }

  // Send email
  try {
    const account = {
      email: draft.acc_email,
      display_name: draft.display_name,
      encrypted_password: draft.encrypted_password,
      encryption_iv: draft.encryption_iv,
      encryption_auth_tag: draft.encryption_auth_tag,
      smtp_host: draft.smtp_host,
      smtp_port: draft.smtp_port
    };

    const result = await smtpService.sendEmail(account, emailData);

    // Save sent email to the emails table for "Sent" folder
    const sentEmail = db.prepare(`
      INSERT INTO emails (
        account_id, uid, message_id, folder, from_address, from_name,
        to_addresses, cc_addresses, subject, snippet, body_text, body_html,
        date, is_read, is_starred, has_attachments, in_reply_to, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      draft.acc_id,
      Date.now(), // Use timestamp as unique UID for sent emails
      result.messageId,
      'Sent',
      draft.acc_email,
      draft.display_name,
      Array.isArray(toAddresses) ? toAddresses.join(', ') : toAddresses,
      ccAddresses ? (Array.isArray(ccAddresses) ? ccAddresses.join(', ') : ccAddresses) : null,
      draft.subject || '(Kein Betreff)',
      (draft.body_text || '').substring(0, 200),
      draft.body_text || '',
      draft.body_html || '',
      new Date().toISOString(),
      1, // Mark as read
      0, // Not starred
      0, // No attachments
      emailData.inReplyTo || null
    );

    // Delete draft after successful send
    db.prepare('DELETE FROM email_drafts WHERE id = ?').run(id);

    res.json({
      success: true,
      messageId: result.messageId,
      sentEmailId: sentEmail.lastInsertRowid,
      message: 'E-Mail erfolgreich gesendet.'
    });
  } catch (error) {
    res.status(500).json({
      error: `Senden fehlgeschlagen: ${error.message}`
    });
  }
}));

/**
 * POST /api/email-drafts/from-reply
 * Create a draft from replying to an email
 */
router.post('/from-reply', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { email_id, reply_all, body } = req.body;

  if (!email_id) {
    return res.status(400).json({ error: 'E-Mail-ID ist erforderlich.' });
  }

  // Get original email
  const originalEmail = db.prepare(`
    SELECT e.*, ea.id as account_id, ea.email as sender_email
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE e.id = ? AND ea.user_id = ?
  `).get(email_id, userId);

  if (!originalEmail) {
    return res.status(404).json({ error: 'Original-E-Mail nicht gefunden.' });
  }

  // Create reply structure
  const reply = smtpService.createReply(
    originalEmail,
    body || '',
    reply_all,
    originalEmail.sender_email
  );

  // Save as draft
  const result = db.prepare(`
    INSERT INTO email_drafts (
      user_id, account_id, to_addresses, cc_addresses, subject,
      body_html, in_reply_to_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    originalEmail.account_id,
    JSON.stringify([reply.to]),
    reply.cc ? JSON.stringify(reply.cc) : null,
    reply.subject,
    reply.html,
    email_id
  );

  const draft = db.prepare(`
    SELECT d.*, ea.email as account_email, ea.display_name as account_name, ea.color as account_color
    FROM email_drafts d
    LEFT JOIN email_accounts ea ON d.account_id = ea.id
    WHERE d.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ draft, message: 'Antwort-Entwurf erstellt.' });
}));

module.exports = router;
