import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useAgent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [history, setHistory] = useState([]);

  const sendMessage = useCallback(async (message, onSuccess) => {
    if (!message.trim()) return null;

    setIsProcessing(true);
    setLastResponse(null);

    // Build chat history from last 10 messages (most recent first, so reverse)
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

      if (response.actions && response.actions.length > 0) {
        const actionTypes = [...new Set(response.actions.map(a => a.tool))];
        if (actionTypes.some(t => t.includes('todo'))) {
          onSuccess?.('todos');
        }
        if (actionTypes.some(t => t.includes('note'))) {
          onSuccess?.('notes');
        }
        if (actionTypes.some(t => t.includes('project'))) {
          onSuccess?.('projects');
        }
        if (actionTypes.some(t => t.includes('calendar') || t.includes('event'))) {
          onSuccess?.('calendar');
        }
      }

      return response;
    } catch (err) {
      toast.error(err.message || 'Fehler bei der Verarbeitung');
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setLastResponse(null);
  }, []);

  return {
    sendMessage,
    isProcessing,
    lastResponse,
    history,
    clearHistory
  };
}
