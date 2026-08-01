'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/hooks/useWishlist';
import { usePreferences } from '@/hooks/usePreferences';
import WishlistModal from '@/components/Wishlist/WishlistModal';
import WishlistCard from '@/components/Wishlist/WishlistCard';
import ThemeToggle from '@/components/UI/ThemeToggle';
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
  
  const { wishlist, loading, addItem, removeItem, updateItem } = useWishlist();
  const { preferences, updatePreferences } = usePreferences();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

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
            <img src="/logo.png" alt="" className={libraryStyles.logoIcon} width={28} height={28} />
            <span className={libraryStyles.logoText}>BuzzyReader</span>
          </a>

          <div className={libraryStyles.headerRight}>
            <ThemeToggle className={libraryStyles.themeToggle} />

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
                    Wishlist
                  </button>
                  <button 
                    className={libraryStyles.dropdownItemLogout}
                    onClick={() => signOut()}
                  >
                    Log out
                  </button>
                  <div className={libraryStyles.dropdownDivider} />
                  <div className={libraryStyles.legalDropdownLinks}>
                    <button className={libraryStyles.legalDropdownLink} onClick={() => router.push('/privacy')}>Privacy Policy</button>
                    <span className={libraryStyles.legalDropdownDivider}>•</span>
                    <button className={libraryStyles.legalDropdownLink} onClick={() => router.push('/terms')}>Terms of Service</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={libraryStyles.content}>
        <div className={styles.wishlistHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Wishlist</h1>
            <button 
              className={styles.addButton} 
              onClick={() => {
                setSelectedItem(null);
                setIsModalOpen(true);
              }} 
              aria-label="Add to Wishlist" 
              title="Add to Wishlist"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search wishlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
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
          <>
            {filteredItems.filter(item => !item.isRead).length > 0 && (
              <div className={styles.wishlistGrid}>
                {filteredItems.filter(item => !item.isRead).map((item) => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    onClick={(i) => {
                      setSelectedItem(i);
                      setIsModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
            
            {filteredItems.filter(item => item.isRead).length > 0 && (
              <div className={styles.readSection}>
                <h2 className={styles.readSectionTitle}>Read Books</h2>
                <div className={styles.wishlistGrid}>
                  {filteredItems.filter(item => item.isRead).map((item) => (
                    <WishlistCard
                      key={item.id}
                      item={item}
                      onClick={(i) => {
                        setSelectedItem(i);
                        setIsModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <WishlistModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={(item) => {
          if (selectedItem) {
            return updateItem(selectedItem.id, item);
          } else {
            return addItem(item);
          }
        }}
        onDelete={removeItem}
        initialItem={selectedItem}
      />
    </div>
  );
}
