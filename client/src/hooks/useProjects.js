import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useProjects(options = {}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options.status) params.append('status', options.status);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/projects${query}`);
      setProjects(response.projects);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.status]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = async (data) => {
    try {
      const response = await api.post('/projects', data);
      setProjects((prev) => [...prev, response.project]);
      toast.success('Projekt erstellt');
      return response.project;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateProject = async (id, data) => {
    try {
      const response = await api.put(`/projects/${id}`, data);
      setProjects((prev) => prev.map((p) => (p.id === id ? response.project : p)));
      toast.success('Projekt aktualisiert');
      return response.project;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteProject = async (id) => {
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success('Projekt gelöscht');
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const reorderProjects = async (items) => {
    try {
      await api.put('/projects/reorder', { items });
      fetchProjects();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    reorderProjects
  };
}

export function useProject(id) {
  const [project, setProject] = useState(null);
  const [todos, setTodos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.get(`/projects/${id}`);
      setProject(response.project);
      setTodos(response.todos);
      setNotes(response.notes);
      setEvents(response.events);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    todos,
    notes,
    events,
    loading,
    error,
    refetch: fetchProject
  };
}
