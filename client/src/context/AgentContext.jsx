import { createContext, useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export const AgentContext = createContext(null);

export function AgentProvider({ children }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [history, setHistory] = useState([]);

  // Event listeners for data refresh
  const [refreshListeners, setRefreshListeners] = useState({});

  const registerRefreshListener = useCallback((type, callback) => {
    setRefreshListeners(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), callback]
    }));

    // Return unregister function
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

  const sendMessage = useCallback(async (message) => {
    if (!message.trim()) return null;

    setIsProcessing(true);
    setLastResponse(null);

    // Build chat history from last 10 messages
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

      // Trigger refreshes based on actions
      if (response.actions && response.actions.length > 0) {
        const actionTypes = [...new Set(response.actions.map(a => a.tool))];
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
      }

      return response;
    } catch (err) {
      toast.error(err.message || 'Fehler bei der Verarbeitung');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [history, triggerRefresh]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastResponse(null);
  }, []);

  return (
    <AgentContext.Provider
      value={{
        sendMessage,
        isProcessing,
        lastResponse,
        history,
        clearHistory,
        registerRefreshListener
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}
