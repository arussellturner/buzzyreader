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

function formatDateTime(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });

    if (diffDays === 0) return `Today, ${timeStr}`;
    if (diffDays === 1) return `Yesterday, ${timeStr}`;

    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
    
    return `${dateStr}, ${timeStr}`;
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

  const colorClass = COLOR_CLASS[highlight.color] ?? COLOR_CLASS.yellow;

  return (
    <div
      className={`${styles.card} ${colorClass}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Highlight: ${highlight.text.slice(0, 60)}…`}
    >
      <p className={styles.text}>{highlight.text}</p>

      {highlight.note && (
        <p className={styles.note}>Note: {highlight.note}</p>
      )}

      <div className={styles.meta}>
        {bookTitle && (
          <span>{bookTitle} · </span>
        )}
        <span>{formatDateTime(highlight.createdAt)}</span>
      </div>
    </div>
  );
}
