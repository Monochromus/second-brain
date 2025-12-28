import { useContext, useEffect } from 'react';
import { AgentContext } from '../context/AgentContext';

export function useAgent(refreshCallbacks = {}) {
  const context = useContext(AgentContext);

  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }

  const { registerRefreshListener } = context;

  // Register refresh callbacks
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

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [registerRefreshListener, refreshCallbacks.todos, refreshCallbacks.notes, refreshCallbacks.projects, refreshCallbacks.calendar]);

  return {
    sendMessage: context.sendMessage,
    isProcessing: context.isProcessing,
    lastResponse: context.lastResponse,
    history: context.history,
    clearHistory: context.clearHistory
  };
}
