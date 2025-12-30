const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { processAgentRequest, executeToolCall } = require('./openai');
const { processImagesWithVision } = require('./vision');

/**
 * Process a capture from iOS Shortcut
 * - Without image: Send text to AI Agent (same as chat input)
 * - With image: Use Vision API and auto-create extracted items
 */
async function processCaptureWithAI(captureId, userId) {
  console.log(`[Capture] Processing capture ${captureId} for user ${userId}`);

  const capture = db.prepare('SELECT * FROM captures WHERE id = ?').get(captureId);

  if (!capture) {
    console.log(`[Capture] Capture ${captureId} not found`);
    throw new Error('Capture nicht gefunden');
  }

  console.log(`[Capture] Capture text: "${capture.text.substring(0, 100)}${capture.text.length > 100 ? '...' : ''}"`);
  console.log(`[Capture] Has image: ${!!capture.image_path}`);

  try {
    let result;

    if (capture.image_path) {
      // With image: Use Vision API
      result = await processWithVision(capture, userId);
    } else {
      // Without image: Use Agent (same as chat)
      result = await processWithAgent(capture, userId);
    }

    // Update capture with result
    db.prepare(`
      UPDATE captures
      SET processed = 1,
          ai_result = ?
      WHERE id = ?
    `).run(JSON.stringify(result), captureId);

    console.log(`[Capture] Processing complete for ${captureId}`);

    // Emit WebSocket event if available
    if (global.io) {
      global.io.to(`user:${userId}`).emit('capture:processed', {
        captureId: capture.id,
        result
      });
    }

    return result;

  } catch (error) {
    console.error('[Capture] Processing error:', error);

    // Store error
    db.prepare(`
      UPDATE captures
      SET processed = 1,
          ai_result = ?
      WHERE id = ?
    `).run(JSON.stringify({ error: error.message }), captureId);

    throw error;
  }
}

/**
 * Process text-only capture using the AI Agent
 * This is the same as sending a message in the chat
 */
async function processWithAgent(capture, userId) {
  console.log(`[Capture] Processing with Agent...`);

  // Call the same function as the chat endpoint
  const agentResult = await processAgentRequest(capture.text, userId, []);

  console.log(`[Capture] Agent response: "${agentResult.response?.substring(0, 100)}..."`);
  console.log(`[Capture] Agent actions: ${agentResult.actions?.length || 0}`);

  return {
    type: 'agent',
    response: agentResult.response,
    actions: agentResult.actions || []
  };
}

/**
 * Process capture with image using Vision API
 * Automatically creates extracted items (no manual confirmation needed)
 */
async function processWithVision(capture, userId) {
  console.log(`[Capture] Processing with Vision API...`);

  // Read image from disk
  const imagePath = path.join(__dirname, '../..', capture.image_path);

  if (!fs.existsSync(imagePath)) {
    throw new Error('Bild nicht gefunden');
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const images = [{
    buffer: imageBuffer,
    mimetype: 'image/jpeg',
    originalname: path.basename(imagePath)
  }];

  // Call Vision API with the capture text as query
  const visionResult = await processImagesWithVision(userId, images, capture.text);

  if (!visionResult.success) {
    throw new Error(visionResult.error);
  }

  console.log(`[Capture] Vision response: "${visionResult.response?.substring(0, 100)}..."`);

  // Auto-create all extracted items
  const created = await autoCreateItems(visionResult.extractions, userId);

  return {
    type: 'vision',
    response: visionResult.response,
    extractions: visionResult.extractions,
    created
  };
}

/**
 * Automatically create items from Vision API extractions
 * (Same logic as /vision/confirm but without manual selection)
 */
async function autoCreateItems(extractions, userId) {
  const created = {
    appointments: [],
    todos: [],
    notes: [],
    contacts: []
  };
  const errors = [];

  // Create appointments
  for (const apt of extractions.appointments || []) {
    try {
      const eventData = {
        title: apt.title,
        start_time: buildDateTime(apt.date, apt.startTime),
        end_time: buildDateTime(apt.date, apt.endTime || apt.startTime, 1),
        description: apt.description || '',
        location: apt.location || '',
        is_all_day: !apt.startTime
      };

      const result = await executeToolCall('create_calendar_event', eventData, userId);
      if (result.success) {
        created.appointments.push(result.event);
        console.log(`[Capture] Created appointment: ${apt.title}`);
      } else {
        errors.push(`Termin "${apt.title}": ${result.error}`);
      }
    } catch (err) {
      errors.push(`Termin "${apt.title}": ${err.message}`);
    }
  }

  // Create todos
  for (const todo of extractions.todos || []) {
    try {
      const todoData = {
        title: todo.title,
        description: todo.description || null,
        priority: todo.priority || 3,
        due_date: todo.dueDate || null
      };

      const result = await executeToolCall('create_todo', todoData, userId);
      if (result.success) {
        created.todos.push(result.todo);
        console.log(`[Capture] Created todo: ${todo.title}`);
      } else {
        errors.push(`Aufgabe "${todo.title}": ${result.error}`);
      }
    } catch (err) {
      errors.push(`Aufgabe "${todo.title}": ${err.message}`);
    }
  }

  // Create notes
  for (const note of extractions.notes || []) {
    try {
      const noteData = {
        title: note.title,
        content: note.content || '',
        tags: note.tags || []
      };

      const result = await executeToolCall('create_note', noteData, userId);
      if (result.success) {
        created.notes.push(result.note);
        console.log(`[Capture] Created note: ${note.title}`);
      } else {
        errors.push(`Notiz "${note.title}": ${result.error}`);
      }
    } catch (err) {
      errors.push(`Notiz "${note.title}": ${err.message}`);
    }
  }

  // Create contacts as notes
  for (const contact of extractions.contacts || []) {
    try {
      const contactContent = formatContactAsNote(contact);
      const noteData = {
        title: `Kontakt: ${contact.name}`,
        content: contactContent,
        tags: ['kontakt', contact.name.toLowerCase().split(' ')[0]]
      };

      const result = await executeToolCall('create_note', noteData, userId);
      if (result.success) {
        created.contacts.push(result.note);
        console.log(`[Capture] Created contact: ${contact.name}`);
      } else {
        errors.push(`Kontakt "${contact.name}": ${result.error}`);
      }
    } catch (err) {
      errors.push(`Kontakt "${contact.name}": ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.log(`[Capture] Errors during item creation:`, errors);
  }

  return {
    ...created,
    errors: errors.length > 0 ? errors : undefined
  };
}

function buildDateTime(date, time, addHours = 0) {
  if (!date) {
    const now = new Date();
    date = now.toISOString().split('T')[0];
  }

  if (!time) {
    return `${date}T00:00:00`;
  }

  const dt = new Date(`${date}T${time}:00`);

  if (addHours > 0) {
    dt.setHours(dt.getHours() + addHours);
  }

  return dt.toISOString();
}

function formatContactAsNote(contact) {
  const lines = [];
  if (contact.name) lines.push(`**Name:** ${contact.name}`);
  if (contact.company) lines.push(`**Firma:** ${contact.company}`);
  if (contact.position) lines.push(`**Position:** ${contact.position}`);
  if (contact.email) lines.push(`**E-Mail:** ${contact.email}`);
  if (contact.phone) lines.push(`**Telefon:** ${contact.phone}`);
  return lines.join('\n');
}

module.exports = {
  processCaptureWithAI
};
