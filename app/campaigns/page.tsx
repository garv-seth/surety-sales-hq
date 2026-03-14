'use client';

import { useState, useEffect } from 'react';
import { Plus, Target, Pause, Play, Check, Trash2, TrendingUp, Phone, Calendar } from 'lucide-react';
import {
  getCampaigns, addCampaign, updateCampaign, deleteCampaign,
  getProspects, getCallLogs, Campaign
} from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'bg-emerald-100 text-emerald-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
};
const STATUS_LABELS: Record<string, string> = {
  in_progress: 'In Progress',
  paused: 'Paused',
  completed: 'Completed',
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
];

function CampaignCard({
  campaign,
  onStatusChange,
  onDelete,
}: {
  campaign: Campaign;
  onStatusChange: (id: string, status: Campaign['status']) => void;
  onDelete: (id: string) => void;
}) {
  const prospects = getProspects().filter(p => p.campaignId === campaign.id);
  const logs = getCallLogs().filter(l => {
    // Match logs for prospects in this campaign
    const pNames = new Set(prospects.map(p => p.ownerName));
    return pNames.has(l.prospectName);
  });
  const demosBooked = logs.filter(l => l.outcome === 'demo_booked' || l.outcome === 'closed_won').length;
  const progress = Math.min(100, Math.round((demosBooked / campaign.goal) * 100));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-slate-900 truncate">{campaign.name}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[campaign.status]}`}>
              {STATUS_LABELS[campaign.status]}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {campaign.businessType} · {campaign.targetCity}, {campaign.targetState}
          </p>
        </div>
        <div className="flex items-center gap-1.5 ml-3">
          {campaign.status !== 'completed' && (
            <button
              onClick={() => onStatusChange(campaign.id, campaign.status === 'in_progress' ? 'paused' : 'in_progress')}
              className="text-xs border border-gray-200 hover:bg-gray-50 text-slate-600 rounded-lg p-2 transition-colors"
            >
              {campaign.status === 'in_progress' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => onDelete(campaign.id)}
            className="text-xs border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 rounded-lg p-2 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Progress toward goal</span>
          <span className="font-semibold text-slate-700">{demosBooked} / {campaign.goal} demos</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${progress >= 100 ? 'bg-purple-500' : 'bg-emerald-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-right text-xs text-gray-400 mt-1">{progress}% complete</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{prospects.length}</p>
          <p className="text-[10px] text-gray-500">Leads</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-slate-900">{logs.length}</p>
          <p className="text-[10px] text-gray-500">Calls Made</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{demosBooked}</p>
          <p className="text-[10px] text-gray-500">Demos</p>
        </div>
      </div>

      {demosBooked >= campaign.goal && campaign.status !== 'completed' && (
        <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-purple-700">🎉 Goal reached!</p>
          <button onClick={() => onStatusChange(campaign.id, 'completed')}
            className="text-xs bg-purple-500 hover:bg-purple-600 text-white rounded-lg px-3 py-1.5 font-medium transition-colors flex items-center gap-1">
            <Check className="w-3 h-3" />Mark Complete
          </button>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-xs text-gray-400">
        <Calendar className="w-3 h-3" />
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage your outbound campaigns</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {campaigns.length === 0 && !showForm ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <Target className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-600 mb-1">No campaigns yet</h3>
          <p className="text-sm text-gray-400 mb-4">Create a campaign to organize your outreach efforts</p>
          <button onClick={() => setShowForm(true)} className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 font-medium transition-colors">
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {showForm && (
            <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900 mb-5">New Campaign</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Campaign Name</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Q1 Plumber Blitz" required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Business Type</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 bg-white"
                      value={form.businessType} onChange={e => setForm({ ...form, businessType: e.target.value })}>
                      {BUSINESS_TYPES.filter(t => t !== 'Other').map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Goal (# Demos)</label>
                    <input type="number" min={1} max={100}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                      value={form.goal} onChange={e => setForm({ ...form, goal: parseInt(e.target.value) || 5 })} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Target City</label>
                    <input className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                      value={form.targetCity} onChange={e => setForm({ ...form, targetCity: e.target.value })}
                      placeholder="Seattle" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">State</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 bg-white"
                      value={form.targetState} onChange={e => setForm({ ...form, targetState: e.target.value })}>
                      {US_STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Start Date</label>
                    <input type="date"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                      value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">
                    Create Campaign
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-lg py-2.5 text-sm font-semibold transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {inProgress.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />Active Campaigns
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {inProgress.map(c => (
                  <CampaignCard key={c.id} campaign={c}
                    onStatusChange={(id, status) => { updateCampaign(id, { status }); refresh(); }}
                    onDelete={id => { deleteCampaign(id); refresh(); }}
                  />
                ))}
              </div>
            </div>
          )}

          {paused.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-400 rounded-full" />Paused
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paused.map(c => (
                  <CampaignCard key={c.id} campaign={c}
                    onStatusChange={(id, status) => { updateCampaign(id, { status }); refresh(); }}
                    onDelete={id => { deleteCampaign(id); refresh(); }}
                  />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />Completed
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {completed.map(c => (
                  <CampaignCard key={c.id} campaign={c}
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
