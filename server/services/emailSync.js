const db = require('../config/database');
const imapService = require('./imap');
const crypto = require('crypto');

/**
 * Synchronize an email account
 * @param {number} accountId - Email account ID
 * @param {object} options - Sync options
 * @param {boolean} options.full - Force full sync (default: incremental)
 * @param {number} options.limit - Max emails to fetch (default: 100)
 * @returns {Promise<{synced: number, errors: string[]}>}
 */
async function syncAccount(accountId, options = {}) {
  const account = db.prepare('SELECT * FROM email_accounts WHERE id = ?').get(accountId);

  if (!account) {
    throw new Error('Account nicht gefunden');
  }

  if (!account.is_active) {
    throw new Error('Account ist deaktiviert');
  }

  const result = { synced: 0, errors: [] };
  let connection;

  try {
    connection = await imapService.createConnection(account);

    // Get mailboxes
    const mailboxes = await imapService.getMailboxes(connection);

    // Sync standard folders
    const foldersToSync = ['INBOX'];

    // Try to find Sent folder
    const sentFolder = mailboxes.find(mb =>
      mb.name.toLowerCase().includes('sent') ||
      mb.name.toLowerCase().includes('gesendet')
    );
    if (sentFolder) foldersToSync.push(sentFolder.name);

    for (const folder of foldersToSync) {
      try {
        const syncedCount = await syncFolder(connection, account, folder, options);
        result.synced += syncedCount;
      } catch (folderError) {
        result.errors.push(`${folder}: ${folderError.message}`);
      }
    }

    // Update last sync time
    db.prepare(`
      UPDATE email_accounts
      SET last_sync = CURRENT_TIMESTAMP,
          last_sync_status = 'success',
          sync_error = NULL
      WHERE id = ?
    `).run(accountId);

  } catch (error) {
    // Update error status
    db.prepare(`
      UPDATE email_accounts
      SET last_sync = CURRENT_TIMESTAMP,
          last_sync_status = 'error',
          sync_error = ?
      WHERE id = ?
    `).run(error.message, accountId);

    throw error;
  } finally {
    if (connection) {
      imapService.closeConnection(connection);
    }
  }

  return result;
}

/**
 * Sync a single folder
 * @param {object} connection - IMAP connection
 * @param {object} account - Email account
 * @param {string} folder - Folder name
 * @param {object} options - Sync options
 * @returns {Promise<number>} - Number of emails synced
 */
