const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.use(requireAuth);

// Rate limiting tracking (in-memory, resets on server restart)
const rateLimits = new Map();

const LIMITS = {
  MAX_TOOLS_PER_USER: 3,
  MAX_GENERATIONS_PER_HOUR: 20,
  MAX_EXECUTIONS_PER_HOUR: 500  // Higher limit to allow auto-refresh widgets
};

function getRateLimitKey(userId, type) {
  return `${userId}:${type}`;
}

function checkRateLimit(userId, type, limit) {
  const key = getRateLimitKey(userId, type);
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  let records = rateLimits.get(key) || [];
  // Clean old records
  records = records.filter(timestamp => timestamp > hourAgo);
  rateLimits.set(key, records);

  if (records.length >= limit) {
    return false;
  }

  records.push(now);
  rateLimits.set(key, records);
  return true;
}

// SECURITY: Remove generated_code from tool before sending to client
function sanitizeTool(tool) {
  if (!tool) return null;
  const { generated_code, ...safe } = tool;
  // Parse JSON fields
  try {
    safe.parameters_schema = JSON.parse(safe.parameters_schema || '{}');
  } catch {
    safe.parameters_schema = {};
  }
  try {
    safe.current_parameters = JSON.parse(safe.current_parameters || '{}');
  } catch {
    safe.current_parameters = {};
  }
  return safe;
}

// GET / - List all tools for user (without generated_code)
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const tools = db.prepare(`
    SELECT * FROM custom_tools
    WHERE user_id = ?
    ORDER BY position ASC, created_at DESC
  `).all(userId);

  res.json({
    tools: tools.map(sanitizeTool),
    limits: {
      maxTools: LIMITS.MAX_TOOLS_PER_USER,
      currentCount: tools.length
    }
  });
}));

