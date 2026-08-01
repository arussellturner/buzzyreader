'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import ThemeToggle from '@/components/UI/ThemeToggle';
import PageNavDropdown from '@/components/UI/PageNavDropdown';
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
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
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

  const unreadBooks = useMemo(() => books.filter((b) => !b.isRead), [books]);
  const readBooks = useMemo(() => books.filter((b) => b.isRead), [books]);

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
    // Actually progress doesn't update the book object, but it's good enough.
  }, [driveStorage]);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const navMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (navMenuRef.current && !navMenuRef.current.contains(event.target as Node)) {
        setIsNavMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            <div className={styles.userMenuContainer} ref={userMenuRef}>
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
                  <div style={{ padding: '0 8px' }}>
                    <ThemeToggle 
                      theme={preferences?.theme}
                      onThemeChange={(t) => updatePreferences({ theme: t as import('@/types/preferences').ThemeMode })}
                    />
                  </div>
                  <button 
                    className={styles.dropdownItemLogout}
                    onClick={() => signOut()}
                  >
                    Log out
                  </button>
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
          <div className={styles.toolbarTopRow}>
            <PageNavDropdown activePage="library" />
            <button className={styles.addButton} onClick={handleOpenModal} aria-label="Add Book" title="Add Book">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
          <div className={styles.controlsRow}>
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
          </div>
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

        {/* Book grids */}
        {!isLoading && books.length > 0 && (
          <>
            {unreadBooks.length > 0 && (
              <div className={styles.bookGrid}>
                {unreadBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    progress={progressMap[book.id]}
                    onOpenDetails={handleOpenDetails}
                  />
                ))}
              </div>
            )}

            {readBooks.length > 0 && (
              <div className={styles.readSection}>
                <h2 className={styles.readSectionTitle}>Read</h2>
                <div className={styles.bookGrid}>
                  {readBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      progress={progressMap[book.id]}
                      onOpenDetails={handleOpenDetails}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
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
