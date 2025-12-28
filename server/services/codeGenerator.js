/**
 * Code Generator Service - LLM-powered code generation for Custom Tools
 *
 * This service uses OpenAI to generate safe, isolated JavaScript widgets
 * based on natural language descriptions.
 */

const OpenAI = require('openai');
const db = require('../config/database');
const { validateCode } = require('./sandbox');

// Get user's API key from settings
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

// Create OpenAI client with user's API key or fallback to environment variable
function createOpenAIClient(userId) {
  const userApiKey = getUserApiKey(userId);
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
    return null;
  }

  return new OpenAI({ apiKey });
}

// System prompt for code generation
const CODE_GENERATION_PROMPT = `Du bist ein Experte für die Erstellung sicherer, isolierter JavaScript-Widgets.

DEINE AUFGABE:
Generiere JavaScript-Code basierend auf der Nutzerbeschreibung. Der Code wird in einer isolierten Sandbox ohne Zugriff auf externe APIs ausgeführt.

STRIKTE REGELN:
1. Du MUSST eine \`render(params)\` Funktion definieren
2. Diese Funktion MUSS ein Objekt zurückgeben: \`{ type: 'html'|'svg'|'json', content: string }\`
3. Du hast NUR Zugriff auf: Math, Date, JSON, String, Array, Object, Number, Boolean, parseInt, parseFloat
4. Du hast KEINEN Zugriff auf: fetch, XMLHttpRequest, require, import, eval, Function constructor, setTimeout, setInterval, process, global, Buffer, fs
5. Nutze KEINE externen URLs, Bilder oder Ressourcen
6. Halte den Code unter 500 Zeilen
7. Generiere auch ein \`parameters\` Objekt mit anpassbaren Werten

VERFÜGBARE HELPER-FUNKTIONEN:
- formatDate(date, format) - Datum formatieren (z.B. 'YYYY-MM-DD HH:mm')
- formatNumber(num, options) - Zahl formatieren (options: { decimals, locale })
- escapeHtml(str) - HTML-Zeichen escapen
- createElement(tag, attrs, content) - HTML-Element erstellen
- createSVG(width, height, content) - SVG erstellen
- hexToRgb(hex) - Hex zu RGB konvertieren
- rgbToHex(r, g, b) - RGB zu Hex konvertieren
- random(min, max) - Zufallszahl
- randomInt(min, max) - Zufällige Ganzzahl
- range(start, end, step) - Array mit Zahlenbereich
- now() - Aktuelles Datum/Zeit

OUTPUT FORMAT (JSON):
{
  "name": "Kurzer, prägnanter Name für das Tool",
  "parameters": {
    "paramName": defaultValue,
    ...
  },
  "code": "function render(params) { ... return { type: 'html', content: '...' }; }"
}

BEISPIEL FÜR EINEN EINFACHEN ZÄHLER:
{
  "name": "Zähler",
  "parameters": {
    "startValue": 0,
    "step": 1
  },
  "code": "function render(params) {\\n  const value = params.startValue || 0;\\n  const step = params.step || 1;\\n  \\n  const html = \`\\n    <div style=\\"text-align: center; padding: 20px;\\">\\n      <div style=\\"font-size: 48px; font-weight: bold; margin-bottom: 10px;\\">\${value}</div>\\n      <div style=\\"color: #666;\\">Schrittweite: \${step}</div>\\n    </div>\\n  \`;\\n  \\n  return { type: 'html', content: html };\\n}"
}

BEISPIEL FÜR EINE UHR:
{
  "name": "Weltuhr",
  "parameters": {
    "timezone": "Europe/Berlin",
    "format24h": true
  },
  "code": "function render(params) {\\n  const tz = params.timezone || 'Europe/Berlin';\\n  const format24h = params.format24h !== false;\\n  const now = new Date();\\n  \\n  let hours = now.getHours();\\n  const minutes = String(now.getMinutes()).padStart(2, '0');\\n  const seconds = String(now.getSeconds()).padStart(2, '0');\\n  \\n  let timeStr = '';\\n  if (format24h) {\\n    timeStr = String(hours).padStart(2, '0') + ':' + minutes + ':' + seconds;\\n  } else {\\n    const ampm = hours >= 12 ? 'PM' : 'AM';\\n    hours = hours % 12 || 12;\\n    timeStr = hours + ':' + minutes + ':' + seconds + ' ' + ampm;\\n  }\\n  \\n  const html = \`\\n    <div style=\\"text-align: center; padding: 30px; font-family: monospace;\\">\\n      <div style=\\"font-size: 64px; font-weight: bold;\\">\${timeStr}</div>\\n      <div style=\\"font-size: 18px; color: #666; margin-top: 10px;\\">\${tz}</div>\\n    </div>\\n  \`;\\n  \\n  return { type: 'html', content: html };\\n}"
}

WICHTIG:
- Antworte NUR mit validem JSON
- Keine Erklärungen, kein Markdown, nur das JSON-Objekt
- Der Code muss syntaktisch korrekt und sicher sein
- Verwende Template-Literals für HTML
- Escape Benutzereingaben mit escapeHtml()`;

