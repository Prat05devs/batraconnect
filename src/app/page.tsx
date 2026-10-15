import type { Metadata } from 'next';
import { Landing } from '@/site/Landing';

export const metadata: Metadata = { alternates: { canonical: '/', languages: { hi: '/hi' } } };

export default function Home() {
  return <Landing lang="en" />;
}
