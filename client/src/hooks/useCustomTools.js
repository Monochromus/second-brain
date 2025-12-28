import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { api, getToken } from '../lib/api';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

export function useCustomTools() {
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limits, setLimits] = useState({ maxTools: 10, currentCount: 0 });
  const socketRef = useRef(null);

  // Fetch all tools
  const fetchTools = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/custom-tools');
      setTools(response.tools || []);
      setLimits(response.limits || { maxTools: 10, currentCount: 0 });
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch custom tools:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Only connect if socket.io-client is available
    try {
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
      });

      socket.on('connect_error', (err) => {
        console.warn('WebSocket connection error:', err.message);
      });

      // Handle tool updates
      socket.on('tool:updated', ({ toolId, status, error: toolError }) => {
        setTools(prev => prev.map(tool => {
          if (tool.id === toolId) {
            return {
              ...tool,
              status,
              error_message: toolError || null
            };
          }
          return tool;
        }));

        if (status === 'ready') {
          toast.success('Tool wurde erfolgreich generiert!');
        } else if (status === 'error') {
          toast.error(`Tool-Generierung fehlgeschlagen: ${toolError}`);
        }
      });

      // Handle tool results
      socket.on('tool:result', ({ toolId, result }) => {
        setTools(prev => prev.map(tool => {
          if (tool.id === toolId) {
            return {
              ...tool,
              last_result: result,
              last_result_at: new Date().toISOString()
            };
          }
          return tool;
        }));
      });

      // Handle tool errors
      socket.on('tool:error', ({ toolId, error: toolError }) => {
        setTools(prev => prev.map(tool => {
          if (tool.id === toolId) {
            return {
              ...tool,
              error_message: toolError
            };
          }
          return tool;
        }));
        toast.error(`Tool-Fehler: ${toolError}`);
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn('Socket.io not available:', err);
    }
  }, []);

  // Fetch tools on mount
  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  // Subscribe to tool updates
  const subscribeTool = useCallback((toolId) => {
    if (socketRef.current) {
      socketRef.current.emit('tool:subscribe', toolId);
    }
  }, []);

  // Unsubscribe from tool updates
  const unsubscribeTool = useCallback((toolId) => {
    if (socketRef.current) {
      socketRef.current.emit('tool:unsubscribe', toolId);
    }
  }, []);

  // Generate new tool
  const generateTool = async (description, name) => {
    try {
      const response = await api.post('/custom-tools/generate', { description, name });
      setTools(prev => [response.tool, ...prev]);
      setLimits(prev => ({ ...prev, currentCount: prev.currentCount + 1 }));
      toast.success('Tool wird generiert...');
      return response.tool;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  // Get single tool
  const getTool = async (id) => {
    try {
      const response = await api.get(`/custom-tools/${id}`);
      return response.tool;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  // Execute tool
  const executeTool = async (id, parameters) => {
    try {
      const response = await api.post(`/custom-tools/${id}/execute`, { parameters });
      if (response.success) {
        // Update local state with new result
        setTools(prev => prev.map(tool => {
          if (tool.id === id) {
            return {
              ...tool,
              last_result: response.result,
              last_result_at: response.executedAt,
              current_parameters: { ...tool.current_parameters, ...parameters }
            };
          }
          return tool;
        }));
      }
      return response;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  // Get tool result
  const getToolResult = async (id) => {
    try {
      const response = await api.get(`/custom-tools/${id}/result`);
      return response;
    } catch (err) {
      throw err;
    }
  };

  // Update tool
  const updateTool = async (id, data) => {
    try {
      const response = await api.put(`/custom-tools/${id}`, data);
      setTools(prev => prev.map(tool =>
        tool.id === id ? response.tool : tool
      ));
      toast.success(response.message);
      return response.tool;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  // Delete tool
  const deleteTool = async (id) => {
    try {
      await api.delete(`/custom-tools/${id}`);
      setTools(prev => prev.filter(tool => tool.id !== id));
      setLimits(prev => ({ ...prev, currentCount: Math.max(0, prev.currentCount - 1) }));
      toast.success('Tool gelöscht');
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  // Update parameters
  const updateParameters = async (id, parameters) => {
    try {
      const response = await api.post(`/custom-tools/${id}/interact`, {
        action: 'updateParameters',
        parameters
      });
      setTools(prev => prev.map(tool =>
        tool.id === id ? response.tool : tool
      ));
      return response.tool;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  // Reorder tools
  const reorderTools = async (items) => {
    try {
      await api.put('/custom-tools/reorder', { items });
      fetchTools();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  return {
    tools,
    loading,
    error,
    limits,
    refetch: fetchTools,
    generateTool,
    getTool,
    executeTool,
    getToolResult,
    updateTool,
    deleteTool,
    updateParameters,
    reorderTools,
    subscribeTool,
    unsubscribeTool
  };
}

// Example prompts for inspiration
export const EXAMPLE_PROMPTS = [
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
