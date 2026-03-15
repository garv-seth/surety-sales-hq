'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Phone, Copy, Check, RefreshCw, ChevronDown, ChevronUp,
  Zap, Target, X, BookOpen
} from 'lucide-react';
import {
  CALL_SCRIPT_STEPS, OBJECTIONS, QUICK_REFERENCE
} from '@/lib/surety-content';
import {
  addCallLog, getCachedObjections, setCachedObjection
} from '@/lib/storage';
import { cn } from '@/lib/utils';

const OUTCOMES = [
  { value: 'no_answer',      label: 'No Answer' },
  { value: 'voicemail',      label: 'Left Voicemail' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'follow_up',      label: 'Follow Up' },
  { value: 'demo_booked',    label: 'Demo Booked' },
  { value: 'closed_won',     label: 'Closed Won' },
] as const;

function PreCallBrief({ businessType, prospectName }: { businessType: string; prospectName: string }) {
  const [brief, setBrief] = useState<{
    painPoints: string[];
    bestOpener: string;
    commonObjections: string[];
    whatTheyCareMost: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessType, prospectName }),
        });
        const data = await res.json();
        if (!data.error) setBrief(data);
      } catch {}
      setLoading(false);
    }
    load();
  }, [businessType, prospectName]);

  if (loading) {
    return (
      <div
        className="rounded-2xl p-4 mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
        data-state="loading"
        aria-busy="true"
        aria-label="Loading pre-call brief"
      >
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Loading pre-call brief...
        </div>
      </div>
    );
  }
  if (!brief) return null;

  return (
    <div
      className="rounded-2xl mb-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 overflow-hidden"
      data-section="pre-call-brief"
      aria-label="Pre-call brief"
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand pre-call brief' : 'Collapse pre-call brief'}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Pre-Call Brief</span>
          {prospectName && <span className="text-xs text-emerald-600 dark:text-emerald-500">— {prospectName}</span>}
        </div>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-emerald-600" />
          : <ChevronUp className="w-4 h-4 text-emerald-600" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-emerald-200 dark:border-emerald-800 pt-3">
          <div>
            <p className="section-label text-emerald-700 dark:text-emerald-500 mb-2">Pain Points</p>
            <ul className="space-y-1.5">
              {brief.painPoints?.map((p, i) => (
                <li key={i} className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>{p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="section-label text-emerald-700 dark:text-emerald-500 mb-2">What They Care About</p>
            <ul className="space-y-1.5">
              {brief.whatTheyCareMost?.map((p, i) => (
                <li key={i} className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>{p}
                </li>
              ))}
            </ul>
          </div>
          <div className="sm:col-span-2">
            <p className="section-label text-emerald-700 dark:text-emerald-500 mb-2">Best Opener</p>
            <p className="text-xs text-emerald-800 dark:text-emerald-200 bg-white dark:bg-emerald-900/40 rounded-xl px-3 py-2.5 border border-emerald-200 dark:border-emerald-800 italic leading-relaxed">
              &ldquo;{brief.bestOpener}&rdquo;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CoachContent() {
  const params = useSearchParams();
  const prospectName = params.get('prospect') || '';
  const phone = params.get('phone') || '';
  const businessType = params.get('businessType') || '';

  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [expandedStep, setExpandedStep] = useState<number>(1);
  const [selectedObjection, setSelectedObjection] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preloading, setPreloading] = useState(false);
  const [preloadDone, setPreloadDone] = useState(false);
  const [objPanelOpen, setObjPanelOpen] = useState(false);

  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ prospectName: prospectName || '', outcome: 'no_answer' as string, notes: '' });
  const [logSuccess, setLogSuccess] = useState(false);
  const [followUp, setFollowUp] = useState<{ sms?: string; voicemail?: string; email?: string } | null>(null);
  const [followUpTab, setFollowUpTab] = useState<'sms' | 'voicemail' | 'email'>('sms');

  async function handleObjection(objText: string, forceRefresh = false) {
    setSelectedObjection(objText);
    setAiResponse('');
    setCached(false);

    const cache = getCachedObjections();
    if (!forceRefresh && cache[objText]) {
      setAiResponse(cache[objText]);
      setCached(true);
      return;
    }

    setAiLoading(true);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objection: objText }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiResponse(data.response);
      setCachedObjection(objText, data.response);
    } catch {
      setAiResponse('Failed to get response. Check your API key and try again.');
    }
    setAiLoading(false);
  }

  async function preloadAll() {
    setPreloading(true);
    const cache = getCachedObjections();
    await Promise.all(
      OBJECTIONS.filter(o => !cache[o.text]).map(async obj => {
        try {
          const res = await fetch('/api/coach', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ objection: obj.text }),
          });
          const data = await res.json();
          if (data.response) setCachedObjection(obj.text, data.response);
        } catch {}
      })
    );
    setPreloading(false);
    setPreloadDone(true);
    setTimeout(() => setPreloadDone(false), 3000);
  }

  async function handleLogCall(e: React.FormEvent) {
    e.preventDefault();
    addCallLog({
      prospectName: logForm.prospectName,
      outcome: logForm.outcome as 'no_answer' | 'not_interested' | 'follow_up' | 'demo_booked' | 'closed_won' | 'voicemail' | 'callback',
      notes: logForm.notes,
      businessType,
    });
    try {
      const res = await fetch('/api/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectName: logForm.prospectName,
          businessType: businessType || 'service business',
          outcome: logForm.outcome,
          callNotes: logForm.notes,
        }),
      });
      const data = await res.json();
      setFollowUp(data);
    } catch {}
    setLogSuccess(true);
    setLogOpen(false);
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const cachedCount = Object.keys(getCachedObjections()).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" data-page="coach" data-prospect={prospectName} data-business-type={businessType} role="main">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Call Coach</h1>
          {prospectName && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Calling: <span className="font-semibold text-foreground">{prospectName}</span>
              {phone && <span className="ml-2 font-mono text-emerald-600 dark:text-emerald-400">{phone}</span>}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {phone && (
            <a
              href={`tel:${phone}`}
              data-action="call-now"
              aria-label={`Call ${prospectName || 'prospect'} at ${phone}`}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-all btn-glow shadow-lg shadow-emerald-500/20"
            >
              <Phone className="w-4 h-4" aria-hidden="true" />
              Call Now
            </a>
          )}
          <button
            onClick={() => setLogOpen(true)}
            data-action="log-call"
            aria-label="Open log call dialog"
            className="flex items-center gap-2 border border-border hover:bg-muted text-foreground rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
          >
            Log Call
          </button>
        </div>
      </div>

      {/* ── Pre-Call Brief ── */}
      {businessType && <PreCallBrief businessType={businessType} prospectName={prospectName} />}

      {/* ── Follow-up section (after logging) ── */}
      {logSuccess && followUp && (
        <div
          className="glass-card rounded-2xl p-4 mb-5 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 animate-in-up"
          data-section="follow-up"
          aria-label="Suggested follow-up templates"
        >
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            <h3 className="text-sm font-bold text-foreground">Call Logged ✓</h3>
          </div>
          <p className="section-label mb-3">Suggested Follow-Up</p>
          <div className="flex gap-2 mb-3" role="tablist" aria-label="Follow-up type">
            {(['sms', 'voicemail', 'email'] as const).map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={followUpTab === tab}
                onClick={() => setFollowUpTab(tab)}
                data-action="select-followup-tab"
                data-value={tab}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-xl font-semibold transition-all capitalize',
                  followUpTab === tab
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'border border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {tab}
              </button>
            ))}
          </div>
          {followUp[followUpTab] ? (
            <div className="bg-background rounded-xl p-3 text-xs text-foreground whitespace-pre-wrap relative border border-border" role="tabpanel">
              {followUp[followUpTab]}
              <button
                onClick={() => copyText(followUp[followUpTab] || '')}
                aria-label="Copy follow-up template"
                data-action="copy-followup"
                className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No {followUpTab} template for this outcome</p>
          )}
        </div>
      )}

      {/* ── Main content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">

        {/* Left: Script + Quick Ref */}
        <div className="lg:col-span-3 space-y-4">

          {/* Call Script */}
          <div
            className="glass-card rounded-2xl border border-border overflow-hidden"
            data-section="call-script"
            aria-label="Live call script"
          >
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-sm font-bold text-foreground">Live Call Script</h2>
              <span className="ml-auto text-xs text-muted-foreground">
                {completedSteps.size}/{CALL_SCRIPT_STEPS.length} done
              </span>
            </div>
            <div className="divide-y divide-border" role="list">
              {CALL_SCRIPT_STEPS.map(step => {
                const isDone = completedSteps.has(step.step);
                const isOpen = expandedStep === step.step;
                return (
                  <div
                    key={step.step}
                    className={cn('transition-opacity', isDone && 'opacity-55')}
                    data-step={step.step}
                    data-completed={isDone}
                    role="listitem"
                  >
                    <button
                      onClick={() => setExpandedStep(isOpen ? 0 : step.step)}
                      aria-expanded={isOpen}
                      aria-label={`${isDone ? 'Completed: ' : ''}Step ${step.step}: ${step.title}`}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          const next = new Set(completedSteps);
                          if (isDone) next.delete(step.step); else next.add(step.step);
                          setCompletedSteps(next);
                          if (!isDone && step.step < CALL_SCRIPT_STEPS.length) setExpandedStep(step.step + 1);
                        }}
                        data-action="toggle-step"
                        data-step={step.step}
                        aria-label={isDone ? `Uncheck step ${step.step}` : `Complete step ${step.step}`}
                        aria-pressed={isDone}
                        className={cn(
                          'w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all',
                          isDone
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'border-2 border-border hover:border-emerald-400'
                        )}
                      >
                        {isDone && <Check className="w-3 h-3" aria-hidden="true" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Step {step.step}
                          </span>
                          <span className="text-sm font-semibold text-foreground">{step.title}</span>
                          {step.duration && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                              {step.duration}
                            </span>
                          )}
                        </div>
                      </div>
                      {isOpen
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-4 animate-in-down">
                        <div className="bg-muted/60 rounded-xl p-4 ml-8">
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                            {step.script}
                          </p>
                          <button
                            onClick={() => copyText(step.script)}
                            data-action="copy-script-step"
                            data-step={step.step}
                            aria-label={`Copy step ${step.step} script`}
                            className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                          >
                            <Copy className="w-3 h-3" aria-hidden="true" />
                            Copy script
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Reference */}
          <div
            className="glass-card rounded-2xl border border-border p-5"
            data-section="quick-reference"
            aria-label="Quick reference facts"
          >
            <h2 className="text-sm font-bold text-foreground mb-3">Quick Reference</h2>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_REFERENCE.map((ref, i) => (
                <div key={i} className="bg-muted/60 rounded-xl px-3 py-2.5">
                  <span className="text-muted-foreground text-xs">{ref.icon} {ref.label}</span>
                  <p className="text-xs font-bold text-foreground mt-0.5">{ref.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: Objection button */}
          <div className="lg:hidden">
            <button
              onClick={() => setObjPanelOpen(!objPanelOpen)}
              aria-expanded={objPanelOpen}
              aria-label={objPanelOpen ? 'Hide objection handler' : 'Show objection handler'}
              data-action="toggle-objections"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-card border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden="true">🛡️</span>
                Objection Handler
                {cachedCount > 0 && (
                  <span className="pill bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                    {cachedCount} cached
                  </span>
                )}
              </span>
              {objPanelOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {objPanelOpen && <ObjectionPanel
              selectedObjection={selectedObjection}
              aiResponse={aiResponse}
              aiLoading={aiLoading}
              cached={cached}
              copied={copied}
              preloading={preloading}
              preloadDone={preloadDone}
              onObjection={handleObjection}
              onPreload={preloadAll}
              onCopy={() => copyText(aiResponse)}
            />}
          </div>
        </div>

        {/* Right: Objections (desktop only) */}
        <div className="hidden lg:block lg:col-span-2">
          <ObjectionPanel
            selectedObjection={selectedObjection}
            aiResponse={aiResponse}
            aiLoading={aiLoading}
            cached={cached}
            copied={copied}
            preloading={preloading}
            preloadDone={preloadDone}
            onObjection={handleObjection}
            onPreload={preloadAll}
            onCopy={() => copyText(aiResponse)}
          />
        </div>
      </div>

      {/* ── Log Call Dialog ── */}
      {logOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Log call"
          data-section="log-call"
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setLogOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-card rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-border animate-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">Log This Call</h3>
              <button
                onClick={() => setLogOpen(false)}
                aria-label="Close log call dialog"
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={handleLogCall} className="space-y-4">
              <div>
                <label className="section-label mb-2 block" htmlFor="log-prospect-name">
                  Prospect Name
                </label>
                <input
                  id="log-prospect-name"
                  name="prospectName"
                  data-field="prospect-name"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-shadow"
                  value={logForm.prospectName}
                  onChange={e => setLogForm({ ...logForm, prospectName: e.target.value })}
                  placeholder="Prospect name"
                  aria-label="Prospect name"
                />
              </div>
              <div>
                <label className="section-label mb-2 block" htmlFor="log-outcome">
                  Outcome
                </label>
                <select
                  id="log-outcome"
                  name="outcome"
                  data-field="outcome"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-shadow"
                  value={logForm.outcome}
                  onChange={e => setLogForm({ ...logForm, outcome: e.target.value })}
                  aria-label="Call outcome"
                >
                  {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label mb-2 block" htmlFor="log-notes">
                  Notes (optional)
                </label>
                <textarea
                  id="log-notes"
                  name="notes"
                  data-field="notes"
                  className="w-full border border-border bg-background rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none transition-shadow"
                  rows={3}
                  value={logForm.notes}
                  onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                  placeholder="Call notes..."
                  aria-label="Call notes"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  data-action="save-log"
                  aria-label="Save call log"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3 text-sm font-bold transition-all btn-glow shadow-lg shadow-emerald-500/20"
                >
                  Log Call
                </button>
                <button
                  type="button"
                  onClick={() => setLogOpen(false)}
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

function ObjectionPanel({
  selectedObjection, aiResponse, aiLoading, cached, copied, preloading, preloadDone,
  onObjection, onPreload, onCopy
}: {
  selectedObjection: string;
  aiResponse: string;
  aiLoading: boolean;
  cached: boolean;
  copied: boolean;
  preloading: boolean;
  preloadDone: boolean;
  onObjection: (text: string, force?: boolean) => void;
  onPreload: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-4 mt-4 lg:mt-0">
      <div
        className="glass-card rounded-2xl border border-border overflow-hidden"
        data-section="objections"
        aria-label="Objection handler"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Objection Handler</h2>
          <button
            onClick={onPreload}
            disabled={preloading}
            data-action="preload-objections"
            aria-label={preloadDone ? 'All objections cached' : preloading ? 'Loading objection responses' : 'Pre-load all objection responses'}
            className="text-xs text-muted-foreground hover:text-emerald-600 flex items-center gap-1.5 transition-colors disabled:opacity-60 font-medium"
          >
            {preloading ? <RefreshCw className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Zap className="w-3 h-3" aria-hidden="true" />}
            {preloadDone ? '✓ Cached!' : preloading ? 'Loading...' : 'Pre-load all'}
          </button>
        </div>
        <div className="p-3 space-y-1.5">
          {OBJECTIONS.map(obj => {
            const isCached = !!getCachedObjections()[obj.text];
            const isSelected = selectedObjection === obj.text;
            return (
              <button
                key={obj.text}
                onClick={() => onObjection(obj.text)}
                data-objection={obj.text}
                data-action="get-objection-response"
                aria-label={`Handle objection: ${obj.label}`}
                aria-pressed={isSelected}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left transition-all border font-medium',
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-800 dark:text-emerald-300 shadow-sm'
                    : 'border-border text-foreground hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                )}
              >
                <span className="text-base flex-shrink-0" aria-hidden="true">{obj.emoji}</span>
                <span className="flex-1">{obj.label}</span>
                {isCached && (
                  <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                    cached
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Response */}
      {(aiLoading || aiResponse) && (
        <div
          className="glass-card rounded-2xl border border-border p-4 animate-in-up"
          data-section="objection-response"
          aria-label="AI objection response"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">
              AI Response
              {cached && <span className="ml-2 text-emerald-600 normal-case font-semibold">· cached</span>}
            </p>
            {!aiLoading && aiResponse && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onObjection(selectedObjection, true)}
                  aria-label="Regenerate response"
                  data-action="regenerate-response"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  onClick={onCopy}
                  aria-label="Copy AI response"
                  data-action="copy-response"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
          {aiLoading ? (
            <div className="space-y-2" data-state="loading" aria-busy="true">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-5/6 rounded" />
              <div className="skeleton h-3 w-4/5 rounded" />
            </div>
          ) : (
            <div className="bg-muted/60 rounded-xl p-3.5">
              <p className="text-sm text-foreground leading-relaxed">{aiResponse}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-32 w-full rounded-2xl" />
      </div>
    }>
      <CoachContent />
    </Suspense>
  );
}
