import { createContext, useState, useEffect, useCallback } from 'react';
import { api, setToken, clearToken, getToken } from '../lib/api';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // Only check auth if we have a token
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      setUser(response.user);
    } catch (error) {
      setUser(null);
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      // Save the JWT token
      if (response.token) {
        setToken(response.token);
      }
      setUser(response.user);
      toast.success('Erfolgreich eingeloggt!');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Login fehlgeschlagen');
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, name) => {
    try {
      const response = await api.post('/auth/register', { email, password, name });
      // Save the JWT token
      if (response.token) {
        setToken(response.token);
      }
      setUser(response.user);
      toast.success('Registrierung erfolgreich!');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Registrierung fehlgeschlagen');
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    } finally {
      setUser(null);
      clearToken();
      toast.success('Erfolgreich ausgeloggt');
    }
  };

  const updateSettings = async (data, { silent = false } = {}) => {
    try {
      const response = await api.put('/auth/settings', data);
      setUser(response.user);
      if (!silent) {
        toast.success('Einstellungen gespeichert');
      }
      return { success: true };
    } catch (error) {
      if (!silent) {
        toast.error(error.message || 'Fehler beim Speichern');
      }
      return { success: false, error: error.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateSettings,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
