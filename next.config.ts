import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';
import path from 'path';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
});

const nextConfig: NextConfig = {
  // Lock output tracing root to project directory
  outputFileTracingRoot: path.join(__dirname),

  // Empty turbopack config for compatibility
  turbopack: {},

  // Expose native Node.js packages to API routes
  serverExternalPackages: ['better-sqlite3', 'pino', 'pino-pretty'],

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.ytimg.com' },
      { protocol: 'https', hostname: '**.ggpht.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'i.redd.it' },
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: 'p16-sign.tiktokcdn.com' },
      { protocol: 'https', hostname: '**.spotifycdn.com' },
      { protocol: 'https', hostname: 'i.scdn.co' },
      { protocol: 'https', hostname: '**.vimeocdn.com' },
      { protocol: 'https', hostname: '**.twimg.com' },
      { protocol: 'https', hostname: 'external-content.duckduckgo.com' },
    ],
    unoptimized: false,
    dangerouslyAllowSVG: false,
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https: wss:",
              "media-src 'self' blob:",
              "worker-src 'self' blob:",
            ].join('; '),
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
