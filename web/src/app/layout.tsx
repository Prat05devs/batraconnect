import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://batraconnect.com'),
  title: { default: 'Batra Connect — coming soon', template: '%s · Batra Connect' },
  description:
    'Report local problems, follow them to resolution and stay in touch with the office of Shri Pradeep Batra. Coming soon to Android and iPhone.',
  openGraph: {
    type: 'website',
    siteName: 'Batra Connect',
    images: [{ url: '/brand/icon.png', width: 512, height: 512 }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
