'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCallsToday } from '@/lib/storage';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/coach', icon: '📞', label: 'Call Coach' },
  { href: '/prospects', icon: '👥', label: 'Prospects' },
  { href: '/templates', icon: '📝', label: 'Templates' },
  { href: '/analytics', icon: '📈', label: 'Analytics' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [callsToday, setCallsToday] = useState(0);
  const [today, setToday] = useState('');

  useEffect(() => {
    setCallsToday(getCallsToday());
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
    const interval = setInterval(() => setCallsToday(getCallsToday()), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside style={{ backgroundColor: '#0f172a' }} className="fixed left-0 top-0 h-full w-60 flex flex-col z-50">
      <div className="p-6 border-b border-slate-700">
        <div className="text-2xl font-bold text-emerald-400">💰 Surety HQ</div>
        <div className="text-xs text-slate-400 mt-1">Sales Command Center</div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const isCoach = item.href === '/coach';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500 text-white'
                  : isCoach
                  ? 'text-emerald-400 hover:bg-slate-800 border border-emerald-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {isCoach && !isActive && (
                <span className="ml-auto text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                  HOT
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="text-xs text-slate-400 mb-2">{today}</div>
        <div className="flex items-center gap-2 text-sm font-semibold text-orange-400">
          <span>🔥</span>
          <span>{callsToday} calls today</span>
        </div>
      </div>
    </aside>
  );
}
