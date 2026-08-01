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
  const [selectedDriveFile, setSelectedDriveFile] = useState<{id: string, name: string} | null>(null);
  const [matchOptions, setMatchOptions] = useState<{title: string, author: string, coverUrl?: string}[]>([]);
  const [isSearchingMatch, setIsSearchingMatch] = useState(false);
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
      setSelectedDriveFile(null);
      setMatchOptions([]);
      setIsSearchingMatch(false);
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

  const handleSelectFile = useCallback(async (file: {id: string, name: string}) => {
    setSelectedDriveFile(file);
    setIsSearchingMatch(true);
    setMatchOptions([]);
    
    // Clean filename
    const cleanName = file.name.replace(/\.epub$/i, '').replace(/[_-]/g, ' ').replace(/\(.*?\)/g, '').trim();
    
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(cleanName)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        const options = data.docs.map((doc: any) => ({
          title: doc.title,
          author: doc.author_name?.[0] || 'Unknown Author',
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : undefined
        }));
        
        // Ensure unique covers/options if any
        const uniqueOptions = options.filter((v: any, i: number, a: any[]) => a.findIndex(t => (t.title === v.title && t.author === v.author)) === i);
        setMatchOptions(uniqueOptions.slice(0, 5));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingMatch(false);
    }
  }, []);

  const handleConfirmMatch = useCallback(
    async (overrides?: {title: string, author: string, coverUrl?: string}) => {
      if (!selectedDriveFile) return;
      if (addingFileId || addedFileIds.has(selectedDriveFile.id) || existingDriveFileIds.has(selectedDriveFile.id)) {
        return;
      }
      setAddingFileId(selectedDriveFile.id);
      try {
        const book = await addBook(selectedDriveFile, overrides);
        setAddedFileIds((prev) => new Set(prev).add(selectedDriveFile.id));
        onBookAdded(book);
        handleClose();
      } catch {
        // Error handled by hook
      } finally {
        setAddingFileId(null);
      }
    },
    [addBook, addingFileId, addedFileIds, existingDriveFileIds, onBookAdded, selectedDriveFile, handleClose]
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
              {selectedDriveFile ? '🔍' : '📂'}
            </span>
            {selectedDriveFile ? 'Select Match' : 'Add from Google Drive'}
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

        {selectedDriveFile ? (
          <div className={styles.matchSelection}>
            <h3 className={styles.matchHeader}>Matching details for "{selectedDriveFile.name}"</h3>
            
            {isSearchingMatch ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <span className={styles.loadingText}>Searching OpenLibrary for matches…</span>
              </div>
            ) : matchOptions.length > 0 ? (
              <div className={styles.matchList}>
                {matchOptions.map((opt, i) => (
                  <button 
                    key={i} 
                    className={styles.matchItem}
                    onClick={() => handleConfirmMatch(opt)}
                    disabled={!!addingFileId}
                    type="button"
                  >
                    {opt.coverUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={opt.coverUrl} className={styles.matchCover} alt="Cover preview" />
                    ) : (
                      <div className={styles.matchCoverPlaceholder}>📘</div>
                    )}
                    <div className={styles.matchInfo}>
                      <span className={styles.matchTitle}>{opt.title}</span>
                      <span className={styles.matchAuthor}>{opt.author}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon} aria-hidden="true">📭</span>
                <span className={styles.emptyTitle}>No matches found</span>
              </div>
            )}

            <button 
              className={styles.skipMatchBtn}
              onClick={() => handleConfirmMatch()}
              disabled={!!addingFileId}
              type="button"
            >
              {addingFileId ? 'Adding...' : 'Skip and use file name'}
            </button>
          </div>
        ) : (
          <>
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
                      onClick={() => handleSelectFile(file)}
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
          </>
        )}
      </div>
    </div>
  );
}
