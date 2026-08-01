'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { ReaderPreferences, FontFamily } from '@/types/preferences';
import { DEFAULT_PREFERENCES } from '@/types/preferences';
import { DriveStorage } from '@/lib/google/drive';
import {
  getPreferences,
  savePreferences,
} from '@/lib/storage/driveStorage';

// ---------------------------------------------------------------------------
// Font-family mapping — enum values → actual CSS font stacks
// ---------------------------------------------------------------------------
const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  inter: "var(--font-inter), 'Inter', system-ui, -apple-system, sans-serif",
  georgia: "Georgia, 'Times New Roman', serif",
  literata: "var(--font-literata), 'Literata', Georgia, serif",
  opendyslexic: "'OpenDyslexic', 'Comic Sans MS', sans-serif",
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
};

// ---------------------------------------------------------------------------
// Apply preferences to the DOM as CSS custom properties
// ---------------------------------------------------------------------------
function applyPreferencesToCSS(prefs: ReaderPreferences): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Set theme on the root document
  if (prefs.theme === 'sepia') {
    root.dataset.theme = 'light';
  } else {
    root.dataset.theme = prefs.theme;
  }

  // Reader-specific custom properties
  root.style.setProperty('--reader-font-size', `${prefs.fontSize}px`);
  root.style.setProperty(
    '--reader-font-family',
    FONT_FAMILY_MAP[prefs.fontFamily] ?? FONT_FAMILY_MAP.literata,
  );
  root.style.setProperty('--reader-line-height', `${prefs.lineSpacing}`);
  root.style.setProperty(
    '--reader-paragraph-spacing',
    `${prefs.paragraphSpacing}em`,
  );
  root.style.setProperty(
    '--reader-char-spacing',
    `${prefs.charSpacing}em`,
  );
  root.style.setProperty(
    '--reader-text-align',
    prefs.textAlign ?? 'left'
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
const getInitialPreferences = (): ReaderPreferences => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('buzzyreader-preferences');
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {}
  }
  return DEFAULT_PREFERENCES;
};

export interface UsePreferencesReturn {
  preferences: ReaderPreferences;
  loading: boolean;
  updatePreferences: (partial: Partial<ReaderPreferences>) => void;
}

export function usePreferences(): UsePreferencesReturn {
  const sessionObj = useSession() || {};
  const session = sessionObj.data;
  const [preferences, setPreferences] = useState<ReaderPreferences>(getInitialPreferences);
  const [loading, setLoading] = useState(true);

  const prefsRef = useRef<ReaderPreferences>(preferences);
  useEffect(() => {
    prefsRef.current = preferences;
  }, [preferences]);

  // Debounce timer ref for saving to Drive
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Access token helper
  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  // ── Load preferences on mount / sign-in ──────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!accessToken) {
        // Not signed in — use defaults
        setLoading(false);
        return;
      }

      try {
        const drive = new DriveStorage(accessToken);
        const prefs = await getPreferences(drive);
        if (!cancelled) {
          setPreferences(prefs);
          applyPreferencesToCSS(prefs);
          try {
            localStorage.setItem('buzzyreader-preferences', JSON.stringify(prefs));
          } catch (e) {}
        }
      } catch (err) {
        console.error('[usePreferences] Failed to load preferences:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // ── Apply CSS whenever preferences change ────────────────────────
  useEffect(() => {
    applyPreferencesToCSS(preferences);
  }, [preferences]);

  // ── Debounced save to Drive ──────────────────────────────────────
  const debouncedSave = useCallback(
    (prefs: ReaderPreferences) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        if (!accessToken) return;

        try {
          const drive = new DriveStorage(accessToken);
          await savePreferences(drive, prefs);
        } catch (err) {
          console.error('[usePreferences] Failed to save preferences:', err);
        }
      }, 1500);
    },
    [accessToken],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // ── Public update method ─────────────────────────────────────────
  const updatePreferences = useCallback(
    (partial: Partial<ReaderPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...partial };
        applyPreferencesToCSS(next);
        debouncedSave(next);
        try {
          localStorage.setItem('buzzyreader-preferences', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
    },
    [debouncedSave],
  );

  return { preferences, loading, updatePreferences };
}
