const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { getProvider } = require('../config/emailProviders');
const { decrypt } = require('./encryption');

/**
 * Create an IMAP connection to an email account
 * @param {object} account - Email account from database
 * @returns {Promise<Imap>} - Connected IMAP instance
 */
function createConnection(account) {
  return new Promise((resolve, reject) => {
    // Decrypt password
    let password;
    try {
      password = decrypt(
        account.encrypted_password,
        account.encryption_iv,
        account.encryption_auth_tag
      );
    } catch (error) {
      reject(new Error('Fehler beim Entschlüsseln des Passworts'));
      return;
    }

    const imap = new Imap({
      user: account.email,
      password: password,
      host: account.imap_host,
      port: account.imap_port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 15000
    });

    imap.once('ready', () => {
      resolve(imap);
    });

    imap.once('error', (err) => {
      reject(err);
    });

    imap.once('end', () => {
      console.log('IMAP connection ended');
    });

    imap.connect();
  });
}

/**
 * Test IMAP connection with credentials
 * @param {object} credentials - { email, password, imapHost, imapPort }
 * @returns {Promise<boolean>}
 */
function testConnection(credentials) {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: credentials.email,
      password: credentials.password,
      host: credentials.imapHost,
      port: credentials.imapPort,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
      connTimeout: 15000
    });

    imap.once('ready', () => {
      imap.end();
      resolve(true);
    });

    imap.once('error', (err) => {
      reject(err);
    });

    imap.connect();
  });
}

/**
 * Get list of mailboxes (folders)
 * @param {Imap} connection - Active IMAP connection
 * @returns {Promise<Array<{name: string, delimiter: string, flags: string[]}>>}
 */
function getMailboxes(connection) {
  return new Promise((resolve, reject) => {
    connection.getBoxes((err, boxes) => {
      if (err) {
        reject(err);
        return;
      }

      const mailboxes = [];

      function parseBoxes(boxObj, prefix = '') {
        for (const [name, box] of Object.entries(boxObj)) {
          const fullName = prefix ? `${prefix}${box.delimiter}${name}` : name;
          mailboxes.push({
            name: fullName,
            delimiter: box.delimiter,
            flags: box.attribs || []
          });

          if (box.children) {
            parseBoxes(box.children, fullName);
          }
        }
      }

      parseBoxes(boxes);
      resolve(mailboxes);
    });
  });
}

/**
 * Fetch email headers from a folder
 * @param {Imap} connection - Active IMAP connection
 * @param {string} folder - Folder name (e.g., 'INBOX')
 * @param {object} options - { limit: number, since: Date, uidAfter: number }
 * @returns {Promise<Array<object>>}
 */
function fetchEmailHeaders(connection, folder, options = {}) {
  return new Promise((resolve, reject) => {
    connection.openBox(folder, true, (err, box) => {
      if (err) {
        reject(err);
        return;
      }

      const emails = [];
      const limit = options.limit || 100;

      // Build search criteria
      let searchCriteria = ['ALL'];
      if (options.since) {
        searchCriteria = [['SINCE', options.since]];
      }
      if (options.uidAfter) {
        searchCriteria = [['UID', `${options.uidAfter}:*`]];
      }

      connection.search(searchCriteria, (err, uids) => {
        if (err) {
          reject(err);
          return;
        }

        if (!uids || uids.length === 0) {
          resolve([]);
          return;
        }

        // Sort by UID descending and take limit
        const sortedUids = uids.sort((a, b) => b - a).slice(0, limit);

        const fetch = connection.fetch(sortedUids, {
          bodies: ['HEADER.FIELDS (FROM TO CC SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES)'],
          struct: true
        });

        fetch.on('message', (msg, seqno) => {
          const email = { uid: null, flags: [], hasAttachments: false };

          msg.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
            stream.once('end', () => {
              email.headers = Imap.parseHeader(buffer);
            });
          });

          msg.once('attributes', (attrs) => {
            email.uid = attrs.uid;
            email.flags = attrs.flags || [];
            email.date = attrs.date;

            // Check for attachments in structure
            if (attrs.struct) {
              email.hasAttachments = hasAttachments(attrs.struct);
            }
          });

          msg.once('end', () => {
            emails.push(email);
          });
        });

        fetch.once('error', (err) => {
          reject(err);
        });

        fetch.once('end', () => {
          resolve(emails);
        });
      });
    });
  });
}

/**
 * Check if email structure has attachments
 */
function hasAttachments(struct) {
  if (Array.isArray(struct)) {
    return struct.some(part => hasAttachments(part));
  }
  if (struct && struct.disposition &&
      (struct.disposition.type === 'ATTACHMENT' || struct.disposition.type === 'attachment')) {
    return true;
  }
  if (struct && struct.parts) {
    return hasAttachments(struct.parts);
  }
  return false;
}

/**
 * Fetch full email body
 * @param {Imap} connection - Active IMAP connection
 * @param {string} folder - Folder name
 * @param {number} uid - Email UID
 * @returns {Promise<object>} - Parsed email with body
 */
