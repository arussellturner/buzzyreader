'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import type { Book } from '@/types/book';
import styles from './AddBookModal.module.css';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAdded: (book: Book) => void;
  /** Books already in the library, to show "Added" state */
  existingDriveFileIds?: Set<string>;
}

function formatFileSize(bytes?: string): string {
  if (!bytes) return '';
  const num = parseInt(bytes, 10);
  if (isNaN(num)) return '';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AddBookModal({
  isOpen,
  onClose,
  onBookAdded,
  existingDriveFileIds = new Set(),
}: AddBookModalProps) {
  const { addBook, error, driveStorage } = useGoogleDrive();
  const [driveFiles, setDriveFiles] = useState<{id: string, name: string}[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingFileId, setAddingFileId] = useState<string | null>(null);
  const [addedFileIds, setAddedFileIds] = useState<Set<string>>(new Set());
  const [isClosing, setIsClosing] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Scan Drive when modal opens
  useEffect(() => {
    if (isOpen) {
      if (driveStorage) {
        setIsScanning(true);
        driveStorage.listEpubFiles().then(files => {
          setDriveFiles(files);
          setIsScanning(false);
        }).catch(err => {
          console.error(err);
          setIsScanning(false);
        });
      }
      setSearchQuery('');
      setAddedFileIds(new Set());
      setIsClosing(false);
      // Focus search input after animation
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, driveStorage]);

  // Close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Click outside to close
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        handleClose();
      }
    },
    [handleClose]
  );

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  const handleAddBook = useCallback(
    async (driveFile: any) => {
      if (addingFileId || addedFileIds.has(driveFile.id) || existingDriveFileIds.has(driveFile.id)) {
        return;
      }
      setAddingFileId(driveFile.id);
      try {
        const book = await addBook(driveFile);
        setAddedFileIds((prev) => new Set(prev).add(driveFile.id));
        onBookAdded(book);
      } catch {
        // Error handled by hook
      } finally {
        setAddingFileId(null);
      }
    },
    [addBook, addingFileId, addedFileIds, existingDriveFileIds, onBookAdded]
  );

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return driveFiles;
    const query = searchQuery.toLowerCase();
    return driveFiles.filter((f) => f.name.toLowerCase().includes(query));
  }, [driveFiles, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Add book from Google Drive"
    >
      <div className={`${styles.modal} ${isClosing ? styles.modalClosing : ''}`}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <span className={styles.modalTitleIcon} aria-hidden="true">
              📂
            </span>
            Add from Google Drive
          </h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close modal"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchWrapper}>
          <div className={styles.searchInputWrapper}>
            <span className={styles.searchIcon} aria-hidden="true">
              🔍
            </span>
            <input
              ref={searchInputRef}
              className={styles.searchInput}
              type="text"
              placeholder="Search your ePub files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search ePub files"
            />
          </div>
        </div>

        {/* File list */}
        <div className={styles.fileList}>
          {isScanning ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <span className={styles.loadingText}>Scanning your Google Drive…</span>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <span className={styles.emptyIcon} aria-hidden="true">⚠️</span>
              <p className={styles.errorText}>{error}</p>
              <button
                className={styles.retryBtn}
                onClick={() => {
                  if (driveStorage) {
                    setIsScanning(true);
                    driveStorage.listEpubFiles().then(setDriveFiles).catch(console.error).finally(() => setIsScanning(false));
                  }
                }}
                type="button"
              >
                Try again
              </button>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">📭</span>
              <span className={styles.emptyTitle}>
                {searchQuery ? 'No matches found' : 'No ePub files found'}
              </span>
              <span className={styles.emptyText}>
                {searchQuery
                  ? `No files match "${searchQuery}". Try a different search.`
                  : 'Upload .epub files to your Google Drive and they\'ll appear here.'}
              </span>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isAlreadyAdded =
                addedFileIds.has(file.id) || existingDriveFileIds.has(file.id);
              const isAdding = addingFileId === file.id;

              return (
                <div key={file.id} className={styles.fileRow}>
                  <div className={styles.fileIcon} aria-hidden="true">
                    📘
                  </div>
                  <span className={styles.fileName} title={file.name}>
                    {file.name}
                  </span>
                  {(file as any).size && (
                    <span className={styles.fileSize}>{formatFileSize((file as any).size)}</span>
                  )}
                  {isAlreadyAdded ? (
                    <button className={styles.addedBtn} disabled type="button">
                      Added ✓
                    </button>
                  ) : (
                    <button
                      className={styles.addBtn}
                      onClick={() => handleAddBook(file)}
                      disabled={isAdding}
                      type="button"
                    >
                      {isAdding ? '…' : 'Add'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
