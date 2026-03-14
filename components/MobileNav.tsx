'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Phone, Zap, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach', label: 'Coach', icon: Phone },
  { href: '/dialer', label: 'Dialer', icon: Zap },
  { href: '/prospects', label: 'Prospects', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-16 bg-gray-950 border-t border-gray-800 safe-area-pb">
      {MOBILE_NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 transition-colors',
              isActive ? 'text-emerald-500' : 'text-gray-500'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
