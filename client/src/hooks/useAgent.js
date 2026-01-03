import { useContext, useEffect } from 'react';
import { AgentContext } from '../context/AgentContext';

export function useAgent(refreshCallbacks = {}) {
  const context = useContext(AgentContext);

  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }

  const { registerRefreshListener } = context;

  useEffect(() => {
    const unsubscribers = [];

    if (refreshCallbacks.todos) {
      unsubscribers.push(registerRefreshListener('todos', refreshCallbacks.todos));
    }
    if (refreshCallbacks.notes) {
      unsubscribers.push(registerRefreshListener('notes', refreshCallbacks.notes));
    }
    if (refreshCallbacks.projects) {
      unsubscribers.push(registerRefreshListener('projects', refreshCallbacks.projects));
    }
    if (refreshCallbacks.calendar) {
      unsubscribers.push(registerRefreshListener('calendar', refreshCallbacks.calendar));
    }
    if (refreshCallbacks.widgets) {
      unsubscribers.push(registerRefreshListener('widgets', refreshCallbacks.widgets));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [registerRefreshListener, refreshCallbacks.todos, refreshCallbacks.notes, refreshCallbacks.projects, refreshCallbacks.calendar, refreshCallbacks.widgets]);

  return {
    sendMessage: context.sendMessage,
    sendWithImages: context.sendWithImages,
    isProcessing: context.isProcessing,
    lastResponse: context.lastResponse,
    history: context.history,
    clearHistory: context.clearHistory,
    clearLastResponse: context.clearLastResponse,
    // Vision/Extraction
    visionResponse: context.visionResponse,
    extractedData: context.extractedData,
    confirmExtraction: context.confirmExtraction,
    cancelExtraction: context.cancelExtraction,
    isConfirming: context.isConfirming,
    // Refresh listeners for real-time updates
    registerRefreshListener: context.registerRefreshListener
  };
}
