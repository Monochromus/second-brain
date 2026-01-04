/**
 * Sandbox Service - Secure JavaScript Execution using isolated-vm
 *
 * SECURITY CRITICAL: This service executes LLM-generated code in a
 * completely isolated V8 context with no access to Node.js APIs.
 */

let ivm;
try {
  ivm = require('isolated-vm');
} catch (err) {
  console.warn('isolated-vm not available. Sandbox execution will use fallback mode.');
  ivm = null;
}

// Configuration
const SANDBOX_CONFIG = {
  memoryLimit: 128, // MB
  timeout: 5000,    // ms
  maxCodeLength: 50000 // characters
};

// Forbidden patterns in SERVER-SIDE code (not in HTML strings for browser)
// Note: setTimeout/setInterval are allowed in HTML <script> tags for browser interactivity
const FORBIDDEN_PATTERNS = [
  /\brequire\s*\(/,
  /\bimport\s+/,
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\bFunction\s*\(/,
  /\bprocess\b/,
  /\bglobal\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
  /\bmodule\b/,
  /\bexports\b/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsetImmediate\b/,
  /\bBuffer\b/,
  /\bfs\b/,
  /\bchild_process\b/,
  /\bexec\s*\(/,
  /\bspawn\s*\(/,
];

/**
 * Validates code for forbidden patterns
 */
function validateCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Code ist leer oder ungültig.' };
  }

  if (code.length > SANDBOX_CONFIG.maxCodeLength) {
    return { valid: false, error: `Code ist zu lang (max ${SANDBOX_CONFIG.maxCodeLength} Zeichen).` };
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      return {
        valid: false,
        error: `Verbotenes Pattern gefunden: ${pattern.toString()}`
      };
    }
  }

  return { valid: true };
}

/**
 * Safe helper functions available in the sandbox
 */
const SAFE_HELPERS = `
  // Date formatting
  function formatDate(date, format) {
    const d = date instanceof Date ? date : new Date(date);
    const pad = (n) => n.toString().padStart(2, '0');

    const replacements = {
      'YYYY': d.getFullYear(),
      'MM': pad(d.getMonth() + 1),
      'DD': pad(d.getDate()),
      'HH': pad(d.getHours()),
      'mm': pad(d.getMinutes()),
      'ss': pad(d.getSeconds())
    };

    let result = format || 'YYYY-MM-DD';
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(key, value);
    }
    return result;
  }

  // Number formatting
  function formatNumber(num, options) {
    const opts = options || {};
    const decimals = opts.decimals !== undefined ? opts.decimals : 2;
    const locale = opts.locale || 'de-DE';
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  }

  // HTML escaping
  function escapeHtml(str) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(str).replace(/[&<>"']/g, c => escapeMap[c]);
  }

  // Create HTML element string
  function createElement(tag, attrs, content) {
    const attrStr = Object.entries(attrs || {})
      .map(([k, v]) => k + '="' + escapeHtml(v) + '"')
      .join(' ');
    const openTag = attrStr ? '<' + tag + ' ' + attrStr + '>' : '<' + tag + '>';
    return openTag + (content || '') + '</' + tag + '>';
  }

  // Create SVG wrapper
  function createSVG(width, height, content) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' + content + '</svg>';
  }

  // Simple color utilities
  function hexToRgb(hex) {
    const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  // Random utilities (deterministic seed option)
  function random(min, max) {
    min = min || 0;
    max = max || 1;
    return Math.random() * (max - min) + min;
  }

  function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
  }

  // Array utilities
  function range(start, end, step) {
    step = step || 1;
    const result = [];
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
    return result;
  }

  // Current timestamp
  function now() {
    return new Date();
  }
`;

/**
 * Execute code in isolated sandbox using isolated-vm
 */
async function executeWithIsolatedVM(code, params) {
  const isolate = new ivm.Isolate({ memoryLimit: SANDBOX_CONFIG.memoryLimit });

  try {
    const context = await isolate.createContext();
    const jail = context.global;

    // Set up global object
    await jail.set('global', jail.derefInto());

    // Inject parameters
    await jail.set('params', new ivm.ExternalCopy(params).copyInto());

    // Inject safe console
    await jail.set('_log', new ivm.Reference((...args) => {
      console.log('[Sandbox]:', ...args);
    }));

    // Build the full script
    const fullScript = `
      // Console polyfill
      const console = {
        log: (...args) => _log.apply(undefined, args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))),
        error: (...args) => _log.apply(undefined, ['ERROR:', ...args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))]),
        warn: (...args) => _log.apply(undefined, ['WARN:', ...args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))])
      };

      ${SAFE_HELPERS}

      // User code
      ${code}

      // Execute render function
      (function() {
        if (typeof render !== 'function') {
          return JSON.stringify({ type: 'error', content: 'render() Funktion nicht gefunden' });
        }
        try {
          const result = render(params);
          if (!result || !result.type || !result.content) {
            return JSON.stringify({ type: 'error', content: 'render() muss {type, content} zurückgeben' });
          }
          return JSON.stringify(result);
        } catch (e) {
          return JSON.stringify({ type: 'error', content: 'Ausführungsfehler: ' + e.message });
        }
      })();
    `;

    // Try to compile the script
    let script;
    try {
      script = await isolate.compileScript(fullScript);
    } catch (compileError) {
      console.error('[Sandbox] Compilation error:', compileError.message);
      console.error('[Sandbox] Generated code (first 500 chars):', code.substring(0, 500));

      // Extract line number from error if possible
      const lineMatch = compileError.message.match(/:(\d+):/);
      const lineInfo = lineMatch ? ` (Zeile ${lineMatch[1]})` : '';

      return {
        type: 'error',
        content: `Syntaxfehler im generierten Code${lineInfo}: ${compileError.message}. Bitte versuche es mit einer anderen Beschreibung.`
      };
    }

    // Run with timeout
    const resultStr = await script.run(context, { timeout: SANDBOX_CONFIG.timeout });

    // Parse result
    return JSON.parse(resultStr);
  } finally {
    isolate.dispose();
  }
}

/**
 * Fallback execution without isolated-vm (development only, less secure)
 */
function executeWithFallback(code, params) {
  console.warn('Using fallback sandbox mode - not recommended for production');

  // Create a restricted function context
  const sandbox = {
    params,
    result: null,
    console: {
      log: (...args) => console.log('[Sandbox]:', ...args),
      error: (...args) => console.error('[Sandbox]:', ...args),
      warn: (...args) => console.warn('[Sandbox]:', ...args)
    },
    Math,
    Date,
    JSON,
    String,
    Number,
    Boolean,
    Array,
    Object,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    Intl
  };

  // Add safe helpers to sandbox
  const helperCode = SAFE_HELPERS;

  const wrappedCode = `
    (function(sandbox) {
      with(sandbox) {
        ${helperCode}
        ${code}

        if (typeof render !== 'function') {
          return { type: 'error', content: 'render() Funktion nicht gefunden' };
        }
        try {
          return render(params);
        } catch (e) {
          return { type: 'error', content: 'Ausführungsfehler: ' + e.message };
        }
      }
    })
  `;

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('sandbox', `return ${wrappedCode}(sandbox)`);

    // Execute with timeout using Promise.race
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout: Code-Ausführung hat zu lange gedauert'));
      }, SANDBOX_CONFIG.timeout);

      try {
        const result = fn(sandbox);
        clearTimeout(timer);
        resolve(result);
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  } catch (err) {
    return Promise.resolve({
      type: 'error',
      content: 'Syntax-Fehler: ' + err.message
    });
  }
}

/**
 * Main execution function
 */
async function executeInSandbox(code, params = {}) {
  // Validate code first
  const validation = validateCode(code);
  if (!validation.valid) {
    return {
      type: 'error',
      content: validation.error
    };
  }

  // Execute with appropriate method
  if (ivm) {
    return executeWithIsolatedVM(code, params);
  } else {
    return executeWithFallback(code, params);
  }
}

/**
 * Test if sandbox is working
 */
async function testSandbox() {
  const testCode = `
    function render(params) {
      return {
        type: 'html',
        content: '<div>Test: ' + (params.value || 'default') + '</div>'
      };
    }
  `;

  try {
    const result = await executeInSandbox(testCode, { value: 'Hello Sandbox!' });
    console.log('Sandbox test result:', result);
    return result.type !== 'error';
  } catch (err) {
    console.error('Sandbox test failed:', err);
    return false;
  }
}

module.exports = {
  executeInSandbox,
  validateCode,
  testSandbox,
  SANDBOX_CONFIG
};
