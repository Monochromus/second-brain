const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { processAgentRequest } = require('../services/openai');

const router = express.Router();

router.use(requireAuth);

router.post('/chat', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Nachricht ist erforderlich.' });
  }

  const result = await processAgentRequest(message.trim(), userId);

  res.json(result);
}));

module.exports = router;
