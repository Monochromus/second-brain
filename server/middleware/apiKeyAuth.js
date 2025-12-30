const crypto = require('crypto');
const db = require('../config/database');

// In-memory store for rate limiting and failed attempts
const rateLimits = new Map();
const failedAttempts = new Map();

const RATE_LIMIT = 60; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function checkRateLimit(keyHash) {
  const now = Date.now();
  const key = `rate:${keyHash}`;

  if (!rateLimits.has(key)) {
    rateLimits.set(key, []);
  }

  const requests = rateLimits.get(key);
  // Remove old requests outside the window
  const validRequests = requests.filter(t => now - t < RATE_WINDOW);
  rateLimits.set(key, validRequests);

  if (validRequests.length >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: Math.min(...validRequests) + RATE_WINDOW };
  }

  validRequests.push(now);
  return { allowed: true, remaining: RATE_LIMIT - validRequests.length, resetAt: now + RATE_WINDOW };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const key = `failed:${ip}`;

  if (!failedAttempts.has(key)) {
    failedAttempts.set(key, { count: 0, lockedUntil: 0 });
  }

  const record = failedAttempts.get(key);

  // Check if currently locked out
  if (record.lockedUntil > now) {
    return { locked: true, lockedUntil: record.lockedUntil };
  }

  record.count++;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION;
    record.count = 0;
    return { locked: true, lockedUntil: record.lockedUntil };
  }

  return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS - record.count };
}

function clearFailedAttempts(ip) {
  failedAttempts.delete(`failed:${ip}`);
}

function isLockedOut(ip) {
  const now = Date.now();
  const key = `failed:${ip}`;
  const record = failedAttempts.get(key);

  if (record && record.lockedUntil > now) {
    return { locked: true, lockedUntil: record.lockedUntil };
  }

  return { locked: false };
}

function requireApiKeyAuth(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;

  // Check lockout first
  const lockout = isLockedOut(ip);
  if (lockout.locked) {
    const retryAfter = Math.ceil((lockout.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      error: 'Zu viele fehlgeschlagene Versuche. Bitte warte.',
      retryAfter
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'API Key erforderlich. Format: Bearer dsb_...' });
  }

  const apiKey = authHeader.substring(7);

  // Validate key format
  if (!apiKey.startsWith('dsb_') || apiKey.length !== 36) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'Ungültiges API Key Format' });
  }

  const keyHash = hashApiKey(apiKey);

  // Check rate limit even for potentially invalid keys to prevent enumeration
  const rateCheck = checkRateLimit(keyHash);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Rate Limit erreicht. Max 60 Anfragen pro Stunde.',
      remaining: rateCheck.remaining,
      resetAt: new Date(rateCheck.resetAt).toISOString()
    });
  }

  // Look up user by key hash
  try {
    const user = db.prepare(`
      SELECT id, email, name, settings, personal_api_key_created_at
      FROM users
      WHERE personal_api_key_hash = ?
    `).get(keyHash);

    if (!user) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'Ungültiger API Key' });
    }

    // Success - clear failed attempts
    clearFailedAttempts(ip);

    // Attach user info to request
    req.userId = user.id;
    req.user = user;
    req.apiKeyAuth = true;

    // Set rate limit headers
    res.set('X-RateLimit-Limit', RATE_LIMIT.toString());
    res.set('X-RateLimit-Remaining', rateCheck.remaining.toString());
    res.set('X-RateLimit-Reset', new Date(rateCheck.resetAt).toISOString());

    next();
  } catch (error) {
    console.error('API Key auth error:', error);
    return res.status(500).json({ error: 'Authentifizierungsfehler' });
  }
}

module.exports = {
  requireApiKeyAuth,
  hashApiKey,
  checkRateLimit
};
