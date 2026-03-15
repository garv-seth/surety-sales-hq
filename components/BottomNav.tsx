'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Zap,
  Phone,
  Lightbulb,
  MoreHorizontal,
  X,
  Trophy,
  Target,
  Users,
  FileText,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dialer', label: 'Dialer', icon: Zap },
  { href: '/coach', label: 'Coach', icon: Phone },
  { href: '/leads', label: 'Leads', icon: Lightbulb },
];

const MORE_NAV = [
  { href: '/practice', label: 'Practice', icon: Trophy },
  { href: '/campaigns', label: 'Campaigns', icon: Target },
  { href: '/prospects', label: 'Prospects', icon: Users },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close sheet on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const isMoreActive = MORE_NAV.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  return (
    <>
      {/* Bottom sheet overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* More sheet */}
      {moreOpen && (
        <div
          className="md:hidden fixed bottom-16 left-0 right-0 z-50 sheet-enter"
          role="dialog"
          aria-label="More navigation"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="mx-3 mb-2 bg-gray-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                More
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/8 transition-colors"
                aria-label="Close more menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1 p-3">
              {MORE_NAV.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-action="navigate"
                    data-destination={item.href}
                    aria-label={`Go to ${item.label}`}
                    className={cn(
                      'flex flex-col items-center gap-2 px-2 py-3 rounded-2xl transition-all text-center',
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/6'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-[10px] font-medium leading-none">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav
        className="md:hidden fixed left-0 right-0 z-50 bg-gray-900/96 backdrop-blur-xl border-t border-white/8"
        style={{
          bottom: 0,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        role="navigation"
        aria-label="Primary navigation"
        data-section="bottom-nav"
      >
        <div className="flex items-center justify-around px-2 h-16">
          {PRIMARY_NAV.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-action="navigate"
                data-destination={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all min-w-[56px]',
                  isActive
                    ? 'text-emerald-400'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      'w-6 h-6 transition-all',
                      isActive && 'drop-shadow-[0_0_6px_oklch(0.65_0.2_155/80%)]'
                    )}
                  />
                  {isActive && (
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium leading-none transition-colors mt-0.5',
                    isActive ? 'text-emerald-400' : 'text-gray-500'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            aria-label="More navigation options"
            aria-expanded={moreOpen}
            data-action="open-more-menu"
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all min-w-[56px]',
              isMoreActive || moreOpen
                ? 'text-emerald-400'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            <div className="relative">
              <MoreHorizontal
                className={cn(
                  'w-6 h-6 transition-all',
                  (isMoreActive || moreOpen) &&
                    'drop-shadow-[0_0_6px_oklch(0.65_0.2_155/80%)]'
                )}
              />
              {(isMoreActive || moreOpen) && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </div>
            <span
              className={cn(
                'text-[10px] font-medium leading-none transition-colors mt-0.5',
                isMoreActive || moreOpen ? 'text-emerald-400' : 'text-gray-500'
              )}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default BottomNav;
