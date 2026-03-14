'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Phone, Trash2, Download, Upload, CheckSquare, Square,
  Filter, Users, Clock, ChevronDown
} from 'lucide-react';
import {
  getProspects, addProspect, deleteProspect, updateProspect,
  exportProspectsCSV, Prospect, BusinessStage
} from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';
import { cn } from '@/lib/utils';

const STAGES: BusinessStage[] = ['new', 'contacted', 'demo_scheduled', 'negotiating', 'closed_won'];
const STAGE_LABELS: Record<BusinessStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  demo_scheduled: 'Demo Scheduled',
  negotiating: 'Negotiating',
  closed_won: 'Closed Won',
};
const STAGE_COLORS: Record<BusinessStage, string> = {
  new: 'bg-slate-100 text-slate-600',
  contacted: 'bg-blue-100 text-blue-700',
  demo_scheduled: 'bg-amber-100 text-amber-700',
  negotiating: 'bg-purple-100 text-purple-700',
  closed_won: 'bg-emerald-100 text-emerald-700',
};

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ProspectsPage() {
  const router = useRouter();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [bulkStage, setBulkStage] = useState('');
  const [addForm, setAddForm] = useState({
    businessName: '', ownerName: '', phone: '', businessType: 'Plumber', notes: '',
  });
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  function loadProspects() { setProspects(getProspects()); }
  useEffect(() => { loadProspects(); }, []);

  const filtered = prospects.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.businessName.toLowerCase().includes(q) ||
      p.ownerName.toLowerCase().includes(q) || p.phone.includes(q);
    const matchStage = stageFilter === 'all' || p.stage === stageFilter;
    const matchType = typeFilter === 'all' || p.businessType === typeFilter;
    return matchSearch && matchStage && matchType;
  });

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  }

  function deleteSelected() {
    selected.forEach(id => deleteProspect(id));
    setSelected(new Set());
    loadProspects();
  }

  function moveBulk() {
    if (!bulkStage) return;
    selected.forEach(id => updateProspect(id, { stage: bulkStage as BusinessStage }));
    setSelected(new Set());
    setBulkStage('');
    loadProspects();
  }

  function handleAddProspect(e: React.FormEvent) {
    e.preventDefault();
    addProspect({ ...addForm, stage: 'new', lastContact: new Date().toISOString().split('T')[0] });
    setAddForm({ businessName: '', ownerName: '', phone: '', businessType: 'Plumber', notes: '' });
    setShowAddForm(false);
    loadProspects();
  }

  function handleExportCSV() {
    const csv = exportProspectsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prospects-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) { setImporting(false); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      let count = 0;
      lines.slice(1).forEach(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => row[h] = cols[i] || '');
        const businessName = row['business name'] || row['businessname'] || row['company'] || '';
        const ownerName = row['owner name'] || row['ownername'] || row['owner'] || row['name'] || '';
        const phone = row['phone'] || row['phone number'] || '';
        const bType = row['business type'] || row['type'] || 'Other';
        if (businessName) {
          addProspect({ businessName, ownerName: ownerName || businessName, phone, businessType: bType, stage: 'new', notes: '', lastContact: new Date().toISOString().split('T')[0] });
          count++;
        }
      });
      setImportMsg(`✓ ${count} prospects imported`);
      setTimeout(() => setImportMsg(''), 3000);
      loadProspects();
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prospects</h1>
          <p className="text-sm text-gray-500 mt-0.5">{prospects.length} total prospects</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 text-sm border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-lg px-3 py-2 font-medium transition-colors">
            <Download className="w-3.5 h-3.5" />Export
          </button>
          <label className="flex items-center gap-1.5 text-sm border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-lg px-3 py-2 font-medium transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />{importing ? 'Importing...' : 'Import CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          </label>
          <button onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 font-semibold transition-colors">
            <Plus className="w-3.5 h-3.5" />Add Prospect
          </button>
        </div>
      </div>

      {importMsg && (
        <div className="mb-4 text-xs font-medium text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-lg border border-emerald-200">
          {importMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            placeholder="Search by name, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 bg-white text-slate-700"
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
        >
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 bg-white text-slate-700"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="all">All Types</option>
          {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-emerald-800">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select
              className="border border-emerald-300 rounded-lg px-3 py-1.5 text-xs text-emerald-800 bg-white focus:outline-none"
              value={bulkStage}
              onChange={e => setBulkStage(e.target.value)}
            >
              <option value="">Move to stage...</option>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            {bulkStage && (
              <button onClick={moveBulk} className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 py-1.5 font-medium transition-colors">
                Apply
              </button>
            )}
            <button onClick={deleteSelected}
              className="text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1.5 font-medium transition-colors">
              Delete
            </button>
            <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-200">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-600 mb-1">
            {prospects.length === 0 ? 'No prospects yet' : 'No results found'}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {prospects.length === 0 ? 'Add your first prospect to get started' : 'Try adjusting your search or filters'}
          </p>
          {prospects.length === 0 && (
            <button onClick={() => setShowAddForm(true)}
              className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 font-medium transition-colors">
              Add Prospect
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 w-10">
                    <button onClick={toggleAll}>
                      {selected.size === filtered.length && filtered.length > 0
                        ? <CheckSquare className="w-4 h-4 text-emerald-500" />
                        : <Square className="w-4 h-4 text-gray-300" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Owner</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden xl:table-cell">Last Contact</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(p => {
                  const days = daysSince(p.lastContact);
                  const isStale = days > 7;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 group transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(p.id)}>
                          {selected.has(p.id)
                            ? <CheckSquare className="w-4 h-4 text-emerald-500" />
                            : <Square className="w-4 h-4 text-gray-300 group-hover:text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">{p.businessName}</p>
                        {p.notes && <p className="text-xs text-gray-400 truncate max-w-32">{p.notes}</p>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-sm text-slate-700">{p.ownerName}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm font-mono text-slate-600">{p.phone}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                          {p.businessType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STAGE_COLORS[p.stage]}`}>
                          {STAGE_LABELS[p.stage]}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {p.lastContact ? (
                          <span className={cn('text-xs flex items-center gap-1', isStale ? 'text-red-500' : 'text-gray-400')}>
                            <Clock className="w-3 h-3" />
                            {days === 0 ? 'Today' : `${days}d ago`}
                          </span>
                        ) : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => router.push(`/coach?prospect=${encodeURIComponent(p.ownerName)}&phone=${encodeURIComponent(p.phone)}&businessType=${encodeURIComponent(p.businessType)}`)}
                            className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md px-2 py-1.5 font-medium transition-colors flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { deleteProspect(p.id); loadProspects(); }}
                            className="text-xs bg-red-50 hover:bg-red-100 text-red-500 rounded-md px-2 py-1.5 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">Showing {filtered.length} of {prospects.length} prospects</p>
          </div>
        </div>
      )}

      {/* Add Prospect Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-slate-900 mb-5">Add Prospect</h3>
            <form onSubmit={handleAddProspect} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Business Name *</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={addForm.businessName}
                    onChange={e => setAddForm({ ...addForm, businessName: e.target.value })}
                    required placeholder="Jake's Plumbing"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Owner Name *</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={addForm.ownerName}
                    onChange={e => setAddForm({ ...addForm, ownerName: e.target.value })}
                    required placeholder="Jake Morrison"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Phone *</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={addForm.phone}
                    onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                    required placeholder="(206) 555-0142"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Business Type</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 bg-white"
                    value={addForm.businessType}
                    onChange={e => setAddForm({ ...addForm, businessType: e.target.value })}
                  >
                    {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Notes</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 resize-none"
                  rows={2}
                  value={addForm.notes}
                  onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">
                  Add Prospect
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-lg py-2.5 text-sm font-semibold transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
