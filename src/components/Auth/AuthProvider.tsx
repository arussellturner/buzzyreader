'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  accessToken: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  isSignedIn: false,
  signIn: () => {},
  signOut: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signIn = useCallback(() => {
    // Google Identity Services sign-in will be wired here
    setIsLoading(true);
    console.log('Sign in triggered — Google Identity Services will be connected here');
    setIsLoading(false);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isSignedIn: !!user,
      signIn,
      signOut,
    }),
    [user, isLoading, signIn, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
