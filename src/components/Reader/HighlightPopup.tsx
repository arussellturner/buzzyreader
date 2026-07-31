'use client';

import React, { useEffect, useRef } from 'react';
import type { HighlightColor } from '@/types/highlight';

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

const colors: { color: HighlightColor; hex: string; label: string }[] = [
  { color: 'yellow', hex: '#facc15', label: 'Yellow' },
  { color: 'green', hex: '#4ade80', label: 'Green' },
  { color: 'blue', hex: '#60a5fa', label: 'Blue' },
  { color: 'pink', hex: '#f472b6', label: 'Pink' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function HighlightPopup({
  onHighlight,
  onClose,
  visible,
}: HighlightPopupProps) {
  const barRef = useRef<HTMLDivElement>(null);

  /* ---- Close on Escape ---- */
  useEffect(() => {
    if (!visible) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={barRef}
      role="menu"
      aria-label="Highlight color selection"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        background: 'rgba(20, 20, 24, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        animation: 'slideUp 0.2s ease-out',
      }}
    >
      <span style={{
        fontSize: '13px',
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.6)',
        marginRight: '4px',
        letterSpacing: '0.02em',
      }}>
        Highlight:
      </span>
      {colors.map(({ color, hex, label }) => (
        <button
          key={color}
          onClick={() => onHighlight(color)}
          aria-label={`${label} highlight`}
          title={`${label} highlight`}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            background: hex,
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: `0 0 8px ${hex}40`,
          }}
        />
      ))}
      <button
        onClick={onClose}
        aria-label="Cancel"
        style={{
          marginLeft: '8px',
          padding: '6px 14px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'rgba(255, 255, 255, 0.08)',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.15s ease',
        }}
      >
        ✕
      </button>
    </div>
  );
}
