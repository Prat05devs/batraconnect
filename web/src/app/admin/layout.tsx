import type { Metadata } from 'next';
import { Providers } from '../providers';
import { AdminGate } from '@/components/admin-gate';

export const metadata: Metadata = {
  title: 'Batra Connect Admin',
  description: 'Administration dashboard for the Batra Connect app.',
  robots: { index: false, follow: false },
};

/** Everything under /admin requires an administrator; anyone else sees the sign-in screen. */
export default function AdminLayout({ children }: React.PropsWithChildren) {
  return (
    <Providers>
      <AdminGate>{children}</AdminGate>
    </Providers>
  );
}
