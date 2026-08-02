'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DriveStorage } from '@/lib/google/drive';
import {
  getHighlights,
  saveHighlights,
} from '@/lib/storage/driveStorage';
import type { Highlight, HighlightColor, BookHighlights } from '@/types/highlight';

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------
export interface UseHighlightsReturn {
  highlights: Highlight[];
  loading: boolean;
  addHighlight: (highlight: Highlight) => void;
  removeHighlight: (highlightId: string) => void;
  updateHighlight: (id: string, updates: Partial<Highlight>) => void;
  loadHighlights: (accessToken: string, bookId: string, bookTitle?: string, bookAuthor?: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useHighlights(): UseHighlightsReturn {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);

  // Use refs for stable access in debounced callbacks
  const accessTokenRef = useRef<string | null>(null);
  const bookIdRef = useRef<string | null>(null);
  const bookTitleRef = useRef<string | null>(null);
  const bookAuthorRef = useRef<string | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const highlightsRef = useRef(highlights);
  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // ── Persist highlights to Drive ──────────────────────────────────
  const persistToDrive = useCallback(
    (updatedHighlights: Highlight[]) => {
      const token = accessTokenRef.current;
      const bookId = bookIdRef.current;
      const bookTitle = bookTitleRef.current || undefined;
      const bookAuthor = bookAuthorRef.current || undefined;
      if (!token || !bookId) return;

      // Clear any pending save to coalesce rapid mutations
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        try {
          const drive = new DriveStorage(token);
          const bookHighlights: BookHighlights = {
            bookId,
            bookTitle,
            bookAuthor,
            highlights: updatedHighlights,
          };
          await saveHighlights(drive, bookId, bookHighlights);
        } catch (err) {
          console.error(
            '[useHighlights] Failed to save highlights:',
            err,
          );
        }
      }, 500);
    },
    [],
  );

  // ── Load highlights ──────────────────────────────────────────────
  const loadHighlights = useCallback(
    async (accessToken: string, bookId: string, bookTitle?: string, bookAuthor?: string): Promise<void> => {
      accessTokenRef.current = accessToken;
      bookIdRef.current = bookId;
      if (bookTitle) bookTitleRef.current = bookTitle;
      if (bookAuthor) bookAuthorRef.current = bookAuthor;
      setLoading(true);

      try {
        const drive = new DriveStorage(accessToken);
        const data = await getHighlights(drive, bookId);
        setHighlights(data.highlights);
      } catch (err) {
        console.error('[useHighlights] Failed to load highlights:', err);
        setHighlights([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Add highlight ────────────────────────────────────────────────
  const addHighlight = useCallback(
    (highlight: Highlight): void => {
      setHighlights((prev) => {
        // Prevent duplicates
        if (prev.some((h) => h.id === highlight.id)) return prev;
        const updated = [...prev, highlight];
        persistToDrive(updated);
        return updated;
      });
    },
    [persistToDrive],
  );

  // ── Remove highlight ─────────────────────────────────────────────
  const removeHighlight = useCallback(
    (highlightId: string): void => {
      setHighlights((prev) => {
        const updated = prev.filter((h) => h.id !== highlightId);
        if (updated.length !== prev.length) {
          persistToDrive(updated);
        }
        return updated;
      });
    },
    [persistToDrive],
  );

  // ── Update highlight ───────────────────────────────────────
  const updateHighlight = useCallback(
    (id: string, updates: Partial<Highlight>): void => {
      setHighlights((prev) => {
        const updated = prev.map((h) =>
          h.id === id ? { ...h, ...updates } : h,
        );
        persistToDrive(updated);
        return updated;
      });
    },
    [persistToDrive],
  );

  return {
    highlights,
    loading,
    addHighlight,
    removeHighlight,
    updateHighlight,
    loadHighlights,
  };
}
