import type { NextConfig } from 'next';

const api = (process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '');
const dev = process.env.NODE_ENV !== 'production';
// Pages may load code and styles only from this site and talk only to the API, so injected markup cannot pull in
// outside scripts or send data elsewhere. Next.js needs inline scripts; development also needs eval and live reload.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${api}${dev ? ' ws:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // One app serves both sites: batraconnect.com (public pages) and admin.batraconnect.com (dashboard).
  async redirects() {
    return [
      { source: '/', has: [{ type: 'host', value: 'admin\\..+' }], destination: '/admin', permanent: false },
      {
        source: '/admin/:path*',
        has: [{ type: 'host', value: '(www\\.)?batraconnect\\.com' }],
        destination: 'https://admin.batraconnect.com/admin/:path*',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www\\.batraconnect\\.com' }],
        destination: 'https://batraconnect.com/:path*',
        permanent: true,
      },
    ];
  },
  // The dashboard holds an administrator session, so it may never be framed by another site (clickjacking).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
