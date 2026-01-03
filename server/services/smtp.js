const nodemailer = require('nodemailer');
const { decrypt } = require('./encryption');

/**
 * Create a nodemailer transporter for an email account
 * @param {object} account - Email account from database
 * @returns {Promise<nodemailer.Transporter>}
 */
async function createTransporter(account) {
  // Decrypt password
  let password;
  try {
    password = decrypt(
      account.encrypted_password,
      account.encryption_iv,
      account.encryption_auth_tag
    );
  } catch (error) {
    throw new Error('Fehler beim Entschlüsseln des Passworts');
  }

  const transporter = nodemailer.createTransport({
    host: account.smtp_host,
    port: account.smtp_port,
    secure: false, // Use STARTTLS
    requireTLS: true,
    auth: {
      user: account.email,
      pass: password
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return transporter;
}

/**
 * Test SMTP connection with credentials
 * @param {object} credentials - { email, password, smtpHost, smtpPort }
 * @returns {Promise<boolean>}
 */
async function testConnection(credentials) {
  const transporter = nodemailer.createTransport({
    host: credentials.smtpHost,
    port: credentials.smtpPort,
    secure: false,
    requireTLS: true,
    auth: {
      user: credentials.email,
      pass: credentials.password
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.verify();
    return true;
  } catch (error) {
    throw error;
  } finally {
    transporter.close();
  }
}

/**
 * Send an email
 * @param {object} account - Email account from database
 * @param {object} emailData - Email data
 * @param {string|string[]} emailData.to - Recipient(s)
 * @param {string|string[]} [emailData.cc] - CC recipient(s)
 * @param {string|string[]} [emailData.bcc] - BCC recipient(s)
 * @param {string} emailData.subject - Subject line
 * @param {string} [emailData.text] - Plain text body
 * @param {string} [emailData.html] - HTML body
 * @param {string} [emailData.inReplyTo] - Message-ID being replied to
 * @param {string[]} [emailData.references] - Reference message IDs
 * @param {Array<{filename: string, content: Buffer|string, contentType?: string}>} [emailData.attachments]
 * @returns {Promise<{messageId: string, response: string}>}
 */
async function sendEmail(account, emailData) {
  const transporter = await createTransporter(account);

  try {
    const mailOptions = {
      from: {
        name: account.display_name || account.email,
        address: account.email
      },
      to: emailData.to,
      subject: emailData.subject
    };

    // Optional fields
    if (emailData.cc) {
      mailOptions.cc = emailData.cc;
    }
    if (emailData.bcc) {
      mailOptions.bcc = emailData.bcc;
    }
    if (emailData.text) {
      mailOptions.text = emailData.text;
    }
    if (emailData.html) {
      mailOptions.html = emailData.html;
    }
    if (emailData.inReplyTo) {
      mailOptions.inReplyTo = emailData.inReplyTo;
    }
    if (emailData.references) {
      mailOptions.references = emailData.references;
    }
    if (emailData.attachments && emailData.attachments.length > 0) {
      mailOptions.attachments = emailData.attachments;
    }

    const result = await transporter.sendMail(mailOptions);

    return {
      messageId: result.messageId,
      response: result.response
    };
  } finally {
    transporter.close();
  }
}

/**
 * Create a reply email structure
 * @param {object} originalEmail - The email being replied to
 * @param {string} replyBody - The reply body (HTML or text)
 * @param {boolean} replyAll - Whether to reply to all recipients
 * @param {string} senderEmail - The sender's email address
 * @returns {object} - Email data ready to send
 */
function createReply(originalEmail, replyBody, replyAll, senderEmail) {
  // Determine recipients
  const to = originalEmail.from_address;
  let cc = null;

  if (replyAll) {
    // Include all original recipients except the sender
    const allRecipients = [
      ...(originalEmail.to_addresses ? JSON.parse(originalEmail.to_addresses) : []),
      ...(originalEmail.cc_addresses ? JSON.parse(originalEmail.cc_addresses) : [])
    ].filter(email =>
      email.toLowerCase() !== senderEmail.toLowerCase() &&
      email.toLowerCase() !== originalEmail.from_address.toLowerCase()
    );

    if (allRecipients.length > 0) {
      cc = allRecipients;
    }
  }

  // Build subject with Re: prefix
  let subject = originalEmail.subject || '';
  if (!subject.toLowerCase().startsWith('re:')) {
    subject = `Re: ${subject}`;
  }

  // Build references chain
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

  // Build quoted original message
  const originalDate = new Date(originalEmail.date).toLocaleString('de-DE', {
    dateStyle: 'full',
    timeStyle: 'short'
  });
  const quotedBody = `
<br><br>
<div style="border-left: 2px solid #ccc; padding-left: 10px; color: #666;">
  <p>Am ${originalDate} schrieb ${originalEmail.from_name || originalEmail.from_address}:</p>
  <blockquote>${originalEmail.body_html || originalEmail.body_text || ''}</blockquote>
</div>
  `.trim();

  return {
    to,
    cc,
    subject,
    html: replyBody + quotedBody,
    inReplyTo: originalEmail.message_id,
    references: references.length > 0 ? references : undefined
  };
}

/**
 * Create a forward email structure
 * @param {object} originalEmail - The email being forwarded
 * @param {string} forwardBody - Additional message body (HTML or text)
 * @returns {object} - Email data ready to send (needs 'to' field)
 */
function createForward(originalEmail, forwardBody = '') {
  // Build subject with Fwd: prefix
  let subject = originalEmail.subject || '';
  if (!subject.toLowerCase().startsWith('fwd:') && !subject.toLowerCase().startsWith('fw:')) {
    subject = `Fwd: ${subject}`;
  }

  // Build forwarded message
  const originalDate = new Date(originalEmail.date).toLocaleString('de-DE', {
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const forwardedBody = `
${forwardBody}
<br><br>
<div style="border-top: 1px solid #ccc; padding-top: 10px;">
  <p><strong>---------- Weitergeleitete Nachricht ----------</strong></p>
  <p><strong>Von:</strong> ${originalEmail.from_name ? `${originalEmail.from_name} <${originalEmail.from_address}>` : originalEmail.from_address}</p>
  <p><strong>Datum:</strong> ${originalDate}</p>
  <p><strong>Betreff:</strong> ${originalEmail.subject}</p>
  <p><strong>An:</strong> ${originalEmail.to_addresses || ''}</p>
  ${originalEmail.cc_addresses ? `<p><strong>Cc:</strong> ${originalEmail.cc_addresses}</p>` : ''}
  <br>
  ${originalEmail.body_html || originalEmail.body_text || ''}
</div>
  `.trim();

  return {
    subject,
    html: forwardedBody
    // 'to' must be added by caller
  };
}

module.exports = {
  createTransporter,
  testConnection,
  sendEmail,
  createReply,
  createForward
};
