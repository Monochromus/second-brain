import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useArchive() {
  const [archive, setArchive] = useState({
    projects: [],
    todos: [],
    notes: [],
    areas: [],
    resources: [],
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArchive = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/archive');
      setArchive(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error('Fehler beim Laden des Archivs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  const restoreItem = useCallback(async (type, id) => {
    try {
      await api.post(`/archive/${type}/${id}/restore`);

      // Remove from local state
      setArchive(prev => ({
        ...prev,
        [type + 's']: prev[type + 's'].filter(item => item.id !== id),
        total: prev.total - 1
      }));

      toast.success('Element wiederhergestellt');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Wiederherstellen');
      throw err;
    }
  }, []);

  const deleteItem = useCallback(async (type, id) => {
    try {
      await api.delete(`/archive/${type}/${id}`);

      // Remove from local state
      setArchive(prev => ({
        ...prev,
        [type + 's']: prev[type + 's'].filter(item => item.id !== id),
        total: prev.total - 1
      }));

      toast.success('Element endgültig gelöscht');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
      throw err;
    }
  }, []);

  return {
    archive,
    loading,
    error,
    refetch: fetchArchive,
    restoreItem,
    deleteItem
  };
}