async function syncFolder(connection, account, folder, options = {}) {
  const limit = options.limit || 100;

  // Get highest UID we have for incremental sync
  let uidAfter = null;
  if (!options.full) {
    const lastEmail = db.prepare(`
      SELECT MAX(uid) as maxUid FROM emails
      WHERE account_id = ? AND folder = ?
    `).get(account.id, folder);

    if (lastEmail && lastEmail.maxUid) {
      uidAfter = lastEmail.maxUid;
    }
  }

  // Fetch email headers
  const headers = await imapService.fetchEmailHeaders(connection, folder, {
    limit,
    uidAfter
  });

  let synced = 0;

  // Process each email
  for (const email of headers) {
    try {
      // Check if email already exists
      const exists = db.prepare(
        'SELECT id FROM emails WHERE account_id = ? AND uid = ? AND folder = ?'
      ).get(account.id, email.uid, folder);

      if (exists) {
        // Only update is_read from IMAP flags
        // IMPORTANT: Do NOT overwrite is_starred - the local database is the source of truth
        // for starred emails. The IMAP star update happens asynchronously and may fail or be delayed,
        // so we don't want sync to revert user's local star changes.
        const isRead = email.flags.includes('\\Seen') ? 1 : 0;

        db.prepare(`
          UPDATE emails SET is_read = ? WHERE id = ?
        `).run(isRead, exists.id);
      } else {
        // Insert new email
        const parsed = parseEmailHeaders(email);
        const threadId = buildThreadId(parsed);

        db.prepare(`
          INSERT INTO emails (
            account_id, uid, message_id, thread_id, folder,
            from_address, from_name, to_addresses, cc_addresses,
            subject, snippet, date, is_read, is_starred,
            has_attachments, in_reply_to, references_header, synced_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          account.id,
          email.uid,
          parsed.messageId,
          threadId,
          folder,
          parsed.fromAddress,
          parsed.fromName,
          parsed.toAddresses,
          parsed.ccAddresses,
          parsed.subject,
          '', // Snippet will be filled when body is loaded
          parsed.date,
          email.flags.includes('\\Seen') ? 1 : 0,
          email.flags.includes('\\Flagged') ? 1 : 0,
          email.hasAttachments ? 1 : 0,
          parsed.inReplyTo,
          parsed.references
        );

        synced++;
      }
    } catch (emailError) {
      console.error(`Error syncing email UID ${email.uid}:`, emailError.message);
    }
  }

  return synced;
}

/**
 * Parse email headers from IMAP response
 * @param {object} email - Raw email from IMAP
 * @returns {object} - Parsed headers
 */
function parseEmailHeaders(email) {
  const headers = email.headers || {};

  // Parse FROM
  const from = headers.from ? headers.from[0] : '';
  let fromAddress = '';
  let fromName = '';

  const fromMatch = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+)>?$/);
  if (fromMatch) {
    fromName = (fromMatch[1] || '').trim();
    fromAddress = (fromMatch[2] || from).trim();
  } else {
    fromAddress = from.trim();
  }

  // Parse TO
  const to = headers.to ? headers.to.join(', ') : '';
  const toAddresses = parseAddressList(to);

  // Parse CC
  const cc = headers.cc ? headers.cc.join(', ') : '';
  const ccAddresses = parseAddressList(cc);

  // Parse date
  const dateStr = headers.date ? headers.date[0] : null;
  let date = email.date || new Date();
  if (dateStr) {
    try {
      date = new Date(dateStr);
    } catch {
      // Use fallback
    }
  }

  return {
    messageId: headers['message-id'] ? headers['message-id'][0] : null,
    subject: headers.subject ? headers.subject[0] : '(Kein Betreff)',
    fromAddress,
    fromName,
    toAddresses: JSON.stringify(toAddresses),
    ccAddresses: ccAddresses.length > 0 ? JSON.stringify(ccAddresses) : null,
    date: date.toISOString(),
    inReplyTo: headers['in-reply-to'] ? headers['in-reply-to'][0] : null,
    references: headers.references ? JSON.stringify(headers.references) : null
  };
}

/**
 * Parse address list string
 * @param {string} addressString - Comma-separated addresses
 * @returns {string[]} - Array of email addresses
 */
function parseAddressList(addressString) {
  if (!addressString) return [];

  const addresses = [];
  const parts = addressString.split(',');

  for (const part of parts) {
    const match = part.match(/<([^>]+)>/);
    if (match) {
      addresses.push(match[1].trim());
    } else {
      const trimmed = part.trim();
      if (trimmed && trimmed.includes('@')) {
        addresses.push(trimmed);
      }
    }
  }

  return addresses;
}

/**
 * Build thread ID from email headers
 * Uses In-Reply-To and References to group emails
 * Falls back to normalized subject
 * @param {object} parsedHeaders - Parsed email headers
 * @returns {string} - Thread ID
 */
function buildThreadId(parsedHeaders) {
  // If we have In-Reply-To, use it as base for thread ID
  if (parsedHeaders.inReplyTo) {
    return crypto.createHash('md5')
      .update(parsedHeaders.inReplyTo)
      .digest('hex')
      .substring(0, 16);
  }

  // If we have References, use the first one
  if (parsedHeaders.references) {
    try {
      const refs = JSON.parse(parsedHeaders.references);
      if (refs.length > 0) {
        return crypto.createHash('md5')
          .update(refs[0])
          .digest('hex')
          .substring(0, 16);
      }
    } catch {
      // Use references string directly
      return crypto.createHash('md5')
        .update(parsedHeaders.references)
        .digest('hex')
        .substring(0, 16);
    }
  }

  // Fallback: normalize subject
  const normalizedSubject = normalizeSubject(parsedHeaders.subject || '');
  return crypto.createHash('md5')
    .update(normalizedSubject)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Normalize email subject for thread grouping
 * Removes Re:, Fwd:, etc.
 * @param {string} subject - Original subject
 * @returns {string} - Normalized subject
 */
function normalizeSubject(subject) {
  return subject
    .replace(/^(re:|aw:|fwd?:|wg:)\s*/gi, '')
    .replace(/^(re:|aw:|fwd?:|wg:)\s*/gi, '') // Run twice for nested prefixes
    .trim()
    .toLowerCase();
}

/**
 * Load email body on demand
 * @param {number} emailId - Email ID in database
 * @returns {Promise<object>} - Email with body loaded
 */
async function loadEmailBody(emailId) {
  // IMPORTANT: Use explicit column aliases to avoid id collision between emails and email_accounts tables
  const email = db.prepare(`
    SELECT
      e.id as email_id,
      e.account_id,
      e.uid,
      e.message_id,
      e.thread_id,
      e.folder,
      e.from_address,
      e.from_name,
      e.to_addresses,
      e.cc_addresses,
      e.subject,
      e.snippet,
      e.body_text,
      e.body_html,
      e.date,
      e.is_read,
      e.is_starred,
      e.has_attachments,
      ea.email as account_email,
      ea.encrypted_password,
      ea.encryption_iv,
      ea.encryption_auth_tag,
      ea.imap_host,
      ea.imap_port
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE e.id = ?
  `).get(emailId);

  if (!email) {
    throw new Error('Email nicht gefunden');
  }

  // If body already loaded, return it
  if (email.body_html || email.body_text) {
    return {
      id: email.email_id,  // Use the aliased column
      subject: email.subject,
      from_address: email.from_address,
      from_name: email.from_name,
      to_addresses: email.to_addresses,
      cc_addresses: email.cc_addresses,
      date: email.date,
      body_html: email.body_html,
      body_text: email.body_text,
      is_read: email.is_read,
      is_starred: email.is_starred
    };
  }

  // Load from IMAP
  let connection;
  try {
    // Create IMAP connection with timeout
    const connectionPromise = imapService.createConnection({
      email: email.account_email,
      encrypted_password: email.encrypted_password,
      encryption_iv: email.encryption_iv,
      encryption_auth_tag: email.encryption_auth_tag,
      imap_host: email.imap_host,
      imap_port: email.imap_port
    });

    // 15 second timeout for connection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('IMAP connection timeout')), 15000);
    });

    connection = await Promise.race([connectionPromise, timeoutPromise]);

    const body = await imapService.fetchEmailBody(connection, email.folder, email.uid);

    // Create snippet from text
    const snippet = body.text
      ? body.text.substring(0, 200).replace(/\s+/g, ' ').trim()
      : '';

    // Save to database
    db.prepare(`
      UPDATE emails SET body_text = ?, body_html = ?, snippet = ?
      WHERE id = ?
    `).run(body.text, body.html, snippet, emailId);

    // Save attachments
    if (body.attachments && body.attachments.length > 0) {
      const insertAttachment = db.prepare(`
        INSERT INTO email_attachments (email_id, filename, content_type, size, content_id, is_inline)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const att of body.attachments) {
        insertAttachment.run(
          emailId,
          att.filename || 'attachment',
          att.contentType,
          att.size,
          att.contentId,
          att.contentId ? 1 : 0
        );
      }
    }

    return {
      id: email.email_id,
      subject: email.subject,
      from_address: email.from_address,
      from_name: email.from_name,
      to_addresses: email.to_addresses,
      cc_addresses: email.cc_addresses,
      date: email.date,
      body_html: body.html,
      body_text: body.text,
      is_read: email.is_read,
      is_starred: email.is_starred,
      attachments: body.attachments.map(a => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size
      }))
    };

  } catch (imapError) {
    console.error('IMAP error loading email body:', imapError.message);

    // Fallback: Return email with snippet as body_text
    return {
      id: email.email_id,
      subject: email.subject,
      from_address: email.from_address,
      from_name: email.from_name,
      to_addresses: email.to_addresses,
      cc_addresses: email.cc_addresses,
      date: email.date,
      body_html: null,
      body_text: email.snippet || 'E-Mail-Inhalt konnte nicht geladen werden. Bitte synchronisieren Sie das Konto erneut.',
      is_read: email.is_read,
      is_starred: email.is_starred,
      _loadError: true // Flag to indicate body could not be loaded from IMAP
    };
  } finally {
    if (connection) {
      try {
        imapService.closeConnection(connection);
      } catch (closeErr) {
        console.error('Error closing IMAP connection:', closeErr.message);
      }
    }
  }
}

