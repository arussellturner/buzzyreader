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
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);

  // Initialize state when book changes or modal opens
  useEffect(() => {
    if (book && isOpen) {
      setTitle(book.title || '');
      setAuthor(book.author || '');
      setCoverUrl(book.coverUrl || '');
      setNotes(book.notes || '');
      setShowUnsavedPrompt(false);
    }
  }, [book, isOpen]);

  const hasChanges = 
    book && (
      title !== (book.title || '') ||
      author !== (book.author || '') ||
      coverUrl !== (book.coverUrl || '') ||
      notes !== (book.notes || '')
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
      });
      onClose();
    } catch (err) {
      console.error('Failed to save book details', err);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!book) return;
    if (confirm(`Are you sure you want to delete "${book.title}"? This cannot be undone.`)) {
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
    }
  };

  const handleResetProgress = async () => {
    if (!book) return;
    if (confirm('Are you sure you want to reset reading progress to 0%?')) {
      try {
        await onResetProgress(book.id);
        alert('Reading progress reset.');
      } catch (err) {
        console.error('Failed to reset progress', err);
        alert('Failed to reset progress');
      }
    }
  };

  if (!isOpen || !book) return null;

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

        {showUnsavedPrompt ? (
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
                {isSaving ? 'Saving...' : 'Save Changes'}
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
              <label htmlFor="book-cover">Cover Image URL (Optional)</label>
              <input
                id="book-cover"
                type="text"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://..."
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="book-notes">My Notes</label>
              <textarea
                id="book-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your thoughts or notes about this book..."
                className={styles.textarea}
              />
            </div>

            <div className={styles.dangerZone}>
              <h4>Manage Book</h4>
              <button
                className={styles.btnGhost}
                onClick={handleResetProgress}
                type="button"
              >
                Reset Reading Progress
              </button>
              <button
                className={styles.btnDanger}
                onClick={handleDelete}
                disabled={isDeleting}
                type="button"
              >
                {isDeleting ? 'Deleting...' : 'Delete Book'}
              </button>
            </div>

            <div className={styles.actions}>
              <button
                className={styles.btnPrimary}
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
