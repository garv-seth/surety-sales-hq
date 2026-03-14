'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Phone,
  Users,
  FileText,
  BarChart3,
  Zap,
  Trophy,
  Lightbulb,
  Settings,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCallsToday } from '@/lib/storage';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach', label: 'Call Coach', icon: Phone },
  { href: '/dialer', label: 'Power Dialer', icon: Zap },
  { href: '/practice', label: 'Practice Mode', icon: Trophy },
  { href: '/leads', label: 'Generate Leads', icon: Lightbulb },
  { href: '/campaigns', label: 'Campaigns', icon: Target },
  { href: '/prospects', label: 'Prospects', icon: Users },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [callsToday, setCallsToday] = useState(0);

  useEffect(() => {
    setCallsToday(getCallsToday());
    const interval = setInterval(() => setCallsToday(getCallsToday()), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-100">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-base font-bold text-white">Surety HQ</span>
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium',
                isActive
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900">
          <span className="text-emerald-400 text-sm">🔥</span>
          <span className="text-xs text-gray-300 font-medium">
            {callsToday} calls today
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-2 px-3">Surety Sales HQ v2</p>
      </div>
    </div>
  );
}

export default Sidebar;
