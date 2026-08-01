'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import styles from './UI.module.css';

interface ThemeToggleProps {
  className?: string;
}

type ThemeMode = 'dark' | 'light' | 'sepia' | 'black';

const THEME_CYCLE: ThemeMode[] = ['light', 'dark', 'black'];

const THEME_ICONS: Record<ThemeMode, React.ReactNode> = {
  dark: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  sepia: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  black: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
};

const THEME_LABELS: Record<ThemeMode, string> = {
  dark: 'Dark mode',
  light: 'Light mode',
  sepia: 'Sepia mode',
  black: 'Black mode',
};

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>('dark');

  // Read initial theme from DOM
  useEffect(() => {
    const current = document.documentElement.dataset.theme as ThemeMode | undefined;
    if (current && THEME_CYCLE.includes(current)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(current);
    }
  }, []);

  const handleSetTheme = useCallback((next: ThemeMode) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;

    // Persist to localStorage
    try {
      const stored = localStorage.getItem('buzzyreader-preferences');
      if (stored) {
        const prefs = JSON.parse(stored);
        prefs.theme = next;
        localStorage.setItem('buzzyreader-preferences', JSON.stringify(prefs));
      } else {
        localStorage.setItem(
          'buzzyreader-preferences',
          JSON.stringify({ theme: next })
        );
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  return (
    <div className={`${styles.themeSelectorGroup} ${className ?? ''}`}>
      {THEME_CYCLE.map((mode) => (
        <button
          key={mode}
          className={`${styles.themeSelectorButton} ${theme === mode ? styles.themeSelectorButtonActive : ''}`}
          onClick={() => handleSetTheme(mode)}
          aria-label={THEME_LABELS[mode]}
          title={THEME_LABELS[mode]}
        >
          {THEME_ICONS[mode]}
        </button>
      ))}
    </div>
  );
}
