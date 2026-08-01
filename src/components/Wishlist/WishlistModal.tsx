'use client';

import { useState, useEffect, useRef } from 'react';
import type { WishlistItem } from '@/types/wishlist';
import styles from './WishlistModal.module.css';

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<WishlistItem, 'id' | 'addedAt'>) => Promise<any>;
  onDelete?: (id: string) => Promise<any>;
  initialItem?: WishlistItem | null;
}

export default function WishlistModal({ isOpen, onClose, onSave, initialItem, onDelete }: WishlistModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [sourceNotes, setSourceNotes] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isRead, setIsRead] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Search Flow State
  const [mode, setMode] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle(initialItem.title);
        setAuthor(initialItem.author);
        setSourceNotes(initialItem.sourceNotes || '');
        setCoverUrl(initialItem.coverUrl || '');
        setIsRead(initialItem.isRead || false);
        setMode('manual');
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTitle('');
        setAuthor('');
        setSourceNotes('');
        setCoverUrl('');
        setIsRead(false);
        setSearchQuery('');
        setMode('search');
      }
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [isOpen, initialItem]);

  useEffect(() => {
    if (mode !== 'search' || !searchQuery.trim()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=5`);
        const data = await res.json();
        setSearchResults(data.docs || []);
        setHasSearched(true);
      } catch (err) {
        console.error('Book search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, mode]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        author: author.trim() || 'Unknown Author',
        sourceNotes: sourceNotes.trim(),
        coverUrl: coverUrl.trim() || undefined,
        isRead
      });
      onClose();
    } catch (error) {
      console.error('Error saving wishlist item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkReadToggle = async () => {
    if (!title.trim() || isSaving || isDeleting) return;
    setIsSaving(true);
    
    const newIsRead = !isRead;
    setIsRead(newIsRead); // Optimistic

    try {
      await onSave({
        title: title.trim(),
        author: author.trim() || 'Unknown Author',
        sourceNotes: sourceNotes.trim(),
        coverUrl: coverUrl.trim() || undefined,
        isRead: newIsRead
      });
      onClose();
    } catch (error) {
      console.error('Error saving read status:', error);
      setIsRead(!newIsRead);
    } finally {
      setIsSaving(false);
    }
  };

  const selectSearchResult = (book: any) => {
    setTitle(book.title || '');
    setAuthor(book.author_name ? book.author_name.join(', ') : 'Unknown Author');
    if (book.cover_i) {
      setCoverUrl(`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`);
    } else {
      setCoverUrl('');
    }
    setMode('manual');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>
            {initialItem ? 'Edit Book' : (mode === 'search' ? 'Find a Book' : 'Add to Wishlist')}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </header>

        {mode === 'search' ? (
          <div className={styles.body}>
            <div className={styles.inputGroup} style={{ position: 'relative' }}>
              <label className={styles.label}>Search for a book</label>
              <input 
                type="text" 
                className={styles.input} 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Enter title, author, or keywords..."
                autoFocus
              />
              {isSearching && (
                <div className={styles.searchingIndicator}>Searching...</div>
              )}
            </div>

            {hasSearched && searchResults.length === 0 && !isSearching && (
              <div className={styles.emptyState}>
                No books found.
              </div>
            )}

            {searchResults.length > 0 && (
              <div className={styles.searchResultsList}>
                {searchResults.map((book: any, idx) => {
                  return (
                    <div 
                      key={book.key || idx} 
                      className={styles.searchResultItem}
                      onClick={() => selectSearchResult(book)}
                    >
                      {book.cover_i ? (
                        <img src={`https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`} alt="" className={styles.suggestionImage} />
                      ) : (
                        <div className={styles.suggestionImagePlaceholder}>?</div>
                      )}
                      <div className={styles.suggestionInfo}>
                        <div className={styles.suggestionTitle}>{book.title}</div>
                        <div className={styles.suggestionAuthor}>{book.author_name?.join(', ')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button 
              className={styles.manualEntryLink} 
              onClick={() => setMode('manual')}
            >
              Can&apos;t find it? Add manually.
            </button>
          </div>
        ) : (
          <>
            <div className={styles.body}>
              <div className={styles.topRow}>
                {coverUrl ? (
                  <div className={styles.coverPreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverUrl} alt="Cover preview" />
                  </div>
                ) : (
                  <div className={styles.coverPreviewPlaceholder} aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                  </div>
                )}
                
                <div className={styles.titleAuthorGroup}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Title</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      placeholder="Book Title"
                      autoFocus={!initialItem}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Author</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      value={author} 
                      onChange={e => setAuthor(e.target.value)} 
                      placeholder="Author Name"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>How did you hear about this?</label>
                <textarea 
                  className={styles.textarea} 
                  value={sourceNotes} 
                  onChange={e => setSourceNotes(e.target.value)} 
                  placeholder="e.g. Recommended by a friend, heard on a podcast..."
                  rows={4}
                />
              </div>
            </div>

            <footer className={styles.footer}>
              <div className={styles.footerLeft}>
                {!initialItem && (
                  <button className={styles.backBtn} onClick={() => setMode('search')}>
                    Back
                  </button>
                )}
                {initialItem && onDelete && (
                  <button 
                    className={styles.deleteBtn} 
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        await onDelete(initialItem.id);
                        onClose();
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    disabled={isDeleting || isSaving}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
              <div className={styles.footerRight}>
                {initialItem && (
                  <button 
                    className={`${styles.markReadBtn} ${isRead ? styles.isReadActive : ''}`} 
                    onClick={handleMarkReadToggle}
                    disabled={isSaving || isDeleting}
                  >
                    {isRead ? 'Mark as Unread' : 'Mark as Read'}
                  </button>
                )}
                <button 
                  className={styles.saveBtn} 
                  onClick={handleSave} 
                  disabled={isSaving || isDeleting || !title.trim()}
                >
                  {isSaving ? 'Saving...' : (initialItem ? 'Save' : 'Add Book')}
                </button>
              </div>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
