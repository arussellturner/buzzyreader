'use client';

import React from 'react';
import styles from './Reader.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface TTSControlsProps {
  isActive: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  rate: number;
  onRateChange: (rate: number) => void;
  voices: SpeechSynthesisVoice[];
  onVoiceChange: (voiceURI: string) => void;
  currentVoice?: string;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icons                                                  */
/* ------------------------------------------------------------------ */

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Rate presets                                                      */
/* ------------------------------------------------------------------ */

const ratePresets = [0.5, 0.75, 1, 1.25, 1.5, 2];

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function TTSControls({
  isActive,
  isPlaying,
  isPaused,
  onPlay,
  onPause,
  onResume,
  onStop,
  rate,
  onRateChange,
  voices,
  onVoiceChange,
  currentVoice,
}: TTSControlsProps) {
  function handlePlayPause() {
    if (isPlaying) {
      onPause();
    } else if (isPaused) {
      onResume();
    } else {
      onPlay();
    }
  }

  return (
    <div className={`${styles.ttsWrapper} ${isActive ? styles.ttsWrapperActive : ''}`}>
      {/* Stop */}
      <button
        className={styles.ttsSecondaryBtn}
        onClick={onStop}
        aria-label="Stop reading"
        title="Stop"
      >
        <StopIcon />
      </button>

      {/* Play / Pause */}
      <button
        className={styles.ttsPlayBtn}
        onClick={handlePlayPause}
        aria-label={isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
        title={isPlaying ? 'Pause' : isPaused ? 'Resume' : 'Play'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      {/* Rate + Voice */}
      <div className={styles.ttsControls}>
        <div className={styles.ttsRateRow}>
          {ratePresets.map((r) => (
            <button
              key={r}
              className={`${styles.ttsRateBtn} ${rate === r ? styles.ttsRateBtnActive : ''}`}
              onClick={() => onRateChange(r)}
              aria-label={`Speed ${r}x`}
            >
              {r}x
            </button>
          ))}
        </div>
        {voices.length > 0 && (
          <select
            className={styles.ttsVoiceSelect}
            value={currentVoice ?? ''}
            onChange={(e) => onVoiceChange(e.target.value)}
            aria-label="Select voice"
          >
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
