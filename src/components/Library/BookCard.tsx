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
  onOpenDetails?: (book: Book) => void;
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


export default function BookCard({ book, progress, onClick, onOpenDetails }: BookCardProps) {
  const router = useRouter();
  const hash = useMemo(() => hashCode(book.id + book.title), [book.id, book.title]);
  const gradient = COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
  const icon = BOOK_ICONS[hash % BOOK_ICONS.length];
  const progressPercent = Math.round((progress?.percentage ?? 0) * 100);

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(book);
    } else {
      router.push(`/reader/${book.id}`);
    }
  }, [book, onClick, router]);


  return (
    <div
      className={styles.card}
    >
      {/* Cover */}
      <div className={styles.coverWrapper}>
        <div className={styles.hoverOverlay}>
          <button className={styles.overlayButton} onClick={handleClick}>Read</button>
          <button className={styles.overlayButton} onClick={(e) => { e.stopPropagation(); if(onOpenDetails) onOpenDetails(book); }}>Details</button>
        </div>
        {book.isRead && (
          <div className={styles.readBadge}>
            Read
          </div>
        )}
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
        
        {/* Progress Overlay */}
        <div className={styles.progressOverlay}>
          <div className={styles.progressTextContainer}>
             <span className={styles.progressPercent}>{progressPercent}%</span>
          </div>
          <div className={styles.progressBarTrack}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${progressPercent}% read`}
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div 
        className={styles.info}
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenDetails) onOpenDetails(book);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            if (onOpenDetails) onOpenDetails(book);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${book.title}`}
      >
        <p className={styles.author}>{book.author}</p>
        <h3 className={styles.title}>{book.title}</h3>
      </div>
    </div>
  );
}
