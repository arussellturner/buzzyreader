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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#fff' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => router.push('/library')} style={{ padding: '8px 16px', background: '#eee', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', color: '#000' }}>
          Back to Library
        </button>
      </div>
      
      <div style={{ flex: 1, position: 'relative' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      </div>

      <div style={{ padding: '16px', borderTop: '1px solid #ccc', display: 'flex', justifyContent: 'center', gap: '16px' }}>
        <button onClick={() => renditionRef.current?.prev()} style={{ padding: '8px 16px', background: '#eee', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', color: '#000' }}>
          Previous Page
        </button>
        <button onClick={() => renditionRef.current?.next()} style={{ padding: '8px 16px', background: '#eee', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', color: '#000' }}>
          Next Page
        </button>
      </div>
    </div>
  );
}
