'use client';

import { usePathname } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';
import { useCloudSync, type SyncStatus } from '@/lib/useCloudSync';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

function SyncButton() {
  const { status, lastSynced, syncNow } = useCloudSync();

  const icon = () => {
    if (status === 'loading' || status === 'syncing')
      return <RefreshCw size={13} className="animate-spin" />;
    if (status === 'error')
      return <CloudOff size={13} />;
    if (status === 'synced')
      return <CheckCircle2 size={13} />;
    return <Cloud size={13} />;
  };

  const label = () => {
    if (status === 'loading') return 'Loading…';
    if (status === 'syncing') return 'Syncing…';
    if (status === 'error') return 'Sync error';
    if (status === 'synced' && lastSynced) {
      const mins = Math.floor((Date.now() - lastSynced.getTime()) / 60000);
      return mins < 1 ? 'Synced' : `Synced ${mins}m ago`;
    }
    return 'Sync';
  };

  const color = (): string => {
    if (status === 'error') return 'text-red-500 border-red-200';
    if (status === 'synced') return 'text-emerald-600 border-emerald-200';
    return 'text-slate-500 border-slate-200';
  };

  return (
    <button
      onClick={syncNow}
      title="Sync across all devices"
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white/80 backdrop-blur transition-all ${color()}`}
    >
      {icon()}
      <span className="hidden sm:inline">{label()}</span>
    </button>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pageName = pathname === '/' ? 'home' : pathname.replace(/^\//, '').split('/')[0];

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col">
      <TopNav />

      {/* Floating sync pill — top right on mobile, sits below top nav */}
      <div className="fixed top-3 right-3 z-50 md:hidden">
        <SyncButton />
      </div>

      {/* Desktop: sync button in top bar area */}
      <div className="hidden md:flex fixed top-4 right-16 z-50 items-center">
        <SyncButton />
      </div>

      <main
        className="flex-1 overflow-y-auto md:pt-20 pb-safe"
        data-page={pageName}
        role="main"
        id="main-content"
      >
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
