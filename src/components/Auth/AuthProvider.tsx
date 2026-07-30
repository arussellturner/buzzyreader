'use client';

import React, { ReactNode } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();
  
  return {
    user: session?.user || null,
    accessToken: (session as any)?.accessToken || null,
    isLoading: status === 'loading',
    isSignedIn: status === 'authenticated',
    signIn,
    signOut,
  };
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
