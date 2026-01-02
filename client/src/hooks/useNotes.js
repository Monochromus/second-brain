import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useNotes(options = {}) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options.project_id) params.append('project_id', options.project_id);
      if (options.tags) params.append('tags', options.tags);
      if (options.search) params.append('search', options.search);
      if (options.limit) params.append('limit', options.limit);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/notes${query}`);
      setNotes(response.notes);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.project_id, options.tags, options.search, options.limit]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const createNote = async (data) => {
    try {
      const response = await api.post('/notes', data);
      setNotes((prev) => [response.note, ...prev]);
      toast.success('Notiz erstellt');
      return response.note;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateNote = async (id, data) => {
    try {
      const response = await api.put(`/notes/${id}`, data);
      setNotes((prev) => prev.map((n) => (n.id === id ? response.note : n)));
      return response.note;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const togglePin = async (id) => {
    try {
      const response = await api.put(`/notes/${id}/pin`);
      setNotes((prev) => prev.map((n) => (n.id === id ? response.note : n)));
      return response.note;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteNote = async (id) => {
    try {
      await api.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notiz gelöscht');
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const reorderNotes = async (items) => {
    try {
      await api.put('/notes/reorder', { items });
      fetchNotes();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  return {
    notes,
    loading,
    error,
    refetch: fetchNotes,
    createNote,
    updateNote,
    togglePin,
    deleteNote,
    reorderNotes
  };
}
