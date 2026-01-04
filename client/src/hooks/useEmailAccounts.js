import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export function useEmailAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/email-accounts');
      setAccounts(response);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const response = await api.get('/email-accounts/providers');
      setProviders(response);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchProviders();
  }, [fetchAccounts, fetchProviders]);

  const addAccount = async (data) => {
    try {
      const response = await api.post('/email-accounts', data);
      setAccounts((prev) => [...prev, response.account]);
      toast.success(response.message || 'E-Mail-Account verbunden');
      return response.account;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const updateAccount = async (id, data, showToast = false) => {
    try {
      const response = await api.put(`/email-accounts/${id}`, data);
      setAccounts((prev) =>
        prev.map((a) => (a.id === id ? response.account : a))
      );
      if (showToast) {
        toast.success(response.message || 'Account aktualisiert');
      }
      return response.account;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const removeAccount = async (id) => {
    try {
      await api.delete(`/email-accounts/${id}`);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      toast.success('E-Mail-Account entfernt');
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const testConnection = async (id) => {
    try {
      const response = await api.post(`/email-accounts/${id}/test`);
      if (response.success) {
        toast.success('Verbindung erfolgreich');
      }
      return response;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  const syncAccount = async (id, full = false) => {
    try {
      const response = await api.post(`/email-accounts/${id}/sync`, { full });
      toast.success(response.message || 'Synchronisierung abgeschlossen');
      // Refresh account to get updated last_sync
      await fetchAccounts();
      return response;
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
  };

  return {
    accounts,
    providers,
    loading,
    error,
    refetch: fetchAccounts,
    addAccount,
    updateAccount,
    removeAccount,
    testConnection,
    syncAccount
  };
}
