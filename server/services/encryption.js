const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

// Get encryption key from environment variable
// Key must be 32 bytes (64 hex characters)
function getKey() {
  const key = process.env.EMAIL_ENCRYPTION_KEY;
  if (!key) {
    console.warn('Warning: EMAIL_ENCRYPTION_KEY not set. Using random key (passwords will be lost on restart).');
    // Generate a temporary key for development - this should NOT be used in production
    return crypto.randomBytes(32);
  }

  if (key.length !== 64) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param {string} text - The plaintext to encrypt
 * @returns {{ encrypted: string, iv: string, authTag: string }} - The encrypted data
 */
function encrypt(text) {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag
  };
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param {string} encrypted - The encrypted text (hex)
 * @param {string} iv - The initialization vector (hex)
 * @param {string} authTag - The authentication tag (hex)
 * @returns {string} - The decrypted plaintext
 */
function decrypt(encrypted, iv, authTag) {
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a new encryption key (for setup)
 * @returns {string} - A 64-character hex string (32 bytes)
 */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  encrypt,
  decrypt,
  generateKey
};
