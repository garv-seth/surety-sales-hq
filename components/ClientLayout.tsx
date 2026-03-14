'use client';

import { TopNav } from '@/components/TopNav';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden flex-col">
      {/* Top Navigation */}
      <TopNav />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-20">
        {children}
      </main>
    </div>
  );
}
