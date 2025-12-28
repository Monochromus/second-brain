import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useResources(options = {}) {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options.include_archived) params.append('include_archived', 'true');
      if (options.category) params.append('category', options.category);
      if (options.search) params.append('search', options.search);

      const data = await api.get(`/resources?${params.toString()}`);
      setResources(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error('Fehler beim Laden der Ressourcen');
    } finally {
      setLoading(false);
    }
  }, [options.include_archived, options.category, options.search]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get('/resources/categories');
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, []);

  useEffect(() => {
    fetchResources();
    fetchCategories();
  }, [fetchResources, fetchCategories]);

  const createResource = useCallback(async (data) => {
    try {
      const resource = await api.post('/resources', data);
      setResources(prev => [resource, ...prev]);
      toast.success('Ressource erstellt');
      fetchCategories();
      return resource;
    } catch (err) {
      toast.error(err.message || 'Fehler beim Erstellen');
      throw err;
    }
  }, [fetchCategories]);

  const updateResource = useCallback(async (id, data) => {
    try {
      const resource = await api.put(`/resources/${id}`, data);
      setResources(prev => prev.map(r => r.id === id ? resource : r));
      toast.success('Ressource aktualisiert');
      fetchCategories();
      return resource;
    } catch (err) {
      toast.error(err.message || 'Fehler beim Aktualisieren');
      throw err;
    }
  }, [fetchCategories]);

  const deleteResource = useCallback(async (id) => {
    try {
      await api.delete(`/resources/${id}`);
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Ressource gelöscht');
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
      throw err;
    }
  }, [fetchCategories]);

  const archiveResource = useCallback(async (id) => {
    try {
      await api.post(`/archive/resource/${id}`);
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Ressource archiviert');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Archivieren');
      throw err;
    }
  }, []);

  return {
    resources,
    categories,
    loading,
    error,
    refetch: fetchResources,
    createResource,
    updateResource,
    deleteResource,
    archiveResource
  };
}
