'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Highlight, HighlightColor } from '@/types/highlight';
import styles from './HighlightCard.module.css';

interface HighlightCardProps {
  highlight: Highlight;
  bookTitle?: string;
  onNavigate?: (highlight: Highlight) => void;
  onEdit?: (highlight: Highlight) => void;
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
  onEdit,
  onDelete,
}: HighlightCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(highlight.text);
    setShowMenu(false);
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate?.(highlight);
    setShowMenu(false);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(highlight);
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this highlight?')) {
      onDelete?.(highlight.id);
    }
    setShowMenu(false);
  };

  const colorClass = COLOR_CLASS[highlight.color] ?? COLOR_CLASS.yellow;

  return (
    <div
      className={`${styles.card} ${colorClass}`}
      onClick={() => setShowMenu(true)}
      role="button"
      tabIndex={0}
      aria-label={`Highlight: ${highlight.text.slice(0, 60)}…`}
      style={{ zIndex: showMenu ? 50 : 1 }}
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

      {showMenu && (
        <div ref={menuRef} className={styles.menu}>
          <button className={styles.menuItem} onClick={handleCopy}>
            Copy
          </button>
          <button className={styles.menuItem} onClick={handleNavigate}>
            See in book
          </button>
          <button className={styles.menuItem} onClick={handleEdit}>
            Edit
          </button>
          <button 
            className={styles.menuItem} 
            onClick={handleDelete}
            style={{ color: '#ef4444' }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
