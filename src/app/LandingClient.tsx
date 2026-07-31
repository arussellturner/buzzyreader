'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/Auth/AuthProvider';
import SignInButton from '@/components/Auth/SignInButton';
import styles from './page.module.css';

export default function LandingClient() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.replace('/library');
    }
  }, [isSignedIn, router]);

  if (isSignedIn) {
    return null;
  }

  return <SignInButton className={styles.signInButton} />;
}
