'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Book } from '@/types/book';
import styles from './BookDetailsModal.module.css';



interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  onSave: (updatedBook: Book) => Promise<void>;
  onDelete: (bookId: string) => Promise<void>;
  onResetProgress: (bookId: string) => Promise<void>;
}

export default function BookDetailsModal({
  isOpen,
  onClose,
  book,
  onSave,
  onDelete,
  onResetProgress,
}: BookDetailsModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverSuggestions, setCoverSuggestions] = useState<string[]>([]);
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [notes, setNotes] = useState('');
  const [isRead, setIsRead] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);

  // Initialize state when book changes or modal opens
  useEffect(() => {
    if (book && isOpen) {
      setTitle(book.title || '');
      setAuthor(book.author || '');
      setCoverUrl(book.coverUrl || '');
      setCoverSuggestions([]);
      setIsSearchingCover(false);
      setNotes(book.notes || '');
      setIsRead(book.isRead || false);
      setShowUnsavedPrompt(false);
      setShowDeletePrompt(false);
    }
  }, [book, isOpen]);

  const hasChanges = 
    book && (
      title !== (book.title || '') ||
      author !== (book.author || '') ||
      coverUrl !== (book.coverUrl || '') ||
      notes !== (book.notes || '') ||
      isRead !== (book.isRead || false)
    );

  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedPrompt(true);
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  const handleForceClose = useCallback(() => {
    setShowUnsavedPrompt(false);
    onClose();
  }, [onClose]);

  const handleSave = async () => {
    if (!book) return;
    setIsSaving(true);
    try {
      await onSave({
        ...book,
        title,
        author,
        coverUrl,
        notes,
        isRead,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save book details', err);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleRead = async () => {
    if (!book) return;
    setIsSaving(true);
    try {
      await onSave({
        ...book,
        title,
        author,
        coverUrl,
        notes,
        isRead: !isRead,
      });
      onClose();
    } catch (err) {
      console.error('Failed to toggle read status', err);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeletePrompt(true);
  };

  const handleConfirmDelete = async () => {
    if (!book) return;
    setIsDeleting(true);
    try {
      await onDelete(book.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete book', err);
      alert('Failed to delete book');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetProgress = async () => {
    if (!book) return;
    if (confirm(`Are you sure you want to reset reading progress for "${book.title}"?`)) {
      try {
        await onResetProgress(book.id);
        onClose();
      } catch (err) {
        console.error('Failed to reset progress', err);
        alert('Failed to reset reading progress');
      }
    }
  };

  const searchCoverArt = async () => {
    if (!title) return;
    setIsSearchingCover(true);
    setCoverSuggestions([]);
    
    try {
      const query = encodeURIComponent(`${title} ${author}`.trim());
      const res = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=10`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      
      const docsWithCovers = data.docs.filter((doc: any) => doc.cover_i);
      // Get up to 4 unique covers
      const covers: string[] = [];
      for (const doc of docsWithCovers) {
        if (covers.length >= 4) break;
        const url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
        if (!covers.includes(url)) covers.push(url);
      }
      setCoverSuggestions(covers);
    } catch (err) {
      console.error('Failed to fetch cover art suggestions:', err);
    } finally {
      setIsSearchingCover(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close"
        >
          ✕
        </button>

        <h2 id="modal-title" className={styles.modalTitle}>
          Book Details
        </h2>

        {showDeletePrompt ? (
          <div className={styles.unsavedPrompt}>
            <h3>Delete Book</h3>
            <p>Are you sure you want to delete "{book?.title}"? This cannot be undone.</p>
            <div className={styles.promptActions}>
              <button 
                className={styles.btnSecondary} 
                onClick={() => setShowDeletePrompt(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className={styles.btnDanger}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Book'}
              </button>
            </div>
          </div>
        ) : showUnsavedPrompt ? (
          <div className={styles.unsavedPrompt}>
            <h3>Unsaved Changes</h3>
            <p>You have unsaved changes. What would you like to do?</p>
            <div className={styles.promptActions}>
              <button className={styles.btnSecondary} onClick={handleForceClose}>
                Don't Save
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <button
              className={styles.btnGhost}
              onClick={() => setShowUnsavedPrompt(false)}
              style={{ marginTop: '12px', width: '100%' }}
            >
              Keep Editing
            </button>
          </div>
        ) : (
          <div className={styles.formContent}>
            <div className={styles.formGroup}>
              <label htmlFor="book-title">Title</label>
              <input
                id="book-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Book Title"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="book-author">Author</label>
              <input
                id="book-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author Name"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="book-notes">My notes</label>
              <textarea
                id="book-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your thoughts or notes about this book..."
                className={styles.textarea}
              />
            </div>

            <div className={styles.formGroup}>
              <button 
                type="button"
                className={styles.btnSecondary}
                onClick={searchCoverArt}
                disabled={isSearchingCover || !title}
                title="Search OpenLibrary for cover art"
                style={{ width: '100%', marginTop: '8px' }}
              >
                {isSearchingCover ? 'Searching...' : 'Find cover'}
              </button>
              
              {coverSuggestions.length > 0 && (
                <div className={styles.coverSuggestions}>
                  <p className={styles.suggestionsLabel}>Select a cover:</p>
                  <div className={styles.suggestionsGrid}>
                    {coverSuggestions.map((url, i) => (
                      <button 
                        key={i}
                        type="button"
                        className={`${styles.suggestionBtn} ${coverUrl === url ? styles.suggestionSelected : ''}`}
                        onClick={() => setCoverUrl(url)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Cover option ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>



            <div className={styles.manageBookActions}>
              <button
                className={styles.btnSuccess}
                onClick={handleToggleRead}
                disabled={isSaving}
                type="button"
              >
                {isRead ? 'Mark as unread' : 'Mark as read'}
              </button>
              <button
                className={styles.btnDarkGrey}
                onClick={handleResetProgress}
                type="button"
              >
                Reset reading progress
              </button>
              <button
                className={styles.btnDanger}
                onClick={handleDeleteClick}
                disabled={isDeleting || isSaving}
                type="button"
              >
                Delete book
              </button>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.btnPrimary}
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
