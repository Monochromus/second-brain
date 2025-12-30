const express = require('express');
const crypto = require('crypto');
const { nanoid } = require('nanoid');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { hashApiKey } = require('../middleware/apiKeyAuth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// Generate a new personal API key
router.post('/api-key/generate', asyncHandler(async (req, res) => {
  const userId = req.userId;

  // Generate new key: prefix + 32 chars from nanoid
  const keyId = nanoid(32);
  const apiKey = `dsb_${keyId}`;
  const keyHash = hashApiKey(apiKey);

  // Store hash and update created_at (this invalidates any previous key)
  db.prepare(`
    UPDATE users
    SET personal_api_key_hash = ?,
        personal_api_key_created_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(keyHash, userId);

  const user = db.prepare(`
    SELECT personal_api_key_created_at
    FROM users
    WHERE id = ?
  `).get(userId);

  // Return the key in plaintext ONLY on generation
  // This is the only time the user will see it
  res.json({
    success: true,
    apiKey,
    createdAt: user.personal_api_key_created_at,
    message: 'API Key generiert. Speichere ihn jetzt - er wird nicht erneut angezeigt!'
  });
}));

// Delete/revoke the personal API key
router.delete('/api-key', asyncHandler(async (req, res) => {
  const userId = req.userId;

  db.prepare(`
    UPDATE users
    SET personal_api_key_hash = NULL,
        personal_api_key_created_at = NULL
    WHERE id = ?
  `).run(userId);

  res.json({
    success: true,
    message: 'API Key widerrufen'
  });
}));

// Get API key status (not the key itself)
router.get('/api-key/status', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const user = db.prepare(`
    SELECT personal_api_key_hash, personal_api_key_created_at
    FROM users
    WHERE id = ?
  `).get(userId);

  res.json({
    hasApiKey: !!user.personal_api_key_hash,
    createdAt: user.personal_api_key_created_at || null
  });
}));

module.exports = router;
