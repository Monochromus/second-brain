const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

// Get user's API key from settings (reused from openai.js)
function getUserApiKey(userId) {
  const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId);
  if (user && user.settings) {
    try {
      const settings = JSON.parse(user.settings);
      return settings.openaiApiKey || null;
    } catch {
      return null;
    }
  }
  return null;
}

// Get user's preferred model (reused from openai.js)
function getUserModel(userId) {
  const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId);
  if (user && user.settings) {
    try {
      const settings = JSON.parse(user.settings);
      return settings.openaiModel || null;
    } catch {
      return null;
    }
  }
  return null;
}

// Create OpenAI client with user's API key or fallback to environment
function createOpenAIClient(userId) {
  const userApiKey = getUserApiKey(userId);
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
    return null;
  }

  return new OpenAI({ apiKey });
}

// Get the model to use
function getModel(userId) {
  const userApiKey = getUserApiKey(userId);
  const userModel = userApiKey ? getUserModel(userId) : null;
  return userModel || process.env.OPENAI_MODEL || 'gpt-4o-mini';
}

// System prompt for capture analysis
const CAPTURE_ANALYSIS_PROMPT = `Du bist ein intelligenter Assistent, der Notizen und Captures analysiert.
Deine Aufgabe ist es, den Inhalt zu verstehen und zu kategorisieren.

Analysiere den folgenden Text (und optional ein Bild) und extrahiere:

1. **Kategorie** (PARA-Methode):
   - "project": Ein konkretes Projekt mit Deadline/Ziel
   - "area": Ein dauerhafter Verantwortungsbereich (Gesundheit, Familie, etc.)
   - "resource": Referenzmaterial, Wissen, Links
   - "archive": Erledigtes oder nicht mehr relevantes

2. **Erkannte Elemente**:
   - todos: Liste von Aufgaben die erledigt werden müssen
   - events: Erkannte Termine mit Datum/Uhrzeit
   - contacts: Erkannte Kontaktdaten (Name, Telefon, Email)
   - links: Erkannte URLs

3. **Vorgeschlagene Tags**: Relevante Schlagworte

4. **Zusammenfassung**: Kurze Zusammenfassung des Inhalts (max 100 Zeichen)

Antworte IMMER im folgenden JSON-Format:
{
  "category": "project|area|resource|archive",
  "summary": "Kurze Zusammenfassung",
  "tags": ["tag1", "tag2"],
  "todos": [{"title": "Aufgabe", "priority": 3, "due_date": "YYYY-MM-DD oder null"}],
  "events": [{"title": "Termin", "start_time": "ISO-8601", "end_time": "ISO-8601", "location": "Ort oder null"}],
  "contacts": [{"name": "Name", "phone": "Nummer", "email": "Email"}],
  "links": ["https://..."],
  "suggestedTitle": "Vorgeschlagener Titel für die Notiz"
}

Wenn keine Elemente erkannt werden, gib leere Arrays zurück.
Heute ist ${new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;

async function processCaptureWithAI(captureId, userId) {
  console.log(`[Capture] Processing capture ${captureId} for user ${userId}`);

  const capture = db.prepare('SELECT * FROM captures WHERE id = ?').get(captureId);

  if (!capture) {
    console.log(`[Capture] Capture ${captureId} not found`);
    throw new Error('Capture nicht gefunden');
  }

  console.log(`[Capture] Capture text: "${capture.text.substring(0, 100)}..."`);

  const openai = createOpenAIClient(userId);

  if (!openai) {
    console.log(`[Capture] No OpenAI API key available for user ${userId} - creating basic note only`);
    // No API key available - mark as processed without AI
    db.prepare(`
      UPDATE captures
      SET processed = 1,
          ai_result = ?
      WHERE id = ?
    `).run(JSON.stringify({ error: 'Kein OpenAI API Key konfiguriert' }), captureId);

    // Still create a basic note from the capture
    await createBasicNoteFromCapture(capture, userId);
    return;
  }

  console.log(`[Capture] OpenAI client created, starting AI processing...`);

  try {
    const model = getModel(userId);
    const messages = [
      { role: 'system', content: CAPTURE_ANALYSIS_PROMPT },
    ];

    // Build user message
    const userContent = [];
    userContent.push({ type: 'text', text: capture.text });

    // Add image if present
    if (capture.image_path) {
      const imagePath = path.join(__dirname, '../..', capture.image_path);
      if (fs.existsSync(imagePath)) {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`,
            detail: 'auto'
          }
        });
      }
    }

    messages.push({ role: 'user', content: userContent });

    // Use vision model if image is present
    const useVisionModel = capture.image_path ? 'gpt-4o' : model;

    const response = await openai.chat.completions.create({
      model: useVisionModel,
      messages,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });

    const aiResult = JSON.parse(response.choices[0].message.content);
    console.log(`[Capture] AI result:`, JSON.stringify(aiResult, null, 2));

    // Store AI result
    db.prepare(`
      UPDATE captures
      SET processed = 1,
          ai_result = ?
      WHERE id = ?
    `).run(JSON.stringify(aiResult), captureId);

    // Create items based on AI analysis
    console.log(`[Capture] Creating items from AI result...`);
    await createItemsFromAIResult(capture, aiResult, userId);
    console.log(`[Capture] Processing complete for ${captureId}`);

  } catch (error) {
    console.error('[Capture] AI processing error:', error);

    // Store error but still create basic note
    db.prepare(`
      UPDATE captures
      SET processed = 1,
          ai_result = ?
      WHERE id = ?
    `).run(JSON.stringify({ error: error.message }), captureId);

    await createBasicNoteFromCapture(capture, userId);
  }
}

