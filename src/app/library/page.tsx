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

  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});
  const [readSortOption, setReadSortOption] = useState<'dateRead' | 'authorFirst' | 'authorLast' | 'title'>('dateRead');

  const sortedBooks = useMemo(() => {
    let filtered = library?.books || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b => 
        (b.title || '').toLowerCase().includes(q) || 
        (b.author && b.author.toLowerCase().includes(q))
      );
    }
    
    const currentSortOption = preferences.librarySortOption || 'recentRead';
    
    return [...filtered].sort((a, b) => {
      switch (currentSortOption) {
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
  }, [library?.books, preferences.librarySortOption, searchQuery]);

  const unreadBooks = useMemo(() => sortedBooks.filter((b) => !b.isRead), [sortedBooks]);
  const readBooks = useMemo(() => {
    const arr = sortedBooks.filter((b) => b.isRead);
    return arr.sort((a, b) => {
      switch (readSortOption) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'authorFirst':
          return (a.author || '').localeCompare(b.author || '');
        case 'authorLast':
          const getLastWord = (str: string) => str.trim().split(' ').pop() || '';
          return getLastWord(a.author || '').localeCompare(getLastWord(b.author || ''));
        case 'dateRead':
        default:
          const aRead = a.finishedAt ? new Date(a.finishedAt).getTime() : (a.lastReadAt ? new Date(a.lastReadAt).getTime() : 0);
          const bRead = b.finishedAt ? new Date(b.finishedAt).getTime() : (b.lastReadAt ? new Date(b.lastReadAt).getTime() : 0);
          return bRead - aRead; // Descending
      }
    });
  }, [sortedBooks, readSortOption]);
  // Protected route: redirect to / if not signed in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  const existingDriveFileIds = useMemo(
    () => new Set((library?.books || []).map((b) => b.originalFileId || b.driveFileId)),
    [library?.books]
  );

  const fetchProgresses = useCallback(async () => {
    if (!driveStorage || !library?.books || library.books.length === 0) return;
    try {
      const promises = library.books.map(book => getReadingProgress(driveStorage, book.id));
      const results = await Promise.allSettled(promises);
      
      const newMap: Record<string, ReadingProgress> = {};
      results.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value) {
          newMap[library.books[i].id] = res.value;
        }
      });
      setProgressMap(newMap);
    } catch (err) {
      console.error(err);
    }
  }, [driveStorage, library?.books]);

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
      updatePreferences({ librarySortOption: 'recentAdded' });
    },
    [refreshLibrary, updatePreferences]
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
  }, [driveStorage]);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const navMenuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (navMenuRef.current && !navMenuRef.current.contains(event.target as Node)) {
        setIsNavMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const userInitials = useMemo(() => {
    if (!session?.user?.name) return '?';
    return session.user.name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [session?.user?.name]);

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

  if (status === 'unauthenticated') {
    return null;
  }

  const isLoading = libraryLoading;

  return (
    <div className={styles.libraryPage}>
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
                  <div className={styles.legalDropdownLinks}>
                    <button className={styles.legalDropdownLink} onClick={() => router.push('/privacy')}>Privacy Policy</button>
                    <span className={styles.legalDropdownDivider}>•</span>
                    <button className={styles.legalDropdownLink} onClick={() => router.push('/terms')}>Terms of Service</button>
                  </div>
                  <button 
                    className={styles.dropdownItemLogout}
                    onClick={() => signOut()}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.content}>
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
                  value={preferences?.librarySortOption || 'recentRead'}
                  onChange={(e) => updatePreferences({ librarySortOption: e.target.value as SortOption })}
                  className={styles.sortSelect}
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
            <div className={styles.customSearchContainer}>
              <div className={styles.customSearchBox}>
                <input
                  type="text"
                  placeholder="Search books by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.customSearchInput}
                />
              </div>
            </div>
          </div>
        </div>

        {isLoading && (library?.books || []).length === 0 && (
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

        {!isLoading && (library?.books || []).length === 0 && (
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

        {(library?.books || []).length > 0 && (
          <>
            {searchQuery.trim() !== '' && sortedBooks.length === 0 && (
              <p className={styles.emptyText}>No books match your search.</p>
            )}
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
                <div className={styles.readSectionHeader}>
                  <h2 className={styles.readSectionTitle}>Read</h2>
                  <div className={styles.readSortContainer}>
                    <label htmlFor="readSort" className={styles.sortLabel}>
                      Sort by:
                    </label>
                    <div className={styles.selectWrapper}>
                      <select
                        id="readSort"
                        className={styles.sortSelect}
                        value={readSortOption}
                        onChange={(e) => setReadSortOption(e.target.value as any)}
                      >
                        <option value="dateRead">Date read</option>
                        <option value="authorFirst">Author (first name)</option>
                        <option value="authorLast">Author (last name)</option>
                        <option value="title">Title</option>
                      </select>
                      <span className={styles.selectIcon} aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
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
