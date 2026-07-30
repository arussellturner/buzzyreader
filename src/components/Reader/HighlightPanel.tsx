'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Highlight } from '@/types/highlight';
import styles from './Reader.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface HighlightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: Highlight[];
  onHighlightClick: (cfiRange: string) => void;
  onDeleteHighlight: (id: string) => void;
  bookTitle: string;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                  */
/* ------------------------------------------------------------------ */

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function HighlighterEmptyIcon() {
  return (
    <svg className={styles.highlightEmptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 0 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Date formatter                                                    */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function HighlightPanel({
  isOpen,
  onClose,
  highlights,
  onHighlightClick,
  onDeleteHighlight,
  bookTitle,
}: HighlightPanelProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Close on overlay click */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  /* Close on Escape */
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (confirmDeleteId) {
          setConfirmDeleteId(null);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, confirmDeleteId]);

  /* Delete confirmation */
  const handleDeleteClick = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  }, []);

  const confirmDelete = useCallback(() => {
    if (confirmDeleteId) {
      onDeleteHighlight(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, onDeleteHighlight]);

  const cancelDelete = useCallback(() => {
    setConfirmDeleteId(null);
  }, []);

  // Sort highlights by their position (cfiRange, lexicographic is good enough for EPub CFIs)
  const sortedHighlights = [...highlights].sort((a, b) => a.cfiRange.localeCompare(b.cfiRange));

  return (
    <>
      {/* Overlay */}
      <div
        className={`${styles.highlightOverlay} ${isOpen ? styles.highlightOverlayOpen : ''}`}
        onClick={handleOverlayClick}
        aria-hidden={!isOpen}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        className={`${styles.highlightPanel} ${isOpen ? styles.highlightPanelOpen : ''}`}
        role="dialog"
        aria-label="Highlights"
        aria-modal={isOpen}
      >
        {/* Header */}
        <div className={styles.highlightHeader}>
          <div>
            <h2 className={styles.highlightHeaderTitle}>
              Highlights
              {sortedHighlights.length > 0 && (
                <span className={styles.highlightCount}>({sortedHighlights.length})</span>
              )}
            </h2>
          </div>
          <button className={styles.settingsCloseBtn} onClick={onClose} aria-label="Close highlights">
            <CloseIcon />
          </button>
        </div>

        {/* List */}
        <div className={styles.highlightList}>
          {sortedHighlights.length === 0 ? (
            <div className={styles.highlightEmpty}>
              <HighlighterEmptyIcon />
              <p className={styles.highlightEmptyText}>No highlights yet</p>
              <p className={styles.highlightEmptyHint}>
                Select text while reading to create highlights in &ldquo;{bookTitle}&rdquo;
              </p>
            </div>
          ) : (
            sortedHighlights.map((h) => (
              <div
                key={h.id}
                className={styles.highlightItem}
                onClick={() => onHighlightClick(h.cfiRange)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onHighlightClick(h.cfiRange);
                }}
              >
                <div className={styles.highlightColorBar} data-color={h.color} />
                <div className={styles.highlightContent}>
                  <p className={styles.highlightText}>&ldquo;{h.text}&rdquo;</p>
                  <div className={styles.highlightMeta}>
                    {h.chapter && (
                      <span className={styles.highlightChapter}>{h.chapter}</span>
                    )}
                    <span className={styles.highlightDate}>{formatDate(h.createdAt)}</span>
                  </div>
                </div>
                <button
                  className={styles.highlightDeleteBtn}
                  onClick={(e) => handleDeleteClick(e, h.id)}
                  aria-label="Delete highlight"
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className={styles.confirmOverlay} onClick={cancelDelete}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.confirmTitle}>Delete Highlight</h3>
            <p className={styles.confirmMessage}>
              Are you sure you want to delete this highlight? This action cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancelBtn} onClick={cancelDelete}>
                Cancel
              </button>
              <button className={styles.confirmDeleteBtn} onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
