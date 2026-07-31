'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/hooks/useWishlist';
import WishlistModal from '@/components/Wishlist/WishlistModal';
import styles from './wishlist.module.css';
import libraryStyles from '../library/library.module.css';

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

export default function WishlistPage() {
  const sessionObj = useSession();
  const session = sessionObj?.data;
  const status = sessionObj?.status || 'unauthenticated';
  const router = useRouter();
  
  const { wishlist, loading, addItem } = useWishlist();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

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

  const items = wishlist?.items || [];
  
  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.author.toLowerCase().includes(query) ||
      item.sourceNotes.toLowerCase().includes(query)
    );
  });

  return (
    <div className={libraryStyles.libraryPage}>
      <header className={libraryStyles.header}>
        <div className={libraryStyles.headerContent}>
          <a href="/library" className={libraryStyles.logoSection}>
            <span className={libraryStyles.logoIcon} aria-hidden="true">
              🐝
            </span>
            <span className={libraryStyles.logoText}>BuzzyReader</span>
          </a>

          <div className={libraryStyles.headerRight}>
            <button 
              className={libraryStyles.addBookIconBtn} 
              onClick={() => setIsModalOpen(true)} 
              aria-label="Add to Wishlist" 
              title="Add to Wishlist"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>

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

      <main className={libraryStyles.content}>
        <div className={styles.wishlistHeader}>
          <h1 className={styles.pageTitle}>Wishlist</h1>
        </div>

        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search wishlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        {loading ? (
          <div className={libraryStyles.emptyState}>
            <p>Loading wishlist...</p>
          </div>
        ) : items.length === 0 ? (
          <div className={libraryStyles.emptyState}>
            <div className={libraryStyles.emptyIllustration} aria-hidden="true">✨</div>
            <h2 className={libraryStyles.emptyTitle}>Your wishlist is empty</h2>
            <p className={libraryStyles.emptyText}>Keep track of books you want to read.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={libraryStyles.emptyState}>
            <p className={libraryStyles.emptyText}>No books match your search.</p>
          </div>
        ) : (
          <div className={styles.wishlistGrid}>
            {filteredItems.map((item) => (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardTitle}>{item.title}</div>
                <div className={styles.cardAuthor}>{item.author}</div>
                {item.sourceNotes && (
                  <div className={styles.cardNotes}>
                    <strong>Notes:</strong> {item.sourceNotes}
                  </div>
                )}
                <div className={styles.cardMeta}>
                  Added on {formatDate(item.addedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <WishlistModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSave={addItem}
      />
    </div>
  );
}
