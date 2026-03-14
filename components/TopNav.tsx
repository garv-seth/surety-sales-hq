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
  Menu,
  X,
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

export function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [callsToday, setCallsToday] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCallsToday(getCallsToday());
    const interval = setInterval(() => setCallsToday(getCallsToday()), 5000);
    return () => clearInterval(interval);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      {/* Desktop Floating Navbar */}
      <nav className="hidden md:flex fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-lg px-8 py-4 max-w-6xl">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mr-12 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-base font-bold text-white hidden lg:inline">Surety HQ</span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap',
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Calls today indicator */}
        {mounted && (
          <div className="ml-auto pl-6 border-l border-gray-700 flex items-center gap-2">
            <span className="text-emerald-400">🔥</span>
            <span className="text-xs text-gray-300 font-medium">{callsToday} today</span>
          </div>
        )}
      </nav>

      {/* Mobile Floating Top Bar */}
      <nav className="md:hidden fixed top-4 left-4 right-4 z-50 bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-lg px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="text-sm font-bold text-white">Surety</span>
        </Link>

        {/* Hamburger Menu */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed top-20 left-4 right-4 z-50 bg-gray-900 rounded-2xl shadow-lg overflow-hidden border border-gray-800">
          {/* Menu Items */}
          <div className="divide-y divide-gray-800">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-colors text-sm font-medium',
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-gray-300 hover:bg-gray-800/50 hover:text-gray-100'
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Footer - Calls Today */}
          {mounted && (
            <div className="px-4 py-3 border-t border-gray-800 bg-gray-800/50">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">🔥</span>
                <span className="text-xs text-gray-300 font-medium">{callsToday} calls today</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">Surety Sales HQ v2</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default TopNav;
