const OpenAI = require('openai');
const db = require('../config/database');

// OpenAI Client erstellen (gleiche Logik wie in openai.js)
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

function createOpenAIClient(userId) {
  const userApiKey = getUserApiKey(userId);
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
    return null;
  }

  return new OpenAI({ apiKey });
}

// Bild zu Base64 Data-URL konvertieren
function imageBufferToDataUrl(buffer, mimeType) {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

// Vision Prompt für strukturierte Extraktion UND Antwort
function createVisionPrompt(userQuery) {
  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `Du bist ein KI-Assistent, der Bilder analysiert.

AUFGABE 1 - DATENEXTRAKTION:
Analysiere das Bild und extrahiere alle erkennbaren Informationen in diese Kategorien:

1. TERMINE (appointments):
   - title, date (YYYY-MM-DD), startTime (HH:MM), endTime (HH:MM), location, description

2. AUFGABEN (todos):
   - title, dueDate (YYYY-MM-DD), priority (1-5, Standard: 3), description

3. NOTIZEN (notes):
   - title, content, tags (Array)

4. KONTAKTE (contacts):
   - name, email, phone, company, position

AUFGABE 2 - BENUTZERANFRAGE BEANTWORTEN:
Der Benutzer hat folgende Anfrage gestellt: "${userQuery || 'Analysiere das Bild.'}"
Beantworte diese Anfrage im Feld "response". Wenn die Anfrage Fragen enthält (z.B. "Was ist 3+3?"), beantworte sie.
Wenn die Anfrage nur eine Anweisung zum Bild ist, bestätige kurz was du gefunden hast.

REGELN:
- Heute ist ${today}. Berechne relative Datumsangaben korrekt.
- Extrahiere nur tatsächlich erkennbare Informationen.
- Leere Arrays für Kategorien ohne Treffer.
- Antworte NUR mit validem JSON.

ANTWORTFORMAT:
{
  "response": "Deine Antwort an den Benutzer hier",
  "appointments": [...],
  "todos": [...],
  "notes": [...],
  "contacts": []
}`;
}

// Bilder mit Vision API analysieren
async function processImagesWithVision(userId, images, userQuery = '') {
  const openai = createOpenAIClient(userId);

  if (!openai) {
    return {
      success: false,
      error: 'OpenAI API-Key nicht konfiguriert. Bitte in den Einstellungen hinterlegen.'
    };
  }

  try {
    // Content-Array für die Vision API aufbauen
    const content = [];

    // Prompt als Text
    content.push({
      type: 'text',
      text: createVisionPrompt(userQuery)
    });

    // Bilder hinzufügen
    for (const image of images) {
      const dataUrl = imageBufferToDataUrl(image.buffer, image.mimetype);
      content.push({
        type: 'image_url',
        image_url: {
          url: dataUrl,
          detail: 'high'
        }
      });
    }

    // Vision API aufrufen
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content
        }
      ],
      max_tokens: 4096,
      response_format: { type: 'json_object' }
    });

    const responseText = response.choices[0].message.content;

    // JSON parsen
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Vision API response:', responseText);
      return {
        success: false,
        error: 'Fehler beim Parsen der KI-Antwort. Bitte erneut versuchen.'
      };
    }

    // Extraktionen mit temporären IDs versehen
    const extractions = {
      appointments: (parsed.appointments || []).map((item, i) => ({ ...item, tempId: `apt-${i}` })),
      todos: (parsed.todos || []).map((item, i) => ({ ...item, tempId: `todo-${i}` })),
      notes: (parsed.notes || []).map((item, i) => ({ ...item, tempId: `note-${i}` })),
      contacts: (parsed.contacts || []).map((item, i) => ({ ...item, tempId: `contact-${i}` }))
    };

    return {
      success: true,
      response: parsed.response || 'Bild analysiert.',
      extractions,
      imageCount: images.length
    };

  } catch (error) {
    console.error('Vision API error:', error);

    if (error.code === 'invalid_api_key') {
      return {
        success: false,
        error: 'Ungültiger OpenAI API-Key. Bitte in den Einstellungen korrigieren.'
      };
    }

    if (error.status === 429) {
      return {
        success: false,
        error: 'API-Limit erreicht. Bitte warte einen Moment und versuche es erneut.'
      };
    }

    return {
      success: false,
      error: `Fehler bei der Bildanalyse: ${error.message}`
    };
  }
}

module.exports = {
  processImagesWithVision
};
