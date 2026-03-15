'use client';

import { useState, useEffect } from 'react';
import { Plus, Target, Pause, Play, Check, Trash2, Calendar, X } from 'lucide-react';
import {
  getCampaigns, addCampaign, updateCampaign, deleteCampaign,
  getProspects, getCallLogs, Campaign
} from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<Campaign['status'], { label: string; dot: string; badgeClass: string }> = {
  in_progress: { label: 'In Progress', dot: 'bg-emerald-400', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  paused:      { label: 'Paused',      dot: 'bg-amber-400',   badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  completed:   { label: 'Completed',   dot: 'bg-gray-400',    badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
];

function CampaignCard({ campaign, onStatusChange, onDelete }: {
  campaign: Campaign;
  onStatusChange: (id: string, status: Campaign['status']) => void;
  onDelete: (id: string) => void;
}) {
  const prospects = getProspects().filter(p => p.campaignId === campaign.id);
  const logs = getCallLogs().filter(l => {
    const pNames = new Set(prospects.map(p => p.ownerName));
    return pNames.has(l.prospectName);
  });
  const demosBooked = logs.filter(l => l.outcome === 'demo_booked' || l.outcome === 'closed_won').length;
  const progress = campaign.goal > 0 ? Math.min(100, Math.round((demosBooked / campaign.goal) * 100)) : 0;
  const cfg = STATUS_CONFIG[campaign.status];

  return (
    <div
      className="glass-card rounded-2xl border border-border p-5 transition-all"
      data-entity="campaign"
      data-entity-id={campaign.id}
      data-entity-status={campaign.status}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-base font-bold text-foreground truncate">{campaign.name}</h3>
            <span
              className={cn('pill flex-shrink-0', cfg.badgeClass)}
              data-status="campaign-status"
              data-value={campaign.status}
            >
              {cfg.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {campaign.businessType} · {campaign.targetCity}, {campaign.targetState}
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
          {campaign.status !== 'completed' && (
            <button
              onClick={() => onStatusChange(campaign.id, campaign.status === 'in_progress' ? 'paused' : 'in_progress')}
              data-action={campaign.status === 'in_progress' ? 'pause-campaign' : 'resume-campaign'}
              aria-label={campaign.status === 'in_progress' ? `Pause ${campaign.name}` : `Resume ${campaign.name}`}
              className="border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl p-2 transition-colors"
            >
              {campaign.status === 'in_progress'
                ? <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                : <Play className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
          )}
          <button
            onClick={() => onDelete(campaign.id)}
            data-action="delete-campaign"
            aria-label={`Delete ${campaign.name}`}
            className="border border-border hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 text-muted-foreground hover:text-red-500 rounded-xl p-2 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4" data-section="campaign-progress">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span className="font-medium">Goal progress</span>
          <span className="font-bold text-foreground">{demosBooked} / {campaign.goal} demos</span>
        </div>
        <div
          className="w-full bg-muted rounded-full h-2 overflow-hidden"
          role="progressbar"
          aria-valuenow={demosBooked}
          aria-valuemin={0}
          aria-valuemax={campaign.goal}
          aria-label={`${demosBooked} of ${campaign.goal} demos`}
        >
          <div
            className={cn('h-full rounded-full transition-all duration-500', progress >= 100 ? 'bg-purple-500' : 'bg-emerald-500')}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-right text-[10px] text-muted-foreground mt-1">{progress}% complete</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3" data-section="campaign-stats">
        {[
          { label: 'Leads', value: prospects.length, className: 'text-foreground' },
          { label: 'Calls', value: logs.length, className: 'text-foreground' },
          { label: 'Demos', value: demosBooked, className: 'text-emerald-600 dark:text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-muted/60 rounded-xl p-3 text-center">
            <p className={cn('text-lg font-black', stat.className)}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Goal reached */}
      {demosBooked >= campaign.goal && campaign.status !== 'completed' && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-3 flex items-center justify-between mb-3 animate-in-up">
          <p className="text-xs font-bold text-purple-700 dark:text-purple-300">🎉 Goal reached!</p>
          <button
            onClick={() => onStatusChange(campaign.id, 'completed')}
            data-action="complete-campaign"
            aria-label={`Mark ${campaign.name} as completed`}
            className="text-xs bg-purple-500 hover:bg-purple-600 text-white rounded-xl px-3 py-1.5 font-semibold transition-colors flex items-center gap-1"
          >
            <Check className="w-3 h-3" aria-hidden="true" />
            Mark Complete
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="w-3 h-3" aria-hidden="true" />
        Started {new Date(campaign.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', businessType: 'Plumber', targetCity: '', targetState: 'WA',
    goal: 5, startDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { setCampaigns(getCampaigns()); }, []);
  function refresh() { setCampaigns(getCampaigns()); }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    addCampaign({ ...form, status: 'in_progress' });
    setForm({ name: '', businessType: 'Plumber', targetCity: '', targetState: 'WA', goal: 5, startDate: new Date().toISOString().split('T')[0] });
    setShowForm(false);
    refresh();
  }

  const inProgress = campaigns.filter(c => c.status === 'in_progress');
  const paused = campaigns.filter(c => c.status === 'paused');
  const completed = campaigns.filter(c => c.status === 'completed');

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" data-page="campaigns" role="main">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your outbound campaigns</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          data-action="new-campaign"
          aria-label="Create new campaign"
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-all btn-glow shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          New Campaign
        </button>
      </div>

      {/* New campaign form */}
      {showForm && (
        <div
          className="glass-card rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/10 p-5 mb-6 animate-in-up"
          data-section="new-campaign-form"
          aria-label="New campaign form"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">New Campaign</h3>
            <button
              onClick={() => setShowForm(false)}
              aria-label="Close form"
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="section-label mb-1.5 block" htmlFor="campaign-name">Campaign Name</label>
              <input
                id="campaign-name"
                name="name"
                data-field="name"
                className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-shadow"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Q1 Plumber Blitz"
                required
                aria-required="true"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="section-label mb-1.5 block" htmlFor="campaign-type">Business Type</label>
                <select
                  id="campaign-type"
                  name="businessType"
                  data-field="business-type"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none text-foreground"
                  value={form.businessType}
                  onChange={e => setForm({ ...form, businessType: e.target.value })}
                >
                  {BUSINESS_TYPES.filter(t => t !== 'Other').map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label mb-1.5 block" htmlFor="campaign-goal">Goal (# Demos)</label>
                <input
                  id="campaign-goal"
                  type="number" min={1} max={100}
                  name="goal"
                  data-field="goal"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-shadow"
                  value={form.goal}
                  onChange={e => setForm({ ...form, goal: parseInt(e.target.value) || 5 })}
                  aria-label="Goal number of demos"
                />
              </div>
              <div>
                <label className="section-label mb-1.5 block" htmlFor="campaign-city">Target City</label>
                <input
                  id="campaign-city"
                  name="targetCity"
                  data-field="target-city"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-shadow"
                  value={form.targetCity}
                  onChange={e => setForm({ ...form, targetCity: e.target.value })}
                  placeholder="Seattle"
                />
              </div>
              <div>
                <label className="section-label mb-1.5 block" htmlFor="campaign-state">State</label>
                <select
                  id="campaign-state"
                  name="targetState"
                  data-field="target-state"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none text-foreground"
                  value={form.targetState}
                  onChange={e => setForm({ ...form, targetState: e.target.value })}
                >
                  {US_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label mb-1.5 block" htmlFor="campaign-start">Start Date</label>
                <input
                  id="campaign-start"
                  type="date"
                  name="startDate"
                  data-field="start-date"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-shadow"
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                data-action="create-campaign"
                aria-label="Create this campaign"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3 text-sm font-bold transition-all btn-glow shadow-lg shadow-emerald-500/20"
              >
                Create Campaign
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Cancel"
                className="flex-1 border border-border hover:bg-muted text-foreground rounded-2xl py-3 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {campaigns.length === 0 && !showForm && (
        <div
          className="text-center py-16 rounded-3xl border-2 border-dashed border-border"
          data-state="empty"
          role="status"
        >
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">No campaigns yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Create a campaign to organize your outreach</p>
          <button
            onClick={() => setShowForm(true)}
            data-action="new-campaign"
            aria-label="Create your first campaign"
            className="inline-flex items-center gap-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-4 py-2.5 font-bold transition-all btn-glow"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Create Campaign
          </button>
        </div>
      )}

      {/* Campaign sections */}
      {campaigns.length > 0 && (
        <div className="space-y-7" data-section="campaigns-list">

          {inProgress.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full" aria-hidden="true" />
                Active Campaigns
                <span className="ml-1 text-xs font-semibold text-muted-foreground">({inProgress.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {inProgress.map(c => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    onStatusChange={(id, status) => { updateCampaign(id, { status }); refresh(); }}
                    onDelete={id => { deleteCampaign(id); refresh(); }}
                  />
                ))}
              </div>
            </div>
          )}

          {paused.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full" aria-hidden="true" />
                Paused
                <span className="ml-1 text-xs font-semibold text-muted-foreground">({paused.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paused.map(c => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    onStatusChange={(id, status) => { updateCampaign(id, { status }); refresh(); }}
                    onDelete={id => { deleteCampaign(id); refresh(); }}
                  />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full" aria-hidden="true" />
                Completed
                <span className="ml-1 text-xs font-semibold text-muted-foreground">({completed.length})</span>
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {completed.map(c => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    onStatusChange={(id, status) => { updateCampaign(id, { status }); refresh(); }}
                    onDelete={id => { deleteCampaign(id); refresh(); }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
