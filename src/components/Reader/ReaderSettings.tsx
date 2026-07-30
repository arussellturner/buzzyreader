'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import type { ReaderPreferences, ThemeMode, FontFamily } from '@/types/preferences';
import styles from './Reader.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface ReaderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  onUpdatePreferences: (update: Partial<ReaderPreferences>) => void;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                  */
/* ------------------------------------------------------------------ */

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Font option labels                                                */
/* ------------------------------------------------------------------ */

const fontOptions: { value: FontFamily; label: string }[] = [
  { value: 'literata', label: 'Literata' },
  { value: 'georgia', label: 'Georgia' },
  { value: 'inter', label: 'Inter' },
  { value: 'opendyslexic', label: 'OpenDyslexic' },
  { value: 'system', label: 'System Default' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ReaderSettings({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
}: ReaderSettingsProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  /* Close on overlay click */
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  /* Close on Escape key */
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  /* Theme setter */
  const setTheme = useCallback(
    (theme: ThemeMode) => onUpdatePreferences({ theme }),
    [onUpdatePreferences]
  );

  /* Font setter */
  const setFont = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      onUpdatePreferences({ fontFamily: e.target.value as FontFamily }),
    [onUpdatePreferences]
  );

  /* Numeric setters */
  const setFontSize = useCallback(
    (v: number) => onUpdatePreferences({ fontSize: Math.min(32, Math.max(12, v)) }),
    [onUpdatePreferences]
  );

  const setLineSpacing = useCallback(
    (v: number) =>
      onUpdatePreferences({ lineSpacing: Math.round(Math.min(2.5, Math.max(1, v)) * 10) / 10 }),
    [onUpdatePreferences]
  );

  const setParagraphSpacing = useCallback(
    (v: number) =>
      onUpdatePreferences({ paragraphSpacing: Math.round(Math.min(3, Math.max(0.5, v)) * 10) / 10 }),
    [onUpdatePreferences]
  );

  const setCharSpacing = useCallback(
    (v: number) =>
      onUpdatePreferences({ charSpacing: Math.round(Math.min(0.2, Math.max(-0.05, v)) * 100) / 100 }),
    [onUpdatePreferences]
  );

  return (
    <>
      {/* Overlay */}
      <div
        className={`${styles.settingsOverlay} ${isOpen ? styles.settingsOverlayOpen : ''}`}
        onClick={handleOverlayClick}
        aria-hidden={!isOpen}
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        className={`${styles.settingsPanel} ${isOpen ? styles.settingsPanelOpen : ''}`}
        role="dialog"
        aria-label="Reader settings"
        aria-modal={isOpen}
      >
        {/* Header */}
        <div className={styles.settingsHeader}>
          <h2 className={styles.settingsTitle}>Reading Settings</h2>
          <button className={styles.settingsCloseBtn} onClick={onClose} aria-label="Close settings">
            <CloseIcon />
          </button>
        </div>

        <div className={styles.settingsBody}>
          {/* ---- Theme ---- */}
          <section className={styles.settingsSection}>
            <span className={styles.settingsLabel}>Theme</span>
            <div className={styles.themeRow}>
              <button
                className={`${styles.themeCircle} ${styles.themeCircleDark} ${preferences.theme === 'dark' ? styles.themeCircleActive : ''}`}
                onClick={() => setTheme('dark')}
                aria-label="Dark theme"
                title="Dark"
              >
                Aa
              </button>
              <button
                className={`${styles.themeCircle} ${styles.themeCircleLight} ${preferences.theme === 'light' ? styles.themeCircleActive : ''}`}
                onClick={() => setTheme('light')}
                aria-label="Light theme"
                title="Light"
              >
                Aa
              </button>
              <button
                className={`${styles.themeCircle} ${styles.themeCircleSepia} ${preferences.theme === 'sepia' ? styles.themeCircleActive : ''}`}
                onClick={() => setTheme('sepia')}
                aria-label="Sepia theme"
                title="Sepia"
              >
                Aa
              </button>
            </div>
          </section>

          {/* ---- Font Family ---- */}
          <section className={styles.settingsSection}>
            <span className={styles.settingsLabel}>Font</span>
            <select
              className={styles.fontSelect}
              value={preferences.fontFamily}
              onChange={setFont}
              aria-label="Select font family"
            >
              {fontOptions.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </section>

          {/* ---- Font Size ---- */}
          <section className={styles.settingsSection}>
            <span className={styles.settingsLabel}>Font Size</span>
            <div className={styles.fontPreview} style={{ fontSize: preferences.fontSize }}>
              Aa
            </div>
            <div className={styles.sliderRow}>
              <button
                className={styles.sliderBtn}
                onClick={() => setFontSize(preferences.fontSize - 1)}
                aria-label="Decrease font size"
              >
                −
              </button>
              <input
                type="range"
                className={styles.slider}
                min={12}
                max={32}
                step={1}
                value={preferences.fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                aria-label="Font size slider"
              />
              <button
                className={styles.sliderBtn}
                onClick={() => setFontSize(preferences.fontSize + 1)}
                aria-label="Increase font size"
              >
                +
              </button>
              <span className={styles.sliderValue}>{preferences.fontSize}px</span>
            </div>
          </section>

          {/* ---- Line Spacing ---- */}
          <section className={styles.settingsSection}>
            <span className={styles.settingsLabel}>Line Spacing</span>
            <div className={styles.sliderRow}>
              <button
                className={styles.sliderBtn}
                onClick={() => setLineSpacing(preferences.lineSpacing - 0.1)}
                aria-label="Decrease line spacing"
              >
                −
              </button>
              <input
                type="range"
                className={styles.slider}
                min={1.0}
                max={2.5}
                step={0.1}
                value={preferences.lineSpacing}
                onChange={(e) => setLineSpacing(Number(e.target.value))}
                aria-label="Line spacing slider"
              />
              <button
                className={styles.sliderBtn}
                onClick={() => setLineSpacing(preferences.lineSpacing + 0.1)}
                aria-label="Increase line spacing"
              >
                +
              </button>
              <span className={styles.sliderValue}>{preferences.lineSpacing.toFixed(1)}</span>
            </div>
          </section>

          {/* ---- Paragraph Spacing ---- */}
          <section className={styles.settingsSection}>
            <span className={styles.settingsLabel}>Paragraph Spacing</span>
            <div className={styles.sliderRow}>
              <button
                className={styles.sliderBtn}
                onClick={() => setParagraphSpacing(preferences.paragraphSpacing - 0.1)}
                aria-label="Decrease paragraph spacing"
              >
                −
              </button>
              <input
                type="range"
                className={styles.slider}
                min={0.5}
                max={3.0}
                step={0.1}
                value={preferences.paragraphSpacing}
                onChange={(e) => setParagraphSpacing(Number(e.target.value))}
                aria-label="Paragraph spacing slider"
              />
              <button
                className={styles.sliderBtn}
                onClick={() => setParagraphSpacing(preferences.paragraphSpacing + 0.1)}
                aria-label="Increase paragraph spacing"
              >
                +
              </button>
              <span className={styles.sliderValue}>{preferences.paragraphSpacing.toFixed(1)}</span>
            </div>
          </section>

          {/* ---- Character Spacing ---- */}
          <section className={styles.settingsSection}>
            <span className={styles.settingsLabel}>Character Spacing</span>
            <div className={styles.sliderRow}>
              <button
                className={styles.sliderBtn}
                onClick={() => setCharSpacing(preferences.charSpacing - 0.01)}
                aria-label="Decrease character spacing"
              >
                −
              </button>
              <input
                type="range"
                className={styles.slider}
                min={-0.05}
                max={0.2}
                step={0.01}
                value={preferences.charSpacing}
                onChange={(e) => setCharSpacing(Number(e.target.value))}
                aria-label="Character spacing slider"
              />
              <button
                className={styles.sliderBtn}
                onClick={() => setCharSpacing(preferences.charSpacing + 0.01)}
                aria-label="Increase character spacing"
              >
                +
              </button>
              <span className={styles.sliderValue}>{preferences.charSpacing.toFixed(2)}em</span>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
