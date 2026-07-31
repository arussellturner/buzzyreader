'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';

export default function ReaderPage() {
  const sessionObj = useSession() || {};
  const status = sessionObj.status || 'unauthenticated';
  const router = useRouter();
  const params = useParams();
  const bookId = params.bookId as string;

  const { library, driveStorage } = useGoogleDrive();
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      rendition.display();
    }

    initEpub();

    return () => {
      if (renditionRef.current) renditionRef.current.destroy();
      if (book) book.destroy();
    };
  }, [epubData]);

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', background: '#fff', overflow: 'hidden' }}>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      </div>

      <div style={{ display: 'flex', width: '100%', height: '50px', borderTop: '1px solid #ccc' }}>
        <button 
          onClick={() => router.push('/library')} 
          style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', border: 'none', borderRight: '1px solid #ccc', cursor: 'pointer', color: '#000', fontSize: '18px' }}
        >
          🐝
        </button>
        <button 
          onClick={() => { /* TODO: Open Settings */ }} 
          style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', border: 'none', borderRight: '1px solid #ccc', cursor: 'pointer', color: '#000', fontSize: '18px' }}
          title="Settings"
        >
          ⚙️
        </button>
        <button 
          onClick={() => renditionRef.current?.prev()} 
          style={{ width: '15%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', border: 'none', borderRight: '1px solid #ccc', cursor: 'pointer', color: '#000', fontSize: '24px' }}
        >
          &larr;
        </button>
        <button 
          onClick={() => renditionRef.current?.next()} 
          style={{ width: '55%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eee', border: 'none', cursor: 'pointer', color: '#000', fontSize: '24px' }}
        >
          &rarr;
        </button>
      </div>
    </div>
  );
}
