'use client';

import { useState } from 'react';
import {
  Lightbulb, Search, Plus, Check, CheckSquare, Square, AlertCircle, Upload
} from 'lucide-react';
import { addProspect } from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';
import { cn } from '@/lib/utils';

interface Lead {
  businessName: string;
  ownerName: string;
  phone: string;
  address: string;
  confidenceScore: number;
  reason: string;
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY'
];

function ConfidenceBadge({ score }: { score: number }) {
  const cls = score >= 80
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
    : score >= 60
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
  return (
    <span
      className={cn('pill flex-shrink-0', cls)}
      data-status="confidence"
      data-value={score}
      aria-label={`Confidence score: ${score}%`}
    >
      {score}%
    </span>
  );
}

export default function LeadsPage() {
  const [city, setCity] = useState('');
  const [state, setState] = useState('WA');
  const [businessType, setBusinessType] = useState('Plumber');
  const [count, setCount] = useState(10);
  const [confidenceMin, setConfidenceMin] = useState(70);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [addedCount, setAddedCount] = useState(0);
  const [thinkingMsg, setThinkingMsg] = useState('');
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);

  async function generateLeads(e: React.FormEvent) {
    e.preventDefault();
    if (!city) return;
    setLoading(true);
    setLeads([]);
    setSelected(new Set());
    setError('');
    setAddedCount(0);
    setThinkingMsg(`Searching for ${businessType.toLowerCase()}s in ${city}, ${state}...`);
    try {
      const res = await fetch('/api/generate-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, state, businessType, count, confidenceMin }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLeads(data.leads || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate leads');
    }
    setLoading(false);
    setThinkingMsg('');
  }

  function toggleSelect(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i); else next.add(i);
    setSelected(next);
  }

  function selectAll() {
    if (selected.size === leads.length) setSelected(new Set());
    else setSelected(new Set(leads.map((_, i) => i)));
  }

  function addLead(lead: Lead) {
    addProspect({
      businessName: lead.businessName,
      ownerName: lead.ownerName,
      phone: lead.phone,
      businessType,
      stage: 'new',
      notes: `Generated lead. ${lead.address}. ${lead.reason}`,
      lastContact: new Date().toISOString().split('T')[0],
    });
  }

  function addSelected() {
    let cnt = 0;
    leads.forEach((lead, i) => { if (selected.has(i)) { addLead(lead); cnt++; } });
    setAddedCount(prev => prev + cnt);
    setSelected(new Set());
  }

  function addAll() {
    leads.forEach(lead => addLead(lead));
    setAddedCount(leads.length);
    setSelected(new Set());
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
      let cnt = 0;
      lines.slice(1).forEach(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => row[h] = cols[i] || '');
        const businessName = row['business name'] || row['businessname'] || row['company'] || '';
        const ownerName = row['owner name'] || row['ownername'] || row['owner'] || row['name'] || '';
        const phone = row['phone'] || row['phone number'] || '';
        const bType = row['business type'] || row['type'] || businessType;
        if (businessName) {
          addProspect({ businessName, ownerName: ownerName || businessName, phone, businessType: bType, stage: 'new', notes: 'Imported from CSV', lastContact: new Date().toISOString().split('T')[0] });
          cnt++;
        }
      });
      setImportCount(cnt);
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" data-page="leads" role="main">
      <div className="mb-5">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Lead Generator</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate AI practice leads or import your own CSV</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Form panel ── */}
        <div className="lg:col-span-1" data-section="generate-form">
          <div className="glass-card rounded-2xl border border-border p-5">
            <h2 className="text-sm font-bold text-foreground mb-4">Generate Leads</h2>
            <form onSubmit={generateLeads} className="space-y-3.5">
              <div>
                <label className="section-label mb-1.5 block" htmlFor="lead-city">City</label>
                <input
                  id="lead-city"
                  name="city"
                  data-field="city"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-shadow"
                  placeholder="Seattle"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
              <div>
                <label className="section-label mb-1.5 block" htmlFor="lead-state">State</label>
                <select
                  id="lead-state"
                  name="state"
                  data-field="state"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none text-foreground"
                  value={state}
                  onChange={e => setState(e.target.value)}
                  aria-label="Select state"
                >
                  {US_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label mb-1.5 block" htmlFor="lead-type">Business Type</label>
                <select
                  id="lead-type"
                  name="businessType"
                  data-field="business-type"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none text-foreground"
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value)}
                  aria-label="Select business type"
                >
                  {BUSINESS_TYPES.filter(t => t !== 'Other').map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label mb-1.5 block" htmlFor="lead-count">Number of Leads</label>
                <input
                  id="lead-count"
                  type="number"
                  min={5} max={50}
                  name="count"
                  data-field="count"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-shadow"
                  value={count}
                  onChange={e => setCount(parseInt(e.target.value) || 10)}
                  aria-label="Number of leads to generate"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="section-label" htmlFor="lead-confidence">Min. Confidence</label>
                  <span className="text-xs font-bold text-emerald-600">{confidenceMin}%</span>
                </div>
                <input
                  id="lead-confidence"
                  type="range" min={50} max={95} step={5}
                  name="confidenceMin"
                  data-field="confidence-min"
                  className="w-full accent-emerald-500 h-2 cursor-pointer"
                  value={confidenceMin}
                  onChange={e => setConfidenceMin(parseInt(e.target.value))}
                  aria-label={`Minimum confidence score: ${confidenceMin}%`}
                  aria-valuemin={50}
                  aria-valuemax={95}
                  aria-valuenow={confidenceMin}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">50%</span>
                  <span className="text-[10px] text-muted-foreground">95%</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !city}
                data-action="generate-leads"
                aria-label={loading ? 'Generating leads...' : 'Generate leads'}
                aria-busy={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl py-3 font-bold text-sm transition-all btn-glow shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Search className="w-4 h-4 animate-pulse" aria-hidden="true" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4" aria-hidden="true" />
                    Generate Leads
                  </>
                )}
              </button>
            </form>

            {/* CSV Import */}
            <div className="mt-5 pt-5 border-t border-border" data-section="csv-import">
              <h3 className="section-label mb-3">CSV Import</h3>
              <label
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-2xl py-3.5 cursor-pointer transition-all text-sm text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
                aria-label={importing ? 'Importing CSV...' : 'Upload CSV file'}
              >
                <Upload className="w-4 h-4" aria-hidden="true" />
                {importing ? 'Importing...' : 'Upload CSV'}
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} data-action="import-csv" />
              </label>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                Columns: Business Name, Owner, Phone, Type
              </p>
              {importCount > 0 && (
                <p className="text-xs text-emerald-600 text-center mt-2 font-bold" role="status" aria-live="polite">
                  ✓ {importCount} prospects imported
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Results panel ── */}
        <div className="lg:col-span-2" data-section="leads-results">

          {/* Thinking message */}
          {loading && thinkingMsg && (
            <div
              className="glass-card rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-5 flex items-center gap-3 mb-4"
              data-state="loading"
              aria-busy="true"
              aria-label={thinkingMsg}
              role="status"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
                <Search className="w-5 h-5 text-emerald-600 animate-pulse" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{thinkingMsg}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">This may take 10-15 seconds...</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="glass-card rounded-2xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 p-4 flex items-center gap-2 text-red-700 dark:text-red-400 text-sm mb-4"
              role="alert"
              data-state="error"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          {/* Leads list */}
          {leads.length > 0 && (
            <div className="space-y-3">
              {/* Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2" role="toolbar" aria-label="Lead actions">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAll}
                    data-action="select-all"
                    aria-label={selected.size === leads.length ? 'Deselect all leads' : 'Select all leads'}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    {selected.size === leads.length
                      ? <CheckSquare className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                      : <Square className="w-4 h-4" aria-hidden="true" />}
                    Select All
                  </button>
                  {addedCount > 0 && (
                    <span
                      className="text-xs text-emerald-600 font-bold"
                      role="status"
                      aria-live="polite"
                    >
                      ✓ {addedCount} added to pipeline
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {selected.size > 0 && (
                    <button
                      onClick={addSelected}
                      data-action="add-selected"
                      aria-label={`Add ${selected.size} selected leads to pipeline`}
                      className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-3 py-2 font-bold transition-all btn-glow"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      Add Selected ({selected.size})
                    </button>
                  )}
                  <button
                    onClick={addAll}
                    data-action="add-all"
                    aria-label="Add all generated leads to pipeline"
                    className="flex items-center gap-1.5 text-xs border border-border hover:bg-muted text-foreground rounded-xl px-3 py-2 font-semibold transition-colors"
                  >
                    Add All
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {leads.length} fictional leads generated for practice
              </p>

              {/* Lead cards */}
              <div className="space-y-2.5" role="list" aria-label="Generated leads">
                {leads.map((lead, i) => (
                  <div
                    key={i}
                    role="listitem"
                    className={cn(
                      'glass-card rounded-2xl border p-4 flex items-start gap-3 transition-all',
                      selected.has(i)
                        ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/10'
                        : 'border-border hover:border-emerald-200 dark:hover:border-emerald-800'
                    )}
                    data-entity="lead"
                    data-lead-index={i}
                  >
                    <button
                      onClick={() => toggleSelect(i)}
                      aria-label={selected.has(i) ? `Deselect ${lead.businessName}` : `Select ${lead.businessName}`}
                      aria-pressed={selected.has(i)}
                      data-action="select-lead"
                      className="mt-0.5 flex-shrink-0"
                    >
                      {selected.has(i)
                        ? <CheckSquare className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                        : <Square className="w-4 h-4 text-muted-foreground/40" aria-hidden="true" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">{lead.businessName}</h3>
                          <p className="text-xs text-muted-foreground">{lead.ownerName}</p>
                        </div>
                        <ConfidenceBadge score={lead.confidenceScore} />
                      </div>
                      <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mb-0.5">{lead.phone}</p>
                      <p className="text-xs text-muted-foreground">{lead.address}</p>
                      {lead.reason && (
                        <p className="text-xs text-muted-foreground italic mt-1">&ldquo;{lead.reason}&rdquo;</p>
                      )}
                    </div>

                    <button
                      onClick={() => { addLead(lead); setAddedCount(prev => prev + 1); }}
                      data-action="add-lead"
                      data-lead-index={i}
                      aria-label={`Add ${lead.businessName} to pipeline`}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl px-3 py-2 font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && leads.length === 0 && !error && (
            <div
              className="flex flex-col items-center justify-center py-20 text-center"
              data-state="empty"
              role="status"
            >
              <div className="w-14 h-14 rounded-3xl bg-muted flex items-center justify-center mb-4">
                <Lightbulb className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-1">No leads yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Fill out the form and click Generate to create practice leads
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
