'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Book } from '@/types/book';
import type { ReadingProgress } from '@/types/progress';
import styles from './BookCard.module.css';

interface BookCardProps {
  book: Book;
  progress?: ReadingProgress;
  onClick?: (book: Book) => void;
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

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default function BookCard({ book, progress, onClick }: BookCardProps) {
  const router = useRouter();
  const hash = useMemo(() => hashCode(book.id + book.title), [book.id, book.title]);
  const gradient = COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
  const icon = BOOK_ICONS[hash % BOOK_ICONS.length];
  const progressPercent = progress?.percentage ?? 0;

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(book);
    } else {
      router.push(`/reader/${book.id}`);
    }
  }, [book, onClick, router]);

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
      aria-label={`Open ${book.title} by ${book.author}`}
    >
      {/* Cover */}
      <div className={styles.coverWrapper}>
        {book.coverUrl ? (
          <img
            className={styles.cover}
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            loading="lazy"
          />
        ) : (
          <div className={styles.placeholderCover} style={{ background: gradient }}>
            <span className={styles.placeholderIcon} aria-hidden="true">
              {icon}
            </span>
            <span className={styles.placeholderTitle}>{book.title}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <h3 className={styles.title}>{book.title}</h3>
        <p className={styles.author}>{book.author}</p>
      </div>

      {/* Meta row */}
      {book.lastReadAt && (
        <div className={styles.meta}>
          <span className={styles.lastRead}>
            Read {formatRelativeDate(book.lastReadAt)}
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div className={styles.progressBarTrack}>
        <div
          className={styles.progressBarFill}
          style={{ width: `${Math.round(progressPercent * 100)}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progressPercent * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${Math.round(progressPercent * 100)}% read`}
        />
      </div>
    </div>
  );
}
