'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, LineChart, Line
} from 'recharts';
import { BarChart3, Phone, Trophy, TrendingUp, Target, Lightbulb, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card rounded-xl px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold text-gray-700">{label}</p>
        <p className="text-emerald-600 font-bold">{payload[0].value} calls</p>
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [range, setRange] = useState('7 Days');
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);

  useEffect(() => {
    setLogs(getCallLogs());
    setProspects(getProspects());
  }, []);

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

  const outcomeCounts = filteredLogs.reduce<Record<string, number>>((acc, l) => {
    acc[l.outcome] = (acc[l.outcome] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(outcomeCounts).map(([name, value]) => ({
    name: OUTCOME_LABELS[name] || name,
    value,
    color: OUTCOME_COLORS[name] || '#94a3b8',
  }));

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

  const tip = (() => {
    if (totalCalls < 3) return 'Make at least 3 calls to see personalized insights here.';
    if (demosBooked > 0) return `You've booked ${demosBooked} demo${demosBooked > 1 ? 's' : ''} — great work! Your conversion rate is ${conversionRate}%.`;
    return `Focus on getting prospects to stay on the line longer. Aim for 2+ exchanges before the pitch.`;
  })();

  if (logs.length === 0) {
    return (
      <main data-page="analytics" role="main" className="p-4 md:p-6 flex flex-col items-center justify-center min-h-96 text-center">
        <div className="glass-card rounded-3xl p-10 max-w-sm mx-auto" data-state="empty">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">No data yet</h2>
          <p className="text-sm text-gray-400 mb-5">Log some calls to see your analytics</p>
          <button
            onClick={() => router.push('/coach')}
            data-action="navigate"
            data-destination="coach"
            aria-label="Start calling to generate analytics data"
            className="btn-glow bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-all"
          >
            Start Calling →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main data-page="analytics" role="main" className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your calling performance at a glance</p>
        </div>
        {/* Time range selector */}
        <div
          className="flex gap-1 bg-gray-100 rounded-xl p-1"
          role="group"
          aria-label="Select time range"
        >
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              data-action="set-time-range"
              data-value={r}
              aria-pressed={range === r}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                range === r
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards — 2×2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5" data-section="kpi-cards">
        {[
          {
            label: 'Total Calls',
            value: totalCalls,
            icon: Phone,
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            metric: 'total-calls',
          },
          {
            label: 'Demos Booked',
            value: demosBooked,
            icon: Target,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            metric: 'demos-booked',
          },
          {
            label: 'Conversion Rate',
            value: `${conversionRate}%`,
            icon: TrendingUp,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            metric: 'conversion-rate',
          },
          {
            label: 'Deals Closed',
            value: closedWon,
            icon: Trophy,
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            metric: 'deals-closed',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="glass-card rounded-2xl p-4 md:p-5"
            data-metric={kpi.metric}
            data-value={String(kpi.value)}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {kpi.label}
              </span>
              <div className={`w-7 h-7 ${kpi.iconBg} rounded-lg flex items-center justify-center`}>
                <kpi.icon className={`w-3.5 h-3.5 ${kpi.iconColor}`} />
              </div>
            </div>
            <p className="metric-value text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Call Volume Bar Chart */}
        <div className="glass-card rounded-2xl p-5" data-section="call-volume-chart">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Call Volume (Last 7 Days)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={callsByDay} barCategoryGap="35%">
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'oklch(0.97 0 0)' }} />
              <Bar dataKey="calls" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Outcomes Pie Chart */}
        <div className="glass-card rounded-2xl p-5" data-section="outcome-chart">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Call Outcomes</h2>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-5">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={58}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid oklch(0 0 0 / 6%)',
                      fontSize: 11,
                      boxShadow: '0 4px 16px oklch(0 0 0 / 8%)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {pieData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{item.value}</span>
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
      <div className="glass-card rounded-2xl p-5 mb-4" data-section="pipeline-funnel">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Pipeline Funnel</h2>
        <div className="space-y-3">
          {funnelData.map((item) => {
            const pct = totalProspects ? Math.round((item.count / totalProspects) * 100) : 0;
            return (
              <div key={item.stage} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-32 truncate flex-shrink-0">
                  {item.stage}
                </span>
                <div
                  className="flex-1 bg-gray-100 rounded-full h-2.5"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.stage}: ${pct}%`}
                >
                  <div
                    className="h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-700 w-8 text-right">{item.count}</span>
                <span className="text-xs text-gray-400 w-9 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pro Tip */}
      <div
        className="glass-card rounded-2xl p-4 border border-emerald-200/60 bg-emerald-50/60 flex items-start gap-3"
        role="note"
        aria-label="Pro tip"
      >
        <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-bold text-emerald-800 mb-0.5 uppercase tracking-wide">Pro Tip</p>
          <p className="text-sm text-emerald-700">{tip}</p>
        </div>
      </div>
    </main>
  );
}
