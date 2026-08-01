'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useWishlist } from '@/hooks/useWishlist';
import { usePreferences } from '@/hooks/usePreferences';
import PageNavDropdown from '@/components/UI/PageNavDropdown';
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
  const [sortBy, setSortBy] = useState('date');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

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
  
  const filteredAndSortedItems = useMemo(() => {
    const result = items.filter(item => {
      const query = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.author.toLowerCase().includes(query) ||
        item.sourceNotes.toLowerCase().includes(query)
      );
    });

    result.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'author-first') {
        return a.author.localeCompare(b.author);
      } else if (sortBy === 'author-last') {
        const getLastName = (name: string) => {
          const parts = name.trim().split(' ');
          return parts[parts.length - 1];
        };
        return getLastName(a.author).localeCompare(getLastName(b.author));
      }
      // default: date added (newest first)
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });

    return result;
  }, [items, searchQuery, sortBy]);

  return (
    <div className={libraryStyles.libraryPage}>
      <header className={libraryStyles.header}>
        <div className={libraryStyles.headerContent}>
          <a href="/library" className={libraryStyles.logoSection}>
            <img src="/logo.png" alt="" className={libraryStyles.logoIcon} width={28} height={28} />
            <span className={libraryStyles.logoText}>BuzzyReader</span>
          </a>

          <div className={libraryStyles.headerRight}>
            <div className={libraryStyles.userMenuContainer} ref={userMenuRef}>
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
                  <div style={{ padding: '0 8px' }}>
                    <ThemeToggle 
                      theme={preferences?.theme}
                      onThemeChange={(t) => updatePreferences({ theme: t as import('@/types/preferences').ThemeMode })}
                    />
                  </div>
                  <button 
                    className={libraryStyles.dropdownItemLogout}
                    onClick={() => signOut()}
                  >
                    Log out
                  </button>
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
          <div className={styles.headerTopRow}>
            <PageNavDropdown activePage="wishlist" />
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

          <div className={styles.controlsRow}>
            <div className={libraryStyles.sortOptions}>
              <span className={libraryStyles.sortLabel}>Sort by:</span>
              <div className={libraryStyles.selectWrapper}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={libraryStyles.sortSelect}
                >
                  <option value="date">Date added</option>
                  <option value="title">Title</option>
                  <option value="author-first">Author (first name)</option>
                  <option value="author-last">Author (last name)</option>
                </select>
                <span className={libraryStyles.selectIcon} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>
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
        ) : filteredAndSortedItems.length === 0 ? (
          <div className={libraryStyles.emptyState}>
            <p className={libraryStyles.emptyText}>No books match your search.</p>
          </div>
        ) : (
          <>
            {filteredAndSortedItems.filter(item => !item.isRead).length > 0 && (
              <div className={styles.wishlistGrid}>
                {filteredAndSortedItems.filter(item => !item.isRead).map((item) => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    onClick={() => {
                      setSelectedItem(item);
                      setIsModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
            
            {filteredAndSortedItems.filter(item => item.isRead).length > 0 && (
              <div className={styles.readSection}>
                <h2 className={styles.readSectionTitle}>Read</h2>
                <div className={styles.wishlistGrid}>
                  {filteredAndSortedItems.filter(item => item.isRead).map((item) => (
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
