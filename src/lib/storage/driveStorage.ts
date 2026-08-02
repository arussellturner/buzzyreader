import { DriveStorage } from '@/lib/google/drive';
import type { Library } from '@/types/book';
import type { BookHighlights } from '@/types/highlight';
import type { ReaderPreferences, } from '@/types/preferences';
import { DEFAULT_PREFERENCES } from '@/types/preferences';
import type { ReadingProgress } from '@/types/progress';

import type { Wishlist } from '@/types/wishlist';

// ---------------------------------------------------------------------------
// File name constants — keep in sync with the Drive folder structure
// ---------------------------------------------------------------------------
const FILES = {
  LIBRARY: 'library.json',
  PREFERENCES: 'preferences.json',
  WISHLIST: 'wishlist.json',
  PROGRESS_PREFIX: 'progress_',
  HIGHLIGHTS_PREFIX: 'highlights_',
} as const;

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------

/**
 * Fetch the user's book library from Drive app data.
 * Returns an empty library if no data exists yet.
 */
export async function getLibrary(drive: DriveStorage): Promise<Library> {
  const library = await drive.readJsonFile<Library>(FILES.LIBRARY);
  return library ?? { books: [], lastSynced: new Date().toISOString() };
}

/**
 * Persist the user's book library to Drive app data.
 */
export async function saveLibrary(
  drive: DriveStorage,
  library: Library
): Promise<void> {
  library.lastSynced = new Date().toISOString();
  await drive.writeJsonFile(FILES.LIBRARY, library);
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

/**
 * Fetch the user's reader preferences from Drive app data.
 * Falls back to DEFAULT_PREFERENCES if nothing is stored yet.
 */
export async function getPreferences(
  drive: DriveStorage
): Promise<ReaderPreferences> {
  const prefs = await drive.readJsonFile<ReaderPreferences>(FILES.PREFERENCES);
  if (!prefs) {
    return { ...DEFAULT_PREFERENCES };
  }
  // Merge with defaults so that any newly-added preference keys are populated
  return { ...DEFAULT_PREFERENCES, ...prefs };
}

/**
 * Persist the user's reader preferences to Drive app data.
 */
export async function savePreferences(
  drive: DriveStorage,
  prefs: ReaderPreferences
): Promise<void> {
  await drive.writeJsonFile(FILES.PREFERENCES, prefs);
}

// ---------------------------------------------------------------------------
// Reading Progress
// ---------------------------------------------------------------------------

/**
 * Build the progress file name for a specific book.
 */
function progressFileName(bookId: string): string {
  return `${FILES.PROGRESS_PREFIX}${bookId}.json`;
}

/**
 * Fetch the reading progress for a specific book.
 * Returns null if no progress has been saved yet.
 */
export async function getReadingProgress(
  drive: DriveStorage,
  bookId: string
): Promise<ReadingProgress | null> {
  const driveResult = await drive.readJsonFile<ReadingProgress>(progressFileName(bookId));
  
  let localResult: ReadingProgress | null = null;
  if (typeof window !== 'undefined') {
    try {
      const localStr = localStorage.getItem(progressFileName(bookId));
      if (localStr) localResult = JSON.parse(localStr);
    } catch (e) {}
  }
  
  if (!driveResult && !localResult) return null;
  if (!driveResult) return localResult;
  if (!localResult) return driveResult;
  
  const driveTime = new Date(driveResult.lastRead || 0).getTime();
  const localTime = new Date(localResult.lastRead || 0).getTime();
  return localTime > driveTime ? localResult : driveResult;
}

/**
 * Persist the reading progress for a specific book.
 */
export async function saveReadingProgress(
  drive: DriveStorage,
  bookId: string,
  progress: ReadingProgress
): Promise<void> {
  progress.lastRead = new Date().toISOString();
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(progressFileName(bookId), JSON.stringify(progress));
    } catch (e) {}
  }
  
  await drive.writeJsonFile(progressFileName(bookId), progress);
}

// ---------------------------------------------------------------------------
// Highlights
// ---------------------------------------------------------------------------

/**
 * Build the highlights file name for a specific book.
 */
function highlightsFileName(bookId: string): string {
  return `${FILES.HIGHLIGHTS_PREFIX}${bookId}.json`;
}

/**
 * Fetch all highlights for a specific book.
 * Returns an empty BookHighlights if none exist yet.
 */
export async function getHighlights(
  drive: DriveStorage,
  bookId: string
): Promise<BookHighlights> {
  const data = await drive.readJsonFile<BookHighlights>(
    highlightsFileName(bookId)
  );
  return data ?? { bookId, highlights: [] };
}

/**
 * Persist highlights for a specific book.
 */
export async function saveHighlights(
  drive: DriveStorage,
  bookId: string,
  highlights: BookHighlights
): Promise<void> {
  await drive.writeJsonFile(highlightsFileName(bookId), highlights);
}

/**
 * Fetch highlights for every book in the library.
 * Loads them in parallel for performance.
 */
export async function getAllHighlights(
  drive: DriveStorage,
  library: Library
): Promise<BookHighlights[]> {
  const highlightFiles = await drive.listAppFolderFiles(FILES.HIGHLIGHTS_PREFIX);
  
  // Extract book IDs from the filenames
  const bookIds = highlightFiles
    .map(file => {
      const match = file.name.match(/^highlights_(.+)\.json$/);
      return match ? match[1] : null;
    })
    .filter((id): id is string => id !== null);

  const results = await Promise.allSettled(
    bookIds.map((bookId) => getHighlights(drive, bookId))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<BookHighlights> =>
        r.status === 'fulfilled'
    )
    .map((r) => r.value)
    .filter((bh) => bh.highlights.length > 0);
}

// ---------------------------------------------------------------------------
// Wishlist
// ---------------------------------------------------------------------------

/**
 * Fetch the user's wishlist from Drive app data.
 * Returns an empty wishlist if no data exists yet.
 */
export async function getWishlist(drive: DriveStorage): Promise<Wishlist> {
  const wishlist = await drive.readJsonFile<Wishlist>(FILES.WISHLIST);
  return wishlist ?? { items: [] };
}

/**
 * Persist the user's wishlist to Drive app data.
 */
export async function saveWishlist(
  drive: DriveStorage,
  wishlist: Wishlist
): Promise<void> {
  await drive.writeJsonFile(FILES.WISHLIST, wishlist);
}
