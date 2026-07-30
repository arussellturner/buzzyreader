'use client';

import React, { useCallback } from 'react';
import type { Highlight, HighlightColor } from '@/types/highlight';
import styles from './HighlightCard.module.css';

interface HighlightCardProps {
  highlight: Highlight;
  bookTitle?: string;
  onNavigate?: (highlight: Highlight) => void;
  onDelete?: (highlightId: string) => void;
}

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return '';
  }
}

const COLOR_CLASS: Record<HighlightColor, string> = {
  yellow: styles.yellow,
  green: styles.green,
  blue: styles.blue,
  pink: styles.pink,
};

export default function HighlightCard({
  highlight,
  bookTitle,
  onNavigate,
  onDelete,
}: HighlightCardProps) {
  const handleClick = useCallback(() => {
    onNavigate?.(highlight);
  }, [onNavigate, highlight]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(highlight.id);
    },
    [onDelete, highlight.id]
  );

  const colorClass = COLOR_CLASS[highlight.color] ?? COLOR_CLASS.yellow;

  return (
    <div
      className={`${styles.card} ${colorClass}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`Highlight: ${highlight.text.slice(0, 60)}…`}
    >
      <p className={styles.text}>{highlight.text}</p>

      {highlight.note && (
        <p className={styles.note}>{highlight.note}</p>
      )}

      <div className={styles.meta}>
        <div className={styles.metaInfo}>
          {highlight.chapter && (
            <>
              <span className={styles.chapter}>{highlight.chapter}</span>
              <span className={styles.dot} aria-hidden="true">·</span>
            </>
          )}
          {bookTitle && (
            <>
              <span className={styles.chapter}>{bookTitle}</span>
              <span className={styles.dot} aria-hidden="true">·</span>
            </>
          )}
          <span className={styles.date}>{formatDate(highlight.createdAt)}</span>
        </div>

        <div className={styles.actions}>
          {onDelete && (
            <button
              className={styles.deleteBtn}
              onClick={handleDelete}
              aria-label="Delete highlight"
              title="Delete highlight"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
