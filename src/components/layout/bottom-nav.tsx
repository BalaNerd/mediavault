'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Download, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', icon: Home, label: 'Home', id: 'nav-home' },
  { href: '/downloads', icon: Download, label: 'Downloads', id: 'nav-downloads' },
  { href: '/settings', icon: Settings, label: 'Settings', id: 'nav-settings' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border px-3 py-1 flex items-center justify-around"
      aria-label="Mobile Navigation Bar"
    >
      {navItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            id={item.id}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center min-h-[48px] min-w-[64px] py-1.5 px-3 rounded-xl text-xs font-medium transition-colors select-none',
              active
                ? 'text-primary bg-primary/10 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <item.icon className="w-5 h-5 mb-0.5 pointer-events-none" aria-hidden="true" />
            <span className="text-[11px] pointer-events-none">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
