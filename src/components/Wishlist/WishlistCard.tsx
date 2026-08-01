'use client';

import { useCallback, useMemo } from 'react';
import type { WishlistItem } from '@/types/wishlist';
import styles from './WishlistCard.module.css';

interface WishlistCardProps {
  item: WishlistItem;
  onClick?: (item: WishlistItem) => void;
}

/** Hashing function to deterministically pick a gradient for a book cover */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #1a1a3e 0%, #2d1b69 50%, #4a1942 100%)',
  'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  'linear-gradient(135deg, #2c1654 0%, #3a1c71 50%, #d76d77 100%)',
  'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)',
  'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #21262d 100%)',
  'linear-gradient(135deg, #1a0533 0%, #3d1f6d 50%, #5f27cd 100%)',
  'linear-gradient(135deg, #141e30 0%, #243b55 50%, #141e30 100%)',
  'linear-gradient(135deg, #2b0f3e 0%, #4a2068 50%, #1a0a26 100%)',
];

const BOOK_ICONS = ['📖', '📚', '📕', '📗', '📘', '📙', '📓', '📔'];

function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

export default function WishlistCard({ item, onClick }: WishlistCardProps) {
  const hash = useMemo(() => hashCode(item.id + item.title), [item.id, item.title]);
  const gradient = COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
  const icon = BOOK_ICONS[hash % BOOK_ICONS.length];

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(item);
    }
  }, [item, onClick]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  return (
    <div
      className={styles.card}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open wishlist item ${item.title}`}
    >
      {/* Cover */}
      <div className={styles.coverWrapper}>
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverUrl} alt={`Cover for ${item.title}`} className={styles.actualCover} />
        ) : (
          <div className={styles.placeholderCover} style={{ background: gradient }}>
            <span className={styles.placeholderIcon} aria-hidden="true">
              {icon}
            </span>
            <span className={styles.placeholderTitle}>{item.title}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <h3 className={styles.title}>{item.title}</h3>
        <p className={styles.author}>{item.author}</p>
        
        {item.sourceNotes ? (
          <>
            <div className={styles.notesLabel}>How you heard about this</div>
            <div className={styles.notesText}>{item.sourceNotes}</div>
          </>
        ) : null}
        
        <div className={styles.dateAdded}>
          Added on {formatDate(item.addedAt)}
        </div>
      </div>
    </div>
  );
}
