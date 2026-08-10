import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'MediaVault — Private Media Downloader',
  description:
    'Private, high-performance Progressive Web App to download and archive media from YouTube, Instagram, Facebook, Spotify, and direct media links.',
  applicationName: 'MediaVault',
  authors: [{ name: 'MediaVault Team' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [
      { rel: 'mask-icon', url: '/logo.svg', color: '#8B5CF6' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MediaVault',
  },
  openGraph: {
    type: 'website',
    title: 'MediaVault — Private Media Downloader',
    description:
      'Private, high-performance media download manager for personal archiving.',
    siteName: 'MediaVault',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MediaVault — Private Media Downloader',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MediaVault — Private Media Downloader',
    description:
      'Private, high-performance media download manager for personal archiving.',
    images: ['/og-image.png'],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#0A0B1E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${inter.variable} font-sans bg-background text-foreground antialiased`}>
        <AppLayout>{children}</AppLayout>
        <Toaster position="bottom-right" theme="dark" richColors />
      </body>
    </html>
  );
}
