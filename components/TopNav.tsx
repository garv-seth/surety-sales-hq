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
  Sun,
  Moon,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCallsToday } from '@/lib/storage';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach', label: 'Coach', icon: Phone },
  { href: '/dialer', label: 'Dialer', icon: Zap },
  { href: '/practice', label: 'Practice', icon: Trophy },
  { href: '/leads', label: 'Leads', icon: Lightbulb },
  { href: '/campaigns', label: 'Campaigns', icon: Target },
  { href: '/prospects', label: 'Prospects', icon: Users },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function TopNav() {
  const pathname = usePathname();
  const [callsToday, setCallsToday] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCallsToday(getCallsToday());

    // Load saved theme
    const saved = localStorage.getItem('surety_theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }

    const interval = setInterval(() => setCallsToday(getCallsToday()), 5000);
    return () => clearInterval(interval);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('surety_theme', next ? 'dark' : 'light');
  }

  return (
    /* Desktop-only top nav — mobile uses BottomNav */
    <nav
      className="hidden md:flex fixed top-4 left-1/2 -translate-x-1/2 z-50
                 bg-gray-900/96 backdrop-blur-xl
                 rounded-2xl shadow-lg shadow-black/20
                 border border-white/8
                 px-4 py-2.5
                 max-w-[1200px] w-[calc(100vw-2rem)]
                 items-center gap-1"
      role="navigation"
      aria-label="Primary navigation"
      data-section="top-nav"
    >
      {/* Logo */}
      <Link
        href="/"
        aria-label="Surety HQ home"
        className="flex items-center gap-2.5 mr-4 flex-shrink-0 group"
      >
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600
                        flex items-center justify-center shadow-md
                        group-hover:shadow-emerald-500/30 group-hover:shadow-lg transition-shadow">
          <span className="text-white font-black text-sm">S</span>
        </div>
        <span className="text-sm font-bold text-white hidden lg:inline tracking-tight">
          Surety HQ
        </span>
      </Link>

      {/* Divider */}
      <div className="w-px h-5 bg-white/10 mr-3 flex-shrink-0 hidden lg:block" />

      {/* Nav Links */}
      <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-hidden">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
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
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all text-xs font-medium whitespace-nowrap flex-shrink-0',
                isActive
                  ? 'bg-emerald-500/18 text-emerald-400 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/6'
              )}
            >
              <Icon
                className={cn(
                  'w-3.5 h-3.5 flex-shrink-0',
                  isActive && 'drop-shadow-[0_0_4px_oklch(0.65_0.2_155/70%)]'
                )}
              />
              <span className="hidden xl:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 ml-3 pl-3 border-l border-white/8 flex-shrink-0">
        {/* Calls today */}
        {mounted && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
            aria-label={`${callsToday} calls today`}
            data-metric="calls-today"
            data-value={callsToday}
          >
            <span className="status-dot status-dot-live bg-emerald-400 w-1.5 h-1.5" />
            <Flame className="w-3 h-3 text-emerald-400" />
            <span className="text-xs text-emerald-300 font-semibold font-mono">
              {callsToday}
            </span>
          </div>
        )}

        {/* Dark mode toggle */}
        {mounted && (
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            data-action="toggle-theme"
            data-theme={isDark ? 'dark' : 'light'}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/8 transition-colors"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </nav>
  );
}

export default TopNav;
