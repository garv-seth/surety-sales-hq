'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Phone, Copy, Check, RefreshCw, ChevronDown, ChevronUp,
  Zap, Target, AlertCircle, CheckSquare, Square
} from 'lucide-react';
import {
  CALL_SCRIPT_STEPS, OBJECTIONS, QUICK_REFERENCE
} from '@/lib/surety-content';
import {
  addCallLog, getCachedObjections, setCachedObjection
} from '@/lib/storage';

const OUTCOMES = [
  { value: 'no_answer', label: 'No Answer' },
  { value: 'voicemail', label: 'Left Voicemail' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'demo_booked', label: 'Demo Booked' },
  { value: 'closed_won', label: 'Closed Won' },
] as const;

function PreCallBrief({ businessType, prospectName }: { businessType: string; prospectName: string }) {
  const [brief, setBrief] = useState<{
    painPoints: string[];
    bestOpener: string;
    commonObjections: string[];
    whatTheyCareMost: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessType, prospectName }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setBrief(data);
      } catch (e) {
        setError('Could not load brief');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [businessType, prospectName]);

  if (loading) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-emerald-700 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading pre-call brief...
        </div>
      </div>
    );
  }
  if (error || !brief) return null;

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-semibold text-emerald-800">Pre-Call Brief</h3>
        {prospectName && <span className="text-xs text-emerald-600">— {prospectName}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">Pain Points</p>
          <ul className="space-y-1">
            {brief.painPoints?.map((p, i) => (
              <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">•</span>{p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">What They Care About</p>
          <ul className="space-y-1">
            {brief.whatTheyCareMost?.map((p, i) => (
              <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">•</span>{p}
              </li>
            ))}
          </ul>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">Best Opener</p>
          <p className="text-xs text-emerald-800 bg-white rounded-md px-3 py-2 border border-emerald-200 italic">
            &ldquo;{brief.bestOpener}&rdquo;
          </p>
        </div>
      </div>
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
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const [copied, setCopied] = useState(false);
  const [preloading, setPreloading] = useState(false);
  const [preloadDone, setPreloadDone] = useState(false);

  // Log call dialog
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ prospectName: prospectName || '', outcome: 'no_answer' as string, notes: '' });
  const [logSuccess, setLogSuccess] = useState(false);

  // Follow-up after logging
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

    setLoading(true);
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
    } catch (e) {
      setAiResponse('Failed to get response. Check your API key and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function preloadAll() {
    setPreloading(true);
    await Promise.all(OBJECTIONS.map(obj => handleObjectionSilent(obj.text)));
    setPreloading(false);
    setPreloadDone(true);
    setTimeout(() => setPreloadDone(false), 3000);
  }

  async function handleObjectionSilent(objText: string) {
    const cache = getCachedObjections();
    if (cache[objText]) return;
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objection: objText }),
      });
      const data = await res.json();
      if (data.response) setCachedObjection(objText, data.response);
    } catch {}
  }

  async function handleLogCall(e: React.FormEvent) {
    e.preventDefault();
    addCallLog({
      prospectName: logForm.prospectName,
      outcome: logForm.outcome as 'no_answer' | 'not_interested' | 'follow_up' | 'demo_booked' | 'closed_won' | 'voicemail' | 'callback',
      notes: logForm.notes,
      businessType: businessType,
    });

    // Get follow-up suggestions
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Call Coach</h1>
          {prospectName && (
            <p className="text-sm text-gray-500 mt-0.5">
              Calling: <span className="font-medium text-slate-700">{prospectName}</span>
              {phone && <span className="ml-2 font-mono text-emerald-600">{phone}</span>}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {phone && (
            <a href={`tel:${phone}`}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors">
              <Phone className="w-4 h-4" />
              Call Now
            </a>
          )}
          <button onClick={() => setLogOpen(true)}
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-slate-700 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors">
            Log Call
          </button>
        </div>
      </div>

      {/* Pre-Call Brief (if businessType provided) */}
      {businessType && <PreCallBrief businessType={businessType} prospectName={prospectName} />}

      {/* Follow-up section after logging */}
      {logSuccess && followUp && (
        <div className="bg-white border border-emerald-200 rounded-lg p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Check className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900">Call Logged ✓</h3>
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Suggested Follow-Up</p>
          <div className="flex gap-2 mb-3">
            {(['sms', 'voicemail', 'email'] as const).map(tab => (
              <button key={tab} onClick={() => setFollowUpTab(tab)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors capitalize ${followUpTab === tab ? 'bg-emerald-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {tab}
              </button>
            ))}
          </div>
          {followUp[followUpTab] ? (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-slate-700 whitespace-pre-wrap relative">
              {followUp[followUpTab]}
              <button onClick={() => copyText(followUp[followUpTab] || '')}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No {followUpTab} template for this outcome</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Script */}
        <div className="lg:col-span-3 space-y-4">
          {/* Call Script Steps */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-slate-900">Live Call Script</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {CALL_SCRIPT_STEPS.map((step) => {
                const isDone = completedSteps.has(step.step);
                const isOpen = expandedStep === step.step;
                return (
                  <div key={step.step} className={isDone ? 'opacity-60' : ''}>
                    <button
                      onClick={() => setExpandedStep(isOpen ? 0 : step.step)}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = new Set(completedSteps);
                          if (isDone) next.delete(step.step); else next.add(step.step);
                          setCompletedSteps(next);
                          if (!isDone && step.step < 5) setExpandedStep(step.step + 1);
                        }}
                        className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center transition-colors ${isDone ? 'bg-emerald-500 text-white' : 'border-2 border-gray-300 hover:border-emerald-400'}`}
                      >
                        {isDone && <Check className="w-3 h-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-400">Step {step.step}</span>
                          <span className="text-sm font-semibold text-slate-800">{step.title}</span>
                          {step.duration && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{step.duration}</span>
                          )}
                        </div>
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4">
                        <div className="bg-gray-50 rounded-lg p-4 ml-8">
                          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{step.script}</p>
                          <button onClick={() => copyText(step.script)} className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                            <Copy className="w-3 h-3" />Copy script
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
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Quick Reference</h2>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_REFERENCE.map((ref, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <span className="text-gray-500 text-xs">{ref.icon} {ref.label}</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{ref.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Objections */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Objection Handler</h2>
              <button
                onClick={preloadAll}
                disabled={preloading}
                className="text-xs text-gray-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
              >
                {preloading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {preloadDone ? 'Cached!' : preloading ? 'Loading...' : 'Pre-load all'}
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-2">
              {OBJECTIONS.map((obj) => {
                const cache = getCachedObjections();
                const isCached = !!cache[obj.text];
                const isSelected = selectedObjection === obj.text;
                return (
                  <button
                    key={obj.text}
                    onClick={() => handleObjection(obj.text)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-800'
                        : 'border border-gray-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{obj.emoji}</span>
                    <span className="text-xs font-medium flex-1">{obj.label}</span>
                    {isCached && <span className="text-[9px] bg-emerald-100 text-emerald-600 px-1 py-0.5 rounded">cached</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Response */}
          {(loading || aiResponse) && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Response</h3>
                <div className="flex items-center gap-2">
                  {cached && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />cached
                    </span>
                  )}
                  {!loading && aiResponse && (
                    <>
                      <button onClick={() => handleObjection(selectedObjection, true)} className="text-xs text-gray-400 hover:text-gray-600">
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <button onClick={() => copyText(aiResponse)} className="text-xs text-gray-400 hover:text-gray-600">
                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                  Generating response...
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-700 leading-relaxed">{aiResponse}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Log Call Dialog */}
      {logOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLogOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-slate-900 mb-4">Log This Call</h3>
            <form onSubmit={handleLogCall} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Prospect Name</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                  value={logForm.prospectName}
                  onChange={e => setLogForm({ ...logForm, prospectName: e.target.value })}
                  placeholder="Prospect name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Outcome</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 bg-white"
                  value={logForm.outcome}
                  onChange={e => setLogForm({ ...logForm, outcome: e.target.value })}
                >
                  {OUTCOMES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Notes (optional)</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 resize-none"
                  rows={3}
                  value={logForm.notes}
                  onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                  placeholder="Call notes..."
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">
                  Log Call
                </button>
                <button type="button" onClick={() => setLogOpen(false)} className="flex-1 border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-lg py-2.5 text-sm font-semibold transition-colors">
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

export default function CoachPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Loading...</div>}>
      <CoachContent />
    </Suspense>
  );
}