async function createBasicNoteFromCapture(capture, userId) {
  const noteResult = db.prepare(`
    INSERT INTO notes (user_id, title, content, tags, position)
    VALUES (?, ?, ?, '["capture"]', (SELECT COALESCE(MAX(position), 0) + 1 FROM notes WHERE user_id = ?))
  `).run(
    userId,
    `Capture ${new Date(capture.created_at).toLocaleDateString('de-DE')}`,
    capture.text,
    userId
  );

  db.prepare(`
    UPDATE captures SET created_note_id = ? WHERE id = ?
  `).run(noteResult.lastInsertRowid, capture.id);
}

async function createItemsFromAIResult(capture, aiResult, userId) {
  let createdNoteId = null;
  let createdTodoId = null;
  let createdEventId = null;

  // Always create a note with the capture content
  const noteTitle = aiResult.suggestedTitle || `Capture ${new Date(capture.created_at).toLocaleDateString('de-DE')}`;
  const tags = JSON.stringify(aiResult.tags || ['capture']);

  const noteResult = db.prepare(`
    INSERT INTO notes (user_id, title, content, tags, position)
    VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM notes WHERE user_id = ?))
  `).run(userId, noteTitle, capture.text, tags, userId);

  createdNoteId = noteResult.lastInsertRowid;

  // Create todos if recognized
  if (aiResult.todos && aiResult.todos.length > 0) {
    for (const todo of aiResult.todos) {
      const todoResult = db.prepare(`
        INSERT INTO todos (user_id, title, priority, due_date, position)
        VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM todos WHERE user_id = ?))
      `).run(
        userId,
        todo.title,
        todo.priority || 3,
        todo.due_date || null,
        userId
      );

      if (!createdTodoId) {
        createdTodoId = todoResult.lastInsertRowid;
      }
    }
  }

  // Create calendar events if recognized
  if (aiResult.events && aiResult.events.length > 0) {
    for (const event of aiResult.events) {
      if (event.start_time && event.end_time) {
        const eventResult = db.prepare(`
          INSERT INTO calendar_events (user_id, title, start_time, end_time, location, calendar_source)
          VALUES (?, ?, ?, ?, ?, 'local')
        `).run(
          userId,
          event.title,
          event.start_time,
          event.end_time,
          event.location || null
        );

        if (!createdEventId) {
          createdEventId = eventResult.lastInsertRowid;
        }
      }
    }
  }

  // Update capture with created item IDs
  db.prepare(`
    UPDATE captures
    SET created_note_id = ?,
        created_todo_id = ?,
        created_event_id = ?
    WHERE id = ?
  `).run(createdNoteId, createdTodoId, createdEventId, capture.id);

  // Emit WebSocket event if available
  if (global.io) {
    global.io.to(`user:${userId}`).emit('capture:processed', {
      captureId: capture.id,
      noteId: createdNoteId,
      todoId: createdTodoId,
      eventId: createdEventId,
      aiResult
    });
  }
}

module.exports = {
  processCaptureWithAI
};
