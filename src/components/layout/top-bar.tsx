'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck } from 'lucide-react';

export function TopBar() {
  return (
    <header
      className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/90 backdrop-blur-md sticky top-0 z-40 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
    >
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg overflow-hidden border border-primary/30 glow-violet shrink-0">
          <Image src="/icon-192.png" alt="MediaVault" width={32} height={32} className="w-full h-full object-cover" />
        </div>
        <span className="font-bold text-base tracking-tight gradient-text">
          MediaVault
        </span>
      </Link>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/80 text-[10px] font-medium text-muted-foreground border border-border/50">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Private Vault</span>
      </div>
    </header>
  );
}
