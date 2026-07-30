'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { useReadingProgress } from '@/hooks/useReadingProgress';
import { useHighlights } from '@/hooks/useHighlights';
import { usePreferences } from '@/hooks/usePreferences';
import { useTTS } from '@/hooks/useTTS';

import ReaderView from '@/components/Reader/ReaderView';
import ReaderToolbar from '@/components/Reader/ReaderToolbar';
import ReaderSettings from '@/components/Reader/ReaderSettings';
import ProgressBar from '@/components/Reader/ProgressBar';
import TTSControls from '@/components/Reader/TTSControls';
import HighlightPanel from '@/components/Reader/HighlightPanel';
import HighlightPopup from '@/components/Reader/HighlightPopup';
import ThemeToggle from '@/components/UI/ThemeToggle';

import styles from './reader.module.css';
import readerStyles from '@/components/Reader/Reader.module.css';

export default function ReaderPage() {
  const sessionObj = useSession() || {};
  const session = sessionObj.data;
  const status = sessionObj.status || 'unauthenticated';
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const bookId = params.bookId as string;
  const initialCfi = searchParams.get('cfi') || undefined;

  const { library, driveStorage } = useGoogleDrive();
  const { progress, updateProgress, loadProgress } = useReadingProgress();
  const { highlights, addHighlight, removeHighlight, loadHighlights } = useHighlights();
  const { preferences, updatePreferences } = usePreferences();
  const tts = useTTS({ rate: preferences.ttsRate });

  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [highlightsOpen, setHighlightsOpen] = useState(false);
  const [ttsOpen, setTtsOpen] = useState(false);
  
  const [selection, setSelection] = useState<{ text: string, cfiRange: string, rect: DOMRect } | null>(null);

  const toolbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const book = library?.books.find(b => b.id === bookId);

  const hideToolbarDelayed = () => {
    if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
    toolbarTimeoutRef.current = setTimeout(() => setToolbarVisible(false), 3000);
  };

  useEffect(() => {
    if (toolbarVisible && !settingsOpen && !highlightsOpen && !ttsOpen) {
      hideToolbarDelayed();
    }
    return () => {
      if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
    };
  }, [toolbarVisible, settingsOpen, highlightsOpen, ttsOpen]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    async function loadBookData() {
      if (!driveStorage || !book) return;
      
      const accessToken = (session as any)?.accessToken as string || '';

      try {
        setLoading(true);
        const data = await driveStorage.getEpubFileContent(book.driveFileId);
        setEpubData(data);
        
        await loadProgress(accessToken, bookId);
        await loadHighlights(accessToken, bookId);
      } catch (err: any) {
        console.error("Failed to load book:", err);
        setError(err.message || 'Failed to load book from Google Drive');
      } finally {
        setLoading(false);
      }
    }

    if (status === 'authenticated' && book && driveStorage && !epubData) {
      loadBookData();
    } else if (library && !book) {
      setError("Book not found in library");
      setLoading(false);
    }
  }, [status, book, driveStorage, library, bookId, loadProgress, loadHighlights]);

  const handleLocationChange = (loc: any) => {
    updateProgress(loc.cfi, loc.percentage);
  };

  const handleTextSelected = (sel: any) => {
    setSelection({ text: sel.text, cfiRange: sel.cfiRange, rect: { left: sel.position.x, top: sel.position.y, width: 0 } as any });
    setToolbarVisible(false);
  };

  const handleCreateHighlight = async (color: any) => {
    if (!selection) return;
    
    await addHighlight({
      id: crypto.randomUUID(),
      bookId,
      cfiRange: selection.cfiRange,
      text: selection.text,
      color,
      createdAt: new Date().toISOString()
    });
    
    setSelection(null);
  };

  const handleToggleToolbar = () => {
    setToolbarVisible(prev => !prev);
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={readerStyles.spinner}></div>
        <p>Loading your book...</p>
      </div>
    );
  }

  if (error || !epubData) {
    return (
      <div className={styles.errorState}>
        <h2>Oops!</h2>
        <p>{error || "Failed to load book."}</p>
        <button onClick={() => router.push('/library')}>Back to Library</button>
      </div>
    );
  }

  return (
    <div className={styles.readerPage} onClick={handleToggleToolbar}>
      <div className={`${readerStyles.readerToolbar} ${toolbarVisible ? readerStyles.toolbarVisible : readerStyles.toolbarHidden}`} onClick={e => e.stopPropagation()}>
        <ReaderToolbar
          visible={toolbarVisible}
          bookTitle={book?.title || 'Unknown'}
          onBack={() => router.push('/library')}
          onToggleSettings={() => setSettingsOpen(!settingsOpen)}
          onToggleHighlights={() => setHighlightsOpen(!highlightsOpen)}
          onToggleTTS={() => setTtsOpen(!ttsOpen)}
        />
        <div className={readerStyles.toolbarThemeToggle}>
          <ThemeToggle />
        </div>
      </div>

      <div className={styles.epubWrapper}>
        <ReaderView
          epubData={epubData}
          initialCfi={initialCfi || progress?.cfi}
          onLocationChange={handleLocationChange}
          onTextSelected={handleTextSelected}
          highlights={highlights}
          preferences={preferences}
        />
        
        {/* Navigation Zones */}
        <div 
          className={`${styles.navZone} ${styles.navZoneLeft}`} 
          onClick={(e) => {
            e.stopPropagation();
            const epubEl = document.querySelector('[data-reader-view]') as any;
            epubEl?._goPrev?.();
          }} 
        />
        <div 
          className={`${styles.navZone} ${styles.navZoneCenter}`} 
          onClick={(e) => {
            e.stopPropagation();
            handleToggleToolbar();
          }} 
        />
        <div 
          className={`${styles.navZone} ${styles.navZoneRight}`} 
          onClick={(e) => {
            e.stopPropagation();
            const epubEl = document.querySelector('[data-reader-view]') as any;
            epubEl?._goNext?.();
          }} 
        />
      </div>

      {settingsOpen && (
        <ReaderSettings
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          preferences={preferences}
          onUpdatePreferences={updatePreferences}
        />
      )}

      {highlightsOpen && (
        <HighlightPanel
          isOpen={highlightsOpen}
          onClose={() => setHighlightsOpen(false)}
          highlights={highlights}
          bookTitle={book?.title || 'Unknown'}
          onDeleteHighlight={(id) => removeHighlight(id)}
          onHighlightClick={(h) => {}}
        />
      )}

      {ttsOpen && (
        <TTSControls
          isActive={ttsOpen}
          isPlaying={tts.isPlaying}
          isPaused={tts.isPaused}
          onPlay={() => tts.speak('')}
          onPause={tts.pause}
          onResume={tts.resume}
          onStop={() => { tts.stop(); setTtsOpen(false); }}
          rate={tts.rate}
          onRateChange={tts.setRate}
          voices={tts.availableVoices}
          onVoiceChange={tts.setVoice}
          currentVoice={tts.currentVoice?.voiceURI}
        />
      )}

      {selection && (
        <HighlightPopup
          visible={!!selection}
          position={{ x: selection.rect.left + (selection.rect.width / 2), y: selection.rect.top }}
          onHighlight={handleCreateHighlight}
          onClose={() => setSelection(null)}
        />
      )}

      {preferences.showProgress && (
        <ProgressBar
          percentage={progress?.percentage || 0}
          currentPage={progress?.currentPage || 0}
          totalPages={progress?.totalPages || 0}
          showProgress={true}
          onToggle={() => {}}
        />
      )}
    </div>
  );
}
