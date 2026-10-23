import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://batraconnect.com'),
  title: { default: 'Batra Connect', template: '%s · Batra Connect' },
  description:
    'An independent initiative of Shri Pradeep Batra, MLA for Roorkee: report local problems, follow them to resolution and book Jan Samvad meetings. Not a government app.',
  openGraph: {
    type: 'website',
    siteName: 'Batra Connect',
    images: [{ url: '/brand/pradeep-batra.jpg', width: 485, height: 632 }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
