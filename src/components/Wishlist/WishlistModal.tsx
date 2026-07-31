'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      if (initialItem) {
        setTitle(initialItem.title);
        setAuthor(initialItem.author);
        setSourceNotes(initialItem.sourceNotes || '');
      } else {
        setTitle('');
        setAuthor('');
        setSourceNotes('');
      }
    }
  }, [isOpen, initialItem]);

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
          <h2 className={styles.title}>Add to Wishlist</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Title</label>
            <input 
              type="text" 
              className={styles.input} 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Book Title"
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
