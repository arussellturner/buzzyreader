'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { usePreferences } from '@/hooks/usePreferences';
import { useHighlights } from '@/hooks/useHighlights';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import ReaderSettingsOverlay from '@/components/Reader/ReaderSettingsOverlay';
import HighlightMenu from '@/components/Reader/HighlightMenu';
import type { HighlightColor } from '@/types/highlight';

// Helper to map fontFamily enum to actual font stack for epub iframe
const getFontStack = (fontFamily: string) => {
  switch (fontFamily) {
    case 'inter': return "'Inter', system-ui, sans-serif";
    case 'georgia': return "Georgia, serif";
    case 'opendyslexic': return "'OpenDyslexic', sans-serif";
    case 'system': return "system-ui, sans-serif";
    case 'literata':
    default:
      return "'Literata', Georgia, serif";
  }
};

export default function ReaderPage() {
  const sessionObj = useSession() || {};
  const status = sessionObj.status || 'unauthenticated';
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const bookId = params.bookId as string;
  const initialCfi = searchParams.get('cfi');

  const { library, driveStorage } = useGoogleDrive();
  const { preferences, updatePreferences } = usePreferences();
  const { highlights, addHighlight, updateHighlight, removeHighlight, loadHighlights } = useHighlights();
  const { progress, updateProgress, loadProgress } = useReadingProgress();
  
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>(['DEBUG V2: LOADED']);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Highlight state
  const [activeSelection, setActiveSelection] = useState<{ id?: string, cfiRange: string, text: string, color?: HighlightColor, note?: string } | null>(null);
  const activeSelectionRef = useRef(activeSelection);
  activeSelectionRef.current = activeSelection;

  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    async function loadBookData() {
      if (!driveStorage || !library) return;
      const book = library.books.find(b => b.id === bookId);
      if (!book) {
        setError("Book not found in library");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Load highlights and progress in parallel
        if (sessionObj.data?.accessToken) {
          loadHighlights(sessionObj.data.accessToken as string, bookId);
          loadProgress(sessionObj.data.accessToken as string, bookId);
        }
        const data = await driveStorage.getEpubFileContent(book.driveFileId);
        setEpubData(data);
      } catch (err: any) {
        console.error("Failed to load book:", err);
        setError(err.message || 'Failed to load book from Google Drive');
      } finally {
        setLoading(false);
      }
    }
    loadBookData();
  }, [status, driveStorage, library, bookId]);

  useEffect(() => {
    let book: any;
    async function initEpub() {
      if (!containerRef.current || !epubData) return;
      
      const ePub = (await import('epubjs')).default;
      book = ePub(epubData as ArrayBuffer);
      
      const rendition = book.renderTo(containerRef.current, {
        width: '100%',
        height: '100%',
        spread: 'none',
        flow: 'paginated'
      });
      
      renditionRef.current = rendition;

      // Read theme colors from the ref so we always get the LATEST preferences,
      // even when this callback fires on page turns long after initEpub ran.
      const getThemeColors = () => {
        const theme = preferencesRef.current.theme;
        const bg = theme === 'light' ? '#ffffff' : 
                   theme === 'sepia' ? '#f4ecd8' : 
                   theme === 'black' ? '#000000' : '#0a0e1a';
        const textColor = theme === 'light' ? '#000000' : 
                          theme === 'sepia' ? '#5c4033' : 
                          theme === 'black' ? '#e4e4e4' : '#ffffff';
        return { bg, textColor };
      };
      
      rendition.hooks.content.register((contents: any) => {
        contents.addStylesheet("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Literata:ital,wght@0,400;0,700;1,400;1,700&display=swap");
        
        // Inject a style tag directly into the epub iframe to force background/text colors
        // This fires on every page turn and is the most reliable way to override epub styles
        const { bg, textColor } = getThemeColors();
        const doc = contents.document;
        const existingStyle = doc.getElementById('buzzyreader-theme');
        if (existingStyle) existingStyle.remove();
        
        const style = doc.createElement('style');
        style.id = 'buzzyreader-theme';
        style.textContent = `
          html, body {
            background-color: ${bg} !important;
            background: ${bg} !important;
            color: ${textColor} !important;
          }
          * {
            color: ${textColor} !important;
            background-color: transparent !important;
          }
          html {
            background-color: ${bg} !important;
            background: ${bg} !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          body {
            background-color: ${bg} !important;
            background: ${bg} !important;
            max-width: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          ::selection {
            background: rgba(255, 255, 0, 0.3) !important;
          }
          @page {
            margin: 0 !important;
          }
          div, section, article {
            max-width: none !important;
          }
        `;
        doc.head.appendChild(style);
        
        // Strip inline color and background styles from all elements
        const allElements = doc.body.querySelectorAll('*');
        allElements.forEach((el: HTMLElement) => {
          if (el.style.color) el.style.color = '';
          if (el.style.backgroundColor) el.style.backgroundColor = '';
          if (el.style.background) el.style.background = '';
        });

        const logDebug = (msg: string) => {
          setDebugLog(prev => [...prev, msg].slice(-7));
        };

        // Custom iOS/mobile text selection handling fallback
        let selectionTimeout: NodeJS.Timeout;
        
        doc.addEventListener('touchstart', () => {
          logDebug('touchstart');
        }, { passive: true });

        doc.addEventListener('selectionchange', () => {
          clearTimeout(selectionTimeout);
          selectionTimeout = setTimeout(() => {
            const sel = contents.window.getSelection();
            if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
              const text = sel.toString().trim();
              logDebug(`selectionchange: ${text.substring(0, 5)}...`);
              if (text) {
                (contents.window as any).__lastSelectionText = text;
                try {
                  if (typeof contents.triggerSelectedEvent === 'function') {
                    contents.triggerSelectedEvent(sel);
                    logDebug('triggerSelectedEvent ok');
                  }
                } catch (err: any) {
                  logDebug(`triggerSelected err: ${err.message}`);
                }
              }
            } else {
              logDebug('selectionchange: collapsed');
            }
          }, 300);
        });
        
        doc.addEventListener('touchend', () => {
          logDebug('touchend');
          setTimeout(() => {
            const sel = contents.window.getSelection();
            if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
              const text = sel.toString().trim();
              if (text && !(contents.window as any).__lastSelectionText) {
                logDebug('touchend fallback run');
                (contents.window as any).__lastSelectionText = text;
                try {
                  if (typeof contents.triggerSelectedEvent === 'function') {
                    contents.triggerSelectedEvent(sel);
                  }
                } catch(e: any) {}
              }
            }
          }, 500);
        });
      });
      
      // Also style the iframe element itself so it never flashes white
      rendition.on('started', () => {
        const iframe = containerRef.current?.querySelector('iframe');
        if (iframe) {
          const { bg } = getThemeColors();
          iframe.style.background = bg;
        }
      });
      
      // Apply user preferences to the epub iframe via themes API (for font, spacing, alignment)
      const applyTheme = () => {
        const textAlign = preferences.textAlign || 'left';
        const textColor = preferences.theme === 'light' ? '#000000 !important' : 
                          preferences.theme === 'sepia' ? '#5c4033 !important' : 
                          preferences.theme === 'black' ? '#e4e4e4 !important' : '#ffffff !important';
        const bgColor = preferences.theme === 'light' ? '#ffffff !important' : 
                        preferences.theme === 'sepia' ? '#f4ecd8 !important' : 
                        preferences.theme === 'black' ? '#000000 !important' : '#0a0e1a !important';
        const fontStack = `${getFontStack(preferences.fontFamily)} !important`;
        const lineHeight = `${preferences.lineSpacing} !important`;
        
        rendition.themes.default({
          'html': {
            'background-color': bgColor,
            'background': bgColor
          },
          'body': {
            'font-family': fontStack,
            'font-size': `${preferences.fontSize}px !important`,
            'line-height': lineHeight,
            'text-align': `${textAlign} !important`,
            'background-color': bgColor,
            'background': bgColor,
            'color': textColor,
            'max-width': 'none !important',
            'padding': '0 !important',
            'margin': '0 !important'
          },
          'p': {
            'margin-bottom': `${preferences.paragraphSpacing}em !important`,
            'text-align': `${textAlign} !important`,
            'line-height': lineHeight,
            'font-family': fontStack,
            'color': textColor
          },
          'div, span, h1, h2, h3, h4, h5, h6, a, li, ul, ol, blockquote': {
            'color': textColor,
            'font-family': fontStack,
            'line-height': lineHeight,
            'background-color': 'transparent !important',
            'background': 'none !important'
          },
          'div': {
            'text-align': `${textAlign} !important`
          },
          '::selection': {
            'background': 'rgba(255, 255, 0, 0.3) !important'
          }
        });
      };
      applyTheme();
      
      // Handle text selection
      let lastSelectedCfi = '';
      let lastSelectionTime = 0;
      rendition.on('selected', (cfiRange: string, contents: any) => {
        setDebugLog(prev => [...prev, 'rendition.selected fired'].slice(-5));
        if (lastSelectedCfi === cfiRange) {
           setDebugLog(prev => [...prev, 'duplicate cfi'].slice(-5));
           return;
        }
        lastSelectedCfi = cfiRange;
        lastSelectionTime = Date.now();
        setTimeout(() => { lastSelectedCfi = ''; }, 1000);
        
        const handleSelection = (text: string) => {
          setDebugLog(prev => [...prev, `handleSelection text: ${text ? 'yes' : 'no'}`].slice(-5));
          if (!text) return;
          const currentActive = activeSelectionRef.current;
          
          if (currentActive && currentActive.id) {
            // Adjusting existing active highlight
            updateHighlight(currentActive.id, { cfiRange, text });
            
            try {
              renditionRef.current?.annotations.remove(currentActive.cfiRange, 'highlight');
              renditionRef.current?.annotations.highlight(cfiRange, {}, (e: any) => {
                const h = { ...currentActive, cfiRange, text };
                setActiveSelection(h);
                // Do NOT clear selection — leave native drag handles visible
              });
            } catch (e) {}
            
            setActiveSelection({ ...currentActive, cfiRange, text });
          } else {
            // Create new highlight automatically
            const id = crypto.randomUUID();
            const newHighlight = {
              id,
              bookId,
              cfiRange,
              text,
              color: 'yellow' as HighlightColor,
              createdAt: new Date().toISOString()
            };
            
            addHighlight(newHighlight);
            
            try {
              renditionRef.current?.annotations.highlight(cfiRange, {}, (e: any) => {
                setActiveSelection(newHighlight);
                // Do NOT clear selection — leave native drag handles visible
              });
            } catch (e) {}
            
            setActiveSelection(newHighlight);
          }
        };

        try {
          book.getRange(cfiRange).then((range: any) => {
            const text = range ? range.toString().trim() : '';
            handleSelection(text || contents.window.__lastSelectionText || '');
          }).catch(() => {
            handleSelection(contents.window.__lastSelectionText || '');
          });
        } catch (err) {
          handleSelection(contents.window.__lastSelectionText || '');
        }
      });
      
      // Clear selection on click elsewhere
      rendition.on('click', (e: any) => {
         setDebugLog(prev => [...prev, 'click fired'].slice(-5));
         // If they just made a selection, ignore synthesized clicks from the touchend event
         if (Date.now() - lastSelectionTime < 500) {
           setDebugLog(prev => [...prev, 'click ignored (time)'].slice(-5));
           return;
         }
         
         const selection = renditionRef.current?.getContents()?.[0]?.window.getSelection();
         
         // If there is an active text selection, they might be dragging handles. Do not close.
         if (selection && !selection.isCollapsed) {
           setDebugLog(prev => [...prev, 'click ignored (not collapsed)'].slice(-5));
           return;
         }
         
         // If they clicked on an epub.js SVG annotation, let the annotation's own callback handle it.
         if (e.target && (e.target.tagName?.toLowerCase() === 'svg' || e.target.closest?.('svg') || e.target.classList?.contains('epubjs-hl'))) {
           return;
         }
         
         if (activeSelectionRef.current && !activeSelectionRef.current.id) {
            // If it was just a temp selection we didn't save, remove the highlight
            try {
              renditionRef.current?.annotations.remove(activeSelectionRef.current.cfiRange, "highlight");
            } catch (err) {}
         }
         
         if (selection) selection.removeAllRanges();
         setActiveSelection(null);
      });
      
      rendition.on('keyup', (e: KeyboardEvent) => {
         if (e.key === 'ArrowLeft') {
           renditionRef.current?.prev();
         } else if (e.key === 'ArrowRight' || e.key === ' ') {
           renditionRef.current?.next();
         }
       });
       
       rendition.on('relocated', (location: any) => {
        const percentage = book.locations.percentageFromCfi(location.start.cfi);
        updateProgress(location.start.cfi, percentage);
      });
      
      // Wait for book to be ready before displaying
      book.ready.then(() => {
        // Generate locations for percentage calculation
        return book.locations.generate(1600); 
      }).then((locations: string[]) => {
        // After generating, update current location's percentage if any
        if (renditionRef.current && renditionRef.current.location) {
           const cfi = renditionRef.current.location.start.cfi;
           const percentage = book.locations.percentageFromCfi(cfi);
           updateProgress(cfi, percentage);
        }
      });
      
      if (initialCfi) {
        rendition.display(initialCfi);
      } else if (progress?.cfi) {
        rendition.display(progress.cfi);
      } else {
        rendition.display();
      }
    }

    initEpub();

    return () => {
      if (renditionRef.current) renditionRef.current.destroy();
      if (book) book.destroy();
    };
  }, [epubData, initialCfi]); // Removed progress from dependency to avoid re-mounting epub on progress change

  // Render highlights
  useEffect(() => {
    if (!renditionRef.current || !highlights) return;
    
    // Clear all existing highlights before re-rendering
    highlights.forEach(h => {
      try {
        renditionRef.current?.annotations.remove(h.cfiRange, 'highlight');
      } catch (e) {}
    });
    
    // Render them
    const colorMap = {
      yellow: 'rgba(251, 191, 36, 0.4)',
      green: 'rgba(52, 211, 153, 0.4)',
      blue: 'rgba(96, 165, 250, 0.4)',
      pink: 'rgba(244, 114, 182, 0.4)'
    };
    
    highlights.forEach(h => {
      try {
        renditionRef.current?.annotations.highlight(h.cfiRange, {}, (e: any) => {
          setActiveSelection(h);
          // Programmatically select the highlight range so native drag handles appear
          try {
            const contents = renditionRef.current?.getContents()?.[0];
            if (contents) {
              renditionRef.current?.book?.getRange(h.cfiRange).then((range: any) => {
                if (range) {
                  const sel = contents.window.getSelection();
                  if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(range);
                  }
                }
              });
            }
          } catch (err) {}
        }, undefined, {
          "fill": colorMap[h.color || 'yellow'],
          "fill-opacity": "1"
        });
      } catch (e) {}
    });
  }, [highlights, epubData]);

  // Listen for preference changes and apply them dynamically if epub is already loaded
  useEffect(() => {
    if (renditionRef.current) {
      const textAlign = preferences.textAlign || 'left';
      const textColor = preferences.theme === 'light' ? '#000000 !important' : 
                        preferences.theme === 'sepia' ? '#5c4033 !important' : 
                        preferences.theme === 'black' ? '#e4e4e4 !important' : '#ffffff !important';
      const bgColor = preferences.theme === 'light' ? '#ffffff !important' : 
                      preferences.theme === 'sepia' ? '#f4ecd8 !important' : 
                      preferences.theme === 'black' ? '#000000 !important' : '#0a0e1a !important';
      const bgRaw = preferences.theme === 'light' ? '#ffffff' : 
                    preferences.theme === 'sepia' ? '#f4ecd8' : 
                    preferences.theme === 'black' ? '#000000' : '#0a0e1a';
      const textRaw = preferences.theme === 'light' ? '#000000' : 
                      preferences.theme === 'sepia' ? '#5c4033' : 
                      preferences.theme === 'black' ? '#e4e4e4' : '#ffffff';
      const fontStack = `${getFontStack(preferences.fontFamily)} !important`;
      const lineHeight = `${preferences.lineSpacing} !important`;
      
      // Update iframe element background
      const iframe = containerRef.current?.querySelector('iframe');
      if (iframe) {
        iframe.style.background = bgRaw;
      }
      
      // Inject style tag into the current epub content AND strip inline styles
      try {
        const contents = renditionRef.current.getContents()?.[0];
        if (contents) {
          const doc = contents.document;
          const existingStyle = doc.getElementById('buzzyreader-theme');
          if (existingStyle) existingStyle.remove();
          
          const style = doc.createElement('style');
          style.id = 'buzzyreader-theme';
          style.textContent = `
            html, body {
              background-color: ${bgRaw} !important;
              background: ${bgRaw} !important;
              color: ${textRaw} !important;
            }
            * {
              color: ${textRaw} !important;
              background-color: transparent !important;
            }
            html {
              background-color: ${bgRaw} !important;
              background: ${bgRaw} !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            body {
              background-color: ${bgRaw} !important;
              background: ${bgRaw} !important;
              max-width: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            @page {
              margin: 0 !important;
            }
            div, section, article {
              max-width: none !important;
            }
          `;
          doc.head.appendChild(style);
          
          // Strip inline color and background styles from all elements
          // This is the nuclear option for epubs that hardcode styles inline
          const allElements = doc.body.querySelectorAll('*');
          allElements.forEach((el: HTMLElement) => {
            if (el.style.color) el.style.color = '';
            if (el.style.backgroundColor) el.style.backgroundColor = '';
            if (el.style.background) el.style.background = '';
          });
        }
      } catch (e) {}
      
      renditionRef.current.themes.default({
        'html': {
          'background-color': bgColor,
          'background': bgColor
        },
        'body': {
          'font-family': fontStack,
          'font-size': `${preferences.fontSize}px !important`,
          'line-height': lineHeight,
          'text-align': `${textAlign} !important`,
          'background-color': bgColor,
          'background': bgColor,
          'color': textColor
        },
        'p': {
          'margin-bottom': `${preferences.paragraphSpacing}em !important`,
          'text-align': `${textAlign} !important`,
          'line-height': lineHeight,
          'font-family': fontStack,
          'color': textColor
        },
        'div, span, h1, h2, h3, h4, h5, h6, a, li, ul, ol, blockquote': {
          'color': textColor,
          'font-family': fontStack,
          'line-height': lineHeight,
          'background-color': 'transparent !important',
          'background': 'none !important'
        },
        'div': {
          'text-align': `${textAlign} !important`
        }
      });
    }
  }, [preferences]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowLeft') {
        renditionRef.current?.prev();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault(); // prevent spacebar scroll
        renditionRef.current?.next();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading your book...</div>;
  }

  if (error || !epubData) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Oops!</h2>
        <p>{error || "Failed to load book."}</p>
        <button onClick={() => router.push('/library')}>Back to Library</button>
      </div>
    );
  }

  const pageBg = preferences.theme === 'light' ? '#ffffff' : 
                 preferences.theme === 'sepia' ? '#f4ecd8' : 
                 preferences.theme === 'black' ? '#000000' : '#0a0e1a';
  const textColor = preferences.theme === 'light' ? '#000000' : 
                    preferences.theme === 'sepia' ? '#5c4033' : 
                    preferences.theme === 'black' ? '#e4e4e4' : '#ffffff';
  const borderColor = preferences.theme === 'dark' ? '#333' : 
                      preferences.theme === 'sepia' ? '#d3c5a3' : 
                      preferences.theme === 'black' ? '#222' : '#ccc';

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100dvh', 
      width: '100vw', 
      background: pageBg, 
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Top Reading Progress Bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'rgba(128, 128, 128, 0.2)',
        zIndex: 50
      }}>
        <div style={{
          height: '100%',
          width: `${(progress?.percentage || 0) * 100}%`,
          background: textColor,
          transition: 'width 0.3s ease-out'
        }} />
      </div>
      <div 
        style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: '12px', width: '100%', maxWidth: '1000px', margin: '0 auto' }}
        onClick={() => {
          if (activeSelection) {
            setActiveSelection(null);
            const selection = renditionRef.current?.getContents()?.[0]?.window.getSelection();
            if (selection) selection.removeAllRanges();
          }
        }}
      >
        <div ref={containerRef} style={{ position: 'absolute', inset: '12px' }} />
      </div>

      <div style={{ display: 'flex', width: '100%', height: '50px', borderTop: `1px solid ${borderColor}`, zIndex: 10, background: 'transparent' }}>
        <button 
          onClick={() => router.push('/library')} 
          style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRight: `1px solid ${borderColor}`, cursor: 'pointer', color: textColor, fontSize: '18px' }}
        >
          <img src="/logo.png" alt="Back to library" width={22} height={22} style={{ filter: (preferences.theme === 'dark' || preferences.theme === 'black') ? 'invert(1)' : 'none' }} />
        </button>
        <button 
          onClick={() => {
            if (activeSelection) {
              const selection = renditionRef.current.getContents()[0].window.getSelection();
              if (selection) selection.removeAllRanges();
              setActiveSelection(null);
            }
            setIsSettingsOpen(!isSettingsOpen);
          }} 
          style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRight: `1px solid ${borderColor}`, cursor: 'pointer', color: textColor, fontSize: '18px' }}
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        <button 
          onClick={() => {
            if (activeSelection) {
              const selection = renditionRef.current.getContents()[0].window.getSelection();
              if (selection) selection.removeAllRanges();
              setActiveSelection(null);
            }
            renditionRef.current?.prev();
          }} 
          style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRight: `1px solid ${borderColor}`, cursor: 'pointer', color: textColor, fontSize: '24px' }}
        >
          &larr;
        </button>
        <button 
          onClick={() => {
            if (activeSelection) {
              const selection = renditionRef.current.getContents()[0].window.getSelection();
              if (selection) selection.removeAllRanges();
              setActiveSelection(null);
            }
            renditionRef.current?.next();
          }} 
          style={{ width: '55%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: textColor, fontSize: '24px' }}
        >
          &rarr;
        </button>
      </div>

      <HighlightMenu
        show={activeSelection !== null}
        isExisting={!!activeSelection?.id}
        initialNote={activeSelection?.note}
        initialColor={activeSelection?.color}
        onSelectColor={(color, note) => {
          if (activeSelection) {
            if (activeSelection.id) {
              // Existing highlight
              updateHighlight(activeSelection.id, { color, note });
              setActiveSelection({ ...activeSelection, color, note });
            } else {
              // Should not happen anymore, but just in case
              const newHighlight = {
                id: crypto.randomUUID(),
                bookId: bookId,
                cfiRange: activeSelection.cfiRange,
                text: activeSelection.text,
                color,
                note,
                createdAt: new Date().toISOString()
              };
              addHighlight(newHighlight);
              setActiveSelection(null);
            }
            const selection = renditionRef.current?.getContents()[0].window.getSelection();
            if (selection) selection.removeAllRanges();
          }
        }}
        onDelete={() => {
          if (activeSelection?.id) {
            removeHighlight(activeSelection.id);
            try {
              renditionRef.current?.annotations.remove(activeSelection.cfiRange, "highlight");
            } catch (e) {}
          }
          setActiveSelection(null);
          const selection = renditionRef.current?.getContents()[0].window.getSelection();
          if (selection) selection.removeAllRanges();
        }}
        onCancel={() => {
          if (activeSelection && !activeSelection.id) {
            // Unsaved highlight being cancelled
            try {
              renditionRef.current?.annotations.remove(activeSelection.cfiRange, "highlight");
            } catch (e) {}
          }
          setActiveSelection(null);
          const selection = renditionRef.current?.getContents()[0].window.getSelection();
          if (selection) selection.removeAllRanges();
        }}
      />

      <ReaderSettingsOverlay
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={preferences}
        updatePreferences={updatePreferences}
      />
      
      {/* DEBUG LOGGER (Temporary for mobile debugging) */}
      <div style={{ position: 'absolute', top: '100px', right: '10px', zIndex: 9999, background: 'rgba(0,0,0,0.8)', color: '#0f0', fontSize: '10px', padding: '4px', pointerEvents: 'none', maxWidth: '200px' }}>
        {debugLog.map((log, i) => <div key={i}>{log}</div>)}
      </div>

    </div>
  );
}
