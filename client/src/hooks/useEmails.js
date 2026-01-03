import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useAgent } from './useAgent';

export function useEmails(options = {}) {
  const [emails, setEmails] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [selectedEmailLoading, setSelectedEmailLoading] = useState(false);
  const [starToggleLoading, setStarToggleLoading] = useState(false); // Prevent double-clicks
  const { registerRefreshListener } = useAgent();

  const fetchEmails = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (options.account_id) {
        params.append('account_id', options.account_id);
      }
      if (options.folder) {
        params.append('folder', options.folder);
      }
      if (options.category) {
        params.append('category', options.category);
      }
      if (options.unread) {
        params.append('unread', 'true');
      }
      if (options.starred) {
        params.append('starred', 'true');
      }
      if (options.limit) {
        params.append('limit', options.limit);
      }
      if (options.offset) {
        params.append('offset', options.offset);
      }
      if (options.search) {
        params.append('search', options.search);
      }

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/emails${query}`);
      setEmails(response.emails);
      setTotal(response.total);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [options.account_id, options.folder, options.category, options.unread, options.starred, options.limit, options.offset, options.search]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Register for agent refresh events
  useEffect(() => {
    const unsubscribe = registerRefreshListener('emails', () => {
      fetchEmails();
    });
    return unsubscribe;
  }, [registerRefreshListener, fetchEmails]);

  const loadEmail = async (id) => {
    try {
      setSelectedEmailLoading(true);
      const response = await api.get(`/emails/${id}`);
      setSelectedEmail(response);

      // Mark as read if unread
      if (!response.is_read) {
        await markAsRead(id, true);
      }

      return response;
    } catch (err) {
      toast.error('Fehler beim Laden der E-Mail');
      throw err;
    } finally {
      setSelectedEmailLoading(false);
    }
  };

  const loadThread = async (id) => {
    try {
      const response = await api.get(`/emails/${id}/thread`);
      return response;
    } catch (err) {
      toast.error('Fehler beim Laden des Threads');
      throw err;
    }
  };

  const markAsRead = async (id, isRead = true) => {
    try {
      await api.put(`/emails/${id}/read`, { is_read: isRead });
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, is_read: isRead ? 1 : 0 } : e))
      );
      if (selectedEmail?.id === id) {
        setSelectedEmail((prev) => ({ ...prev, is_read: isRead ? 1 : 0 }));
      }
    } catch (err) {
      toast.error('Fehler beim Aktualisieren des Status');
    }
  };

  const toggleStar = async (id) => {
    // Prevent double-clicks
    if (starToggleLoading) {
      return;
    }

    // Check both emails list and selectedEmail
    const emailFromList = emails.find((e) => e.id === id);
    const email = emailFromList || (selectedEmail?.id === id ? selectedEmail : null);

    if (!email) {
      toast.error('E-Mail nicht gefunden');
      return;
    }

    const currentStarred = email.is_starred === 1 || email.is_starred === true;
    const newStarred = !currentStarred;

    // Optimistically update UI first
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_starred: newStarred ? 1 : 0 } : e))
    );
    if (selectedEmail?.id === id) {
      setSelectedEmail((prev) => ({ ...prev, is_starred: newStarred ? 1 : 0 }));
    }

    setStarToggleLoading(true);
    try {
      await api.put(`/emails/${id}/star`, { is_starred: newStarred });
    } catch (err) {
      // Revert optimistic update on error
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, is_starred: currentStarred ? 1 : 0 } : e))
      );
      if (selectedEmail?.id === id) {
        setSelectedEmail((prev) => ({ ...prev, is_starred: currentStarred ? 1 : 0 }));
      }
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setStarToggleLoading(false);
    }
  };

  const moveToFolder = async (id, folder) => {
    try {
      await api.put(`/emails/${id}/move`, { folder });
      setEmails((prev) => prev.filter((e) => e.id !== id));
      toast.success(`E-Mail nach ${folder} verschoben`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteEmail = async (id) => {
    try {
      await api.delete(`/emails/${id}`);
      setEmails((prev) => prev.filter((e) => e.id !== id));
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
      toast.success('E-Mail gelöscht');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const searchEmails = async (query) => {
    try {
      const response = await api.post('/emails/search', { query, limit: 50 });
      return response.results;
    } catch (err) {
      toast.error('Suche fehlgeschlagen');
      throw err;
    }
  };

  const bulkAction = async (ids, action, value) => {
    try {
      await api.post('/emails/bulk', { ids, action, value });

      // Update local state based on action
      switch (action) {
        case 'mark_read':
          setEmails((prev) =>
            prev.map((e) => (ids.includes(e.id) ? { ...e, is_read: 1 } : e))
          );
          break;
        case 'mark_unread':
          setEmails((prev) =>
            prev.map((e) => (ids.includes(e.id) ? { ...e, is_read: 0 } : e))
          );
          break;
        case 'delete':
        case 'move':
          setEmails((prev) => prev.filter((e) => !ids.includes(e.id)));
          break;
      }

      toast.success(`${ids.length} E-Mail(s) aktualisiert`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return {
    emails,
    total,
    loading,
    error,
    selectedEmail,
    selectedEmailLoading,
    starToggleLoading,
    setSelectedEmail,
    refetch: fetchEmails,
    loadEmail,
    loadThread,
    markAsRead,
    toggleStar,
    moveToFolder,
    deleteEmail,
    searchEmails,
    bulkAction
  };
}

export function useEmailDrafts() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDrafts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/email-drafts');
      setDrafts(response);
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const createDraft = async (data) => {
    try {
      const response = await api.post('/email-drafts', data);
      setDrafts((prev) => [response.draft, ...prev]);
      return response.draft;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateDraft = async (id, data) => {
    try {
      const response = await api.put(`/email-drafts/${id}`, data);
      setDrafts((prev) =>
        prev.map((d) => (d.id === id ? response.draft : d))
      );
      return response.draft;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const deleteDraft = async (id) => {
    try {
      await api.delete(`/email-drafts/${id}`);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const sendDraft = async (id) => {
    try {
      const response = await api.post(`/email-drafts/${id}/send`);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success('E-Mail gesendet');
      return response;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const createReplyDraft = async (emailId, replyAll = false, body = '') => {
    try {
      const response = await api.post('/email-drafts/from-reply', {
        email_id: emailId,
        reply_all: replyAll,
        body
      });
      setDrafts((prev) => [response.draft, ...prev]);
      return response.draft;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  return {
    drafts,
    loading,
    refetch: fetchDrafts,
    createDraft,
    updateDraft,
    deleteDraft,
    sendDraft,
    createReplyDraft
  };
}

export function useEmailStats() {
  const [stats, setStats] = useState({ total: 0, unread: 0, starred: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/emails/stats');
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch email stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
