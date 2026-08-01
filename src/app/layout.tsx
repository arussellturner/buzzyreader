import type { Metadata, Viewport } from 'next';
import { Inter, Literata } from 'next/font/google';
import AuthProvider from '@/components/Auth/AuthProvider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const literata = Literata({
  variable: '--font-literata',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'BuzzyReader — Your Books, Everywhere',
  description:
    'A premium cloud-synced ePub reader powered by Google Drive. Read beautifully on any device with seamless progress sync, smart highlights, and text-to-speech.',
  keywords: ['epub reader', 'ebook reader', 'google drive', 'cloud sync', 'reading app'],
  authors: [{ name: 'BuzzyReader' }],
  openGraph: {
    title: 'BuzzyReader — Your Books, Everywhere',
    description:
      'A premium cloud-synced ePub reader powered by Google Drive.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0e1a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${literata.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('buzzyreader-preferences');
                if (stored) {
                  const prefs = JSON.parse(stored);
                  if (prefs.theme) {
                    document.documentElement.dataset.theme = prefs.theme;
                  } else {
                    document.documentElement.dataset.theme = 'dark';
                  }
                } else {
                  document.documentElement.dataset.theme = 'dark';
                }
              } catch (e) {
                document.documentElement.dataset.theme = 'dark';
              }
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
