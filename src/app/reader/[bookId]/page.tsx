'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { usePreferences } from '@/hooks/usePreferences';
import { useHighlights } from '@/hooks/useHighlights';
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
  const bookId = params.bookId as string;

  const { library, driveStorage } = useGoogleDrive();
  const { preferences, updatePreferences } = usePreferences();
  const { highlights, addHighlight, loadHighlights } = useHighlights();
  
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Highlight state
  const [activeSelection, setActiveSelection] = useState<{ cfiRange: string, text: string } | null>(null);

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
        // Load highlights in parallel
        if (sessionObj.data?.accessToken) {
          loadHighlights(sessionObj.data.accessToken as string, bookId);
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
      
      // Apply user preferences to the epub iframe
      const applyTheme = () => {
        rendition.themes.default({
          'body': {
            'font-family': `${getFontStack(preferences.fontFamily)} !important`,
            'font-size': `${preferences.fontSize}px !important`,
            'line-height': `${preferences.lineSpacing} !important`,
            'text-align': `${preferences.textAlign || 'left'} !important`,
            'background-color': 'transparent !important',
            'color': preferences.theme === 'light' ? '#000000 !important' : 
                     preferences.theme === 'sepia' ? '#5c4033 !important' : '#ffffff !important'
          },
          'p': {
            'margin-bottom': `${preferences.paragraphSpacing}em !important`
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
      
      rendition.display();
    }

    initEpub();

    return () => {
      if (renditionRef.current) renditionRef.current.destroy();
      if (book) book.destroy();
    };
  }, [epubData]); // Re-run when epubData loads

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
        rendition.annotations.highlight(h.cfiRange, {}, (e: Event) => {
          console.log("Clicked highlight", h);
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
      renditionRef.current.themes.default({
        'body': {
          'font-family': `${getFontStack(preferences.fontFamily)} !important`,
          'font-size': `${preferences.fontSize}px !important`,
          'line-height': `${preferences.lineSpacing} !important`,
          'text-align': `${preferences.textAlign || 'left'} !important`,
          'background-color': 'transparent !important',
          'color': preferences.theme === 'light' ? '#000000 !important' : 
                   preferences.theme === 'sepia' ? '#5c4033 !important' : '#ffffff !important'
        },
        'p': {
          'margin-bottom': `${preferences.paragraphSpacing}em !important`
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

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100dvh', 
      width: '100vw', 
      background: preferences.theme === 'light' ? '#ffffff' : 
                  preferences.theme === 'sepia' ? '#f4ecd8' : '#0a0e1a', 
      overflow: 'hidden' 
    }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      </div>

      <div style={{ display: 'flex', width: '100%', height: '50px', borderTop: `1px solid ${preferences.theme === 'dark' ? '#333' : '#ccc'}`, zIndex: 10 }}>
        <button 
          onClick={() => router.push('/library')} 
          style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: preferences.theme === 'dark' ? '#111827' : '#eee', border: 'none', borderRight: `1px solid ${preferences.theme === 'dark' ? '#333' : '#ccc'}`, cursor: 'pointer', color: preferences.theme === 'dark' ? '#fff' : '#000', fontSize: '18px' }}
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
          style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: preferences.theme === 'dark' ? '#111827' : '#eee', border: 'none', borderRight: `1px solid ${preferences.theme === 'dark' ? '#333' : '#ccc'}`, cursor: 'pointer', color: preferences.theme === 'dark' ? '#fff' : '#000', fontSize: '18px' }}
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
          style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: preferences.theme === 'dark' ? '#111827' : '#eee', border: 'none', borderRight: `1px solid ${preferences.theme === 'dark' ? '#333' : '#ccc'}`, cursor: 'pointer', color: preferences.theme === 'dark' ? '#fff' : '#000', fontSize: '24px' }}
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
          style={{ width: '55%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: preferences.theme === 'dark' ? '#111827' : '#eee', border: 'none', cursor: 'pointer', color: preferences.theme === 'dark' ? '#fff' : '#000', fontSize: '24px' }}
        >
          &rarr;
        </button>
      </div>

      <HighlightMenu
        show={activeSelection !== null}
        onSelectColor={(color, note) => {
          if (activeSelection) {
            addHighlight({
              id: crypto.randomUUID(),
              bookId,
              cfiRange: activeSelection.cfiRange,
              text: activeSelection.text,
              color,
              note,
              createdAt: new Date().toISOString()
            });
            // Clear selection
            const selection = renditionRef.current.getContents()[0].window.getSelection();
            if (selection) selection.removeAllRanges();
            setActiveSelection(null);
          }
        }}
        onCancel={() => {
          const selection = renditionRef.current.getContents()[0].window.getSelection();
          if (selection) selection.removeAllRanges();
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
