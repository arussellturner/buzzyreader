'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import HighlightCard from '@/components/Highlights/HighlightCard';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { BookHighlights, Highlight } from '@/types/highlight';
import { getAllHighlights, saveHighlights } from '@/lib/storage/driveStorage';
import { usePreferences } from '@/hooks/usePreferences';
import ThemeToggle from '@/components/UI/ThemeToggle';
import styles from './highlights.module.css';
import libraryStyles from '../library/library.module.css';

export default function HighlightsPage() {
  const sessionObj = useSession();
  const session = sessionObj?.data;
  const status = sessionObj?.status || 'unauthenticated';
  const router = useRouter();
  const { library, loading: libraryLoading, driveStorage } = useGoogleDrive();
  const { preferences, updatePreferences } = usePreferences();
  
  const [allHighlights, setAllHighlights] = useState<BookHighlights[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [editNote, setEditNote] = useState('');
  const [sortBy, setSortBy] = useState('recent');

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

  const getBookTitle = useCallback((bookId: string) => {
    return library?.books.find(b => b.id === bookId)?.title || 'Unknown Book';
  }, [library]);

  const sortedHighlights = useMemo(() => {
    const sorted = [...filteredHighlights];
    if (sortBy === 'title') {
      sorted.sort((a, b) => {
        const titleA = getBookTitle(a.bookId).toLowerCase();
        const titleB = getBookTitle(b.bookId).toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else if (sortBy === 'author-first') {
      sorted.sort((a, b) => {
        const bookA = library?.books.find(book => book.id === a.bookId);
        const bookB = library?.books.find(book => book.id === b.bookId);
        const authorA = (bookA?.author || 'Unknown').toLowerCase();
        const authorB = (bookB?.author || 'Unknown').toLowerCase();
        return authorA.localeCompare(authorB);
      });
    } else if (sortBy === 'author-last') {
      sorted.sort((a, b) => {
        const bookA = library?.books.find(book => book.id === a.bookId);
        const bookB = library?.books.find(book => book.id === b.bookId);
        const getLastName = (author: string) => author.split(' ').pop() || author;
        const authorA = getLastName(bookA?.author || 'Unknown').toLowerCase();
        const authorB = getLastName(bookB?.author || 'Unknown').toLowerCase();
        return authorA.localeCompare(authorB);
      });
    } else { // 'recent'
      sorted.sort((a, b) => {
        const recentA = Math.max(...a.highlights.map(h => new Date(h.createdAt || 0).getTime()));
        const recentB = Math.max(...b.highlights.map(h => new Date(h.createdAt || 0).getTime()));
        return recentB - recentA;
      });
    }
    return sorted;
  }, [filteredHighlights, sortBy, library, getBookTitle]);

  const saveEdit = async () => {
    if (!editingHighlight || !driveStorage) return;
    try {
      const group = allHighlights.find(g => g.bookId === editingHighlight.bookId);
      if (!group) return;
      
      const updatedHighlights = group.highlights.map(h => 
        h.id === editingHighlight.id ? { ...h, note: editNote } : h
      );
      
      const updatedGroup = { ...group, highlights: updatedHighlights };
      
      await saveHighlights(driveStorage, group.bookId, updatedGroup);
      
      setAllHighlights(prev => prev.map(g => g.bookId === group.bookId ? updatedGroup : g));
      setEditingHighlight(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (highlightId: string, bookId: string) => {
    if (!driveStorage) return;
    try {
      const group = allHighlights.find(g => g.bookId === bookId);
      if (!group) return;
      
      const updatedHighlights = group.highlights.filter(h => h.id !== highlightId);
      const updatedGroup = { ...group, highlights: updatedHighlights };
      
      await saveHighlights(driveStorage, bookId, updatedGroup);
      
      setAllHighlights(prev => prev.map(g => g.bookId === bookId ? updatedGroup : g));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className={libraryStyles.libraryPage}>
      {/* Re-use Library Header */}
      <header className={libraryStyles.header}>
        <div className={libraryStyles.headerContent}>
          <a href="/library" className={libraryStyles.logoSection}>
            <img src="/logo.png" alt="" className={libraryStyles.logoIcon} width={28} height={28} />
            <span className={libraryStyles.logoText}>BuzzyReader</span>
          </a>

          <div className={libraryStyles.headerRight}>
            <div className={libraryStyles.navDropdownContainer} ref={navMenuRef}>
              <button 
                className={libraryStyles.navDropdownButton}
                onClick={() => setIsNavMenuOpen(!isNavMenuOpen)}
              >
                Highlights
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              {isNavMenuOpen && (
                <div className={libraryStyles.navDropdownMenu}>
                  <button className={libraryStyles.navDropdownItem} onClick={() => router.push('/library')}>Library</button>
                  <button className={libraryStyles.navDropdownItem} onClick={() => router.push('/wishlist')}>Wishlist</button>
                  <button className={`${libraryStyles.navDropdownItem} ${libraryStyles.navDropdownItemActive}`} onClick={() => router.push('/highlights')}>Highlights</button>
                </div>
              )}
            </div>

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
                      onThemeChange={(t) => updatePreferences({ theme: t })}
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

      {/* Main Content */}
      <main className={libraryStyles.content}>
        <div className={styles.highlightsHeader}>
          <div className={styles.headerTopRow}>
            <h1 className={styles.pageTitle}>Highlights</h1>
            <div className={libraryStyles.sortOptions}>
              <span className={libraryStyles.sortLabel}>Sort by:</span>
              <div className={libraryStyles.selectWrapper}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className={libraryStyles.sortSelect}
                >
                  <option value="recent">Recent</option>
                  <option value="title">Book Title</option>
                  <option value="author-first">Author (First Name)</option>
                  <option value="author-last">Author (Last Name)</option>
                </select>
                <span className={libraryStyles.selectIcon} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>
            </div>
          </div>
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
        ) : sortedHighlights.length === 0 ? (
          <div className={libraryStyles.emptyState}>
            <p className={libraryStyles.emptyText}>No highlights match your search.</p>
          </div>
        ) : (
          <div className={styles.highlightList}>
            {sortedHighlights.map((bookGroup) => (
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
                      onEdit={(h) => {
                        setEditingHighlight(h);
                        setEditNote(h.note || '');
                      }}
                      onDelete={(id) => handleDelete(id, bookGroup.bookId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editingHighlight && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 12, width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Edit Note</h2>
              <button onClick={() => setEditingHighlight(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 24, cursor: 'pointer' }}>&times;</button>
            </div>
            
            <blockquote style={{ margin: 0, paddingLeft: 12, borderLeft: '4px solid var(--accent-primary)', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: 14 }}>
              {editingHighlight.text}
            </blockquote>

            <textarea
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
              placeholder="Add your note here..."
              rows={4}
              style={{ width: '100%', padding: 12, borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'none' }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={() => setEditingHighlight(null)} 
                style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button 
                onClick={saveEdit} 
                style={{ padding: '8px 16px', background: 'var(--accent-primary)', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