// GET /:id - Get single tool (without generated_code)
router.get('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const tool = db.prepare(`
    SELECT * FROM custom_tools
    WHERE id = ? AND user_id = ?
  `).get(id, userId);

  if (!tool) {
    return res.status(404).json({ error: 'Tool nicht gefunden.' });
  }

  res.json({ tool: sanitizeTool(tool) });
}));

// GET /:id/result - Get only the rendered result (for embedding)
router.get('/:id/result', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const tool = db.prepare(`
    SELECT last_result, last_result_at, status, error_message
    FROM custom_tools
    WHERE id = ? AND user_id = ?
  `).get(id, userId);

  if (!tool) {
    return res.status(404).json({ error: 'Tool nicht gefunden.' });
  }

  if (tool.status === 'error') {
    return res.json({
      success: false,
      error: tool.error_message,
      result: null,
      renderedAt: null
    });
  }

  let result = null;
  try {
    result = JSON.parse(tool.last_result || 'null');
  } catch {
    result = null;
  }

  res.json({
    success: true,
    result,
    renderedAt: tool.last_result_at
  });
}));

// POST /generate - Generate new tool from description
router.post('/generate', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { description, name } = req.body;

  if (!description || !description.trim()) {
    return res.status(400).json({ error: 'Beschreibung ist erforderlich.' });
  }

  // Check tool limit
  const toolCount = db.prepare(`
    SELECT COUNT(*) as count FROM custom_tools WHERE user_id = ?
  `).get(userId);

  if (toolCount.count >= LIMITS.MAX_TOOLS_PER_USER) {
    return res.status(429).json({
      error: `Du hast das Maximum von ${LIMITS.MAX_TOOLS_PER_USER} Tools erreicht. Lösche ein Tool, um ein neues zu erstellen.`
    });
  }

  // Check rate limit for generations
  if (!checkRateLimit(userId, 'generate', LIMITS.MAX_GENERATIONS_PER_HOUR)) {
    return res.status(429).json({
      error: `Du hast das Limit von ${LIMITS.MAX_GENERATIONS_PER_HOUR} Generierungen pro Stunde erreicht. Bitte warte eine Weile.`
    });
  }

  const toolId = uuidv4();
  const toolName = name?.trim() || `Tool ${new Date().toLocaleDateString('de-DE')}`;

  // Get max position
  const maxPos = db.prepare(`
    SELECT MAX(position) as max FROM custom_tools WHERE user_id = ?
  `).get(userId);

  // Create tool in 'generating' status
  db.prepare(`
    INSERT INTO custom_tools (id, user_id, name, description, status, position)
    VALUES (?, ?, ?, ?, 'generating', ?)
  `).run(toolId, userId, toolName, description.trim(), (maxPos.max || 0) + 1);

  // Trigger code generation asynchronously
  // Import the code generator service
  const { generateToolCode } = require('../services/codeGenerator');

  // Don't await - let it run in background
  generateToolCode(userId, toolId, description.trim())
    .then(result => {
      if (result.success) {
        db.prepare(`
          UPDATE custom_tools
          SET generated_code = ?,
              parameters_schema = ?,
              name = ?,
              refresh_interval = ?,
              status = 'ready',
              error_message = NULL
          WHERE id = ?
        `).run(
          result.code,
          JSON.stringify(result.parameters || {}),
          result.name || toolName,
          result.refreshInterval || 0,
          toolId
        );

        // Auto-execute the tool after generation
        const { executeInSandbox } = require('../services/sandbox');
        executeInSandbox(result.code, result.parameters || {})
          .then(execResult => {
            db.prepare(`
              UPDATE custom_tools
              SET last_result = ?,
                  last_result_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).run(JSON.stringify(execResult), toolId);

            // Emit WebSocket event with result
            if (global.io) {
              global.io.to(`user:${userId}`).emit('tool:updated', {
                toolId,
                status: 'ready',
                result: execResult,
                refreshInterval: result.refreshInterval || 0
              });
            }
          })
          .catch(() => {
            // Emit without result on execution error
            if (global.io) {
              global.io.to(`user:${userId}`).emit('tool:updated', {
                toolId,
                status: 'ready',
                refreshInterval: result.refreshInterval || 0
              });
            }
          });
      } else {
        db.prepare(`
          UPDATE custom_tools
          SET status = 'error',
              error_message = ?
          WHERE id = ?
        `).run(result.error || 'Unbekannter Fehler bei der Code-Generierung', toolId);

        if (global.io) {
          global.io.to(`user:${userId}`).emit('tool:updated', {
            toolId,
            status: 'error',
            error: result.error
          });
        }
      }
    })
    .catch(err => {
      console.error('Code generation error:', err);
      db.prepare(`
        UPDATE custom_tools
        SET status = 'error',
            error_message = ?
        WHERE id = ?
      `).run('Fehler bei der Code-Generierung: ' + err.message, toolId);

      if (global.io) {
        global.io.to(`user:${userId}`).emit('tool:updated', {
          toolId,
          status: 'error',
          error: err.message
        });
      }
    });

  // Return immediately with the tool in generating status
  const tool = db.prepare('SELECT * FROM custom_tools WHERE id = ?').get(toolId);

  res.status(201).json({
    tool: sanitizeTool(tool),
    message: 'Tool wird generiert...'
  });
}));

