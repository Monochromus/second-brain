import { createContext, useState, useEffect, useCallback } from 'react';

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

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored) return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [accentColor, setAccentColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accentColor') || 'amber';
    }
    return 'amber';
  });

  const [themeConfigured, setThemeConfigured] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('themeConfigured') === 'true';
    }
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-accent', accentColor);
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const stored = localStorage.getItem('theme');
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setLightTheme = useCallback(() => setTheme('light'), []);
  const setDarkTheme = useCallback(() => setTheme('dark'), []);

  const markThemeConfigured = useCallback(() => {
    localStorage.setItem('themeConfigured', 'true');
    setThemeConfigured(true);
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
