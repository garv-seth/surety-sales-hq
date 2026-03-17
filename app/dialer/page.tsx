'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Phone, PhoneOff, SkipForward, Shuffle, LogIn, Clock,
  Users, Check, X, RefreshCw, Target, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  getProspects, getDialerQueue, saveDialerQueue, addCallLog, updateProspect,
  getCachedObjections, setCachedObjection, Prospect
} from '@/lib/storage';
import { OBJECTIONS, CALL_SCRIPT_STEPS } from '@/lib/surety-content';
import { cn } from '@/lib/utils';

const OUTCOMES = [
  { value: 'no_answer', label: 'No Answer', color: 'bg-gray-100 text-gray-700' },
  { value: 'voicemail', label: 'Left Voicemail', color: 'bg-blue-100 text-blue-700' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-700' },
  { value: 'follow_up', label: 'Follow Up', color: 'bg-amber-100 text-amber-700' },
  { value: 'demo_booked', label: 'Demo Booked 🎉', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'closed_won', label: 'Closed Won 🏆', color: 'bg-purple-100 text-purple-700' },
];

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface PreCallResearch {
  businessProfile: string;
  painSignals: string[];
  personalizedOpener: string;
  likelyObjection: string;
  callAngle: string;
}

function PreCallPanel({ prospect }: { prospect: Prospect }) {
  const [research, setResearch] = useState<PreCallResearch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);
  const lastProspectId = useRef('');

  useEffect(() => {
    if (!prospect || prospect.id === lastProspectId.current) return;
    lastProspectId.current = prospect.id;

    setLoading(true);
    setError('');
    setResearch(null);
    setExpanded(true);

    fetch('/api/pre-call-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: prospect.businessName,
        businessType: prospect.businessType,
        city: '',
        phone: prospect.phone,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setResearch(data);
      })
      .catch(() => setError('Research unavailable'))
      .finally(() => setLoading(false));
  }, [prospect?.id]);

  if (error) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">Pre-Call Brief</span>
          {loading && <RefreshCw className="w-3 h-3 text-amber-500 animate-spin" />}
          {research && !loading && <span className="text-[10px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded">ready</span>}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-500" /> : <ChevronDown className="w-4 h-4 text-amber-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-amber-600 py-2">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Researching {prospect.businessName}...
            </div>
          )}

          {research && (
            <div className="space-y-3">
              {/* Personalized opener — most important */}
              <div className="bg-white rounded-lg px-3 py-2.5 border border-amber-200">
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Use This Opener</p>
                <p className="text-sm text-slate-800 italic leading-relaxed">
                  &ldquo;{research.personalizedOpener}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <div>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Profile</p>
                  <p className="text-xs text-amber-900 leading-relaxed">{research.businessProfile}</p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Pain Signals</p>
                  <ul className="space-y-0.5">
                    {research.painSignals?.map((signal, i) => (
                      <li key={i} className="text-xs text-amber-900 flex items-start gap-1.5">
                        <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                        {signal}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Best Angle</p>
                  <p className="text-xs text-amber-900">{research.callAngle}</p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-1">Watch For</p>
                  <p className="text-xs text-amber-900">{research.likelyObjection}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DialerPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ outcome: 'no_answer', notes: '' });
  const [activeObjection, setActiveObjection] = useState('');
  const [objResponse, setObjResponse] = useState('');
  const [objLoading, setObjLoading] = useState(false);
  const [justLogged, setJustLogged] = useState('');
  const [scriptExpanded, setScriptExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const allProspects = getProspects();
    setProspects(allProspects);

    const saved = getDialerQueue();
    if (saved.length > 0) {
      const validIds = new Set(allProspects.map(p => p.id));
      setQueue(saved.filter(id => validIds.has(id)));
    } else {
      const defaultQueue = allProspects
        .filter(p => p.stage === 'new' || p.stage === 'contacted')
        .map(p => p.id);
      setQueue(defaultQueue);
    }
  }, []);

  useEffect(() => {
    saveDialerQueue(queue);
  }, [queue]);

  useEffect(() => {
    if (isCalling) {
      timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isCalling]);

  const currentProspect = prospects.find(p => p.id === queue[currentIndex]);
  const remaining = queue.length - currentIndex;

  function startCall() {
    if (!currentProspect) return;
    setIsCalling(true);
    setCallTimer(0);
    window.location.href = `tel:${currentProspect.phone.replace(/\D/g, '')}`;
  }

  function endCall() {
    setIsCalling(false);
    setLogOpen(true);
  }

  function handleLogAndNext() {
    if (!currentProspect) return;
    addCallLog({
      prospectName: currentProspect.ownerName,
      outcome: logForm.outcome as 'no_answer' | 'not_interested' | 'follow_up' | 'demo_booked' | 'closed_won' | 'voicemail' | 'callback',
      notes: logForm.notes,
      businessType: currentProspect.businessType,
    });
    updateProspect(currentProspect.id, {
      stage: logForm.outcome === 'demo_booked' ? 'demo_scheduled' :
             logForm.outcome === 'closed_won' ? 'closed_won' : 'contacted',
      lastContact: new Date().toISOString().split('T')[0],
    });

    const outcome = OUTCOMES.find(o => o.value === logForm.outcome);
    setJustLogged(outcome?.label || '');
    setTimeout(() => setJustLogged(''), 2000);

    const newQueue = queue.filter((_, i) => i !== currentIndex);
    setQueue(newQueue);
    setCurrentIndex(prev => Math.min(prev, newQueue.length - 1));
    setIsCalling(false);
    setCallTimer(0);
    setLogOpen(false);
    setLogForm({ outcome: 'no_answer', notes: '' });
    setActiveObjection('');
    setObjResponse('');
  }

  function handleSkip() {
    if (queue.length <= 1) return;
    const newQueue = [...queue];
    const [skipped] = newQueue.splice(currentIndex, 1);
    newQueue.push(skipped);
    setQueue(newQueue);
    setCurrentIndex(0);
    setIsCalling(false);
    setCallTimer(0);
  }

  function handleShuffle() {
    const rem = queue.slice(currentIndex);
    const past = queue.slice(0, currentIndex);
    const shuffled = [...rem].sort(() => Math.random() - 0.5);
    setQueue([...past, ...shuffled]);
    setCurrentIndex(past.length);
  }

  async function handleObjection(objText: string) {
    setActiveObjection(objText);
    setObjResponse('');

    const cache = getCachedObjections();
    if (cache[objText]) {
      setObjResponse(cache[objText]);
      return;
    }

    setObjLoading(true);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objection: objText }),
      });
      const data = await res.json();
      if (data.response) {
        setObjResponse(data.response);
        setCachedObjection(objText, data.response);
      }
    } catch {}
    setObjLoading(false);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); isCalling ? endCall() : startCall(); }
      if (e.key === 'l' || e.key === 'L') { setLogOpen(true); }
      if (e.key === 's' || e.key === 'S') { handleSkip(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isCalling, currentProspect, queue, currentIndex]);

  if (queue.length === 0 && prospects.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96">
        <Users className="w-12 h-12 text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold text-slate-700 mb-1">No Prospects</h2>
        <p className="text-sm text-gray-400 mb-4">Add prospects first to use the power dialer</p>
        <a href="/prospects" className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 font-medium transition-colors">
          Add Prospects →
        </a>
      </div>
    );
  }

  if (queue.length === 0 || currentIndex >= queue.length) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96">
        <Check className="w-12 h-12 text-emerald-500 mb-3" />
        <h2 className="text-lg font-semibold text-slate-700 mb-1">Queue Complete!</h2>
        <p className="text-sm text-gray-400 mb-4">You&apos;ve worked through all prospects in the queue</p>
        <button onClick={() => {
          const all = getProspects().filter(p => p.stage === 'new' || p.stage === 'contacted').map(p => p.id);
          setQueue(all);
          setCurrentIndex(0);
          setProspects(getProspects());
        }} className="text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 font-medium transition-colors">
          Restart Queue
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Power Dialer</h1>
          <p className="text-sm text-gray-500 mt-0.5">{remaining} remaining · Tap number or CALL to dial</p>
        </div>
        <div className="flex items-center gap-3">
          {justLogged && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-pulse">
              ✓ {justLogged}
            </span>
          )}
          {isCalling && (
            <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg">
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold text-lg">{formatTimer(callTimer)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">

          {/* Pre-Call Research Brief */}
          {currentProspect && <PreCallPanel prospect={currentProspect} />}

          {/* Prospect Card */}
          <div className={cn(
            'bg-white border-2 rounded-xl p-5 shadow-sm transition-colors',
            isCalling ? 'border-emerald-400 shadow-emerald-100' : 'border-gray-200'
          )}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Current Prospect</p>
                <h2 className="text-xl font-bold text-slate-900">{currentProspect?.businessName}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{currentProspect?.ownerName}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                  {currentProspect?.businessType}
                </span>
              </div>
            </div>

            {/* Phone — tap to dial */}
            <a
              href={`tel:${currentProspect?.phone?.replace(/\D/g, '')}`}
              className="block bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl p-4 mb-4 text-center transition-colors group"
            >
              <div className="flex items-center justify-center gap-2">
                <Phone className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                <span className="text-2xl font-bold text-slate-900 font-mono group-hover:text-emerald-700 transition-colors">
                  {currentProspect?.phone}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Tap to call · Opens phone dialer on mobile</p>
            </a>

            <div className="flex gap-3">
              {!isCalling ? (
                <button
                  onClick={startCall}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-14 font-bold text-lg transition-colors shadow-sm"
                >
                  <Phone className="w-5 h-5" />
                  CALL
                </button>
              ) : (
                <button
                  onClick={endCall}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-xl h-14 font-bold text-lg transition-colors"
                >
                  <PhoneOff className="w-5 h-5" />
                  END CALL
                </button>
              )}
              <button
                onClick={handleSkip}
                className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl px-4 h-14 font-semibold transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </button>
            </div>

            <p className="text-[10px] text-gray-400 text-center mt-3">
              Space = call/end · L = log · S = skip
            </p>
          </div>

          {/* Queue Controls */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Queue Progress</span>
                <span className="font-medium text-slate-700">{currentIndex + 1} / {queue.length}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
                />
              </div>
            </div>
            <button onClick={handleShuffle} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-slate-700 border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors">
              <Shuffle className="w-3.5 h-3.5" />Shuffle
            </button>
            <button onClick={() => setLogOpen(true)} className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 py-2 transition-colors font-medium">
              <LogIn className="w-3.5 h-3.5" />Log & Next
            </button>
          </div>

          {/* Live Script (collapsible) */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <button
              onClick={() => setScriptExpanded(e => !e)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Script</p>
              {scriptExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {scriptExpanded && (
              <div>
                {CALL_SCRIPT_STEPS.map(step => (
                  <div key={step.step} className="px-4 py-3 border-t border-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-gray-400">Step {step.step}</span>
                      <span className="text-xs font-semibold text-slate-700">{step.title}</span>
                      {step.duration && <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded">{step.duration}</span>}
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{step.script}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Objections + Response */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hit an Objection?</p>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">instant</span>
            </div>
            <div className="p-3 space-y-2">
              {OBJECTIONS.map(obj => (
                <button
                  key={obj.text}
                  onClick={() => handleObjection(obj.text)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all text-xs font-medium',
                    activeObjection === obj.text
                      ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-800'
                      : 'border border-gray-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                  )}
                >
                  <span className="text-sm">{obj.emoji}</span>
                  {obj.label}
                </button>
              ))}
            </div>
          </div>

          {(objLoading || objResponse) && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Response</p>
              {objLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                  Loading...
                </div>
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed">{objResponse}</p>
              )}
            </div>
          )}

          {/* Quick Reference */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Reference</p>
            <div className="space-y-2">
              {[
                ['Price', 'from $49/mo'],
                ['Setup', 'under 10 min'],
                ['Guarantee', '14-day money-back'],
                ['Result', 'Paid in ~3 weeks'],
                ['QuickBooks', 'Direct sync'],
                ['Close ask', '20-min Zoom'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-slate-700">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Log Call Dialog */}
      {logOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLogOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Log Call</h3>
              <button onClick={() => setLogOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {currentProspect?.businessName} — {currentProspect?.ownerName}
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Outcome</label>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOMES.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setLogForm({ ...logForm, outcome: o.value })}
                      className={cn(
                        'text-xs py-2 px-3 rounded-lg font-medium transition-colors border text-left',
                        logForm.outcome === o.value ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : `${o.color} border-transparent`
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Notes</label>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 resize-none"
                  rows={2}
                  value={logForm.notes}
                  onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                  placeholder="Objections raised, follow-up date..."
                />
              </div>
            </div>
            <button
              onClick={handleLogAndNext}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-3 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save & Next Prospect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
