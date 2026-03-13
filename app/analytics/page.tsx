'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getCallLogs, getProspects, CallLog, Prospect } from '@/lib/storage';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const router = useRouter();

  useEffect(() => {
    setCallLogs(getCallLogs());
    setProspects(getProspects());
  }, []);

  const hasData = callLogs.length > 0 || prospects.length > 0;

  // Last 7 days call data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const count = callLogs.filter(l => l.date === dateStr).length;
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
      calls: count,
    };
  });

  // Stage funnel
  const stageCounts = {
    new: prospects.filter(p => p.stage === 'new').length,
    contacted: prospects.filter(p => p.stage === 'contacted').length,
    demo_scheduled: prospects.filter(p => p.stage === 'demo_scheduled').length,
    negotiating: prospects.filter(p => p.stage === 'negotiating').length,
    closed_won: prospects.filter(p => p.stage === 'closed_won').length,
  };

  const funnelData = [
    { stage: 'New', count: stageCounts.new },
    { stage: 'Contacted', count: stageCounts.contacted },
    { stage: 'Demo', count: stageCounts.demo_scheduled },
    { stage: 'Negotiating', count: stageCounts.negotiating },
    { stage: 'Closed', count: stageCounts.closed_won },
  ];

  // Outcome breakdown
  const outcomes = {
    no_answer: callLogs.filter(l => l.outcome === 'no_answer').length,
    not_interested: callLogs.filter(l => l.outcome === 'not_interested').length,
    follow_up: callLogs.filter(l => l.outcome === 'follow_up').length,
    demo_booked: callLogs.filter(l => l.outcome === 'demo_booked').length,
    closed_won: callLogs.filter(l => l.outcome === 'closed_won').length,
  };

  const totalCalls = callLogs.length;
  const winRate = totalCalls > 0 ? ((outcomes.closed_won / totalCalls) * 100).toFixed(1) : '0';
  const demoRate = totalCalls > 0 ? (((outcomes.demo_booked + outcomes.closed_won) / totalCalls) * 100).toFixed(1) : '0';

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">Your sales performance at a glance</p>
      </div>

      {!hasData ? (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-16 text-center">
            <div className="text-6xl mb-4">🔥</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Start calling!</h2>
            <p className="text-slate-500 mb-6">Log your first call to see analytics appear here.</p>
            <Button
              className="bg-emerald-500 hover:bg-emerald-600"
              onClick={() => router.push('/coach')}
            >
              📞 Go to Call Coach
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="text-sm text-slate-500">Total Calls Logged</div>
                <div className="text-4xl font-bold text-slate-900 mt-1">{totalCalls}</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="text-sm text-slate-500">Win Rate</div>
                <div className="text-4xl font-bold text-emerald-500 mt-1">{winRate}%</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="text-sm text-slate-500">Demo Rate</div>
                <div className="text-4xl font-bold text-amber-500 mt-1">{demoRate}%</div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-sm">
              <CardContent className="p-6">
                <div className="text-sm text-slate-500">Revenue Closed</div>
                <div className="text-4xl font-bold text-slate-900 mt-1">${outcomes.closed_won * 49}/mo</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Calls Per Day (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={last7Days}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Pipeline Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Outcome Breakdown */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Call Outcome Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'No Answer', count: outcomes.no_answer, color: 'text-slate-500' },
                  { label: 'Not Interested', count: outcomes.not_interested, color: 'text-red-500' },
                  { label: 'Follow Up', count: outcomes.follow_up, color: 'text-blue-500' },
                  { label: 'Demo Booked', count: outcomes.demo_booked, color: 'text-amber-500' },
                  { label: 'Closed Won', count: outcomes.closed_won, color: 'text-emerald-500' },
                ].map(item => (
                  <div key={item.label} className="text-center p-4 bg-slate-50 rounded-lg">
                    <div className={`text-3xl font-bold ${item.color}`}>{item.count}</div>
                    <div className="text-xs text-slate-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
