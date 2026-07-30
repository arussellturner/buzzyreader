'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import BookCard from '@/components/Library/BookCard';
import AddBookModal from '@/components/Library/AddBookModal';
import type { Book } from '@/types/book';
import styles from './library.module.css';

const SKELETON_COUNT = 8;

export default function LibraryPage() {
  const router = useRouter();
  const sessionObj = useSession() || {};
  const session = sessionObj.data;
  const status = sessionObj.status || 'unauthenticated';
  const { library, loading: libraryLoading, refreshLibrary } = useGoogleDrive();
  const books = library?.books || [];
  const [isModalOpen, setIsModalOpen] = useState(false);

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
            <span className={styles.logoIcon} aria-hidden="true">
              🐝
            </span>
            <span className={styles.logoText}>BuzzyReader</span>
          </a>

          <div className={styles.headerRight}>
            <div className={styles.userMenu}>
              {session?.user?.image ? (
                <img
                  className={styles.userAvatar}
                  src={session.user.image}
                  alt={session.user.name || 'User avatar'}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className={styles.userAvatarPlaceholder} aria-hidden="true">
                  {userInitials}
                </div>
              )}
              <span className={styles.userName}>{session?.user?.name}</span>
              <button
                className={styles.signOutButton}
                onClick={() => signOut()}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className={styles.content}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <h1 className={styles.pageTitle}>
            My Library
            {!isLoading && books.length > 0 && (
              <span className={styles.bookCount}>{books.length} book{books.length !== 1 ? 's' : ''}</span>
            )}
          </h1>
          <button
            className={styles.addButton}
            onClick={handleOpenModal}
            type="button"
          >
            <span className={styles.addButtonIcon} aria-hidden="true">
              +
            </span>
            Add Book
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
              Your ePub files will appear here as beautiful book cards.
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
    </div>
  );
}
