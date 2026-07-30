'use client';

import React, { useState, useCallback } from 'react';
import styles from './Reader.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ProgressBarProps {
  percentage: number; // 0 to 1
  currentPage: number;
  totalPages: number;
  showProgress: boolean;
  onToggle: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ProgressBar({
  percentage,
  currentPage,
  totalPages,
  showProgress,
  onToggle,
}: ProgressBarProps) {
  const [expanded, setExpanded] = useState(false);

  const pct = Math.round(percentage * 100);
  const widthPct = `${Math.min(100, Math.max(0, percentage * 100))}%`;

  const handleMouseEnter = useCallback(() => setExpanded(true), []);
  const handleMouseLeave = useCallback(() => setExpanded(false), []);
  const handleClick = useCallback(() => {
    setExpanded((v) => !v);
    onToggle();
  }, [onToggle]);

  if (!showProgress) return null;

  return (
    <div
      className={`${styles.progressWrapper} ${expanded ? styles.progressWrapperExpanded : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Reading progress: ${pct}%`}
    >
      <div className={styles.progressBar} style={{ width: widthPct }} />
      <div className={styles.progressInfo}>
        <span>
          Page {currentPage} of {totalPages} &bull; {pct}% complete
        </span>
      </div>
    </div>
  );
}
