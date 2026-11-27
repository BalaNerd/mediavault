'use client';

import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { TopBar } from './top-bar';
import { PwaInstallPrompt } from '../pwa-install-prompt';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <TopBar />
        <main className="flex-1 px-3.5 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <BottomNav />

      {/* PWA Banner */}
      <PwaInstallPrompt />
    </div>
  );
}
