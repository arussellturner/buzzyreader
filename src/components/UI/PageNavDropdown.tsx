'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './PageNavDropdown.module.css';

interface PageNavDropdownProps {
  activePage: 'library' | 'wishlist' | 'highlights';
}

export default function PageNavDropdown({ activePage }: PageNavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const PAGE_TITLES = {
    library: 'Library',
    wishlist: 'Wishlist',
    highlights: 'Highlights',
  };

  return (
    <div className={styles.navContainer} ref={menuRef}>
      <button 
        className={styles.navButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <h1>{PAGE_TITLES[activePage]}</h1>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      {isOpen && (
        <div className={styles.dropdownMenu}>
          <button 
            className={`${styles.dropdownItem} ${activePage === 'library' ? styles.active : ''}`}
            onClick={() => {
              setIsOpen(false);
              router.push('/library');
            }}
          >
            Library
          </button>
          <button 
            className={`${styles.dropdownItem} ${activePage === 'wishlist' ? styles.active : ''}`}
            onClick={() => {
              setIsOpen(false);
              router.push('/wishlist');
            }}
          >
            Wishlist
          </button>
          <button 
            className={`${styles.dropdownItem} ${activePage === 'highlights' ? styles.active : ''}`}
            onClick={() => {
              setIsOpen(false);
              router.push('/highlights');
            }}
          >
            Highlights
          </button>
        </div>
      )}
    </div>
  );
}
