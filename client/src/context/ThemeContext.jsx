import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

export const ThemeContext = createContext(null);

export const ACCENT_COLORS = [
  { id: 'amber', name: 'Bernstein', color: '#D97706', darkColor: '#F59E0B' },
  { id: 'orange', name: 'Orange', color: '#EA580C', darkColor: '#F97316' },
  { id: 'red', name: 'Rot', color: '#DC2626', darkColor: '#EF4444' },
  { id: 'rose', name: 'Rose', color: '#E11D48', darkColor: '#F43F5E' },
  { id: 'pink', name: 'Pink', color: '#DB2777', darkColor: '#EC4899' },
  { id: 'purple', name: 'Lila', color: '#9333EA', darkColor: '#A855F7' },
  { id: 'indigo', name: 'Indigo', color: '#4F46E5', darkColor: '#6366F1' },
  { id: 'blue', name: 'Blau', color: '#2563EB', darkColor: '#3B82F6' },
  { id: 'teal', name: 'Petrol', color: '#0D9488', darkColor: '#14B8A6' },
  { id: 'green', name: 'Grün', color: '#16A34A', darkColor: '#22C55E' }
];

// Get initial theme from localStorage or system preference (for fast initial render)
function getInitialTheme() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function getInitialAccent() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accentColor') || 'amber';
  }
  return 'amber';
}

// Get initial themeConfigured from localStorage
function getInitialThemeConfigured() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('themeConfigured') === 'true';
  }
  return false;
}

export function ThemeProvider({ children }) {
  const { user, loading, updateSettings } = useAuth();
  const [theme, setThemeState] = useState(getInitialTheme);
  const [accentColor, setAccentColorState] = useState(getInitialAccent);
  const [themeConfigured, setThemeConfigured] = useState(getInitialThemeConfigured);
  const isInitialized = useRef(false);
  const saveTimeoutRef = useRef(null);

  // Sync theme settings from user when user logs in or changes
  useEffect(() => {
    // Don't do anything while still loading auth state
    if (loading) return;

    if (user) {
      // User is logged in - always use server-side settings
      const userSettings = user.settings || {};
      const { theme: userTheme, accentColor: userAccent, themeConfigured: userConfigured } = userSettings;

      if (userTheme) {
        setThemeState(userTheme);
        localStorage.setItem('theme', userTheme);
      }

      if (userAccent) {
        setAccentColorState(userAccent);
        localStorage.setItem('accentColor', userAccent);
      }

      // For new users or users who haven't configured theme yet, show setup modal
      // The key check is on userConfigured === true, not just truthy
      if (userConfigured === true) {
        setThemeConfigured(true);
        localStorage.setItem('themeConfigured', 'true');
      } else {
        // New user or user hasn't configured theme - show modal
        setThemeConfigured(false);
        localStorage.removeItem('themeConfigured');
      }

      isInitialized.current = true;
    } else {
      // No user logged in - reset to localStorage defaults but don't show modal
      // The modal should only show after successful login/registration
      const localConfigured = localStorage.getItem('themeConfigured') === 'true';
      setThemeConfigured(localConfigured);
    }
  }, [user, loading]);

  // Apply theme class to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply accent color to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-accent', accentColor);
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Only auto-switch if user hasn't configured theme yet
      if (!themeConfigured && !user?.settings?.themeConfigured) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeConfigured, user]);

  // Save settings to server (debounced, silent)
  const saveToServer = useCallback((newSettings) => {
    if (!user || !updateSettings) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save to avoid too many requests
    saveTimeoutRef.current = setTimeout(async () => {
      const currentSettings = user.settings || {};
      await updateSettings({
        settings: {
          ...currentSettings,
          ...newSettings
        }
      }, { silent: true });
    }, 500);
  }, [user, updateSettings]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    saveToServer({ theme: newTheme });
  }, [saveToServer]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [theme, setTheme]);

  const setLightTheme = useCallback(() => setTheme('light'), [setTheme]);
  const setDarkTheme = useCallback(() => setTheme('dark'), [setTheme]);

  const setAccentColor = useCallback((newAccent) => {
    setAccentColorState(newAccent);
    localStorage.setItem('accentColor', newAccent);
    saveToServer({ accentColor: newAccent });
  }, [saveToServer]);

  const markThemeConfigured = useCallback(() => {
    setThemeConfigured(true);
    localStorage.setItem('themeConfigured', 'true');

    // Save all current settings to server (silent)
    if (user && updateSettings) {
      const currentSettings = user.settings || {};
      updateSettings({
        settings: {
          ...currentSettings,
          theme,
          accentColor,
          themeConfigured: true
        }
      }, { silent: true });
    }
  }, [user, updateSettings, theme, accentColor]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === 'dark',
        toggleTheme,
        setLightTheme,
        setDarkTheme,
        setTheme,
        accentColor,
        setAccentColor,
        themeConfigured,
        markThemeConfigured,
        accentColors: ACCENT_COLORS
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
