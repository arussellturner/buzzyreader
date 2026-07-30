'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/UI/Navbar';
import HighlightCard from '@/components/Highlights/HighlightCard';
import { useGoogleDrive } from '@/hooks/useGoogleDrive';
import { BookHighlights } from '@/types/highlight';
import { getAllHighlights } from '@/lib/storage/driveStorage';
import styles from './highlights.module.css';

export default function HighlightsPage() {
  const sessionObj = useSession();
  const session = sessionObj?.data;
  const status = sessionObj?.status || 'unauthenticated';
  const router = useRouter();
  const { library, loading: libraryLoading, driveStorage } = useGoogleDrive();
  
  const [allHighlights, setAllHighlights] = useState<BookHighlights[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchHighlights() {
      if (!driveStorage || !library || libraryLoading) return;
      
      try {
        setLoading(true);
        const highlightsData = await getAllHighlights(driveStorage, library);
        setAllHighlights(highlightsData);
      } catch (error) {
        console.error('Error fetching highlights:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHighlights();
  }, [driveStorage, library, libraryLoading]);

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  const filteredHighlights = allHighlights.map(bh => ({
    ...bh,
    highlights: bh.highlights.filter(h => 
      h.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (h.note && h.note.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(bh => bh.highlights.length > 0);

  const getBookTitle = (bookId: string) => {
    return library?.books.find(b => b.id === bookId)?.title || 'Unknown Book';
  };

  return (
    <div className={styles.highlightsPage}>
      <Navbar activePage="highlights" />
      
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Your Highlights</h1>
            
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search highlights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} />
              <p>Loading highlights...</p>
            </div>
          ) : allHighlights.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🖍️</div>
              <h2>No highlights yet</h2>
              <p>Start reading and highlighting passages in your books.</p>
            </div>
          ) : filteredHighlights.length === 0 ? (
             <div className={styles.emptyState}>
              <p>No highlights match your search.</p>
            </div>
          ) : (
            <div className={styles.highlightList}>
              {filteredHighlights.map((bookGroup) => (
                <div key={bookGroup.bookId} className={styles.bookSection}>
                  <h2 className={styles.bookTitle}>
                    {getBookTitle(bookGroup.bookId)}
                    <span className={styles.countBadge}>
                      {bookGroup.highlights.length}
                    </span>
                  </h2>
                  
                  <div className={styles.highlightsGrid}>
                    {bookGroup.highlights.map(highlight => (
                      <HighlightCard
                        key={highlight.id}
                        highlight={highlight}
                        onNavigate={() => router.push(`/reader/${bookGroup.bookId}?cfi=${encodeURIComponent(highlight.cfiRange)}`)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
