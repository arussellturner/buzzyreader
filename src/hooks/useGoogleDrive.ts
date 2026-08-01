'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { DriveStorage } from '@/lib/google/drive';
import {
  getLibrary,
  saveLibrary,
} from '@/lib/storage/driveStorage';
import type { Book, Library } from '@/types/book';

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------
export interface UseGoogleDriveReturn {
  library: Library | null;
  loading: boolean;
  error: string | null;
  addBook: (file: { id: string; name: string }) => Promise<Book>;
  removeBook: (bookId: string) => Promise<void>;
  updateBook: (updatedBook: Book) => Promise<void>;
  loadEpub: (driveFileId: string) => Promise<ArrayBuffer>;
  refreshLibrary: () => Promise<void>;
  driveStorage: DriveStorage | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useGoogleDrive(): UseGoogleDriveReturn {
  const sessionObj = useSession() || {};
  const session = sessionObj.data;
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const accessToken = (session as { accessToken?: string } | null)?.accessToken;

  // Stable DriveStorage instance — recreated only when accessToken changes
  const drive = useMemo(
    () => (accessToken ? new DriveStorage(accessToken) : null),
    [accessToken],
  );

  const libraryRef = useRef(library);
  useEffect(() => {
    libraryRef.current = library;
  }, [library]);

  // ── Load library on mount / sign-in ──────────────────────────────
  useEffect(() => {
    if (!drive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const lib = await getLibrary(drive);
        if (!cancelled) setLibrary(lib);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : 'Failed to load library';
          setError(msg);
          console.error('[useGoogleDrive] Load error:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [drive]);

  // ── Refresh ──────────────────────────────────────────────────────
  const refreshLibrary = useCallback(async () => {
    if (!drive) return;

    setLoading(true);
    setError(null);

    try {
      const lib = await getLibrary(drive);
      setLibrary(lib);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to refresh library';
      setError(msg);
      console.error('[useGoogleDrive] Refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [drive]);

  // ── Add book ─────────────────────────────────────────────────────
  const addBook = useCallback(
    async (file: { id: string; name: string }): Promise<Book> => {
      if (!drive) throw new Error('Not authenticated');

      const newBook: Book = {
        id: crypto.randomUUID(),
        driveFileId: file.id,
        title: file.name.replace(/\.epub$/i, ''),
        author: 'Unknown Author',
        addedAt: new Date().toISOString(),
      };

      // Optimistic update
      setLibrary((prev) => {
        const updated: Library = {
          books: [...(prev?.books ?? []), newBook],
          lastSynced: new Date().toISOString(),
        };
        return updated;
      });

      try {
        // Persist the full library (including new book) to Drive
        const current = libraryRef.current;
        const updatedLib: Library = {
          books: [...(current?.books ?? []), newBook],
          lastSynced: new Date().toISOString(),
        };
        await saveLibrary(drive, updatedLib);
      } catch (err) {
        // Rollback on failure
        setLibrary((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            books: prev.books.filter((b) => b.id !== newBook.id),
          };
        });
        const msg =
          err instanceof Error ? err.message : 'Failed to add book';
        setError(msg);
        throw err;
      }

      return newBook;
    },
    [drive],
  );

  // ── Remove book ──────────────────────────────────────────────────
  const removeBook = useCallback(
    async (bookId: string): Promise<void> => {
      if (!drive) throw new Error('Not authenticated');

      const previousLibrary = libraryRef.current;

      // Optimistic update
      setLibrary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          books: prev.books.filter((b) => b.id !== bookId),
          lastSynced: new Date().toISOString(),
        };
      });

      try {
        const updatedLib: Library = {
          books: (previousLibrary?.books ?? []).filter((b) => b.id !== bookId),
          lastSynced: new Date().toISOString(),
        };
        await saveLibrary(drive, updatedLib);
      } catch (err) {
        // Rollback on failure
        setLibrary(previousLibrary);
        const msg =
          err instanceof Error ? err.message : 'Failed to remove book';
        setError(msg);
        throw err;
      }
    },
    [drive],
  );

  // ── Load ePub content ────────────────────────────────────────────
  const loadEpub = useCallback(
    async (driveFileId: string): Promise<ArrayBuffer> => {
      if (!drive) throw new Error('Not authenticated');

      try {
        return await drive.getEpubFileContent(driveFileId);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to load ePub';
        setError(msg);
        throw err;
      }
    },
    [drive],
  );

  // ── Update book ──────────────────────────────────────────────────
  const updateBook = useCallback(
    async (updatedBook: Book): Promise<void> => {
      if (!drive) throw new Error('Not authenticated');

      const previousLibrary = libraryRef.current;

      // Optimistic update
      setLibrary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          books: prev.books.map((b) => b.id === updatedBook.id ? updatedBook : b),
          lastSynced: new Date().toISOString(),
        };
      });

      try {
        const updatedLib: Library = {
          books: (previousLibrary?.books ?? []).map((b) => b.id === updatedBook.id ? updatedBook : b),
          lastSynced: new Date().toISOString(),
        };
        await saveLibrary(drive, updatedLib);
      } catch (err) {
        // Rollback on failure
        setLibrary(previousLibrary);
        const msg = err instanceof Error ? err.message : 'Failed to update book';
        setError(msg);
        throw err;
      }
    },
    [drive],
  );

  return {
    library,
    loading,
    error,
    addBook,
    removeBook,
    updateBook,
    loadEpub,
    refreshLibrary,
    driveStorage: drive,
  };
}
