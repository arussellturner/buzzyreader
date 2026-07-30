'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/Auth/AuthProvider';
import ThemeToggle from './ThemeToggle';
import styles from './Navbar.module.css';

interface NavbarProps {
  activePage: 'library' | 'highlights';
}

export default function Navbar({ activePage }: NavbarProps) {
  const { user, isSignedIn, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Close mobile menu on route change / resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleSignOut = useCallback(() => {
    setMenuOpen(false);
    signOut();
  }, [signOut]);

  return (
    <>
      <nav className={styles.navbar}>
        {/* Logo */}
        <Link href="/library" className={styles.logo}>
          <span className={styles.logoEmoji} aria-hidden="true">🐝</span>
          <span className={styles.logoText}>BuzzyReader</span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className={styles.navLinks}>
          <li>
            <Link
              href="/library"
              className={`${styles.navLink} ${activePage === 'library' ? styles.active : ''}`}
            >
              <svg className={styles.navLinkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Library
            </Link>
          </li>
          <li>
            <Link
              href="/highlights"
              className={`${styles.navLink} ${activePage === 'highlights' ? styles.active : ''}`}
            >
              <svg className={styles.navLinkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
              </svg>
              Highlights
            </Link>
          </li>
        </ul>

        {/* Right: Theme + User */}
        <div className={styles.userSection}>
          <ThemeToggle />

          {isSignedIn && user ? (
            <div className={styles.userMenu} ref={menuRef}>
              <img
                className={styles.userAvatar}
                src={user.image || ''}
                alt={user.name || 'User'}
                width={32}
                height={32}
                onClick={() => setMenuOpen((prev) => !prev)}
                referrerPolicy="no-referrer"
              />

              {menuOpen && (
                <div className={styles.userMenuDropdown}>
                  <div className={styles.userMenuHeader}>
                    <div className={styles.userName}>{user.name}</div>
                    <div className={styles.userEmail}>{user.email}</div>
                  </div>

                  <button
                    className={`${styles.userMenuItem} ${styles.userMenuItemDanger}`}
                    onClick={handleSignOut}
                  >
                    <svg className={styles.userMenuItemIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Hamburger (mobile) */}
          <button
            className={`${styles.hamburger} ${mobileOpen ? styles.open : ''}`}
            onClick={toggleMobile}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
            <span className={styles.hamburgerLine} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${mobileOpen ? styles.open : ''}`}>
        <Link
          href="/library"
          className={`${styles.mobileNavLink} ${activePage === 'library' ? styles.active : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          Library
        </Link>
        <Link
          href="/highlights"
          className={`${styles.mobileNavLink} ${activePage === 'highlights' ? styles.active : ''}`}
          onClick={() => setMobileOpen(false)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
          </svg>
          Highlights
        </Link>
      </div>

      {/* Spacer to push content below fixed navbar */}
      <div className={styles.navSpacer} />
    </>
  );
}
