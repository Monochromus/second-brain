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

// System prompt for code generation - INTERACTIVE WIDGETS
const CODE_GENERATION_PROMPT = `Du bist ein UI/UX-Experte für interaktive JavaScript-Widgets mit modernem Design.

DEINE AUFGABE:
Generiere INTERAKTIVE, VISUELL ANSPRECHENDE Widgets. Der Code wird serverseitig ausgeführt und das HTML wird im Browser angezeigt.

DESIGN-ANFORDERUNGEN:
1. MODERNES DESIGN mit Farbverläufen, Schatten, abgerundeten Ecken
2. INTERAKTIVE ELEMENTE: Buttons, Slider, Inputs die mit JavaScript im Browser funktionieren
3. SVG-ICONS inline einbetten (keine externen Ressourcen)
4. ANIMATIONEN mit CSS transitions/keyframes
5. RESPONSIVE Layout das gut aussieht
6. Dunkles oder helles Theme mit satten Farben

TECHNISCHE REGELN:
1. Definiere eine \`render(params)\` Funktion
2. Rückgabe: \`{ type: 'html', content: string, refreshInterval?: number }\`
3. refreshInterval in ms für auto-updates (z.B. 1000 für Uhren/Timer)
4. Du kannst <script> Tags im HTML für Browser-Interaktivität einbetten
5. Du kannst <style> Tags für CSS einbetten
6. KEINE externen URLs, fetch, oder imports

VERFÜGBARE HELPER:
- formatDate(date, format) - 'YYYY-MM-DD HH:mm:ss'
- formatNumber(num, {decimals, locale})
- now() - aktuelles Date
- random(min, max), randomInt(min, max)
- range(start, end, step)

SVG ICONS (kopiere diese direkt):
- Uhr: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
- Play: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
- Pause: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>
- Plus: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
- Minus: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/></svg>
- Check: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
- Refresh: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>

OUTPUT FORMAT (JSON):
{
  "name": "Widget Name",
  "parameters": { "key": defaultValue },
  "refreshInterval": 1000,
  "code": "function render(params) { ... return { type: 'html', content: html }; }"
}

BEISPIEL - Interaktiver Zähler:
{
  "name": "Zähler",
  "parameters": { "start": 0 },
  "code": "function render(params) {\\n  const start = params.start || 0;\\n  const html = \`\\n<div style=\\"font-family: system-ui; padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 20px; color: white;\\">\\n  <div id=\\"count\\" style=\\"font-size: 72px; font-weight: bold; text-shadow: 0 4px 20px rgba(0,0,0,0.3);\\">\${start}</div>\\n  <div style=\\"display: flex; gap: 16px; justify-content: center; margin-top: 24px;\\">\\n    <button onclick=\\"document.getElementById('count').textContent = parseInt(document.getElementById('count').textContent) - 1\\" style=\\"width: 60px; height: 60px; border-radius: 50%; border: none; background: rgba(255,255,255,0.2); color: white; font-size: 24px; cursor: pointer; backdrop-filter: blur(10px); transition: transform 0.2s;\\" onmouseover=\\"this.style.transform='scale(1.1)'\\" onmouseout=\\"this.style.transform='scale(1)'\\">−</button>\\n    <button onclick=\\"document.getElementById('count').textContent = parseInt(document.getElementById('count').textContent) + 1\\" style=\\"width: 60px; height: 60px; border-radius: 50%; border: none; background: rgba(255,255,255,0.2); color: white; font-size: 24px; cursor: pointer; backdrop-filter: blur(10px); transition: transform 0.2s;\\" onmouseover=\\"this.style.transform='scale(1.1)'\\" onmouseout=\\"this.style.transform='scale(1)'\\">+</button>\\n  </div>\\n</div>\\n\`;\\n  return { type: 'html', content: html };\\n}"
}

BEISPIEL - Live Uhr:
{
  "name": "Digitaluhr",
  "parameters": {},
  "refreshInterval": 1000,
  "code": "function render(params) {\\n  const now = new Date();\\n  const time = now.toLocaleTimeString('de-DE');\\n  const date = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });\\n  const html = \`\\n<div style=\\"font-family: system-ui; padding: 40px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 20px; color: white;\\">\\n  <div style=\\"font-size: 64px; font-weight: 200; font-family: monospace; letter-spacing: 4px; text-shadow: 0 0 30px rgba(99, 102, 241, 0.5);\\">\${time}</div>\\n  <div style=\\"font-size: 18px; color: #818cf8; margin-top: 16px;\\">\${date}</div>\\n</div>\\n\`;\\n  return { type: 'html', content: html };\\n}"
}

BEISPIEL - Pomodoro Timer:
{
  "name": "Pomodoro Timer",
  "parameters": { "workMinutes": 25, "breakMinutes": 5 },
  "code": "function render(params) {\\n  const work = params.workMinutes || 25;\\n  const brk = params.breakMinutes || 5;\\n  const html = \`\\n<style>\\n  @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }\\n  .timer-btn { padding: 12px 24px; border-radius: 12px; border: none; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; }\\n  .timer-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }\\n</style>\\n<div style=\\"font-family: system-ui; padding: 40px; text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 24px; color: white;\\">\\n  <div style=\\"font-size: 14px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8;\\" id=\\"mode\\">Fokus-Zeit</div>\\n  <div id=\\"timer\\" style=\\"font-size: 80px; font-weight: bold; font-family: monospace; margin: 20px 0; text-shadow: 0 4px 20px rgba(0,0,0,0.2);\\">\${String(work).padStart(2,'0')}:00</div>\\n  <div style=\\"display: flex; gap: 12px; justify-content: center;\\">\\n    <button class=\\"timer-btn\\" style=\\"background: white; color: #f5576c;\\" onclick=\\"startTimer()\\" id=\\"startBtn\\">▶ Start</button>\\n    <button class=\\"timer-btn\\" style=\\"background: rgba(255,255,255,0.2); color: white;\\" onclick=\\"resetTimer()\\">↺ Reset</button>\\n  </div>\\n</div>\\n<script>\\n  let seconds = \${work} * 60, interval = null, isWork = true;\\n  const workSec = \${work} * 60, breakSec = \${brk} * 60;\\n  function updateDisplay() {\\n    const m = Math.floor(seconds / 60), s = seconds % 60;\\n    document.getElementById('timer').textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');\\n  }\\n  function startTimer() {\\n    if (interval) { clearInterval(interval); interval = null; document.getElementById('startBtn').innerHTML = '▶ Start'; return; }\\n    document.getElementById('startBtn').innerHTML = '⏸ Pause';\\n    interval = setInterval(() => {\\n      if (--seconds < 0) { isWork = !isWork; seconds = isWork ? workSec : breakSec; document.getElementById('mode').textContent = isWork ? 'Fokus-Zeit' : 'Pause'; }\\n      updateDisplay();\\n    }, 1000);\\n  }\\n  function resetTimer() { clearInterval(interval); interval = null; isWork = true; seconds = workSec; updateDisplay(); document.getElementById('startBtn').innerHTML = '▶ Start'; document.getElementById('mode').textContent = 'Fokus-Zeit'; }\\n</script>\\n\`;\\n  return { type: 'html', content: html };\\n}"
}

WICHTIG:
- NUR valides JSON ausgeben, kein Markdown
- IMMER modernes, farbenfrohes Design verwenden
- INTERAKTIVE Elemente einbauen wo sinnvoll
- refreshInterval für Uhren/Timer setzen (in Millisekunden)
- CSS inline oder im <style> Tag`;

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
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
      refreshInterval: parsed.refreshInterval || 0,
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
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
