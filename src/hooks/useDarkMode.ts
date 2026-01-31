/**
 * useDarkMode Hook
 *
 * A custom hook that manages dark mode state with:
 * - System preference detection via prefers-color-scheme
 * - localStorage persistence of user preference
 * - Automatic 'dark' class application to document.documentElement
 * - No flash of wrong theme on initial load
 */

import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface DarkModeReturn {
  /** Whether dark mode is currently active */
  isDark: boolean;
  /** The current theme setting ('light', 'dark', or 'system') */
  theme: Theme;
  /** Toggle between light and dark mode */
  toggle: () => void;
  /** Set dark mode explicitly */
  setDark: (dark: boolean) => void;
  /** Set theme to 'light', 'dark', or 'system' */
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'strategic-canvas-theme';

/**
 * Get the initial theme from localStorage or default to 'system'
 */
function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage might be unavailable
  }

  return 'system';
}

/**
 * Get whether dark mode should be active based on theme setting and system preference
 */
function getIsDark(theme: Theme): boolean {
  if (theme === 'system') {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return theme === 'dark';
}

/**
 * Apply or remove the 'dark' class from the document
 */
function applyDarkClass(isDark: boolean): void {
  if (typeof document === 'undefined') return;

  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useDarkMode(): DarkModeReturn {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [isDark, setIsDark] = useState<boolean>(() => getIsDark(theme));

  // Apply dark class whenever isDark changes
  useEffect(() => {
    applyDarkClass(isDark);
  }, [isDark]);

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Legacy browsers
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, [theme]);

  // Store theme preference in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage might be unavailable
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setIsDark(getIsDark(newTheme));
  }, []);

  const setDark = useCallback((dark: boolean) => {
    setTheme(dark ? 'dark' : 'light');
  }, [setTheme]);

  const toggle = useCallback(() => {
    setDark(!isDark);
  }, [isDark, setDark]);

  return {
    isDark,
    theme,
    toggle,
    setDark,
    setTheme,
  };
}

export default useDarkMode;