/**
 * Generate tool code from natural language description
 */
async function generateToolCode(userId, toolId, description) {
  const openai = createOpenAIClient(userId);

  if (!openai) {
    return {
      success: false,
      error: 'Kein OpenAI API-Key konfiguriert. Bitte füge deinen API-Key in den Einstellungen hinzu.'
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: CODE_GENERATION_PROMPT
        },
        {
          role: 'user',
          content: `Erstelle ein Widget für: ${description}`
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: 'Keine Antwort vom AI-Modell erhalten.'
      };
    }

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', content);
      return {
        success: false,
        error: 'Die AI-Antwort konnte nicht verarbeitet werden. Versuche es mit einer anderen Beschreibung.'
      };
    }

    // Validate the response structure
    if (!parsed.code || typeof parsed.code !== 'string') {
      return {
        success: false,
        error: 'Die AI hat keinen gültigen Code generiert.'
      };
    }

    // Validate the code for forbidden patterns
    const validation = validateCode(parsed.code);
    if (!validation.valid) {
      console.warn('Generated code failed validation:', validation.error);
      return {
        success: false,
        error: 'Der generierte Code enthält unsichere Patterns: ' + validation.error
      };
    }

    // Check for render function
    if (!parsed.code.includes('function render')) {
      return {
        success: false,
        error: 'Der generierte Code enthält keine render() Funktion.'
      };
    }

    return {
      success: true,
      name: parsed.name || 'Neues Tool',
      parameters: parsed.parameters || {},
      code: parsed.code
    };
  } catch (err) {
    console.error('Code generation error:', err);

    // Handle specific OpenAI errors
    if (err.status === 401) {
      return {
        success: false,
        error: 'Ungültiger OpenAI API-Key. Bitte überprüfe deine Einstellungen.'
      };
    }

    if (err.status === 429) {
      return {
        success: false,
        error: 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.'
      };
    }

    if (err.status === 500 || err.status === 503) {
      return {
        success: false,
        error: 'Der AI-Service ist vorübergehend nicht verfügbar. Bitte versuche es später erneut.'
      };
    }

    return {
      success: false,
      error: 'Fehler bei der Code-Generierung: ' + (err.message || 'Unbekannter Fehler')
    };
  }
}

/**
 * Improve existing tool code based on feedback
 */
async function improveToolCode(userId, currentCode, currentParams, feedback) {
  const openai = createOpenAIClient(userId);

  if (!openai) {
    return {
      success: false,
      error: 'Kein OpenAI API-Key konfiguriert.'
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: CODE_GENERATION_PROMPT
        },
        {
          role: 'user',
          content: `Hier ist der aktuelle Code:\n\n${currentCode}\n\nAktuelle Parameter:\n${JSON.stringify(currentParams, null, 2)}\n\nVerbessere den Code basierend auf diesem Feedback:\n${feedback}`
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'Keine Antwort erhalten.' };
    }

    const parsed = JSON.parse(content);

    const validation = validateCode(parsed.code);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return {
      success: true,
      name: parsed.name,
      parameters: parsed.parameters || {},
      code: parsed.code
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Fehler bei der Code-Verbesserung'
    };
  }
}

/**
 * Example prompts for user inspiration
 */
const EXAMPLE_PROMPTS = [
  {
    title: 'Pomodoro Timer',
    description: 'Ein Pomodoro-Timer mit 25 Minuten Arbeitszeit und 5 Minuten Pause'
  },
  {
    title: 'Währungsrechner',
    description: 'Ein einfacher Währungsrechner der Euro in Dollar umrechnet'
  },
  {
    title: 'Weltuhr',
    description: 'Eine Uhr die die Zeit in Berlin, New York und Tokyo anzeigt'
  },
  {
    title: 'Farbpalette',
    description: 'Ein Farbpaletten-Generator der harmonische Farben aus einer Basisfarbe erstellt'
  },
  {
    title: 'Zufallszitat',
    description: 'Zeigt ein zufälliges motivierendes Zitat aus einer vordefinierten Liste'
  },
  {
    title: 'BMI Rechner',
    description: 'Ein BMI-Rechner mit Eingabefeldern für Gewicht und Größe'
  },
  {
    title: 'Countdown',
    description: 'Ein Countdown-Timer zu einem bestimmten Datum'
  },
  {
    title: 'Fortschrittsanzeige',
    description: 'Eine visuelle Fortschrittsanzeige mit Prozentangabe'
  }
];

module.exports = {
  generateToolCode,
  improveToolCode,
  EXAMPLE_PROMPTS
};
