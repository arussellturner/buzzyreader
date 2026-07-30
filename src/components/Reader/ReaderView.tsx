'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { ReaderPreferences } from '@/types/preferences';
import type { Highlight, HighlightColor } from '@/types/highlight';
import styles from './Reader.module.css';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface LocationInfo {
  cfi: string;
  percentage: number;
  currentPage: number;
  totalPages: number;
  chapter?: string;
}

export interface TextSelection {
  text: string;
  cfiRange: string;
  position: { x: number; y: number };
}

interface ReaderViewProps {
  epubData: ArrayBuffer;
  initialCfi?: string;
  preferences: ReaderPreferences;
  highlights?: Highlight[];
  onLocationChange?: (location: LocationInfo) => void;
  onTextSelected?: (selection: TextSelection) => void;
  onToggleMenu?: () => void;
  onReady?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Font-family resolver                                              */
/* ------------------------------------------------------------------ */

function resolveFontFamily(f: string): string {
  switch (f) {
    case 'inter': return '"Inter", sans-serif';
    case 'georgia': return 'Georgia, "Times New Roman", serif';
    case 'literata': return '"Literata", Georgia, serif';
    case 'opendyslexic': return '"OpenDyslexic", sans-serif';
    case 'system':
    default:
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }
}

/* ------------------------------------------------------------------ */
/*  Theme → CSS for epub iframe                                       */
/* ------------------------------------------------------------------ */

function themeStyles(p: ReaderPreferences) {
  const backgrounds: Record<string, string> = {
    dark: '#0d0d0f',
    light: '#f8f6f2',
    sepia: '#f4ecd8',
  };
  const colors: Record<string, string> = {
    dark: '#e8e6e3',
    light: '#1a1a1a',
    sepia: '#3d3229',
  };

  return {
    body: {
      'font-family': resolveFontFamily(p.fontFamily) + ' !important',
      'font-size': `${p.fontSize}px !important`,
      'line-height': `${p.lineSpacing} !important`,
      'letter-spacing': `${p.charSpacing}em !important`,
      color: `${colors[p.theme] ?? colors.dark} !important`,
      background: `${backgrounds[p.theme] ?? backgrounds.dark} !important`,
      'padding': '0 5% !important',
      '-webkit-font-smoothing': 'antialiased',
    },
    p: {
      'margin-bottom': `${p.paragraphSpacing}em !important`,
    },
    'a': {
      color: '#6c63ff !important',
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Highlight colour map                                              */
/* ------------------------------------------------------------------ */

const highlightColorMap: Record<HighlightColor, string> = {
  yellow: 'rgba(250, 204, 21, 0.35)',
  green: 'rgba(74, 222, 128, 0.30)',
  blue: 'rgba(96, 165, 250, 0.30)',
  pink: 'rgba(244, 114, 182, 0.30)',
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function ReaderView({
  epubData,
  initialCfi,
  preferences,
  highlights = [],
  onLocationChange,
  onTextSelected,
  onToggleMenu,
  onReady,
}: ReaderViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const displayedHighlightIds = useRef<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Initialize epub.js                                               */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      const ePub = (await import('epubjs')).default;

      const book = ePub(epubData as unknown as string);
      bookRef.current = book;

      const rendition = book.renderTo(containerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'none',
        flow: preferences.readingMode === 'vertical' ? 'scrolled' : 'paginated',
        manager: 'continuous',
      });

      renditionRef.current = rendition;

      // Apply initial theme
      const theme = themeStyles(preferences);
      rendition.themes.default(theme);

      // Display at initial location or start
      if (initialCfi) {
        await rendition.display(initialCfi);
      } else {
        await rendition.display();
      }

      if (cancelled) return;

      // Location change handler
      rendition.on('locationChanged', (loc: { start: string; end: string }) => {
        if (!book.locations || !loc?.start) return;

        const currentLocation = book.locations.locationFromCfi(loc.start);
        const totalLocations = book.locations.length();
        const percentage = totalLocations > 0 ? (Number(currentLocation) || 0) / (Number(totalLocations) || 1) : 0;

        // Try to get chapter info
        let chapter: string | undefined;
        try {
          const spineItem = book.spine.get(loc.start);
          if (spineItem?.index !== undefined) {
            const navItem = book.navigation?.toc?.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (t: any) => t.href && spineItem.href?.includes(t.href.split('#')[0])
            );
            if (navItem) chapter = navItem.label?.trim();
          }
        } catch {
          // Chapter resolution is best-effort
        }

        onLocationChange?.({
          cfi: loc.start,
          percentage: Math.min(1, Math.max(0, percentage)),
          currentPage: (Number(currentLocation) || 0) + 1,
          totalPages: Number(totalLocations) || 1,
          chapter,
        });
      });

      // Text selection handler
      rendition.on('selected', (cfiRange: string, contents: { window: Window }) => {
        const sel = contents.window.getSelection();
        if (!sel || sel.isCollapsed) return;

        const text = sel.toString().trim();
        if (!text) return;

        // Get position for popup
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Translate iframe-local coordinates to page coordinates
        const iframe = containerRef.current?.querySelector('iframe');
        const iframeRect = iframe?.getBoundingClientRect() ?? { left: 0, top: 0 };

        const x = rect.left + rect.width / 2 + iframeRect.left;
        const y = rect.top + iframeRect.top;

        onTextSelected?.({
          text,
          cfiRange,
          position: { x, y },
        });
      });

      // Generate locations for progress tracking
      await book.locations.generate(1024);

      if (!cancelled) {
        setIsInitialized(true);
        onReady?.();
      }
    }

    init();

    return () => {
      cancelled = true;
      if (renditionRef.current) {
        try { renditionRef.current.destroy(); } catch { /* cleanup */ }
      }
      if (bookRef.current) {
        try { bookRef.current.destroy(); } catch { /* cleanup */ }
      }
      renditionRef.current = null;
      bookRef.current = null;
      displayedHighlightIds.current.clear();
      setIsInitialized(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epubData, preferences.readingMode]);

  /* ---------------------------------------------------------------- */
  /*  Update theme when preferences change                             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!renditionRef.current || !isInitialized) return;
    const theme = themeStyles(preferences);
    renditionRef.current.themes.default(theme);
    // Force re-render
    try {
      renditionRef.current.views().forEach((v: { render: () => void }) => {
        try { v.render(); } catch { /* best effort */ }
      });
    } catch {
      /* views() may not be available yet */
    }
  }, [preferences, isInitialized]);

  /* ---------------------------------------------------------------- */
  /*  Apply highlights                                                 */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!renditionRef.current || !isInitialized) return;

    const rendition = renditionRef.current;

    // Remove old highlights that are no longer in the list
    const currentIds = new Set(highlights.map(h => h.id));
    for (const id of displayedHighlightIds.current) {
      if (!currentIds.has(id)) {
        try { rendition.annotations.remove(id, 'highlight'); } catch { /* ok */ }
        displayedHighlightIds.current.delete(id);
      }
    }

    // Add new highlights
    for (const h of highlights) {
      if (!displayedHighlightIds.current.has(h.id)) {
        try {
          rendition.annotations.highlight(
            h.cfiRange,
            { id: h.id },
            undefined,
            undefined,
            { fill: highlightColorMap[h.color] ?? highlightColorMap.yellow, 'fill-opacity': '1', 'mix-blend-mode': 'multiply' }
          );
          displayedHighlightIds.current.add(h.id);
        } catch {
          /* highlight application is best-effort */
        }
      }
    }
  }, [highlights, isInitialized]);

  /* ---------------------------------------------------------------- */
  /*  Navigation                                                       */
  /* ---------------------------------------------------------------- */

  const goNext = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const goPrev = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyDown); // fallback

    // Also bind inside the epub iframe using hooks
    if (renditionRef.current && isInitialized) {
      try {
        renditionRef.current.hooks.content.register((contents: any) => {
          contents.document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
              e.preventDefault();
              goNext();
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              goPrev();
            }
          });
        });
      } catch {
        /* binding may fail */
      }
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyDown);
    };
  }, [goNext, goPrev, isInitialized]);

  /* ---------------------------------------------------------------- */
  /*  Public navigation methods (exposed via imperative handle)        */
  /* ---------------------------------------------------------------- */

  // Expose methods via data attributes on container for parent access
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    (el as HTMLDivElement & { _goNext: () => void; _goPrev: () => void; _goTo: (cfi: string) => void }).
      _goNext = goNext;
    (el as HTMLDivElement & { _goPrev: () => void })._goPrev = goPrev;
    (el as HTMLDivElement & { _goTo: (cfi: string) => void })._goTo = (cfi: string) => {
      renditionRef.current?.display(cfi);
    };
  }, [goNext, goPrev, isInitialized]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      <div
        ref={containerRef}
        className={styles.epubContainer}
        data-reader-view
      />
      
      {/* Navigation Zones built into ReaderView so they have direct access to goNext/goPrev */}
      {preferences.readingMode !== 'vertical' && (
        <>
          <div 
            className={`${styles.navZone} ${styles.navZoneLeft}`} 
            onClick={(e) => { e.stopPropagation(); goPrev(); }} 
          />
          <div 
            className={`${styles.navZone} ${styles.navZoneRight}`} 
            onClick={(e) => { e.stopPropagation(); goNext(); }} 
          />
        </>
      )}
      
      {/* Center Zone toggles the menu in any mode */}
      <div 
        className={`${styles.navZone} ${styles.navZoneCenter}`} 
        onClick={(e) => { e.stopPropagation(); onToggleMenu?.(); }} 
      />
    </>
  );
}
