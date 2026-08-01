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

export default function WishlistModal({ isOpen, onClose, onSave, onDelete, initialItem }: WishlistModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [sourceNotes, setSourceNotes] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Google Books Search State
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const lastSelectedTitle = useRef('');

  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        setTitle(initialItem.title);
        setAuthor(initialItem.author);
        setSourceNotes(initialItem.sourceNotes || '');
        lastSelectedTitle.current = initialItem.title;
      } else {
        setTitle('');
        setAuthor('');
        setSourceNotes('');
        lastSelectedTitle.current = '';
      }
      setSearchResults([]);
      setShowSuggestions(false);
    }
  }, [isOpen, initialItem]);

  useEffect(() => {
    // Only search for new items, and only if they've typed something
    if (initialItem || !title.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
    
    // Don't search if the title is exactly what they just selected from the dropdown
    if (title === lastSelectedTitle.current) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&maxResults=5`);
        const data = await res.json();
        setSearchResults(data.items || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Book search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 600); // 600ms debounce

    return () => clearTimeout(timeoutId);
  }, [title, initialItem]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!title.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave({
        title: title.trim(),
        author: author.trim() || 'Unknown Author',
        sourceNotes: sourceNotes.trim()
      });
      setTitle('');
      setAuthor('');
      setSourceNotes('');
      lastSelectedTitle.current = '';
      onClose();
    } catch (error) {
      console.error('Error saving wishlist item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>{initialItem ? 'Edit Book' : 'Add to Wishlist'}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.inputGroup} style={{ position: 'relative' }}>
            <label className={styles.label}>Title</label>
            <input 
              type="text" 
              className={styles.input} 
              value={title} 
              onChange={e => {
                setTitle(e.target.value);
                if (e.target.value === '') {
                  setSearchResults([]);
                  setShowSuggestions(false);
                }
              }} 
              onFocus={() => {
                if (searchResults.length > 0) setShowSuggestions(true);
              }}
              placeholder="Search for a book or enter title..."
            />
            {isSearching && (
              <div className={styles.searchingIndicator}>Searching...</div>
            )}
            {showSuggestions && searchResults.length > 0 && !initialItem && (
               <div className={styles.suggestionsDropdown}>
                  {searchResults.map(book => {
                     const volInfo = book.volumeInfo;
                     return (
                       <div 
                         key={book.id} 
                         className={styles.suggestionItem}
                         onClick={() => {
                           const newTitle = volInfo.title;
                           lastSelectedTitle.current = newTitle;
                           setTitle(newTitle);
                           setAuthor(volInfo.authors ? volInfo.authors.join(', ') : 'Unknown Author');
                           setShowSuggestions(false);
                         }}
                       >
                         {volInfo.imageLinks?.smallThumbnail ? (
                           <img src={volInfo.imageLinks.smallThumbnail} alt="" className={styles.suggestionImage} />
                         ) : (
                           <div className={styles.suggestionImagePlaceholder}>?</div>
                         )}
                         <div className={styles.suggestionInfo}>
                           <div className={styles.suggestionTitle}>{volInfo.title}</div>
                           <div className={styles.suggestionAuthor}>{volInfo.authors?.join(', ')}</div>
                         </div>
                       </div>
                     );
                  })}
               </div>
            )}
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
            <button 
              className={styles.saveBtn} 
              onClick={handleSave} 
              disabled={isSaving || isDeleting || !title.trim()}
            >
              {isSaving ? 'Saving...' : (initialItem ? 'Save' : 'Add Book')}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
