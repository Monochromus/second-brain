import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useAreas(options = {}) {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAreas = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options.include_archived) params.append('include_archived', 'true');

      const data = await api.get(`/areas?${params.toString()}`);
      setAreas(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error('Fehler beim Laden der Bereiche');
    } finally {
      setLoading(false);
    }
  }, [options.include_archived]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const createArea = useCallback(async (data) => {
    try {
      const area = await api.post('/areas', data);
      setAreas(prev => [...prev, area]);
      toast.success('Bereich erstellt');
      return area;
    } catch (err) {
      toast.error(err.message || 'Fehler beim Erstellen');
      throw err;
    }
  }, []);

  const updateArea = useCallback(async (id, data) => {
    try {
      const area = await api.put(`/areas/${id}`, data);
      setAreas(prev => prev.map(a => a.id === id ? area : a));
      toast.success('Bereich aktualisiert');
      return area;
    } catch (err) {
      toast.error(err.message || 'Fehler beim Aktualisieren');
      throw err;
    }
  }, []);

  const deleteArea = useCallback(async (id) => {
    try {
      await api.delete(`/areas/${id}`);
      setAreas(prev => prev.filter(a => a.id !== id));
      toast.success('Bereich gelöscht');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
      throw err;
    }
  }, []);

  const archiveArea = useCallback(async (id) => {
    try {
      await api.post(`/archive/area/${id}`);
      setAreas(prev => prev.filter(a => a.id !== id));
      toast.success('Bereich archiviert');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Archivieren');
      throw err;
    }
  }, []);

  return {
    areas,
    loading,
    error,
    refetch: fetchAreas,
    createArea,
    updateArea,
    deleteArea,
    archiveArea
  };
}
