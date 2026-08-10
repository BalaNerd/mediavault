'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Download, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/downloads', icon: Download, label: 'Downloads' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 border-r border-border bg-sidebar/80 backdrop-blur-xl">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 px-5 py-5 border-b border-border group">
        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg glow-violet shrink-0 border border-primary/30">
          <Image src="/icons/icon-192x192.png" alt="MediaVault" width={36} height={36} className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">
            MediaVault
          </p>
          <p className="text-[10px] text-muted-foreground">Private Media Vault</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px]',
                active
                  ? 'text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-primary shadow-sm"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon className="relative w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border/80">
        <p className="text-[10px] text-muted-foreground font-medium">MediaVault Production</p>
        <p className="text-[10px] text-muted-foreground/70">Self-hosted &amp; Encrypted</p>
      </div>
    </aside>
  );
}
