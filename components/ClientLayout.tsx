'use client';

import { usePathname } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { BottomNav } from '@/components/BottomNav';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Extract page name from pathname (e.g. "/dialer" → "dialer")
  const pageName = pathname === '/' ? 'home' : pathname.replace(/^\//, '').split('/')[0];

  return (
    <div className="flex h-screen bg-background overflow-hidden flex-col">
      {/* Desktop top nav */}
      <TopNav />

      {/* Main content — pt-20 for desktop top nav, pb-safe for mobile bottom nav */}
      <main
        className="flex-1 overflow-y-auto md:pt-20 pb-safe"
        data-page={pageName}
        role="main"
        id="main-content"
      >
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
