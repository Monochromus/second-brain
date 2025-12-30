const express = require('express');
const { nanoid } = require('nanoid');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../config/database');
const { requireApiKeyAuth } = require('../middleware/apiKeyAuth');
const { asyncHandler } = require('../middleware/errorHandler');
const { processCaptureWithAI } = require('../services/captureProcessor');

const router = express.Router();

// Maximum image size in bytes (10MB)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 80;

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/heic': '.heic',
  'image/webp': '.webp'
};

// Validate request body
function validateCaptureBody(body) {
  const errors = [];

  if (!body.text || typeof body.text !== 'string') {
    errors.push('text ist erforderlich und muss ein String sein');
  } else if (body.text.length > 10000) {
    errors.push('text darf maximal 10000 Zeichen haben');
  }

  if (body.image !== undefined && body.image !== null) {
    if (typeof body.image !== 'string') {
      errors.push('image muss ein Base64-String sein');
    } else if (body.image.length > MAX_IMAGE_SIZE * 1.37) {
      // Base64 is ~37% larger than binary
      errors.push('Bild ist zu gross (max 10MB)');
    }
  }

  if (body.timestamp !== undefined) {
    const date = new Date(body.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('timestamp muss ein gültiges ISO-8601 Datum sein');
    }
  }

  if (body.source !== undefined) {
    if (!['shortcut', 'web', 'share'].includes(body.source)) {
      errors.push('source muss shortcut, web oder share sein');
    }
  }

  return errors;
}

// Process and save image
async function processImage(base64Data, userId) {
  // Strip data URL prefix if present
  let imageData = base64Data;
  let mimeType = 'image/jpeg';

  const dataUrlMatch = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    imageData = dataUrlMatch[2];
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES[mimeType] && !dataUrlMatch) {
    // Try to detect from buffer
    mimeType = 'image/jpeg'; // Default assumption
  }

  // Decode base64
  const buffer = Buffer.from(imageData, 'base64');

  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error('Bild ist zu gross (max 10MB)');
  }

  // Create upload directory
  const uploadDir = path.join(__dirname, '../../uploads', userId.toString(), 'captures');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate filename
  const timestamp = Date.now();
  const fileId = nanoid(8);
  const filename = `${timestamp}_${fileId}.jpg`;
  const filepath = path.join(uploadDir, filename);

  // Process with sharp: resize and convert to JPEG
  await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(filepath);

  // Return relative path for database storage
  return `/uploads/${userId}/captures/${filename}`;
}

// CORS preflight for capture endpoint (allow all origins for shortcuts)
router.options('/', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// Quick Capture endpoint
router.post('/', (req, res, next) => {
  // Allow all origins for this endpoint (for iOS Shortcuts)
  res.set('Access-Control-Allow-Origin', '*');
  next();
}, requireApiKeyAuth, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { text, image, timestamp, source = 'shortcut' } = req.body;

  // Validate request
  const errors = validateCaptureBody(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validierungsfehler', details: errors });
  }

  // Process image if provided
  let imagePath = null;
  if (image) {
    try {
      imagePath = await processImage(image, userId);
    } catch (err) {
      console.error('Image processing error:', err);
      return res.status(400).json({ error: 'Bildverarbeitung fehlgeschlagen', details: err.message });
    }
  }

  // Generate capture ID
  const captureId = nanoid(21);

  // Store capture in database
  const captureTimestamp = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

  db.prepare(`
    INSERT INTO captures (id, user_id, text, image_path, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(captureId, userId, text, imagePath, source, captureTimestamp);

  // Start async AI processing
  processCaptureWithAI(captureId, userId).catch(err => {
    console.error(`AI processing failed for capture ${captureId}:`, err);
  });

  // Return success immediately
  res.status(201).json({
    success: true,
    captureId,
    message: 'Erfasst! Wird im Hintergrund verarbeitet.',
    hasImage: !!imagePath
  });
}));

// Get capture status (optional endpoint for checking processing status)
router.get('/:id', requireApiKeyAuth, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const captureId = req.params.id;

  const capture = db.prepare(`
    SELECT id, text, image_path, source, processed, ai_result,
           created_note_id, created_todo_id, created_event_id, created_at
    FROM captures
    WHERE id = ? AND user_id = ?
  `).get(captureId, userId);

  if (!capture) {
    return res.status(404).json({ error: 'Capture nicht gefunden' });
  }

  res.json({
    ...capture,
    aiResult: capture.ai_result ? JSON.parse(capture.ai_result) : null
  });
}));

module.exports = router;
