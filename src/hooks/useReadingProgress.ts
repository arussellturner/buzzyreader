'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DriveStorage } from '@/lib/google/drive';
import {
  getReadingProgress,
  saveReadingProgress,
} from '@/lib/storage/driveStorage';
import type { ReadingProgress } from '@/types/progress';

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------
export interface UseReadingProgressReturn {
  progress: ReadingProgress | null;
  loading: boolean;
  updateProgress: (location: string, percentage: number | null) => void;
  loadProgress: (accessToken: string, bookId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useReadingProgress(): UseReadingProgressReturn {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);
  const [loading, setLoading] = useState(false);

  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const bookIdRef = useRef<string | null>(null);

  // Cleanup debounce timer on unmount and flush pending save
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        const token = accessTokenRef.current;
        const bookId = bookIdRef.current;
        const currentProgress = progressRef.current;
        if (token && bookId && currentProgress) {
          const drive = new DriveStorage(token);
          saveReadingProgress(drive, bookId, currentProgress).catch(err => 
            console.error('[useReadingProgress] Failed to flush progress on unmount:', err)
          );
        }
      }
    };
  }, []);

  // ── Load progress ────────────────────────────────────────────────
  const loadProgress = useCallback(
    async (accessToken: string, bookId: string): Promise<void> => {
      accessTokenRef.current = accessToken;
      bookIdRef.current = bookId;
      setLoading(true);

      try {
        const drive = new DriveStorage(accessToken);
        const saved = await getReadingProgress(drive, bookId);
        setProgress(
          saved ?? {
            bookId,
            cfi: '',
            percentage: 0,
            lastRead: new Date().toISOString(),
          },
        );
      } catch (err) {
        console.error('[useReadingProgress] Failed to load progress:', err);
        // Initialize with empty progress on error
        setProgress({
          bookId,
          cfi: '',
          percentage: 0,
          lastRead: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Update progress (optimistic + debounced save) ────────────────
  const updateProgress = useCallback(
    (location: string, percentage: number | null): void => {
      const bookId = bookIdRef.current;
      if (!bookId) return;

      const safePercentage = percentage !== null && !isNaN(percentage) 
        ? Math.min(1, Math.max(0, percentage))
        : (progressRef.current?.percentage ?? 0);

      const updated: ReadingProgress = {
        bookId,
        cfi: location,
        percentage: safePercentage,
        lastRead: new Date().toISOString(),
        currentPage: progressRef.current?.currentPage,
        totalPages: progressRef.current?.totalPages,
      };

      // Update local state immediately
      setProgress(updated);

      // Debounced save to Drive (2 seconds)
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        const token = accessTokenRef.current;
        if (!token) return;

        try {
          const drive = new DriveStorage(token);
          await saveReadingProgress(drive, bookId, updated);
        } catch (err) {
          console.error(
            '[useReadingProgress] Failed to save progress:',
            err,
          );
        }
      }, 2000);
    },
    [],
  );

  return { progress, loading, updateProgress, loadProgress };
}
