'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Phone, Users, Trophy, TrendingUp, Plus, Zap, GripVertical,
  Trash2, MoveRight, Clock, BarChart3, Lightbulb
} from 'lucide-react';
import {
  getProspects, getCallLogs, getCallsToday, incrementCallsToday,
  addProspect, updateProspect, deleteProspect, Prospect, BusinessStage
} from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';
import { cn } from '@/lib/utils';

const STAGES: { key: BusinessStage; label: string; stageClass: string; dot: string }[] = [
  { key: 'new',           label: 'New',           stageClass: 'stage-new',           dot: 'bg-gray-400' },
  { key: 'contacted',     label: 'Contacted',     stageClass: 'stage-contacted',     dot: 'bg-blue-400' },
  { key: 'demo_scheduled',label: 'Demo Scheduled',stageClass: 'stage-demo_scheduled',dot: 'bg-amber-400' },
  { key: 'negotiating',   label: 'Negotiating',   stageClass: 'stage-negotiating',   dot: 'bg-purple-400' },
  { key: 'closed_won',    label: 'Closed Won',    stageClass: 'stage-closed_won',    dot: 'bg-emerald-400' },
];

const TYPE_COLORS: Record<string, string> = {
  'Plumber':      'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'HVAC':         'bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  'Electrician':  'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  'Landscaper':   'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'House Cleaner':'bg-pink-50 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'Contractor':   'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Roofer':       'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function daysSince(dateStr: string): number {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function AddProspectDialog({ stage, onAdd }: { stage: BusinessStage; onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ businessName: '', ownerName: '', phone: '', businessType: 'Plumber', notes: '' });

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
        data-action="add-prospect"
        data-target-stage={stage}
        aria-label={`Add prospect to ${stage} stage`}
        className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl px-3 py-2.5 transition-all border border-dashed border-border hover:border-emerald-300"
      >
        <Plus className="w-3 h-3" />
        Add prospect
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-lg animate-in-up">
      <h4 className="text-sm font-bold text-foreground mb-3">Add Prospect</h4>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          className="w-full text-xs border border-border bg-background rounded-xl px-3 py-2 focus:outline-none transition-shadow"
          placeholder="Business Name *"
          value={form.businessName}
          onChange={e => setForm({ ...form, businessName: e.target.value })}
          aria-label="Business name"
          required
        />
        <input
          className="w-full text-xs border border-border bg-background rounded-xl px-3 py-2 focus:outline-none transition-shadow"
          placeholder="Owner Name *"
          value={form.ownerName}
          onChange={e => setForm({ ...form, ownerName: e.target.value })}
          aria-label="Owner name"
          required
        />
        <input
          className="w-full text-xs border border-border bg-background rounded-xl px-3 py-2 focus:outline-none transition-shadow font-mono"
          placeholder="Phone *"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          aria-label="Phone number"
          required
        />
        <select
          className="w-full text-xs border border-border bg-background rounded-xl px-3 py-2 focus:outline-none"
          value={form.businessType}
          onChange={e => setForm({ ...form, businessType: e.target.value })}
          aria-label="Business type"
          data-field="business-type"
        >
          {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            data-action="save-prospect"
            aria-label="Save prospect"
            className="flex-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-3 py-2 font-semibold transition-colors"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cancel"
            className="flex-1 text-xs border border-border hover:bg-muted text-foreground rounded-xl px-3 py-2 transition-colors"
          >
            Cancel
          </button>
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
  const typeColor = TYPE_COLORS[prospect.businessType] || 'bg-muted text-muted-foreground';

  return (
    <div
      className="bg-card border border-border rounded-2xl p-3.5 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group"
      data-entity="prospect"
      data-entity-id={prospect.id}
      data-entity-stage={prospect.stage}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate leading-tight">{prospect.businessName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{prospect.ownerName}</p>
        </div>
        <GripVertical className="w-3.5 h-3.5 text-muted/40 flex-shrink-0 mt-0.5 cursor-grab" aria-hidden="true" />
      </div>

      <p className="text-xs text-muted-foreground font-mono mb-2.5">{prospect.phone}</p>

      <div className="flex items-center justify-between mb-3">
        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', typeColor)}
          data-status="business-type"
          data-value={prospect.businessType}
        >
          {prospect.businessType}
        </span>
        {prospect.lastContact && (
          <span className={cn('text-[10px] flex items-center gap-1', days > 7 ? 'text-red-500' : 'text-muted-foreground')}>
            <Clock className="w-2.5 h-2.5" aria-hidden="true" />
            <span aria-label={`Last contacted ${days === 0 ? 'today' : `${days} days ago`}`}>
              {days === 0 ? 'Today' : `${days}d ago`}
            </span>
          </span>
        )}
      </div>

      <div className="flex gap-1.5 transition-opacity" data-section="prospect-actions" data-testid={`prospect-actions-${prospect.id}`}>
        <button
          onClick={() => router.push(`/coach?prospect=${encodeURIComponent(prospect.ownerName)}&phone=${encodeURIComponent(prospect.phone)}&businessType=${encodeURIComponent(prospect.businessType)}`)}
          data-action="call"
          aria-label={`Call ${prospect.ownerName} at ${prospect.businessName}`}
          className="flex-1 text-[10px] text-center bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg py-1.5 font-semibold transition-colors flex items-center justify-center gap-1"
        >
          <Phone className="w-2.5 h-2.5" aria-hidden="true" />
          Call
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            data-action="open-move-menu"
            aria-label={`Move ${prospect.businessName} to another stage`}
            aria-expanded={showMoveMenu}
            className="text-[10px] bg-muted hover:bg-border text-muted-foreground rounded-lg px-2.5 py-1.5 font-medium transition-colors"
          >
            <MoveRight className="w-3 h-3" aria-hidden="true" />
          </button>
          {showMoveMenu && (
            <div
              className="absolute bottom-8 left-0 z-10 bg-card border border-border rounded-2xl shadow-xl py-1.5 w-44 animate-in-up"
              role="menu"
              aria-label="Move to stage"
            >
              {STAGES.filter(s => s.key !== prospect.stage).map(s => (
                <button
                  key={s.key}
                  onClick={() => { onMove(s.key); setShowMoveMenu(false); }}
                  data-action="move-stage"
                  data-target-stage={s.key}
                  aria-label={`Move to ${s.label}`}
                  role="menuitem"
                  className="w-full text-left text-xs px-4 py-2 hover:bg-muted text-foreground flex items-center gap-2 transition-colors"
                >
                  <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onDelete}
          data-action="delete"
          aria-label={`Delete ${prospect.businessName}`}
          className="text-[10px] bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <Trash2 className="w-3 h-3" aria-hidden="true" />
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
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="p-4 md:p-6 max-w-[1440px] mx-auto" data-page="dashboard" role="main">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Dashboard</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/leads')}
            aria-label="Generate leads"
            data-action="navigate"
            data-destination="/leads"
            className="hidden md:flex items-center gap-1.5 border border-border hover:bg-muted text-foreground rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            Leads
          </button>
          <button
            onClick={() => router.push('/dialer')}
            aria-label="Open power dialer"
            data-action="navigate"
            data-destination="/dialer"
            data-testid="dashboard-open-dialer-button"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-all btn-glow shadow-lg shadow-emerald-500/20"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Power </span>Dialer
          </button>
        </div>
      </div>

      {/* ── Ready-to-dial banner ── */}
      {callsToday === 0 && prospects.length > 0 && (
        <div
          className="mb-5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-300/40 dark:border-emerald-800 rounded-2xl px-4 py-3.5 flex items-center justify-between animate-in-up"
          role="status"
          aria-label="No calls made today"
          data-state="no-calls-today"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🔥</span>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Ready to dial?</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {prospects.length} prospect{prospects.length !== 1 ? 's' : ''} waiting — start your session
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dialer')}
            data-action="navigate"
            data-destination="/dialer"
            aria-label="Start dialing session"
            className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-3.5 py-2 transition-all btn-glow"
          >
            Start →
          </button>
        </div>
      )}

      {/* ── KPI Cards (bento grid) ── */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8"
        data-section="kpi-cards"
        aria-label="Key performance indicators"
      >
        {/* Calls Today */}
        <div
          className="glass-card rounded-2xl md:rounded-3xl p-4 md:p-5 border border-border"
          data-metric="calls-today"
          data-value={callsToday}
          data-testid="dashboard-stat-calls-today"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Calls Today</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Phone className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            </div>
          </div>
          <p className="metric-value text-foreground" aria-label={`${callsToday} calls today`}>
            {callsToday}
          </p>
          <button
            onClick={() => { incrementCallsToday(); refresh(); }}
            data-action="increment-calls"
            aria-label="Manually add one call to today's count"
            className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
          >
            + Add call
          </button>
        </div>

        {/* Demos Scheduled */}
        <div
          className="glass-card rounded-2xl md:rounded-3xl p-4 md:p-5 border border-border"
          data-metric="demos-scheduled"
          data-value={demosScheduled}
          data-testid="dashboard-stat-demos"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Demos Booked</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Users className="w-4 h-4 text-amber-600" aria-hidden="true" />
            </div>
          </div>
          <p className="metric-value text-foreground" aria-label={`${demosScheduled} demos scheduled`}>
            {demosScheduled}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">in pipeline</p>
        </div>

        {/* Deals Closed */}
        <div
          className="glass-card rounded-2xl md:rounded-3xl p-4 md:p-5 border border-border"
          data-metric="deals-closed"
          data-value={dealsWon}
          data-testid="dashboard-stat-deals-closed"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Deals Closed</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-purple-600" aria-hidden="true" />
            </div>
          </div>
          <p className="metric-value text-foreground" aria-label={`${dealsWon} deals closed`}>
            {dealsWon}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">total won</p>
        </div>

        {/* Pipeline MRR */}
        <div
          className="glass-card rounded-2xl md:rounded-3xl p-4 md:p-5 border border-emerald-200/60 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/80 to-transparent dark:from-emerald-900/20"
          data-metric="pipeline-mrr"
          data-value={pipelineValue}
          data-testid="dashboard-stat-mrr"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="section-label">Pipeline MRR</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            </div>
          </div>
          <p className="metric-value text-emerald-600 dark:text-emerald-400" aria-label={`$${pipelineValue} monthly recurring revenue`}>
            ${pipelineValue}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">@$49/mo per deal</p>
        </div>
      </div>

      {/* ── Quick Actions (mobile) ── */}
      <div className="flex gap-2 mb-5 md:hidden overflow-x-auto pb-1" aria-label="Quick actions">
        {[
          { href: '/analytics', icon: BarChart3, label: 'Analytics' },
          { href: '/leads', icon: Lightbulb, label: 'Leads' },
          { href: '/prospects', icon: Users, label: 'Prospects' },
        ].map(item => (
          <a
            key={item.href}
            href={item.href}
            data-action="navigate"
            data-destination={item.href}
            aria-label={`Go to ${item.label}`}
            className="flex items-center gap-2 flex-shrink-0 border border-border bg-card hover:bg-muted text-foreground rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors"
          >
            <item.icon className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            {item.label}
          </a>
        ))}
      </div>

      {/* ── Kanban Pipeline ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground">Pipeline</h2>
        <span className="text-xs text-muted-foreground">{prospects.length} total</span>
      </div>

      {prospects.length === 0 ? (
        <div
          className="text-center py-16 rounded-3xl border-2 border-dashed border-border"
          data-state="empty"
          role="status"
        >
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No prospects yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Add your first prospect to get started</p>
          <button
            onClick={() => router.push('/prospects')}
            data-action="navigate"
            data-destination="/prospects"
            aria-label="Add prospects"
            className="inline-flex items-center gap-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-4 py-2.5 font-semibold transition-all btn-glow"
          >
            <Plus className="w-4 h-4" />
            Add Prospects
          </button>
        </div>
      ) : (
        <div
          className="flex gap-3 md:gap-4 overflow-x-auto pb-4"
          data-section="pipeline-kanban"
          aria-label="Sales pipeline"
          role="region"
        >
          {STAGES.map(stage => {
            const stageProspects = prospects.filter(p => p.stage === stage.key);
            return (
              <div
                key={stage.key}
                className="flex-shrink-0 w-56 md:w-64 xl:w-72"
                data-stage={stage.key}
                aria-label={`${stage.label} column: ${stageProspects.length} prospects`}
              >
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('w-2 h-2 rounded-full', stage.dot)} aria-hidden="true" />
                  <span className="text-sm font-bold text-foreground">{stage.label}</span>
                  <span
                    className={cn('pill ml-auto', stage.stageClass)}
                    data-status="stage"
                    data-value={stage.key}
                    aria-label={`${stageProspects.length} prospects`}
                  >
                    {stageProspects.length}
                  </span>
                </div>

                {/* Prospect cards */}
                <div className="space-y-2.5 mb-2.5" role="list" aria-label={`${stage.label} prospects`}>
                  {stageProspects.map(p => (
                    <div key={p.id} role="listitem">
                      <ProspectCard
                        prospect={p}
                        onDelete={() => { deleteProspect(p.id); refresh(); }}
                        onMove={newStage => {
                          updateProspect(p.id, { stage: newStage, lastContact: new Date().toISOString().split('T')[0] });
                          refresh();
                        }}
                      />
                    </div>
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