// POST /:id/execute - Execute tool in sandbox
router.post('/:id/execute', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { parameters } = req.body;

  // Check rate limit
  if (!checkRateLimit(userId, 'execute', LIMITS.MAX_EXECUTIONS_PER_HOUR)) {
    return res.status(429).json({
      error: `Du hast das Limit von ${LIMITS.MAX_EXECUTIONS_PER_HOUR} Ausführungen pro Stunde erreicht.`
    });
  }

  const tool = db.prepare(`
    SELECT * FROM custom_tools
    WHERE id = ? AND user_id = ?
  `).get(id, userId);

  if (!tool) {
    return res.status(404).json({ error: 'Tool nicht gefunden.' });
  }

  if (tool.status !== 'ready') {
    return res.status(400).json({
      error: tool.status === 'generating'
        ? 'Tool wird noch generiert. Bitte warte einen Moment.'
        : 'Tool kann nicht ausgeführt werden. Status: ' + tool.status
    });
  }

  if (!tool.generated_code) {
    return res.status(400).json({ error: 'Kein Code für dieses Tool vorhanden.' });
  }

  // Merge parameters
  let currentParams = {};
  try {
    currentParams = JSON.parse(tool.current_parameters || '{}');
  } catch {}

  const execParams = { ...currentParams, ...(parameters || {}) };

  // Update current parameters if new ones provided
  if (parameters) {
    db.prepare(`
      UPDATE custom_tools SET current_parameters = ? WHERE id = ?
    `).run(JSON.stringify(execParams), id);
  }

  // Execute in sandbox
  const { executeInSandbox } = require('../services/sandbox');

  try {
    const result = await executeInSandbox(tool.generated_code, execParams);

    // Cache the result
    db.prepare(`
      UPDATE custom_tools
      SET last_result = ?,
          last_result_at = CURRENT_TIMESTAMP,
          execution_count = execution_count + 1
      WHERE id = ?
    `).run(JSON.stringify(result), id);

    // Emit WebSocket event
    if (global.io) {
      global.io.to(`user:${userId}`).emit('tool:result', {
        toolId: id,
        result
      });
    }

    res.json({
      success: true,
      result,
      executedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Sandbox execution error:', err);

    const errorMsg = err.message || 'Fehler bei der Ausführung';

    // Update error state
    db.prepare(`
      UPDATE custom_tools
      SET last_result = ?,
          last_result_at = CURRENT_TIMESTAMP,
          error_message = ?
      WHERE id = ?
    `).run(JSON.stringify({ type: 'error', content: errorMsg }), errorMsg, id);

    if (global.io) {
      global.io.to(`user:${userId}`).emit('tool:error', {
        toolId: id,
        error: errorMsg
      });
    }

    res.status(500).json({
      success: false,
      error: errorMsg
    });
  }
}));

// POST /:id/interact - Change parameters and re-execute
router.post('/:id/interact', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { action, parameters } = req.body;

  const tool = db.prepare(`
    SELECT * FROM custom_tools
    WHERE id = ? AND user_id = ?
  `).get(id, userId);

  if (!tool) {
    return res.status(404).json({ error: 'Tool nicht gefunden.' });
  }

  // Handle different actions
  if (action === 'updateParameters') {
    if (!parameters) {
      return res.status(400).json({ error: 'Parameter erforderlich.' });
    }

    let currentParams = {};
    try {
      currentParams = JSON.parse(tool.current_parameters || '{}');
    } catch {}

    const newParams = { ...currentParams, ...parameters };

    db.prepare(`
      UPDATE custom_tools SET current_parameters = ? WHERE id = ?
    `).run(JSON.stringify(newParams), id);

    const updatedTool = db.prepare('SELECT * FROM custom_tools WHERE id = ?').get(id);

    res.json({
      tool: sanitizeTool(updatedTool),
      message: 'Parameter aktualisiert.'
    });
  } else if (action === 'execute') {
    // Redirect to execute endpoint
    req.body.parameters = parameters;
    return router.handle(req, res, () => {});
  } else {
    res.status(400).json({ error: 'Unbekannte Aktion: ' + action });
  }
}));

