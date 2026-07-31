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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Highlight state
  const [activeSelection, setActiveSelection] = useState<{ id?: string, cfiRange: string, text: string, color?: HighlightColor, note?: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);

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
      
      rendition.hooks.content.register((contents: any) => {
        contents.addStylesheet("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Literata:ital,wght@0,400;0,700;1,400;1,700&display=swap");
      });
      
      // Apply user preferences to the epub iframe
      const applyTheme = () => {
        const textAlign = preferences.textAlign || 'left';
        const textColor = preferences.theme === 'light' ? '#000000 !important' : 
                          preferences.theme === 'sepia' ? '#5c4033 !important' : '#ffffff !important';
        const fontStack = `${getFontStack(preferences.fontFamily)} !important`;
        const lineHeight = `${preferences.lineSpacing} !important`;
        
        rendition.themes.default({
          'html': {
            'background-color': 'transparent !important',
            'background': 'none !important'
          },
          'body': {
            'font-family': fontStack,
            'font-size': `${preferences.fontSize}px !important`,
            'line-height': lineHeight,
            'text-align': `${textAlign} !important`,
            'background-color': 'transparent !important',
            'background': 'none !important',
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
          },
          '::selection': {
            'background': 'rgba(255, 255, 0, 0.3) !important'
          }
        });
      };
      applyTheme();
      
      // Handle text selection
      rendition.on('selected', (cfiRange: string, contents: any) => {
        book.getRange(cfiRange).then((range: any) => {
          if (range) {
            setActiveSelection({
              cfiRange,
              text: range.toString()
            });
          }
        });
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
    if (renditionRef.current && highlights.length > 0) {
      const rendition = renditionRef.current;
      
      // Define styles for our highlight colors
      const colorMap = {
        yellow: 'rgba(251, 191, 36, 0.4)',
        green: 'rgba(52, 211, 153, 0.4)',
        blue: 'rgba(96, 165, 250, 0.4)',
        pink: 'rgba(244, 114, 182, 0.4)'
      };

      highlights.forEach(h => {
        // First, clear any existing annotation for this range to prevent duplicates/stacking
        try {
          rendition.annotations.remove(h.cfiRange, "highlight");
        } catch (e) {
          // Ignore if it doesn't exist
        }
        
        rendition.annotations.highlight(h.cfiRange, {}, (e: Event) => {
          setActiveSelection({
            id: h.id,
            cfiRange: h.cfiRange,
            text: h.text,
            color: h.color,
            note: h.note
          });
        }, undefined, {
          "fill": colorMap[h.color],
          "fill-opacity": "1"
        });
      });
    }
  }, [highlights, epubData]); // Run when highlights load/change, or when epub loads

  // Listen for preference changes and apply them dynamically if epub is already loaded
  useEffect(() => {
    if (renditionRef.current) {
      const textAlign = preferences.textAlign || 'left';
      const textColor = preferences.theme === 'light' ? '#000000 !important' : 
                        preferences.theme === 'sepia' ? '#5c4033 !important' : '#ffffff !important';
      const fontStack = `${getFontStack(preferences.fontFamily)} !important`;
      const lineHeight = `${preferences.lineSpacing} !important`;
      
      renditionRef.current.themes.default({
        'html': {
          'background-color': 'transparent !important',
          'background': 'none !important'
        },
        'body': {
          'font-family': fontStack,
          'font-size': `${preferences.fontSize}px !important`,
          'line-height': lineHeight,
          'text-align': `${textAlign} !important`,
          'background-color': 'transparent !important',
          'background': 'none !important',
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
                 preferences.theme === 'sepia' ? '#f4ecd8' : '#0a0e1a';
  const textColor = preferences.theme === 'light' ? '#000000' : 
                    preferences.theme === 'sepia' ? '#5c4033' : '#ffffff';
  const borderColor = preferences.theme === 'dark' ? '#333' : 
                      preferences.theme === 'sepia' ? '#d3c5a3' : '#ccc';

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100dvh', 
      width: '100vw', 
      background: pageBg, 
      overflow: 'hidden' 
    }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      </div>

      <div style={{ display: 'flex', width: '100%', height: '50px', borderTop: `1px solid ${borderColor}`, zIndex: 10, background: 'transparent' }}>
        <button 
          onClick={() => router.push('/library')} 
          style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRight: `1px solid ${borderColor}`, cursor: 'pointer', color: textColor, fontSize: '18px' }}
        >
          🐝
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
          ⚙️
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
              // Edit existing highlight
              updateHighlight(activeSelection.id, { color, note });
            } else {
              // Create new highlight
              addHighlight({
                id: crypto.randomUUID(),
                bookId,
                cfiRange: activeSelection.cfiRange,
                text: activeSelection.text,
                color,
                note,
                createdAt: new Date().toISOString()
              });
            }
            
            // Clear selection in epubjs if it was a new highlight
            if (!activeSelection.id) {
              const selection = renditionRef.current?.getContents()?.[0]?.window.getSelection();
              if (selection) selection.removeAllRanges();
            }
            
            setActiveSelection(null);
          }
        }}
        onDelete={() => {
          if (activeSelection?.id) {
            removeHighlight(activeSelection.id);
            try {
              renditionRef.current?.annotations.remove(activeSelection.cfiRange, "highlight");
            } catch (e) {}
            setActiveSelection(null);
          }
        }}
        onCancel={() => {
          if (activeSelection && !activeSelection.id) {
            const selection = renditionRef.current?.getContents()?.[0]?.window.getSelection();
            if (selection) selection.removeAllRanges();
          }
          setActiveSelection(null);
        }}
      />

      <ReaderSettingsOverlay 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        preferences={preferences}
        updatePreferences={updatePreferences}
      />
    </div>
  );
}
