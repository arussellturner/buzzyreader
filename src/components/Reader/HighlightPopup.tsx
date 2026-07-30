'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { HighlightColor } from '@/types/highlight';
import styles from './Reader.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface HighlightPopupProps {
  position: { x: number; y: number };
  onHighlight: (color: HighlightColor) => void;
  onClose: () => void;
  visible: boolean;
}

/* ------------------------------------------------------------------ */
/*  Colors                                                            */
/* ------------------------------------------------------------------ */

const colors: { color: HighlightColor; className: string; label: string }[] = [
  { color: 'yellow', className: styles.highlightColorBtnYellow, label: 'Yellow highlight' },
  { color: 'green', className: styles.highlightColorBtnGreen, label: 'Green highlight' },
  { color: 'blue', className: styles.highlightColorBtnBlue, label: 'Blue highlight' },
  { color: 'pink', className: styles.highlightColorBtnPink, label: 'Pink highlight' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function HighlightPopup({
  position,
  onHighlight,
  onClose,
  visible,
}: HighlightPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  /* ---- Position the popup relative to selection ---- */
  const getPositionStyle = useCallback((): React.CSSProperties => {
    if (!visible) return { left: 0, top: 0 };

    const popupWidth = 180;
    const popupHeight = 50;
    const margin = 12;

    let x = position.x - popupWidth / 2;
    let y = position.y - popupHeight - margin;

    // Clamp to viewport
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

    if (x < margin) x = margin;
    if (x + popupWidth > vw - margin) x = vw - popupWidth - margin;

    // If above the selection goes off-screen, show below
    if (y < margin) {
      y = position.y + margin;
    }
    if (y + popupHeight > vh - margin) {
      y = vh - popupHeight - margin;
    }

    return { left: x, top: y };
  }, [position, visible]);

  /* ---- Close on click outside ---- */
  useEffect(() => {
    if (!visible) return;

    function handleClick(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }

    // Delay to avoid closing on the same click that opens the popup
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [visible, onClose]);

  /* ---- Close on Escape ---- */
  useEffect(() => {
    if (!visible) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  return (
    <div
      ref={popupRef}
      className={`${styles.highlightPopup} ${visible ? styles.highlightPopupVisible : ''}`}
      style={getPositionStyle()}
      role="menu"
      aria-label="Highlight color selection"
    >
      {colors.map(({ color, className, label }) => (
        <button
          key={color}
          className={`${styles.highlightColorBtn} ${className}`}
          onClick={() => onHighlight(color)}
          aria-label={label}
          title={label}
        />
      ))}
    </div>
  );
}