/**
 * Get all emails in a thread
 * @param {number} emailId - Any email in the thread
 * @returns {Promise<Array<object>>}
 */
async function getEmailThread(emailId) {
  const email = db.prepare('SELECT thread_id FROM emails WHERE id = ?').get(emailId);

  if (!email) {
    throw new Error('Email nicht gefunden');
  }

  const emails = db.prepare(`
    SELECT e.*, ea.email as account_email, ea.display_name as account_name, ea.color as account_color
    FROM emails e
    JOIN email_accounts ea ON e.account_id = ea.id
    WHERE e.thread_id = ?
    ORDER BY e.date ASC
  `).all(email.thread_id);

  return emails;
}

/**
 * Get folder statistics
 * @param {number} accountId - Email account ID
 * @returns {object} - Folder counts
 */
function getFolderStats(accountId) {
  const stats = db.prepare(`
    SELECT
      folder,
      COUNT(*) as total,
      SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
    FROM emails
    WHERE account_id = ?
    GROUP BY folder
  `).all(accountId);

  const result = {};
  for (const row of stats) {
    result[row.folder] = {
      total: row.total,
      unread: row.unread
    };
  }

  return result;
}

module.exports = {
  syncAccount,
  syncFolder,
  loadEmailBody,
  getEmailThread,
  getFolderStats,
  buildThreadId,
  normalizeSubject
};
