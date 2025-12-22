import { createContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.user);
    } catch (error) {
      setUser(null);
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
      setUser(null);
      toast.success('Erfolgreich ausgeloggt');
    } catch (error) {
      setUser(null);
    }
  };

  const updateSettings = async (data) => {
    try {
      const response = await api.put('/auth/settings', data);
      setUser(response.user);
      toast.success('Einstellungen gespeichert');
      return { success: true };
    } catch (error) {
      toast.error(error.message || 'Fehler beim Speichern');
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
