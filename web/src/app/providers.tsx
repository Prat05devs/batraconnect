'use client';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth';

export function Providers({ children }: React.PropsWithChildren) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
