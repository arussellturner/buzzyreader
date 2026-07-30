'use client';

import React, { useCallback, useRef, useMemo } from 'react';
import styles from './UI.module.css';

interface SliderProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  label: string;
  formatValue?: (value: number) => string;
  id?: string;
  className?: string;
}

export default function Slider({
  min,
  max,
  step,
  value,
  onChange,
  label,
  formatValue,
  id,
  className,
}: SliderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = id ?? `slider-${label.toLowerCase().replace(/\s+/g, '-')}`;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(parseFloat(e.target.value));
    },
    [onChange]
  );

  const displayValue = formatValue ? formatValue(value) : String(value);

  // Calculate fill percentage for the track gradient
  const fillPercent = useMemo(() => {
    return ((value - min) / (max - min)) * 100;
  }, [value, min, max]);

  const trackStyle: React.CSSProperties = {
    background: `linear-gradient(to right, var(--color-brand-amber) 0%, var(--color-brand-amber) ${fillPercent}%, var(--color-surface) ${fillPercent}%, var(--color-surface) 100%)`,
  };

  return (
    <div className={`${styles.sliderContainer} ${className ?? ''}`}>
      <div className={styles.sliderHeader}>
        <label className={styles.sliderLabel} htmlFor={inputId}>
          {label}
        </label>
        <span className={styles.sliderValue} aria-live="polite">
          {displayValue}
        </span>
      </div>
      <input
        ref={inputRef}
        id={inputId}
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={trackStyle}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
      />
    </div>
  );
}