// PUT /:id - Update tool description and regenerate code
router.put('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  const { name, description, regenerate } = req.body;

  const tool = db.prepare(`
    SELECT * FROM custom_tools
    WHERE id = ? AND user_id = ?
  `).get(id, userId);

  if (!tool) {
    return res.status(404).json({ error: 'Tool nicht gefunden.' });
  }

  // Update name/description
  if (name !== undefined || description !== undefined) {
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description.trim());
    }

    params.push(id);

    db.prepare(`
      UPDATE custom_tools SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);
  }

  // Regenerate code if requested
  if (regenerate && description) {
    // Check rate limit
    if (!checkRateLimit(userId, 'generate', LIMITS.MAX_GENERATIONS_PER_HOUR)) {
      return res.status(429).json({
        error: `Du hast das Limit von ${LIMITS.MAX_GENERATIONS_PER_HOUR} Generierungen pro Stunde erreicht.`
      });
    }

    // Set status to generating
    db.prepare(`
      UPDATE custom_tools SET status = 'generating', error_message = NULL WHERE id = ?
    `).run(id);

    // Trigger regeneration
    const { generateToolCode } = require('../services/codeGenerator');

    generateToolCode(userId, id, description.trim())
      .then(result => {
        if (result.success) {
          db.prepare(`
            UPDATE custom_tools
            SET generated_code = ?,
                parameters_schema = ?,
                refresh_interval = ?,
                status = 'ready',
                error_message = NULL
            WHERE id = ?
          `).run(
            result.code,
            JSON.stringify(result.parameters || {}),
            result.refreshInterval || 0,
            id
          );

          // Auto-execute the regenerated tool
          const { executeInSandbox } = require('../services/sandbox');
          executeInSandbox(result.code, result.parameters || {})
            .then(execResult => {
              db.prepare(`
                UPDATE custom_tools
                SET last_result = ?,
                    last_result_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `).run(JSON.stringify(execResult), id);

              // Emit with result
              if (global.io) {
                global.io.to(`user:${userId}`).emit('tool:updated', {
                  toolId: id,
                  status: 'ready',
                  result: execResult,
                  refreshInterval: result.refreshInterval || 0
                });
              }
            })
            .catch(() => {
              // Emit without result on execution error
              if (global.io) {
                global.io.to(`user:${userId}`).emit('tool:updated', {
                  toolId: id,
                  status: 'ready',
                  refreshInterval: result.refreshInterval || 0
                });
              }
            });
        } else {
          db.prepare(`
            UPDATE custom_tools
            SET status = 'error', error_message = ?
            WHERE id = ?
          `).run(result.error, id);

          if (global.io) {
            global.io.to(`user:${userId}`).emit('tool:updated', {
              toolId: id,
              status: 'error',
              error: result.error
            });
          }
        }
      })
      .catch(err => {
        db.prepare(`
          UPDATE custom_tools
          SET status = 'error', error_message = ?
          WHERE id = ?
        `).run(err.message, id);

        if (global.io) {
          global.io.to(`user:${userId}`).emit('tool:updated', {
            toolId: id,
            status: 'error',
            error: err.message
          });
        }
      });
  }

  const updatedTool = db.prepare('SELECT * FROM custom_tools WHERE id = ?').get(id);

  res.json({
    tool: sanitizeTool(updatedTool),
    message: regenerate ? 'Tool wird neu generiert...' : 'Tool aktualisiert.'
  });
}));

// DELETE /:id - Delete tool
router.delete('/:id', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;

  const tool = db.prepare(`
    SELECT * FROM custom_tools
    WHERE id = ? AND user_id = ?
  `).get(id, userId);

  if (!tool) {
    return res.status(404).json({ error: 'Tool nicht gefunden.' });
  }

  db.prepare('DELETE FROM custom_tools WHERE id = ?').run(id);

  res.json({ message: 'Tool gelöscht.' });
}));

// PUT /reorder - Reorder tools
router.put('/reorder', asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Items-Array erforderlich.' });
  }

  const stmt = db.prepare('UPDATE custom_tools SET position = ? WHERE id = ? AND user_id = ?');
  const updateMany = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.position, item.id, userId);
    }
  });

  updateMany(items);

  res.json({ message: 'Reihenfolge aktualisiert.' });
}));

module.exports = router;
