'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import styles from './UserMenu.module.css';

export default function UserMenu() {
  const sessionObj = useSession() || {};
  const session = sessionObj.data;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const user = session?.user;

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleSignOut = useCallback(() => {
    setIsOpen(false);
    signOut({ callbackUrl: '/' });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  if (!user) return null;

  const initials = (user.name ?? user.email ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={styles.container}>
      <button
        ref={buttonRef}
        className={styles.avatarButton}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User menu"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name ?? 'User avatar'}
            className={styles.avatar}
            referrerPolicy="no-referrer"
            width={36}
            height={36}
          />
        ) : (
          <span className={styles.avatarFallback}>{initials}</span>
        )}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className={styles.dropdown}
          role="menu"
          aria-label="User menu"
        >
          <div className={styles.userInfo}>
            {user.image && (
              <img
                src={user.image}
                alt=""
                className={styles.dropdownAvatar}
                referrerPolicy="no-referrer"
                width={48}
                height={48}
              />
            )}
            <div className={styles.userDetails}>
              {user.name && (
                <span className={styles.userName}>{user.name}</span>
              )}
              {user.email && (
                <span className={styles.userEmail}>{user.email}</span>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          <button
            className={styles.menuItem}
            onClick={handleSignOut}
            role="menuitem"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
