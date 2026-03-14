'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, LineChart, Line
} from 'recharts';
import { BarChart3, Phone, Trophy, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { getCallLogs, getProspects, CallLog, Prospect } from '@/lib/storage';
import { useRouter } from 'next/navigation';

const TIME_RANGES = ['7 Days', '30 Days', 'All Time'];

const OUTCOME_COLORS: Record<string, string> = {
  no_answer: '#94a3b8',
  voicemail: '#60a5fa',
  not_interested: '#f87171',
  follow_up: '#fbbf24',
  demo_booked: '#34d399',
  closed_won: '#a78bfa',
  callback: '#fb923c',
};

const OUTCOME_LABELS: Record<string, string> = {
  no_answer: 'No Answer',
  voicemail: 'Voicemail',
  not_interested: 'Not Interested',
  follow_up: 'Follow Up',
  demo_booked: 'Demo Booked',
  closed_won: 'Closed Won',
  callback: 'Callback',
};

function getDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [range, setRange] = useState('7 Days');
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);

  useEffect(() => {
    setLogs(getCallLogs());
    setProspects(getProspects());
  }, []);

  // Filter logs by range
  const filteredLogs = (() => {
    if (range === 'All Time') return logs;
    const days = range === '7 Days' ? 7 : 30;
    const cutoff = getDaysAgo(days);
    return logs.filter(l => new Date(l.timestamp) >= cutoff);
  })();

  const totalCalls = filteredLogs.length;
  const demosBooked = filteredLogs.filter(l => l.outcome === 'demo_booked' || l.outcome === 'closed_won').length;
  const closedWon = filteredLogs.filter(l => l.outcome === 'closed_won').length;
  const conversionRate = totalCalls ? ((demosBooked / totalCalls) * 100).toFixed(1) : '0.0';

  // 7-day call volume
  const callsByDay = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = getDaysAgo(i);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayStr = d.toISOString().split('T')[0];
      const count = filteredLogs.filter(l => l.date === dayStr).length;
      days.push({ day: label, calls: count });
    }
    return days;
  })();

  // Outcome distribution
  const outcomeCounts = filteredLogs.reduce<Record<string, number>>((acc, l) => {
    acc[l.outcome] = (acc[l.outcome] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(outcomeCounts).map(([name, value]) => ({
    name: OUTCOME_LABELS[name] || name,
    value,
    color: OUTCOME_COLORS[name] || '#94a3b8',
  }));

  // Pipeline funnel
  const totalProspects = prospects.length;
  const contacted = prospects.filter(p => p.stage !== 'new').length;
  const demoScheduled = prospects.filter(p => p.stage === 'demo_scheduled' || p.stage === 'negotiating' || p.stage === 'closed_won').length;
  const closedWonCount = prospects.filter(p => p.stage === 'closed_won').length;

  const funnelData = [
    { stage: 'Total Prospects', count: totalProspects, color: '#64748b' },
    { stage: 'Contacted', count: contacted, color: '#3b82f6' },
    { stage: 'Demo Scheduled', count: demoScheduled, color: '#f59e0b' },
    { stage: 'Closed Won', count: closedWonCount, color: '#10b981' },
  ];

  // Best calling tip
  const tip = (() => {
    if (totalCalls < 3) return 'Make at least 3 calls to see insights here.';
    if (demosBooked > 0) return `You&apos;ve booked ${demosBooked} demo${demosBooked > 1 ? 's' : ''} — keep going! Your conversion rate is ${conversionRate}%.`;
    return `Focus on getting prospects to stay on the line longer. Aim for 2+ exchanges before the pitch.`;
  })();

  if (logs.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96 text-center">
        <BarChart3 className="w-12 h-12 text-gray-200 mb-3" />
        <h2 className="text-lg font-semibold text-slate-700 mb-1">No data yet</h2>
        <p className="text-sm text-gray-400 mb-4">Log some calls to see your analytics</p>
        <button onClick={() => router.push('/coach')} className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 font-medium transition-colors">
          Start Calling →
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your calling performance at a glance</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TIME_RANGES.map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${range === r ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Calls', value: totalCalls, icon: Phone, color: 'text-emerald-500' },
          { label: 'Demos Booked', value: demosBooked, icon: Target, color: 'text-amber-500' },
          { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-blue-500' },
          { label: 'Deals Closed', value: closedWon, icon: Trophy, color: 'text-purple-500', valueClass: 'text-purple-600' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
            </div>
            <p className={`text-3xl font-bold ${(kpi as { valueClass?: string }).valueClass || 'text-slate-900'}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Call Volume Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Call Volume (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={callsByDay} barCategoryGap="30%">
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="calls" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Outcomes Pie Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Call Outcomes</h2>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No call data in this period</p>
          )}
        </div>
      </div>

      {/* Pipeline Funnel */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm mb-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Pipeline Funnel</h2>
        <div className="space-y-3">
          {funnelData.map((item, i) => {
            const pct = totalProspects ? Math.round((item.count / totalProspects) * 100) : 0;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-32 truncate">{item.stage}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-12 text-right">{item.count}</span>
                <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pro Tip */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
        <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-emerald-800 mb-0.5">Pro Tip</p>
          <p className="text-sm text-emerald-700">{tip}</p>
        </div>
      </div>
    </div>
  );
}
