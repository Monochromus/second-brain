import { createContext, useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { api, getToken } from '../lib/api';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

export const AgentContext = createContext(null);

export function AgentProvider({ children }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [history, setHistory] = useState([]);

  // Vision/Image states
  const [visionResponse, setVisionResponse] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Event listeners for data refresh
  const [refreshListeners, setRefreshListeners] = useState({});

  // WebSocket ref for capture notifications
  const socketRef = useRef(null);
  const refreshListenersRef = useRef(refreshListeners);

  // Keep ref in sync with state
  useEffect(() => {
    refreshListenersRef.current = refreshListeners;
  }, [refreshListeners]);

  const registerRefreshListener = useCallback((type, callback) => {
    setRefreshListeners(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), callback]
    }));

    return () => {
      setRefreshListeners(prev => ({
        ...prev,
        [type]: (prev[type] || []).filter(cb => cb !== callback)
      }));
    };
  }, []);

  const triggerRefresh = useCallback((type) => {
    const listeners = refreshListeners[type] || [];
    listeners.forEach(callback => callback());
  }, [refreshListeners]);

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

  // WebSocket connection for capture:processed events from iOS Shortcuts
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    try {
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('AgentContext: WebSocket connected for captures');
      });

      // Handle capture:processed events from iOS Shortcuts
      socket.on('capture:processed', ({ captureId, result }) => {
        console.log('Capture processed:', captureId, result);

        // Create history entry for the capture
        const historyEntry = {
          id: Date.now(),
          message: result.type === 'vision' ? '[Kurzbefehl mit Bild]' : '[Kurzbefehl]',
          response: result.response || 'Verarbeitung abgeschlossen.',
          actions: result.actions || [],
          timestamp: new Date().toISOString(),
          fromCapture: true
        };

        setHistory((prev) => [historyEntry, ...prev].slice(0, 20));
        setLastResponse({ response: result.response, actions: result.actions || [] });

        // Show toast notification
        toast.success('Kurzbefehl verarbeitet!', { icon: '📱' });

        // Trigger data refreshes using ref
        const listeners = refreshListenersRef.current;
        const doRefresh = (type) => {
          (listeners[type] || []).forEach(cb => cb());
        };

        if (result.actions?.length > 0) {
          const actionTypes = [...new Set(result.actions.map(a => a.tool))];
          if (actionTypes.some(t => t.includes('todo'))) doRefresh('todos');
          if (actionTypes.some(t => t.includes('note'))) doRefresh('notes');
          if (actionTypes.some(t => t.includes('project'))) doRefresh('projects');
          if (actionTypes.some(t => t.includes('calendar') || t.includes('event'))) doRefresh('calendar');
        }

        // Also refresh for vision-created items
        if (result.created) {
          if (result.created.todos?.length > 0) doRefresh('todos');
          if (result.created.notes?.length > 0) doRefresh('notes');
          if (result.created.appointments?.length > 0) doRefresh('calendar');
        }
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn('AgentContext: Socket.io not available:', err);
    }
  }, []);

  // Regular text message
  const sendMessage = useCallback(async (message) => {
    if (!message.trim()) return null;

    setIsProcessing(true);
    setLastResponse(null);

    const chatHistory = history
      .slice(0, 10)
      .reverse()
      .map(entry => ({
        user: entry.message,
        assistant: entry.response
      }));

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
