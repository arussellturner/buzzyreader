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
import PageNavDropdown from '@/components/UI/PageNavDropdown';
import styles from './highlights.module.css';
import libraryStyles from '../library/library.module.css';

type SearchFilter = {
  type: 'book' | 'author';
  value: string;
  label: string;
};

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
  const [searchFilter, setSearchFilter] = useState<SearchFilter | null>(null);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
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

  const filteredHighlights = allHighlights.filter(bh => {
    if (!searchFilter) return true;
    if (searchFilter.type === 'book') {
      return bh.bookId === searchFilter.value;
    }
    if (searchFilter.type === 'author') {
      const book = library?.books.find(b => b.id === bh.bookId);
      return book?.author === searchFilter.value;
    }
    return true;
  }).map(bh => ({
    ...bh,
    highlights: bh.highlights.filter(h => 
      h.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (h.note && h.note.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(bh => bh.highlights.length > 0);

  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || !library) return [];
    const query = searchQuery.toLowerCase();
    
    const suggestions: SearchFilter[] = [];
    
    // Find matching books
    library.books.forEach(book => {
      if (book.title.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'book',
          value: book.id,
          label: book.title
        });
      }
    });

    // Find matching authors (unique)
    const matchingAuthors = Array.from(new Set(
      library.books
        .map(b => b.author)
        .filter(author => author.toLowerCase().includes(query))
    ));

    matchingAuthors.forEach(author => {
      suggestions.push({
        type: 'author',
        value: author,
        label: author
      });
    });

    return suggestions;
  }, [searchQuery, library]);

  const handleSelectFilter = (filter: SearchFilter) => {
    setSearchFilter(filter);
    setSearchQuery('');
    setShowSearchSuggestions(false);
  };

  const getBookTitle = useCallback((bookId: string) => {
    return library?.books.find(b => b.id === bookId)?.title || 'Unknown Book';
  }, [library]);

  const sortedHighlights = useMemo(() => {
    // 1. Group by title + author
    const groups = new Map<string, {
      title: string;
      author: string;
      isMissing: boolean;
      highlights: Highlight[];
    }>();

    filteredHighlights.forEach(bh => {
      const isMissing = !library?.books.some(b => b.id === bh.bookId);
      const title = library?.books.find(b => b.id === bh.bookId)?.title || bh.bookTitle || 'Unknown Book';
      const author = library?.books.find(b => b.id === bh.bookId)?.author || bh.bookAuthor || 'Unknown Author';
      const key = `${title}::${author}`;

      if (!groups.has(key)) {
        groups.set(key, { title, author, isMissing, highlights: [] });
      }
      groups.get(key)!.highlights.push(...bh.highlights);
      
      // If AT LEAST ONE bookId for this title is not missing, we consider the book as NOT missing
      if (!isMissing) {
        groups.get(key)!.isMissing = false;
      }
    });

    const sorted = Array.from(groups.values());

    if (sortBy === 'title') {
      sorted.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
    } else if (sortBy === 'author-first') {
      sorted.sort((a, b) => a.author.toLowerCase().localeCompare(b.author.toLowerCase()));
    } else if (sortBy === 'author-last') {
      const getLastName = (author: string) => author.split(' ').pop() || author;
      sorted.sort((a, b) => getLastName(a.author).toLowerCase().localeCompare(getLastName(b.author).toLowerCase()));
    } else { // 'recent'
      sorted.sort((a, b) => {
        const recentA = Math.max(...a.highlights.map(h => new Date(h.createdAt || 0).getTime()));
        const recentB = Math.max(...b.highlights.map(h => new Date(h.createdAt || 0).getTime()));
        return recentB - recentA;
      });
    }

    return sorted;
  }, [filteredHighlights, sortBy, library]);

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
                  <div className={libraryStyles.legalDropdownLinks}>
                    <button className={libraryStyles.legalDropdownLink} onClick={() => router.push('/privacy')}>Privacy Policy</button>
                    <span className={libraryStyles.legalDropdownDivider}>•</span>
                    <button className={libraryStyles.legalDropdownLink} onClick={() => router.push('/terms')}>Terms of Service</button>
                  </div>
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
        <div className={libraryStyles.toolbar}>
          <div className={libraryStyles.toolbarTopRow}>
            <PageNavDropdown activePage="highlights" />
          </div>
          
          <div className={libraryStyles.controlsRow}>
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
            
            <div className={styles.customSearchContainer}>
              <div className={styles.customSearchBox}>
                {searchFilter && (
                  <div className={styles.searchFilterPill}>
                    <span>{searchFilter.label}</span>
                    <button className={styles.clearFilterBtn} onClick={() => setSearchFilter(null)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  placeholder={searchFilter ? 'Search within filter...' : 'Search highlights...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onBlur={() => {
                    // Small delay to allow clicking suggestions
                    setTimeout(() => setShowSearchSuggestions(false), 200);
                  }}
                  className={styles.customSearchInput}
                />
              </div>

              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className={styles.suggestionsDropdown}>
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      className={styles.suggestionItem}
                      onClick={() => handleSelectFilter(suggestion)}
                    >
                      <span>{suggestion.label}</span>
                      <span className={styles.suggestionType}>
                        {suggestion.type === 'book' ? 'Book' : 'Author'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            {sortedHighlights.map((group) => {
              return (
                <div key={`${group.title}::${group.author}`} className={styles.bookSection}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <h2 className={styles.bookTitle} style={{ margin: 0 }}>
                      {group.title}
                      <span className={styles.countBadge}>
                        {group.highlights.length}
                      </span>
                    </h2>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        {group.author}
                      </span>
                      {group.isMissing && (
                        <span style={{ fontSize: 12, color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: 12 }}>
                          No longer in library
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.highlightsGrid}>
                    {group.highlights.map(highlight => (
                      <HighlightCard
                        key={highlight.id}
                        highlight={highlight}
                        bookTitle={group.title}
                        isBookMissing={group.isMissing}
                        onNavigate={() => router.push(`/reader/${highlight.bookId}?cfi=${encodeURIComponent(highlight.cfiRange)}`)}
                      onEdit={(h) => {
                        setEditingHighlight(h);
                        setEditNote(h.note || '');
                      }}
                      onDelete={(id) => handleDelete(id, highlight.bookId)}
                    />
                  ))}
                </div>
              </div>
              );
            })}
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
