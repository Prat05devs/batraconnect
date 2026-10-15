import type { NextConfig } from 'next';

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
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
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
