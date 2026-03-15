'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, Phone, Trash2, Download, Upload, CheckSquare, Square,
  Users, Clock, X, MoreVertical, ChevronRight
} from 'lucide-react';
import {
  getProspects, addProspect, deleteProspect, updateProspect,
  exportProspectsCSV, Prospect, BusinessStage
} from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';
import { cn } from '@/lib/utils';

const STAGES: BusinessStage[] = ['new', 'contacted', 'demo_scheduled', 'negotiating', 'closed_won'];
const STAGE_LABELS: Record<BusinessStage, string> = {
  new: 'New', contacted: 'Contacted', demo_scheduled: 'Demo Scheduled',
  negotiating: 'Negotiating', closed_won: 'Closed Won',
};

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

// Mobile prospect card
function ProspectCard({ p, selected, onToggle, onCall, onDelete }: {
  p: Prospect;
  selected: boolean;
  onToggle: () => void;
  onCall: () => void;
  onDelete: () => void;
}) {
  const days = daysSince(p.lastContact);
  return (
    <div
      className={cn(
        'glass-card rounded-2xl border p-4 transition-all',
        selected ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-border'
      )}
      data-entity="prospect"
      data-entity-id={p.id}
      data-entity-stage={p.stage}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          aria-label={selected ? `Deselect ${p.businessName}` : `Select ${p.businessName}`}
          aria-pressed={selected}
          data-action="select-prospect"
          className="mt-0.5 flex-shrink-0"
        >
          {selected
            ? <CheckSquare className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            : <Square className="w-4 h-4 text-muted-foreground/40" aria-hidden="true" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <h3 className="text-sm font-bold text-foreground truncate">{p.businessName}</h3>
              <p className="text-xs text-muted-foreground">{p.ownerName}</p>
            </div>
            <span
              className={cn('pill flex-shrink-0', `stage-${p.stage}`)}
              data-status="stage"
              data-value={p.stage}
            >
              {STAGE_LABELS[p.stage]}
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground">{p.phone}</span>
              {p.lastContact && (
                <span className={cn('text-[10px] flex items-center gap-1', days > 7 ? 'text-red-500' : 'text-muted-foreground')}>
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {days === 0 ? 'Today' : `${days}d ago`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onCall}
                aria-label={`Call ${p.ownerName} at ${p.businessName}`}
                data-action="call"
                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-600 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                onClick={onDelete}
                aria-label={`Delete ${p.businessName}`}
                data-action="delete"
                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [addForm, setAddForm] = useState({ businessName: '', ownerName: '', phone: '', businessType: 'Plumber', notes: '' });
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
    if (next.has(id)) next.delete(id); else next.add(id);
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
    <div className="p-4 md:p-6 max-w-6xl mx-auto" data-page="prospects" role="main">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Prospects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{prospects.length} total</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleExportCSV}
            data-action="export"
            aria-label="Export prospects as CSV"
            className="hidden sm:flex items-center gap-1.5 text-sm border border-border hover:bg-muted text-foreground rounded-xl px-3 py-2 font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Export
          </button>
          <label
            className="hidden sm:flex items-center gap-1.5 text-sm border border-border hover:bg-muted text-foreground rounded-xl px-3 py-2 font-medium transition-colors cursor-pointer"
            aria-label={importing ? 'Importing CSV...' : 'Import CSV file'}
          >
            <Upload className="w-3.5 h-3.5" aria-hidden="true" />
            {importing ? 'Importing...' : 'Import'}
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} data-action="import-csv" />
          </label>
          <button
            onClick={() => setShowAddForm(true)}
            data-action="add-prospect"
            aria-label="Add new prospect"
            className="flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold transition-all btn-glow shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Add Prospect</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* ── Import success message ── */}
      {importMsg && (
        <div
          className="mb-4 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 animate-in-up"
          role="status"
          aria-live="polite"
        >
          {importMsg}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4" role="search" aria-label="Filter prospects">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            className="w-full border border-border bg-background rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none transition-shadow"
            placeholder="Search by name, phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search prospects"
            data-field="search"
          />
        </div>
        <select
          className="border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none text-foreground transition-shadow"
          value={stageFilter}
          onChange={e => setStageFilter(e.target.value)}
          aria-label="Filter by stage"
          data-field="filter-stage"
        >
          <option value="all">All Stages</option>
          {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </select>
        <select
          className="border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none text-foreground transition-shadow"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          aria-label="Filter by business type"
          data-field="filter-type"
        >
          <option value="all">All Types</option>
          {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div
          className="mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap animate-in-up"
          role="toolbar"
          aria-label="Bulk actions"
          data-section="bulk-actions"
        >
          <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <select
              className="border border-emerald-300 dark:border-emerald-700 rounded-xl px-3 py-1.5 text-xs bg-background text-foreground focus:outline-none"
              value={bulkStage}
              onChange={e => setBulkStage(e.target.value)}
              aria-label="Move selected to stage"
              data-field="bulk-stage"
            >
              <option value="">Move to stage...</option>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            {bulkStage && (
              <button
                onClick={moveBulk}
                data-action="bulk-move"
                aria-label={`Move ${selected.size} prospects to ${STAGE_LABELS[bulkStage as BusinessStage]}`}
                className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-3 py-1.5 font-semibold transition-colors"
              >
                Apply
              </button>
            )}
            <button
              onClick={deleteSelected}
              data-action="bulk-delete"
              aria-label={`Delete ${selected.size} selected prospects`}
              className="text-xs bg-red-500 hover:bg-red-600 text-white rounded-xl px-3 py-1.5 font-semibold transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              data-action="clear-selection"
              aria-label="Clear selection"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Empty State ── */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-3xl border-2 border-dashed border-border"
          data-state="empty"
          role="status"
        >
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-1">
            {prospects.length === 0 ? 'No prospects yet' : 'No results found'}
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            {prospects.length === 0 ? 'Add your first prospect to get started' : 'Try adjusting your filters'}
          </p>
          {prospects.length === 0 && (
            <button
              onClick={() => setShowAddForm(true)}
              data-action="add-prospect"
              aria-label="Add your first prospect"
              className="inline-flex items-center gap-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-4 py-2.5 font-bold transition-all btn-glow"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Prospect
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Mobile card list (< md) ── */}
          <div
            className="md:hidden space-y-2.5"
            role="list"
            aria-label="Prospects list"
            data-section="prospects-list"
          >
            {filtered.map(p => (
              <div key={p.id} role="listitem">
                <ProspectCard
                  p={p}
                  selected={selected.has(p.id)}
                  onToggle={() => toggleSelect(p.id)}
                  onCall={() => router.push(`/coach?prospect=${encodeURIComponent(p.ownerName)}&phone=${encodeURIComponent(p.phone)}&businessType=${encodeURIComponent(p.businessType)}`)}
                  onDelete={() => { deleteProspect(p.id); loadProspects(); }}
                />
              </div>
            ))}
          </div>

          {/* ── Desktop table (md+) ── */}
          <div
            className="hidden md:block glass-card rounded-2xl border border-border overflow-hidden"
            data-section="prospects-table"
          >
            <div className="overflow-x-auto">
              <table
                className="w-full"
                role="grid"
                aria-label="Prospects"
                aria-rowcount={filtered.length}
              >
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 w-10">
                      <button
                        onClick={toggleAll}
                        aria-label={selected.size === filtered.length ? 'Deselect all' : 'Select all'}
                        data-action="select-all"
                      >
                        {selected.size === filtered.length && filtered.length > 0
                          ? <CheckSquare className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                          : <Square className="w-4 h-4 text-muted-foreground/40" aria-hidden="true" />}
                      </button>
                    </th>
                    <th className="text-left px-4 py-3"><span className="section-label">Business</span></th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell"><span className="section-label">Owner</span></th>
                    <th className="text-left px-4 py-3 hidden md:table-cell"><span className="section-label">Phone</span></th>
                    <th className="text-left px-4 py-3 hidden lg:table-cell"><span className="section-label">Type</span></th>
                    <th className="text-left px-4 py-3"><span className="section-label">Stage</span></th>
                    <th className="text-left px-4 py-3 hidden xl:table-cell"><span className="section-label">Last Contact</span></th>
                    <th className="px-4 py-3 w-20" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p, i) => {
                    const days = daysSince(p.lastContact);
                    const isStale = days > 7;
                    return (
                      <tr
                        key={p.id}
                        className={cn(
                          'hover:bg-muted/30 group transition-colors',
                          selected.has(p.id) && 'bg-emerald-50/50 dark:bg-emerald-900/10'
                        )}
                        data-entity="prospect"
                        data-entity-id={p.id}
                        data-entity-stage={p.stage}
                        aria-rowindex={i + 1}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleSelect(p.id)}
                            aria-label={selected.has(p.id) ? `Deselect ${p.businessName}` : `Select ${p.businessName}`}
                            aria-pressed={selected.has(p.id)}
                            data-action="select-prospect"
                          >
                            {selected.has(p.id)
                              ? <CheckSquare className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                              : <Square className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" aria-hidden="true" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-foreground">{p.businessName}</p>
                          {p.notes && <p className="text-xs text-muted-foreground truncate max-w-32">{p.notes}</p>}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <p className="text-sm text-foreground">{p.ownerName}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-sm font-mono text-muted-foreground">{p.phone}</p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
                            {p.businessType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn('pill', `stage-${p.stage}`)}
                            data-status="stage"
                            data-value={p.stage}
                          >
                            {STAGE_LABELS[p.stage]}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          {p.lastContact ? (
                            <span className={cn('text-xs flex items-center gap-1 font-medium', isStale ? 'text-red-500' : 'text-muted-foreground')}>
                              <Clock className="w-3 h-3" aria-hidden="true" />
                              {days === 0 ? 'Today' : `${days}d ago`}
                            </span>
                          ) : <span className="text-xs text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 transition-opacity" data-testid={`prospect-row-actions-${p.id}`}>
                            <button
                              onClick={() => router.push(`/coach?prospect=${encodeURIComponent(p.ownerName)}&phone=${encodeURIComponent(p.phone)}&businessType=${encodeURIComponent(p.businessType)}`)}
                              data-action="call"
                              data-testid={`prospect-table-call-${p.id}`}
                              aria-label={`Call ${p.ownerName} at ${p.businessName}`}
                              className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-600 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => { deleteProspect(p.id); loadProspects(); }}
                              data-action="delete"
                              data-testid={`prospect-table-delete-${p.id}`}
                              aria-label={`Delete ${p.businessName}`}
                              className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 hover:bg-red-100 text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Showing {filtered.length} of {prospects.length} prospects
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── Add Prospect Modal ── */}
      {showAddForm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add new prospect"
          data-section="add-prospect-dialog"
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setShowAddForm(false)}
            aria-hidden="true"
          />
          <div className="relative bg-card rounded-3xl shadow-2xl p-6 w-full max-w-md border border-border animate-in-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-foreground">Add Prospect</h3>
              <button
                onClick={() => setShowAddForm(false)}
                aria-label="Close dialog"
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleAddProspect} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label mb-1.5 block" htmlFor="add-business-name">Business Name *</label>
                  <input
                    id="add-business-name"
                    name="businessName"
                    data-field="business-name"
                    className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-shadow"
                    value={addForm.businessName}
                    onChange={e => setAddForm({ ...addForm, businessName: e.target.value })}
                    required
                    placeholder="Jake's Plumbing"
                    aria-required="true"
                  />
                </div>
                <div>
                  <label className="section-label mb-1.5 block" htmlFor="add-owner-name">Owner Name *</label>
                  <input
                    id="add-owner-name"
                    name="ownerName"
                    data-field="owner-name"
                    className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-shadow"
                    value={addForm.ownerName}
                    onChange={e => setAddForm({ ...addForm, ownerName: e.target.value })}
                    required
                    placeholder="Jake Morrison"
                    aria-required="true"
                  />
                </div>
                <div>
                  <label className="section-label mb-1.5 block" htmlFor="add-phone">Phone *</label>
                  <input
                    id="add-phone"
                    name="phone"
                    data-field="phone"
                    className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none transition-shadow"
                    value={addForm.phone}
                    onChange={e => setAddForm({ ...addForm, phone: e.target.value })}
                    required
                    placeholder="(206) 555-0142"
                    aria-required="true"
                  />
                </div>
                <div>
                  <label className="section-label mb-1.5 block" htmlFor="add-type">Business Type</label>
                  <select
                    id="add-type"
                    name="businessType"
                    data-field="business-type"
                    className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none text-foreground"
                    value={addForm.businessType}
                    onChange={e => setAddForm({ ...addForm, businessType: e.target.value })}
                  >
                    {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="section-label mb-1.5 block" htmlFor="add-notes">Notes</label>
                <textarea
                  id="add-notes"
                  name="notes"
                  data-field="notes"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none transition-shadow"
                  rows={2}
                  value={addForm.notes}
                  onChange={e => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  data-action="save-prospect"
                  aria-label="Add this prospect"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3 text-sm font-bold transition-all btn-glow shadow-lg shadow-emerald-500/20"
                >
                  Add Prospect
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  aria-label="Cancel"
                  className="flex-1 border border-border hover:bg-muted text-foreground rounded-2xl py-3 text-sm font-semibold transition-colors"
                >
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
