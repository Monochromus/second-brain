const db = require('../config/database');

/**
 * Get Perplexity settings for a user
 */
function getUserPerplexitySettings(userId) {
  const user = db.prepare('SELECT settings FROM users WHERE id = ?').get(userId);

  if (user && user.settings) {
    try {
      const settings = JSON.parse(user.settings);
      return {
        apiKey: settings.perplexityApiKey || null,
        model: settings.perplexityModel || 'sonar'
      };
    } catch {
      return { apiKey: null, model: 'sonar' };
    }
  }

  return { apiKey: null, model: 'sonar' };
}

/**
 * Perform web research using Perplexity AI
 * @param {string} query - The search query
 * @param {number} userId - User ID for settings lookup
 * @param {Object} options - Additional options
 * @param {string} options.recency - Time filter (hour, day, week, month)
 * @param {string[]} options.domains - Domain filter (prefix with - to exclude)
 * @returns {Promise<Object>} Research results with summary, citations, related questions
 */
async function webResearch(query, userId, options = {}) {
  const settings = getUserPerplexitySettings(userId);
  const hasOwnKey = Boolean(settings.apiKey);
  const apiKey = settings.apiKey || process.env.PERPLEXITY_API_KEY;

  // Debug log
  console.log('[Perplexity] Research request:', {
    query,
    hasOwnKey,
    hasEnvKey: Boolean(process.env.PERPLEXITY_API_KEY),
    keyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'NONE'
  });

  if (!apiKey) {
    return {
      success: false,
      error: 'Perplexity API-Key nicht konfiguriert. Bitte in den Einstellungen hinterlegen.'
    };
  }

  // Only allow 'sonar' model when using the default API key (no user key)
  // Pro models (sonar-pro, sonar-reasoning, sonar-deep-research) require own key
  const requestedModel = options.model || settings.model || 'sonar';
  const model = hasOwnKey ? requestedModel : 'sonar';
  // Zeitfilter wird vom KI-Modell selbst gewählt (options.recency)
  const recencyFilter = options.recency || null;

  // Build request body
  const requestBody = {
    model,
    messages: [
      {
        role: 'system',
        content: 'Du bist ein hilfreicher Recherche-Assistent. Gib präzise, gut strukturierte Antworten auf Deutsch. Fasse die wichtigsten Informationen zusammen und verweise auf die Quellen.'
      },
      {
        role: 'user',
        content: query
      }
    ],
    return_related_questions: true
  };

  // Add optional filters
  if (recencyFilter) {
    requestBody.search_recency_filter = recencyFilter;
  }

  if (options.domains && options.domains.length > 0) {
    requestBody.search_domain_filter = options.domains;
  }

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        return { success: false, error: 'Perplexity API-Key ungültig.' };
      }
      if (response.status === 402) {
        return { success: false, error: 'Perplexity Guthaben aufgebraucht.' };
      }
      if (response.status === 429) {
        return { success: false, error: 'Perplexity Rate-Limit erreicht. Bitte später erneut versuchen.' };
      }

      return {
        success: false,
        error: errorData.error?.message || `Perplexity Fehler (${response.status})`
      };
    }

    const data = await response.json();

    // Extract the response content
    const content = data.choices?.[0]?.message?.content || '';

    // Extract citations from the response
    // Perplexity returns citations in the response metadata
    const citations = data.citations || [];

    // Extract related questions if available
    const relatedQuestions = data.related_questions || [];

    console.log('[Perplexity] Success! Summary length:', content.length, 'Citations:', citations.length);

    return {
      success: true,
      summary: content,
      citations: citations.map((url, index) => ({
        id: index + 1,
        url,
        title: extractDomainName(url)
      })),
      relatedQuestions,
      model: data.model,
      usage: data.usage
    };

  } catch (error) {
    console.error('[Perplexity] API error:', error.name, error.message);

    // Handle timeout
    if (error.name === 'AbortError') {
      console.log('[Perplexity] Request timed out');
      return {
        success: false,
        error: 'Recherche-Anfrage hat zu lange gedauert. Bitte erneut versuchen.'
      };
    }

    return {
      success: false,
      error: 'Verbindung zu Perplexity fehlgeschlagen. Bitte später erneut versuchen.'
    };
  }
}

/**
 * Extract a readable domain name from a URL
 */
function extractDomainName(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

module.exports = {
  webResearch,
  getUserPerplexitySettings
};
