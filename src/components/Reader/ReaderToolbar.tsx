'use client';

import React from 'react';
import styles from './Reader.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ReaderToolbarProps {
  visible: boolean;
  bookTitle: string;
  onBack: () => void;
  onToggleSettings: () => void;
  onToggleTTS: () => void;
  onToggleHighlights: () => void;
  ttsActive?: boolean;
  highlightsOpen?: boolean;
  settingsOpen?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                  */
/* ------------------------------------------------------------------ */

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function HighlighterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 0 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ReaderToolbar({
  visible,
  bookTitle,
  onBack,
  onToggleSettings,
  onToggleTTS,
  onToggleHighlights,
  ttsActive = false,
  highlightsOpen = false,
  settingsOpen = false,
}: ReaderToolbarProps) {
  return (
    <header
      className={`${styles.toolbar} ${!visible ? styles.toolbarHidden : ''}`}
      role="toolbar"
      aria-label="Reader toolbar"
    >
      <div className={styles.toolbarLeft}>
        <button
          className={styles.toolbarBtn}
          onClick={onBack}
          aria-label="Go back to library"
          title="Back to library"
        >
          <BackIcon />
        </button>
        <span className={styles.toolbarTitle}>{bookTitle}</span>
      </div>

      <div className={styles.toolbarRight}>
        <button
          className={`${styles.toolbarBtn} ${highlightsOpen ? styles.toolbarBtnActive : ''}`}
          onClick={onToggleHighlights}
          aria-label="Toggle highlights panel"
          title="Highlights"
        >
          <HighlighterIcon />
        </button>
        <button
          className={`${styles.toolbarBtn} ${ttsActive ? styles.toolbarBtnActive : ''}`}
          onClick={onToggleTTS}
          aria-label="Toggle text to speech"
          title="Read aloud"
        >
          <SpeakerIcon />
        </button>
        <button
          className={`${styles.toolbarBtn} ${settingsOpen ? styles.toolbarBtnActive : ''}`}
          onClick={onToggleSettings}
          aria-label="Toggle reader settings"
          title="Settings"
        >
          <SettingsIcon />
        </button>
      </div>
    </header>
  );
}
