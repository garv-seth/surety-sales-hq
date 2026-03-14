'use client';

import { useState } from 'react';
import {
  Lightbulb, Search, Plus, Check, CheckSquare, Square, AlertCircle,
  Upload, Download
} from 'lucide-react';
import { addProspect } from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';

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
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                score >= 60 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
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

  // CSV Import
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
    } finally {
      setLoading(false);
      setThinkingMsg('');
    }
  }

  function toggleSelect(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
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
      notes: `Generated lead. Address: ${lead.address}. Reason: ${lead.reason}`,
      lastContact: new Date().toISOString().split('T')[0],
    });
  }

  function addSelected() {
    let count = 0;
    leads.forEach((lead, i) => {
      if (selected.has(i)) { addLead(lead); count++; }
    });
    setAddedCount(prev => prev + count);
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
      let count = 0;

      lines.slice(1).forEach(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => row[h] = cols[i] || '');

        const businessName = row['business name'] || row['businessname'] || row['company'] || '';
        const ownerName = row['owner name'] || row['ownername'] || row['owner'] || row['name'] || '';
        const phone = row['phone'] || row['phone number'] || '';
        const bType = row['business type'] || row['type'] || businessType;

        if (businessName) {
          addProspect({
            businessName,
            ownerName: ownerName || businessName,
            phone,
            businessType: bType,
            stage: 'new',
            notes: `Imported from CSV`,
            lastContact: new Date().toISOString().split('T')[0],
          });
          count++;
        }
      });

      setImportCount(count);
      setImporting(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Lead Generator</h1>
        <p className="text-sm text-gray-500 mt-0.5">Generate realistic practice leads or import your own CSV</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Generate Leads</h2>
            <form onSubmit={generateLeads} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">City</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Seattle"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">State</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 bg-white"
                  value={state}
                  onChange={e => setState(e.target.value)}
                >
                  {US_STATES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Business Type</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 bg-white"
                  value={businessType}
                  onChange={e => setBusinessType(e.target.value)}
                >
                  {BUSINESS_TYPES.filter(t => t !== 'Other').map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Number of Leads</label>
                <input
                  type="number"
                  min={5} max={50}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                  value={count}
                  onChange={e => setCount(parseInt(e.target.value) || 10)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Min. Confidence Score: {confidenceMin}%
                </label>
                <input
                  type="range" min={50} max={95} step={5}
                  className="w-full accent-emerald-500"
                  value={confidenceMin}
                  onChange={e => setConfidenceMin(parseInt(e.target.value))}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !city}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl py-3 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Search className="w-4 h-4 animate-pulse" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4" />
                    Generate Leads
                  </>
                )}
              </button>
            </form>

            {/* CSV Import */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">CSV Import</h3>
              <label className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 rounded-lg py-3 cursor-pointer transition-colors text-sm text-gray-500 hover:text-emerald-700">
                <Upload className="w-4 h-4" />
                {importing ? 'Importing...' : 'Upload CSV'}
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
              </label>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                Columns: Business Name, Owner Name, Phone, Business Type
              </p>
              {importCount > 0 && (
                <p className="text-xs text-emerald-600 text-center mt-2 font-medium">
                  ✓ {importCount} prospects imported
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {loading && thinkingMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-center gap-3">
              <Search className="w-5 h-5 text-emerald-500 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">{thinkingMsg}</p>
                <p className="text-xs text-emerald-600">This may take 10-15 seconds...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {leads.length > 0 && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={selectAll} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-slate-700 transition-colors">
                    {selected.size === leads.length ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
                    Select All
                  </button>
                  {addedCount > 0 && (
                    <span className="text-xs text-emerald-600 font-medium">✓ {addedCount} added to pipeline</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {selected.size > 0 && (
                    <button onClick={addSelected}
                      className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 py-2 font-medium transition-colors">
                      <Plus className="w-3.5 h-3.5" />Add Selected ({selected.size})
                    </button>
                  )}
                  <button onClick={addAll}
                    className="flex items-center gap-1.5 text-xs border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-lg px-3 py-2 font-medium transition-colors">
                    Add All
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Generated {leads.length} fictional leads for practice purposes
              </p>

              {/* Lead Cards */}
              {leads.map((lead, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-start gap-3 hover:border-emerald-300 hover:shadow-md transition-all">
                  <button onClick={() => toggleSelect(i)} className="mt-0.5 flex-shrink-0">
                    {selected.has(i)
                      ? <CheckSquare className="w-4 h-4 text-emerald-500" />
                      : <Square className="w-4 h-4 text-gray-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{lead.businessName}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{lead.ownerName}</p>
                      </div>
                      <ConfidenceBadge score={lead.confidenceScore} />
                    </div>
                    <p className="text-xs font-mono text-emerald-600 mt-1.5">{lead.phone}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{lead.address}</p>
                    {lead.reason && (
                      <p className="text-xs text-gray-400 italic mt-1">"{lead.reason}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => { addLead(lead); setAddedCount(prev => prev + 1); }}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg px-3 py-2 font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && leads.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Lightbulb className="w-12 h-12 text-gray-200 mb-3" />
              <h3 className="text-base font-semibold text-slate-600 mb-1">No leads yet</h3>
              <p className="text-sm text-gray-400">Fill out the form and click Generate to create leads</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
