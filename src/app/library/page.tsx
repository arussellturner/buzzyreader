'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { usePreferences } from '@/hooks/usePreferences';
import BookCard from '@/components/Library/BookCard';
import AddBookModal from '@/components/Library/AddBookModal';
import BookDetailsModal from '@/components/Library/BookDetailsModal';
import { getReadingProgress, saveReadingProgress } from '@/lib/storage/driveStorage';
import type { Book } from '@/types/book';
import type { ReadingProgress } from '@/types/progress';
import styles from './library.module.css';

const SKELETON_COUNT = 8;

type SortOption = 'title' | 'authorFirst' | 'authorLast' | 'recentRead' | 'recentAdded';

export default function LibraryPage() {
  const router = useRouter();
  const sessionObj = useSession() || {};
  const session = sessionObj.data;
  const status = sessionObj.status || 'unauthenticated';
  const { library, loading: libraryLoading, refreshLibrary, updateBook, removeBook, driveStorage } = useGoogleDrive();
  const { preferences, updatePreferences } = usePreferences();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsBook, setDetailsBook] = useState<Book | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>('recentRead');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});

  const books = useMemo(() => {
    const libraryBooks = library?.books || [];
    return [...libraryBooks].sort((a, b) => {
      switch (sortOption) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'authorFirst':
          return (a.author || '').localeCompare(b.author || '');
        case 'authorLast':
          const getLastWord = (str: string) => str.trim().split(' ').pop() || '';
          return getLastWord(a.author || '').localeCompare(getLastWord(b.author || ''));
        case 'recentRead':
          const aRead = a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0;
          const bRead = b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0;
          return bRead - aRead; // Descending
        case 'recentAdded':
        default:
          const aAdded = a.addedAt ? new Date(a.addedAt).getTime() : 0;
          const bAdded = b.addedAt ? new Date(b.addedAt).getTime() : 0;
          return bAdded - aAdded; // Descending
      }
    });
  }, [library?.books, sortOption]);

  // Protected route: redirect to / if not signed in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  const existingDriveFileIds = useMemo(
    () => new Set(books.map((b) => b.driveFileId)),
    [books]
  );

  const fetchProgresses = useCallback(async () => {
    if (!driveStorage || books.length === 0) return;
    try {
      const promises = books.map(book => getReadingProgress(driveStorage, book.id));
      const results = await Promise.allSettled(promises);
      
      const newMap: Record<string, ReadingProgress> = {};
      results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value) {
          newMap[books[i].id] = res.value;
        }
      });
      setProgressMap(newMap);
    } catch (err) {
      console.error(err);
    }
  }, [driveStorage, books]);

  // Fetch progresses whenever books or driveStorage changes
  useEffect(() => {
    fetchProgresses();
  }, [fetchProgresses]);

  // Force refresh data when the page becomes visible/focused
  useEffect(() => {
    const handleFocus = () => {
      refreshLibrary();
      fetchProgresses();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handleFocus();
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('visibilitychange', handleFocus);
    };
  }, [refreshLibrary, fetchProgresses]);

  const handleBookAdded = useCallback(
    (_book: Book) => {
      refreshLibrary();
    },
    [refreshLibrary]
  );

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleOpenDetails = useCallback((book: Book) => {
    setDetailsBook(book);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsBook(null);
  }, []);

  const handleSaveBookDetails = useCallback(async (updatedBook: Book) => {
    await updateBook(updatedBook);
  }, [updateBook]);

  const handleDeleteBook = useCallback(async (bookId: string) => {
    await removeBook(bookId);
    setDetailsBook(null);
  }, [removeBook]);

  const handleResetProgress = useCallback(async (bookId: string) => {
    if (!driveStorage) return;
    await saveReadingProgress(driveStorage, bookId, {
      bookId,
      cfi: '',
      percentage: 0,
      lastRead: new Date().toISOString()
    });
    // Trigger refresh to update "Recently read" if we fetched progress.
    // Actually progress doesn't update the book object, but it's good enough.
  }, [driveStorage]);

  const toggleTheme = useCallback(() => {
    const themes = ['light', 'dark', 'black'] as const;
    let currentIdx = themes.indexOf(preferences.theme as any);
    if (currentIdx === -1) currentIdx = 0;
    const nextIdx = (currentIdx + 1) % themes.length;
    updatePreferences({ theme: themes[nextIdx] });
  }, [preferences.theme, updatePreferences]);

  // Get user initials for avatar placeholder
  const userInitials = useMemo(() => {
    if (!session?.user?.name) return '?';
    return session.user.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [session?.user?.name]);

  // Show nothing while checking auth
  if (status === 'loading') {
    return (
      <div className={styles.libraryPage}>
        <div className={styles.content}>
          <div className={styles.skeletonGrid}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={i} className={styles.skeleton}>
                <div className={styles.skeletonCover} />
                <div className={styles.skeletonInfo}>
                  <div className={styles.skeletonTitle} />
                  <div className={styles.skeletonAuthor} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not signed in (redirect will happen)
  if (status === 'unauthenticated') {
    return null;
  }

  const isLoading = libraryLoading;

  return (
    <div className={styles.libraryPage}>
      {/* ── Sticky Header ── */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <a href="/library" className={styles.logoSection}>
            <img src="/logo.png" alt="" className={styles.logoIcon} width={28} height={28} />
            <span className={styles.logoText}>BuzzyReader</span>
          </a>

          <div className={styles.headerRight}>
            <button className={styles.addBookIconBtn} onClick={handleOpenModal} aria-label="Add Book" title="Add Book">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>

            <div className={styles.userMenuContainer}>
              <button 
                className={styles.avatarButton} 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-label="User Menu"
              >
                {session?.user?.image ? (
                  <img
                    className={styles.userAvatar}
                    src={session.user.image}
                    alt="User avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={styles.userAvatarPlaceholder} aria-hidden="true">
                    {userInitials}
                  </div>
                )}
              </button>

              {isUserMenuOpen && (
                <div className={styles.userMenuDropdown}>
                  <button 
                    className={styles.dropdownItem}
                    onClick={() => router.push('/highlights')}
                  >
                    Highlights
                  </button>
                  <button 
                    className={styles.dropdownItem}
                    onClick={() => router.push('/wishlist')}
                  >
                    Wishlist
                  </button>
                  <button 
                    className={styles.dropdownItemLogout}
                    onClick={() => signOut()}
                  >
                    Log out
                  </button>
                  <div className={styles.dropdownDivider} />
                  <div className={styles.legalDropdownLinks}>
                    <button className={styles.legalDropdownLink} onClick={() => router.push('/privacy')}>Privacy Policy</button>
                    <span className={styles.legalDropdownDivider}>•</span>
                    <button className={styles.legalDropdownLink} onClick={() => router.push('/terms')}>Terms of Service</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className={styles.content}>
        {/* Sub Nav / Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.sortOptions}>
            <label htmlFor="sort-select" className={styles.sortLabel}>Sort by:</label>
            <div className={styles.selectWrapper}>
              <select
                id="sort-select"
                className={styles.sortSelect}
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
              >
                <option value="title">Title</option>
                <option value="authorFirst">Author (First name)</option>
                <option value="authorLast">Author (Last name)</option>
                <option value="recentRead">Last opened</option>
                <option value="recentAdded">Date added</option>
              </select>
              <svg className={styles.selectIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>
          <button className={styles.themeToggle} onClick={toggleTheme} aria-label="Toggle theme">
            {preferences.theme === 'dark' ? (
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            ) : preferences.theme === 'light' ? (
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            ) : (
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            )}
          </button>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className={styles.skeletonGrid}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <div key={i} className={styles.skeleton}>
                <div className={styles.skeletonCover} />
                <div className={styles.skeletonInfo}>
                  <div className={styles.skeletonTitle} />
                  <div className={styles.skeletonAuthor} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && books.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIllustration} aria-hidden="true">
              📚
            </div>
            <h2 className={styles.emptyTitle}>Your library is empty</h2>
            <p className={styles.emptyText}>
              Add your first book from Google Drive and start reading!
            </p>
            <button
              className={styles.emptyAddButton}
              onClick={handleOpenModal}
              type="button"
            >
              <span className={styles.addButtonIcon} aria-hidden="true">
                +
              </span>
              Add Your First Book
            </button>
          </div>
        )}

        {/* Book grid */}
        {!isLoading && books.length > 0 && (
          <div className={styles.bookGrid}>
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                progress={progressMap[book.id]}
                onOpenDetails={handleOpenDetails}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Book Modal */}
      <AddBookModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onBookAdded={handleBookAdded}
        existingDriveFileIds={existingDriveFileIds}
      />

      <BookDetailsModal
        isOpen={!!detailsBook}
        onClose={handleCloseDetails}
        book={detailsBook}
        onSave={handleSaveBookDetails}
        onDelete={handleDeleteBook}
        onResetProgress={handleResetProgress}
      />
    </div>
  );
}
