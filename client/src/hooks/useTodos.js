import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useTodos(options = {}) {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);
      if (options.project_id) params.append('project_id', options.project_id);
      if (options.priority) params.append('priority', options.priority);
      if (options.due_before) params.append('due_before', options.due_before);
      if (options.limit) params.append('limit', options.limit);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/todos${query}`);
      setTodos(response.todos);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.status, options.project_id, options.priority, options.due_before, options.limit]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const createTodo = async (data) => {
    try {
      const response = await api.post('/todos', data);
      setTodos((prev) => [response.todo, ...prev]);
      toast.success('Todo erstellt');
      return response.todo;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateTodo = async (id, data) => {
    try {
      const response = await api.put(`/todos/${id}`, data);
      setTodos((prev) => prev.map((t) => (t.id === id ? response.todo : t)));
      toast.success('Todo aktualisiert');
      return response.todo;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const toggleTodo = async (id) => {
    try {
      const response = await api.put(`/todos/${id}/complete`);
      setTodos((prev) => prev.map((t) => (t.id === id ? response.todo : t)));

      // Show notification if project was auto-completed
      if (response.projectCompleted) {
        toast.success('Projekt abgeschlossen! Alle Todos erledigt.');
      }

      return response;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteTodo = async (id) => {
    try {
      await api.delete(`/todos/${id}`);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      toast.success('Todo gelöscht');
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const reorderTodos = async (items) => {
    try {
      await api.put('/todos/reorder', { items });
      fetchTodos();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  return {
    todos,
    loading,
    error,
    refetch: fetchTodos,
    createTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    reorderTodos
  };
}
