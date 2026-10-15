'use client';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Login } from '@/views/Login';

/** Everything under /admin requires an administrator; anyone else sees the sign-in screen. */
export function AdminGate({ children }: React.PropsWithChildren) {
  const { user, ready } = useAuth();
  if (!ready)
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  return user ? children : <Login />;
}