function fetchEmailBody(connection, folder, uid) {
  return new Promise((resolve, reject) => {
    connection.openBox(folder, true, (err) => {
      if (err) {
        reject(err);
        return;
      }

      const fetch = connection.fetch([uid], {
        bodies: '',
        struct: true
      });

      let rawEmail = '';

      fetch.on('message', (msg) => {
        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            rawEmail += chunk.toString('utf8');
          });
        });
      });

      fetch.once('error', reject);

      fetch.once('end', async () => {
        try {
          const parsed = await simpleParser(rawEmail);
          resolve({
            subject: parsed.subject,
            from: parsed.from,
            to: parsed.to,
            cc: parsed.cc,
            date: parsed.date,
            messageId: parsed.messageId,
            inReplyTo: parsed.inReplyTo,
            references: parsed.references,
            text: parsed.text,
            html: parsed.html,
            attachments: (parsed.attachments || []).map(att => ({
              filename: att.filename,
              contentType: att.contentType,
              size: att.size,
              contentId: att.contentId,
              content: att.content // Buffer
            }))
          });
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });
  });
}

/**
 * Mark emails as read
 * @param {Imap} connection - Active IMAP connection
 * @param {string} folder - Folder name
 * @param {number[]} uids - Email UIDs
 */
function markAsRead(connection, folder, uids) {
  return new Promise((resolve, reject) => {
    connection.openBox(folder, false, (err) => {
      if (err) {
        reject(err);
        return;
      }

      connection.addFlags(uids, ['\\Seen'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

/**
 * Mark emails as unread
 * @param {Imap} connection - Active IMAP connection
 * @param {string} folder - Folder name
 * @param {number[]} uids - Email UIDs
 */
function markAsUnread(connection, folder, uids) {
  return new Promise((resolve, reject) => {
    connection.openBox(folder, false, (err) => {
      if (err) {
        reject(err);
        return;
      }

      connection.delFlags(uids, ['\\Seen'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

/**
 * Add/remove star (flagged)
 * @param {Imap} connection - Active IMAP connection
 * @param {string} folder - Folder name
 * @param {number} uid - Email UID
 * @param {boolean} starred - Whether to star or unstar
 */
function setStarred(connection, folder, uid, starred) {
  return new Promise((resolve, reject) => {
    connection.openBox(folder, false, (err) => {
      if (err) {
        reject(err);
        return;
      }

      const method = starred ? connection.addFlags : connection.delFlags;
      method.call(connection, [uid], ['\\Flagged'], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

/**
 * Move email to another folder
 * @param {Imap} connection - Active IMAP connection
 * @param {number} uid - Email UID
 * @param {string} fromFolder - Source folder
 * @param {string} toFolder - Destination folder
 */
function moveEmail(connection, uid, fromFolder, toFolder) {
  return new Promise((resolve, reject) => {
    connection.openBox(fromFolder, false, (err) => {
      if (err) {
        reject(err);
        return;
      }

      connection.move([uid], toFolder, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

/**
 * Delete email (move to Trash or permanently delete)
 * @param {Imap} connection - Active IMAP connection
 * @param {string} folder - Current folder
 * @param {number} uid - Email UID
 * @param {string} trashFolder - Trash folder name
 */
function deleteEmail(connection, folder, uid, trashFolder = '[Gmail]/Trash') {
  return new Promise((resolve, reject) => {
    // If already in trash, permanently delete
    if (folder.toLowerCase().includes('trash') || folder.toLowerCase().includes('deleted')) {
      connection.openBox(folder, false, (err) => {
        if (err) {
          reject(err);
          return;
        }

        connection.addFlags([uid], ['\\Deleted'], (err) => {
          if (err) {
            reject(err);
            return;
          }

          connection.expunge([uid], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      });
    } else {
      // Move to trash
      moveEmail(connection, uid, folder, trashFolder)
        .then(resolve)
        .catch(reject);
    }
  });
}

/**
 * Search emails by criteria
 * @param {Imap} connection - Active IMAP connection
 * @param {string} folder - Folder to search
 * @param {object} criteria - Search criteria
 * @returns {Promise<number[]>} - Array of UIDs
 */
function searchEmails(connection, folder, criteria) {
  return new Promise((resolve, reject) => {
    connection.openBox(folder, true, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Build IMAP search criteria
      const searchCriteria = [];

      if (criteria.from) {
        searchCriteria.push(['FROM', criteria.from]);
      }
      if (criteria.subject) {
        searchCriteria.push(['SUBJECT', criteria.subject]);
      }
      if (criteria.body) {
        searchCriteria.push(['BODY', criteria.body]);
      }
      if (criteria.since) {
        searchCriteria.push(['SINCE', criteria.since]);
      }
      if (criteria.before) {
        searchCriteria.push(['BEFORE', criteria.before]);
      }
      if (criteria.unread) {
        searchCriteria.push('UNSEEN');
      }
      if (criteria.flagged) {
        searchCriteria.push('FLAGGED');
      }

      // If no criteria, search all
      if (searchCriteria.length === 0) {
        searchCriteria.push('ALL');
      }

      connection.search(searchCriteria, (err, uids) => {
        if (err) reject(err);
        else resolve(uids || []);
      });
    });
  });
}

/**
 * Close IMAP connection
 * @param {Imap} connection - Active IMAP connection
 */
function closeConnection(connection) {
  if (connection && connection.state !== 'disconnected') {
    connection.end();
  }
}

module.exports = {
  createConnection,
  testConnection,
  getMailboxes,
  fetchEmailHeaders,
  fetchEmailBody,
  markAsRead,
  markAsUnread,
  setStarred,
  moveEmail,
  deleteEmail,
  searchEmails,
  closeConnection
};
