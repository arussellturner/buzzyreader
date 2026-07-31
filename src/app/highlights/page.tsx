'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import HighlightCard from '@/components/Highlights/HighlightCard';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { BookHighlights } from '@/types/highlight';
import { getAllHighlights } from '@/lib/storage/driveStorage';
import styles from './highlights.module.css';
import libraryStyles from '../library/library.module.css';

export default function HighlightsPage() {
  const sessionObj = useSession();
  const session = sessionObj?.data;
  const status = sessionObj?.status || 'unauthenticated';
  const router = useRouter();
  const { library, loading: libraryLoading, driveStorage } = useGoogleDrive();
  
  const [allHighlights, setAllHighlights] = useState<BookHighlights[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchHighlights() {
      if (!driveStorage || !library || libraryLoading) return;
      
      try {
        setLoading(true);
        const highlightsData = await getAllHighlights(driveStorage, library);
        setAllHighlights(highlightsData);
      } catch (error) {
        console.error('Error fetching highlights:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHighlights();
  }, [driveStorage, library, libraryLoading]);

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

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  const filteredHighlights = allHighlights.map(bh => ({
    ...bh,
    highlights: bh.highlights.filter(h => 
      h.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (h.note && h.note.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(bh => bh.highlights.length > 0);

  const getBookTitle = (bookId: string) => {
    return library?.books.find(b => b.id === bookId)?.title || 'Unknown Book';
  };

  return (
    <div className={libraryStyles.libraryPage}>
      {/* Re-use Library Header */}
      <header className={libraryStyles.header}>
        <div className={libraryStyles.headerContent}>
          <a href="/library" className={libraryStyles.logoSection}>
            <span className={libraryStyles.logoIcon} aria-hidden="true">
              🐝
            </span>
            <span className={libraryStyles.logoText}>BuzzyReader</span>
          </a>

          <div className={libraryStyles.headerRight}>
            <div className={libraryStyles.userMenuContainer}>
              <button 
                className={libraryStyles.avatarButton} 
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-label="User Menu"
              >
                {session?.user?.image ? (
                  <img
                    className={libraryStyles.userAvatar}
                    src={session.user.image}
                    alt="User avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={libraryStyles.userAvatarPlaceholder} aria-hidden="true">
                    {userInitials}
                  </div>
                )}
              </button>

              {isUserMenuOpen && (
                <div className={libraryStyles.userMenuDropdown}>
                  <button 
                    className={libraryStyles.dropdownItem}
                    onClick={() => router.push('/highlights')}
                  >
                    Highlights
                  </button>
                  <button 
                    className={libraryStyles.dropdownItem}
                    onClick={() => router.push('/wishlist')}
                  >
                    Wish list
                  </button>
                  <button 
                    className={libraryStyles.dropdownItemLogout}
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

      {/* Main Content */}
      <main className={libraryStyles.content}>
        <div className={styles.highlightsHeader}>
          <h1 className={styles.pageTitle}>Your Highlights</h1>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search highlights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>

        {loading ? (
          <div className={libraryStyles.emptyState}>
            <p>Loading highlights...</p>
          </div>
        ) : allHighlights.length === 0 ? (
          <div className={libraryStyles.emptyState}>
            <div className={libraryStyles.emptyIllustration} aria-hidden="true">🖍️</div>
            <h2 className={libraryStyles.emptyTitle}>No highlights yet</h2>
            <p className={libraryStyles.emptyText}>Start reading and highlighting passages in your books.</p>
          </div>
        ) : filteredHighlights.length === 0 ? (
          <div className={libraryStyles.emptyState}>
            <p className={libraryStyles.emptyText}>No highlights match your search.</p>
          </div>
        ) : (
          <div className={styles.highlightList}>
            {filteredHighlights.map((bookGroup) => (
              <div key={bookGroup.bookId} className={styles.bookSection}>
                <h2 className={styles.bookTitle}>
                  {getBookTitle(bookGroup.bookId)}
                  <span className={styles.countBadge}>
                    {bookGroup.highlights.length}
                  </span>
                </h2>
                
                <div className={styles.highlightsGrid}>
                  {bookGroup.highlights.map(highlight => (
                    <HighlightCard
                      key={highlight.id}
                      highlight={highlight}
                      bookTitle={getBookTitle(bookGroup.bookId)}
                      onNavigate={() => router.push(`/reader/${bookGroup.bookId}?cfi=${encodeURIComponent(highlight.cfiRange)}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
