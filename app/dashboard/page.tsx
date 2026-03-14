'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone, Users, Trophy, TrendingUp, Plus, Zap, GripVertical,
  Trash2, MoveRight, Clock
} from 'lucide-react';
import {
  getProspects, getCallLogs, getCallsToday, incrementCallsToday,
  addProspect, updateProspect, deleteProspect, Prospect, BusinessStage
} from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';
import { cn } from '@/lib/utils';

const STAGES: { key: BusinessStage; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'bg-slate-100 text-slate-600' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { key: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-amber-100 text-amber-700' },
  { key: 'negotiating', label: 'Negotiating', color: 'bg-purple-100 text-purple-700' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-emerald-100 text-emerald-700' },
];

function daysSince(dateStr: string): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function AddProspectDialog({ stage, onAdd }: { stage: BusinessStage; onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    businessName: '', ownerName: '', phone: '', businessType: 'Plumber', notes: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.businessName || !form.ownerName || !form.phone) return;
    addProspect({ ...form, stage, lastContact: new Date().toISOString().split('T')[0] });
    setForm({ businessName: '', ownerName: '', phone: '', businessType: 'Plumber', notes: '' });
    setOpen(false);
    onAdd();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors border border-dashed border-gray-200 hover:border-gray-300"
      >
        <Plus className="w-3 h-3" />
        Add prospect
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-md">
      <h4 className="text-sm font-semibold text-slate-900 mb-3">Add Prospect</h4>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          className="w-full text-xs border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
          placeholder="Business Name *" value={form.businessName}
          onChange={e => setForm({ ...form, businessName: e.target.value })} required
        />
        <input
          className="w-full text-xs border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
          placeholder="Owner Name *" value={form.ownerName}
          onChange={e => setForm({ ...form, ownerName: e.target.value })} required
        />
        <input
          className="w-full text-xs border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100"
          placeholder="Phone *" value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })} required
        />
        <select
          className="w-full text-xs border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-emerald-400 bg-white"
          value={form.businessType} onChange={e => setForm({ ...form, businessType: e.target.value })}
        >
          {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-md px-3 py-2 font-medium transition-colors">Add</button>
          <button type="button" onClick={() => setOpen(false)} className="flex-1 text-xs border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-md px-3 py-2 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function ProspectCard({ prospect, onDelete, onMove }: {
  prospect: Prospect;
  onDelete: () => void;
  onMove: (stage: BusinessStage) => void;
}) {
  const router = useRouter();
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const days = daysSince(prospect.lastContact);

  const typeColors: Record<string, string> = {
    'Plumber': 'bg-blue-50 text-blue-700', 'HVAC': 'bg-orange-50 text-orange-700',
    'Electrician': 'bg-yellow-50 text-yellow-700', 'Landscaper': 'bg-green-50 text-green-700',
    'House Cleaner': 'bg-pink-50 text-pink-700', 'Contractor': 'bg-purple-50 text-purple-700',
    'Roofer': 'bg-red-50 text-red-700',
  };
  const typeColor = typeColors[prospect.businessType] || 'bg-gray-50 text-gray-700';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate leading-tight">{prospect.businessName}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{prospect.ownerName}</p>
        </div>
        <GripVertical className="w-3.5 h-3.5 text-gray-200 flex-shrink-0 mt-0.5 cursor-grab" />
      </div>

      <p className="text-xs text-gray-400 font-mono mb-2.5">{prospect.phone}</p>

      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${typeColor}`}>
          {prospect.businessType}
        </span>
        {prospect.lastContact && (
          <span className={cn('text-[10px] flex items-center gap-1', days > 7 ? 'text-red-500' : 'text-gray-400')}>
            <Clock className="w-2.5 h-2.5" />
            {days === 0 ? 'Today' : `${days}d ago`}
          </span>
        )}
      </div>

      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => router.push(`/coach?prospect=${encodeURIComponent(prospect.ownerName)}&phone=${encodeURIComponent(prospect.phone)}&businessType=${encodeURIComponent(prospect.businessType)}`)}
          className="flex-1 text-[10px] text-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md py-1.5 font-medium transition-colors flex items-center justify-center gap-1"
        >
          <Phone className="w-2.5 h-2.5" />Call
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="text-[10px] bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md px-2.5 py-1.5 font-medium transition-colors"
          >
            <MoveRight className="w-3 h-3" />
          </button>
          {showMoveMenu && (
            <div className="absolute bottom-8 left-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40">
              {STAGES.filter(s => s.key !== prospect.stage).map(s => (
                <button key={s.key} onClick={() => { onMove(s.key); setShowMoveMenu(false); }}
                  className="w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 text-gray-700">
                  → {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={onDelete} className="text-[10px] bg-red-50 hover:bg-red-100 text-red-500 rounded-md px-2.5 py-1.5 transition-colors">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [callsToday, setCallsToday] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setProspects(getProspects());
    setCallsToday(getCallsToday());
  }, [tick]);

  function refresh() { setTick(t => t + 1); }

  const demosScheduled = prospects.filter(p => p.stage === 'demo_scheduled').length;
  const dealsWon = prospects.filter(p => p.stage === 'closed_won').length;
  const pipelineValue = dealsWon * 49;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => router.push('/dialer')}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors shadow-sm"
        >
          <Zap className="w-4 h-4" />
          Power Dialer
        </button>
      </div>

      {/* Ready to dial banner */}
      {callsToday === 0 && prospects.length > 0 && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔥</span>
            <div>
              <p className="text-sm font-semibold text-emerald-800">Ready to dial?</p>
              <p className="text-xs text-emerald-600">{prospects.length} prospects waiting — start your session</p>
            </div>
          </div>
          <button onClick={() => router.push('/dialer')}
            className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 py-2 transition-colors">
            Start →
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Calls Today', value: callsToday, icon: Phone, color: 'text-emerald-500', sub: <button onClick={() => { incrementCallsToday(); refresh(); }} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">+ Add call</button> },
          { label: 'Demos Scheduled', value: demosScheduled, icon: Users, color: 'text-amber-500', sub: <span className="text-xs text-gray-400">in pipeline</span> },
          { label: 'Deals Closed', value: dealsWon, icon: Trophy, color: 'text-purple-500', sub: <span className="text-xs text-gray-400">total</span> },
          { label: 'Pipeline MRR', value: `$${pipelineValue}`, icon: TrendingUp, color: 'text-emerald-500', valueClass: 'text-emerald-600', sub: <span className="text-xs text-gray-400">@$49/mo</span> },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className={`text-3xl font-bold ${(stat as { valueClass?: string }).valueClass || 'text-slate-900'}`}>{stat.value}</p>
            <div className="mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <h2 className="text-base font-semibold text-slate-900 mb-4">Pipeline</h2>

      {prospects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-200">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 mb-1">No prospects yet</h3>
          <p className="text-sm text-gray-400 mb-4">Add your first prospect to get started</p>
          <button onClick={() => router.push('/prospects')} className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 font-medium transition-colors">
            Add Prospects →
          </button>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageProspects = prospects.filter(p => p.stage === stage.key);
            return (
              <div key={stage.key} className="flex-shrink-0 w-60 xl:w-72">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-semibold text-slate-700">{stage.label}</span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${stage.color}`}>{stageProspects.length}</span>
                </div>
                <div className="space-y-3 mb-3">
                  {stageProspects.map(p => (
                    <ProspectCard key={p.id} prospect={p}
                      onDelete={() => { deleteProspect(p.id); refresh(); }}
                      onMove={newStage => { updateProspect(p.id, { stage: newStage, lastContact: new Date().toISOString().split('T')[0] }); refresh(); }}
                    />
                  ))}
                </div>
                <AddProspectDialog stage={stage.key} onAdd={refresh} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
