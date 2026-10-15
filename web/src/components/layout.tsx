'use client';
import type React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Newspaper,
  ScrollText,
  SlidersHorizontal,
  UserCog,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/settings', label: 'App settings', icon: SlidersHorizontal },
  { to: '/admin/places', label: 'Wards & offices', icon: MapPin },
  { to: '/admin/content', label: 'Public content', icon: Newspaper },
  { to: '/admin/integrations', label: 'Integrations', icon: KeyRound },
  { to: '/admin/messages', label: 'Message log', icon: Mail },
  { to: '/admin/audit', label: 'Audit log', icon: ScrollText },
  { to: '/admin/account', label: 'My account', icon: UserCog },
];
/** Sidebar navigation and header shared by every dashboard page. */
export function Shell({ children }: React.PropsWithChildren) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0">
        <div className="px-5 py-5 text-lg font-bold text-white">
          Batra <span className="text-sky-300">Connect</span>
          <div className="text-xs font-normal text-sidebar-foreground/70">Admin dashboard</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === '/admin' ? pathname === to : pathname.startsWith(to);
            return (
              <Link
                key={to}
                href={to}
                className={cn(
                  'flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent',
                  active && 'bg-sidebar-primary text-white hover:bg-sidebar-primary',
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b bg-card px-6 py-3 print:hidden">
          <span className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user?.name}</span> · {user?.email}
          </span>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </header>
        <main className="mx-auto max-w-7xl p-6">{children}</main>
      </div>
    </div>
  );
}
