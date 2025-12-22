import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

export function useCalendar(options = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (options.start_date) {
        params.append('start_date', options.start_date);
      }
      if (options.end_date) {
        params.append('end_date', options.end_date);
      }
      if (options.source) {
        params.append('source', options.source);
      }

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/calendar/events${query}`);
      setEvents(response.events);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.start_date, options.end_date, options.source]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = async (data) => {
    try {
      const response = await api.post('/calendar/events', data);
      setEvents((prev) => [...prev, response.event].sort((a, b) =>
        new Date(a.start_time) - new Date(b.start_time)
      ));
      toast.success('Termin erstellt');
      return response.event;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateEvent = async (id, data) => {
    try {
      const response = await api.put(`/calendar/events/${id}`, data);
      setEvents((prev) => prev.map((e) => (e.id === id ? response.event : e)));
      toast.success('Termin aktualisiert');
      return response.event;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api.delete(`/calendar/events/${id}`);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.success('Termin gelöscht');
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const syncCalendar = async () => {
    try {
      const response = await api.post('/calendar/sync');
      toast.success(response.message);
      fetchEvents();
      return response;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    syncCalendar
  };
}

export function useCalendarConnections() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/calendar/connections');
      setConnections(response.connections);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const addConnection = async (data) => {
    try {
      await api.post('/calendar/connections', data);
      toast.success('Kalender verbunden');
      fetchConnections();
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const removeConnection = async (id) => {
    try {
      await api.delete(`/calendar/connections/${id}`);
      setConnections((prev) => prev.filter((c) => c.id !== id));
      toast.success('Kalender entfernt');
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  return {
    connections,
    loading,
    refetch: fetchConnections,
    addConnection,
    removeConnection
  };
}

export function getCalendarRange(date, view = 'month') {
  const d = date instanceof Date ? date : new Date(date);

  if (view === 'month') {
    const start = startOfWeek(startOfMonth(d), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(d), { weekStartsOn: 1 });
    return {
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd')
    };
  }

  if (view === 'week') {
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    return {
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd')
    };
  }

  return {
    start_date: format(d, 'yyyy-MM-dd'),
    end_date: format(d, 'yyyy-MM-dd')
  };
}
