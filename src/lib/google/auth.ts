import NextAuth from 'next-auth';
import Google from '@auth/core/providers/google';
import type { NextAuthConfig } from 'next-auth';

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.readonly',
  'openid',
  'email',
  'profile',
];

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: SCOPES.join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user.email?.toLowerCase() !== 'arussellturner@gmail.com') {
        console.warn(`Unauthorized login attempt blocked for: ${user.email}`);
        return false;
      }
      return true;
    },
    async jwt({ token, account }) {
      // On initial sign-in, persist OAuth tokens into the JWT
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }

      // If the access token has not expired, return it as-is
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // Access token has expired — attempt to refresh it
      if (token.refreshToken) {
        try {
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string,
            }),
          });

          const refreshedTokens = await response.json();

          if (!response.ok) {
            throw new Error(
              `Token refresh failed: ${JSON.stringify(refreshedTokens)}`
            );
          }

          return {
            ...token,
            accessToken: refreshedTokens.access_token,
            expiresAt: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
            // Only update refresh token if a new one was issued
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
          };
        } catch (error) {
          console.error('Error refreshing access token:', error);
          // Return the token with an error flag so the client can handle it
          return { ...token, error: 'RefreshAccessTokenError' };
        }
      }

      return token;
    },

    async session({ session, token }) {
      // Expose the access token and any error to the client session
      session.accessToken = token.accessToken as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Augment the next-auth types to include custom fields
declare module 'next-auth' {
  interface Session {
    accessToken: string;
    error?: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
