import { createContext, useState, useCallback, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export const AgentContext = createContext(null);

// LocalStorage Keys
const STORAGE_KEYS = {
  LAST_RESPONSE: 'agent_lastResponse',
  HISTORY: 'agent_history'
};

// Hilfsfunktionen für localStorage
function loadFromStorage(key, defaultValue) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

export function AgentProvider({ children }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState(() =>
    loadFromStorage(STORAGE_KEYS.LAST_RESPONSE, null)
  );
  const [history, setHistory] = useState(() =>
    loadFromStorage(STORAGE_KEYS.HISTORY, [])
  );

  // Persist lastResponse to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LAST_RESPONSE, lastResponse);
  }, [lastResponse]);

  // Persist history to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.HISTORY, history);
  }, [history]);

  // Vision/Image states
  const [visionResponse, setVisionResponse] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Event listeners for data refresh - use ref to avoid stale closure
  const refreshListenersRef = useRef({});

  const registerRefreshListener = useCallback((type, callback) => {
    const listeners = refreshListenersRef.current[type] || [];
    refreshListenersRef.current[type] = [...listeners, callback];

    return () => {
      refreshListenersRef.current[type] = (refreshListenersRef.current[type] || []).filter(cb => cb !== callback);
    };
  }, []);

  const triggerRefresh = useCallback((type) => {
    const listeners = refreshListenersRef.current[type] || [];
    listeners.forEach(callback => callback());
  }, []);

  const triggerRefreshesForActions = useCallback((actions) => {
    if (actions && actions.length > 0) {
      const actionTypes = [...new Set(actions.map(a => a.tool))];
      if (actionTypes.some(t => t.includes('todo'))) {
        triggerRefresh('todos');
      }
      if (actionTypes.some(t => t.includes('note'))) {
        triggerRefresh('notes');
      }
      if (actionTypes.some(t => t.includes('project'))) {
        triggerRefresh('projects');
      }
      if (actionTypes.some(t => t.includes('calendar') || t.includes('event'))) {
        triggerRefresh('calendar');
      }
      if (actionTypes.some(t => t.includes('widget'))) {
        triggerRefresh('widgets');
      }
    }
  }, [triggerRefresh]);

  // Regular text message
  const sendMessage = useCallback(async (message) => {
    if (!message.trim()) return null;

    setIsProcessing(true);
    setLastResponse(null);

    // Build chat history: last 15 user messages, last 5 with full response details
    const recentHistory = history.slice(0, 15);
    const chatHistory = recentHistory
      .reverse()
      .map((entry, index, arr) => {
        const isRecent = index >= arr.length - 5; // Last 5 entries get full details

        // For recent entries, include research results if available
        let assistantContent = entry.response || '';
        if (isRecent && entry.actions?.length > 0) {
          // Include ALL action results for context
          entry.actions.forEach(action => {
            if (action.result?.type === 'research' && action.result?.summary) {
              assistantContent += `\n\n[Web-Recherche zu "${action.result.query}"]:\n${action.result.summary}`;
              // Also include citations summary if available
              if (action.result.citations?.length > 0) {
                assistantContent += `\n\nQuellen: ${action.result.citations.map(c => c.title || c.url).join(', ')}`;
              }
            }
          });
        }

        return {
          user: entry.message,
          assistant: assistantContent
        };
      });

    // Debug log to verify research results are included
    const hasResearch = chatHistory.some(h => h.assistant?.includes('[Web-Recherche'));
    if (hasResearch) {
      console.log('[AgentContext] Chat history includes research results');
    }

    try {
      const response = await api.post('/agent/chat', { message, chatHistory });

      const historyEntry = {
        id: Date.now(),
        message,
        response: response.response,
        actions: response.actions || [],
        timestamp: new Date().toISOString()
      };

      setHistory((prev) => [historyEntry, ...prev].slice(0, 20));
      setLastResponse(response);
      triggerRefreshesForActions(response.actions);

      return response;
    } catch (err) {
      toast.error(err.message || 'Fehler bei der Verarbeitung');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [history, triggerRefreshesForActions]);

  // Send with images - returns response AND extractions for confirmation
  const sendWithImages = useCallback(async (message, files) => {
    if (!files || files.length === 0) {
      toast.error('Mindestens ein Bild erforderlich.');
      return null;
    }

    setIsProcessing(true);
    setLastResponse(null);
    setVisionResponse(null);
    setExtractedData(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('images', file);
      });
      if (message.trim()) {
        formData.append('query', message);
      }

      const response = await api.upload('/vision/analyze', formData);

      if (response.success) {
        // Store LLM response and extractions
        setVisionResponse(response.response);
        setExtractedData(response.extractions);
        return response;
      } else {
        toast.error(response.error || 'Fehler bei der Bildanalyse');
        return null;
      }
    } catch (err) {
      toast.error(err.message || 'Fehler bei der Bildanalyse');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Confirm selected items from extraction
  const confirmExtraction = useCallback(async (items) => {
    if (!items || items.length === 0) {
      toast.error('Keine Elemente ausgewählt.');
      return null;
    }

    setIsConfirming(true);

    try {
      const response = await api.post('/vision/confirm', { items });

      if (response.success) {
        // Trigger refreshes
        triggerRefreshesForActions(response.actions);

        // Create lastResponse for display
        const createdItems = [];
        if (response.created.todos?.length > 0) {
          createdItems.push(`${response.created.todos.length} Aufgabe${response.created.todos.length > 1 ? 'n' : ''}`);
        }
        if (response.created.appointments?.length > 0) {
          createdItems.push(`${response.created.appointments.length} Termin${response.created.appointments.length > 1 ? 'e' : ''}`);
        }
        if (response.created.notes?.length > 0) {
          createdItems.push(`${response.created.notes.length} Notiz${response.created.notes.length > 1 ? 'en' : ''}`);
        }

        const responseMessage = createdItems.length > 0
          ? `${createdItems.join(', ')} erstellt.`
          : response.message;

        // Add to history
        const historyEntry = {
          id: Date.now(),
          message: '[Bild-Analyse]',
          response: visionResponse + '\n\n' + responseMessage,
          actions: response.actions || [],
          timestamp: new Date().toISOString()
        };
        setHistory((prev) => [historyEntry, ...prev].slice(0, 20));

        setLastResponse({
          response: responseMessage,
          actions: response.actions
        });

        // Clear extraction state
        setExtractedData(null);
        setVisionResponse(null);

        return response;
      } else {
        if (response.errors?.length > 0) {
          response.errors.forEach(err => toast.error(err));
        }
        return null;
      }
    } catch (err) {
      toast.error(err.message || 'Fehler beim Erstellen');
      return null;
    } finally {
      setIsConfirming(false);
    }
  }, [triggerRefreshesForActions, visionResponse]);

  // Cancel extraction
  const cancelExtraction = useCallback(() => {
    setExtractedData(null);
    setVisionResponse(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastResponse(null);
    setExtractedData(null);
    setVisionResponse(null);
    // Auch localStorage leeren
    saveToStorage(STORAGE_KEYS.HISTORY, []);
    saveToStorage(STORAGE_KEYS.LAST_RESPONSE, null);
  }, []);

  return (
    <AgentContext.Provider
      value={{
        sendMessage,
        sendWithImages,
        isProcessing,
        lastResponse,
        history,
        clearHistory,
        registerRefreshListener,
        // Vision/Extraction
        visionResponse,
        extractedData,
        confirmExtraction,
        cancelExtraction,
        isConfirming
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}
