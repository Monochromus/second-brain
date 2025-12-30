const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { upload, handleMulterError } = require('../middleware/upload');
const { processImagesWithVision } = require('../services/vision');
const { executeToolCall } = require('../services/openai');

const router = express.Router();

// Alle Routes erfordern Authentifizierung
router.use(requireAuth);

/**
 * POST /api/vision/analyze
 * Analysiert hochgeladene Bilder mit GPT-4o Vision
 * Gibt sowohl eine LLM-Antwort als auch extrahierte Daten zurück
 */
router.post('/analyze',
  upload.array('images', 5),
  handleMulterError,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const files = req.files;
    const query = req.body.query || '';

    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'Mindestens ein Bild erforderlich.'
      });
    }

    const images = files.map(file => ({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname
    }));

    const result = await processImagesWithVision(userId, images, query);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      response: result.response,
      extractions: result.extractions,
      imageCount: result.imageCount
    });
  })
);

/**
 * POST /api/vision/confirm
 * Erstellt die ausgewählten Elemente aus der Bildanalyse
 */
router.post('/confirm',
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Keine Elemente zum Erstellen ausgewählt.'
      });
    }

    const created = {
      appointments: [],
      todos: [],
      notes: []
    };
    const errors = [];
    const actions = [];

    for (const item of items) {
      try {
        switch (item.type) {
          case 'appointment': {
            const eventData = {
              title: item.data.title,
              start_time: buildDateTime(item.data.date, item.data.startTime),
              end_time: buildDateTime(item.data.date, item.data.endTime || item.data.startTime, 1),
              description: item.data.description || '',
              location: item.data.location || '',
              is_all_day: !item.data.startTime
            };

            const result = await executeToolCall('create_calendar_event', eventData, userId);
            if (result.success) {
              created.appointments.push(result.event);
              actions.push({ tool: 'create_calendar_event', result });
            } else {
              errors.push(`Termin "${item.data.title}": ${result.error}`);
            }
            break;
          }

          case 'todo': {
            const todoData = {
              title: item.data.title,
              description: item.data.description || null,
              priority: item.data.priority || 3,
              due_date: item.data.dueDate || null
            };

            const result = await executeToolCall('create_todo', todoData, userId);
            if (result.success) {
              created.todos.push(result.todo);
              actions.push({ tool: 'create_todo', result });
            } else {
              errors.push(`Aufgabe "${item.data.title}": ${result.error}`);
            }
            break;
          }

          case 'note': {
            const noteData = {
              title: item.data.title,
              content: item.data.content || '',
              tags: item.data.tags || []
            };

            const result = await executeToolCall('create_note', noteData, userId);
            if (result.success) {
              created.notes.push(result.note);
              actions.push({ tool: 'create_note', result });
            } else {
              errors.push(`Notiz "${item.data.title}": ${result.error}`);
            }
            break;
          }

          case 'contact': {
            const contactContent = formatContactAsNote(item.data);
            const noteData = {
              title: `Kontakt: ${item.data.name}`,
              content: contactContent,
              tags: ['kontakt', item.data.name.toLowerCase().split(' ')[0]]
            };

            const result = await executeToolCall('create_note', noteData, userId);
            if (result.success) {
              created.notes.push(result.note);
              actions.push({ tool: 'create_note', result });
            } else {
              errors.push(`Kontakt "${item.data.name}": ${result.error}`);
            }
            break;
          }

          default:
            errors.push(`Unbekannter Typ: ${item.type}`);
        }
      } catch (error) {
        errors.push(`Fehler bei ${item.type}: ${error.message}`);
      }
    }

    const totalCreated = created.appointments.length + created.todos.length + created.notes.length;

    res.json({
      success: errors.length === 0,
      created,
      actions,
      message: `${totalCreated} Element${totalCreated !== 1 ? 'e' : ''} erstellt.`,
      errors: errors.length > 0 ? errors : undefined
    });
  })
);

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

module.exports = router;
