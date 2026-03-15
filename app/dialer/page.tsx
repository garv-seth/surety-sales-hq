'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone, PhoneOff, SkipForward, Shuffle, LogIn, Clock,
  Users, Check, X, RefreshCw, Copy, ChevronUp, ChevronDown,
  ArrowLeft, Zap
} from 'lucide-react';
import {
  getProspects, getDialerQueue, saveDialerQueue, addCallLog, updateProspect,
  getCachedObjections, setCachedObjection, Prospect
} from '@/lib/storage';
import { OBJECTIONS, CALL_SCRIPT_STEPS } from '@/lib/surety-content';
import { cn } from '@/lib/utils';

const OUTCOMES = [
  { value: 'no_answer',     label: 'No Answer',      short: 'No Ans', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', ring: 'ring-gray-400' },
  { value: 'voicemail',     label: 'Left Voicemail', short: 'VM',     color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   ring: 'ring-blue-400' },
  { value: 'not_interested',label: 'Not Interested', short: 'Not Int',color: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',    ring: 'ring-red-400' },
  { value: 'follow_up',     label: 'Follow Up',      short: 'Follow', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', ring: 'ring-amber-400' },
  { value: 'demo_booked',   label: 'Demo Booked 🎉', short: 'Demo 🎉',color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', ring: 'ring-emerald-400' },
  { value: 'closed_won',    label: 'Closed Won 🏆',  short: 'Won 🏆', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', ring: 'ring-purple-400' },
];

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
  const [objSheetOpen, setObjSheetOpen] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);
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

  useEffect(() => { saveDialerQueue(queue); }, [queue]);

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
  const progress = queue.length > 0 ? ((currentIndex + 1) / queue.length) * 100 : 0;

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
    setTimeout(() => setJustLogged(''), 2500);

    const newQueue = queue.filter((_, i) => i !== currentIndex);
    setQueue(newQueue);
    setCurrentIndex(prev => Math.min(prev, newQueue.length - 1));
    setIsCalling(false);
    setCallTimer(0);
    setLogOpen(false);
    setLogForm({ outcome: 'no_answer', notes: '' });
    setActiveObjection('');
    setObjResponse('');
    setObjSheetOpen(false);
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
    setActiveObjection('');
    setObjResponse('');
  }

  function handleShuffle() {
    const past = queue.slice(0, currentIndex);
    const rest = queue.slice(currentIndex);
    const shuffled = [...rest].sort(() => Math.random() - 0.5);
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

  function copyResponse() {
    if (!objResponse) return;
    navigator.clipboard.writeText(objResponse);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 1500);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); isCalling ? endCall() : startCall(); }
      if (e.key === 'l' || e.key === 'L') setLogOpen(true);
      if (e.key === 's' || e.key === 'S') handleSkip();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isCalling, currentProspect, queue, currentIndex]);

  // ── Empty states ──

  if (queue.length === 0 && prospects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center" data-state="empty">
        <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">No Prospects Yet</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          Add prospects to your pipeline to start dialing
        </p>
        <a
          href="/prospects"
          data-action="navigate"
          data-destination="/prospects"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-5 py-2.5 font-semibold text-sm transition-all btn-glow"
        >
          Go to Prospects →
        </a>
      </div>
    );
  }

  if (queue.length === 0 || currentIndex >= queue.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center" data-state="complete">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">Queue Complete!</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
          You&apos;ve worked through all prospects
        </p>
        <button
          onClick={() => {
            const all = getProspects().filter(p => p.stage === 'new' || p.stage === 'contacted').map(p => p.id);
            setQueue(all);
            setCurrentIndex(0);
            setProspects(getProspects());
          }}
          data-action="restart-queue"
          aria-label="Restart dialer queue"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-5 py-2.5 font-semibold text-sm transition-all btn-glow"
        >
          <Zap className="w-4 h-4" />
          Restart Queue
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen" data-page="dialer" role="main">

      {/* ================================================================
          MOBILE LAYOUT (< lg)
          ================================================================ */}
      <div className="lg:hidden flex flex-col min-h-screen bg-background">

        {/* Mobile header strip */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <a
            href="/dashboard"
            aria-label="Back to dashboard"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-medium">Back</span>
          </a>

          <div className="flex items-center gap-2">
            {justLogged && (
              <span
                className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-400 px-3 py-1 rounded-full animate-in-up"
                role="status"
                aria-live="polite"
              >
                ✓ {justLogged}
              </span>
            )}
            <div
              className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full"
              aria-label={`${remaining} of ${queue.length} prospects remaining`}
            >
              {currentIndex + 1} / {queue.length}
            </div>
          </div>
        </div>

        {/* Queue progress bar */}
        <div className="px-4 pb-3">
          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={currentIndex + 1}
              aria-valuemin={1}
              aria-valuemax={queue.length}
              aria-label="Queue progress"
            />
          </div>
        </div>

        {/* Prospect card */}
        <div
          className="mx-4 mb-4"
          data-entity="prospect"
          data-entity-id={currentProspect?.id}
          data-entity-stage={currentProspect?.stage}
          data-entity-phone={currentProspect?.phone}
          data-entity-name={currentProspect?.businessName}
          data-section="prospect-card"
          data-testid="dialer-current-prospect"
          aria-label="Current prospect"
        >
          <div className={cn(
            'rounded-3xl p-6 transition-all duration-300',
            isCalling
              ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-2 border-emerald-400/60 shadow-lg shadow-emerald-500/10'
              : 'bg-card border border-border shadow-md'
          )}>
            {/* Business type badge */}
            <div className="flex items-center justify-between mb-4">
              <span
                className="pill bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                data-status="business-type"
                data-value={currentProspect?.businessType}
              >
                {currentProspect?.businessType}
              </span>
              {isCalling && (
                <div
                  className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-bold"
                  data-state="calling"
                  role="status"
                  aria-label={`Call in progress: ${formatTimer(callTimer)}`}
                >
                  <span className="status-dot status-dot-live bg-white" />
                  <Clock className="w-3 h-3" />
                  <span className="font-mono">{formatTimer(callTimer)}</span>
                </div>
              )}
            </div>

            {/* Business / owner names */}
            <h2 className="text-2xl font-black tracking-tight text-foreground mb-0.5">
              {currentProspect?.businessName}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              {currentProspect?.ownerName}
            </p>

            {/* Phone number */}
            <a
              href={`tel:${currentProspect?.phone?.replace(/\D/g, '')}`}
              aria-label={`Call ${currentProspect?.phone}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-muted hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors mb-5 group"
            >
              <Phone className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
              <span className="font-mono text-xl font-bold text-foreground tracking-wide">
                {currentProspect?.phone}
              </span>
            </a>

            {/* Call / End button */}
            <div
              className="flex flex-col items-center gap-3"
              data-section="call-controls"
              aria-label="Call controls"
            >
              {!isCalling ? (
                <button
                  onClick={startCall}
                  data-action="start-call"
                  data-testid="dialer-call-button"
                  data-state="idle"
                  data-prospect-id={currentProspect?.id}
                  aria-label={`Start call with ${currentProspect?.businessName}`}
                  className="w-20 h-20 rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95
                             flex items-center justify-center shadow-xl shadow-emerald-500/30
                             transition-all duration-150 btn-glow"
                >
                  <Phone className="w-8 h-8 text-white" />
                </button>
              ) : (
                <button
                  onClick={endCall}
                  data-action="end-call"
                  data-testid="dialer-end-call-button"
                  data-state="calling"
                  aria-label="End call and log outcome"
                  className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 active:scale-95
                             flex items-center justify-center shadow-xl shadow-red-500/30
                             transition-all duration-150"
                >
                  <PhoneOff className="w-8 h-8 text-white" />
                </button>
              )}
              <p className="text-[10px] text-muted-foreground text-center">
                {isCalling ? 'Tap to end & log' : 'Tap to call'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick action row */}
        <div className="flex items-center gap-2 px-4 mb-4">
          <button
            onClick={handleSkip}
            data-action="skip"
            data-testid="dialer-skip-button"
            aria-label="Skip to next prospect"
            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Skip
          </button>
          <button
            onClick={handleShuffle}
            data-action="shuffle-queue"
            data-testid="dialer-shuffle-button"
            aria-label="Shuffle queue order"
            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-2xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Shuffle className="w-4 h-4" />
            Shuffle
          </button>
          <button
            onClick={() => setLogOpen(true)}
            data-action="log-call"
            data-testid="dialer-log-button"
            aria-label="Open log call dialog"
            className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-2xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <LogIn className="w-4 h-4" />
            Log
          </button>
        </div>

        {/* Objections toggle */}
        <div className="mx-4 mb-4">
          <button
            onClick={() => setObjSheetOpen(!objSheetOpen)}
            aria-label={objSheetOpen ? 'Collapse objections' : 'Show objection responses'}
            aria-expanded={objSheetOpen}
            data-action="toggle-objections"
            className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-card border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <span className="flex items-center gap-2">
              <span>🛡️</span>
              Objection Help
            </span>
            {objSheetOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {objSheetOpen && (
            <div
              className="mt-2 bg-card border border-border rounded-3xl overflow-hidden animate-in-up"
              data-section="objections"
              aria-label="Objection handler"
            >
              <div className="p-3 grid grid-cols-2 gap-2">
                {OBJECTIONS.map(obj => (
                  <button
                    key={obj.text}
                    onClick={() => handleObjection(obj.text)}
                    data-objection={obj.text}
                    data-action="get-objection-response"
                    aria-label={`Get response for: ${obj.label}`}
                    aria-pressed={activeObjection === obj.text}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-2xl text-left text-xs font-medium transition-all border',
                      activeObjection === obj.text
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-800 dark:text-emerald-300'
                        : 'border-border text-foreground hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    )}
                  >
                    <span className="text-base">{obj.emoji}</span>
                    <span className="leading-tight">{obj.label}</span>
                  </button>
                ))}
              </div>

              {(objLoading || objResponse) && (
                <div className="mx-3 mb-3 p-4 rounded-2xl bg-muted">
                  {objLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-state="loading" aria-busy="true">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                      Generating response...
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-foreground leading-relaxed mb-3">{objResponse}</p>
                      <button
                        onClick={copyResponse}
                        aria-label="Copy response to clipboard"
                        data-action="copy-response"
                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        {copiedResponse ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedResponse ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Script (when calling) */}
        {isCalling && (
          <div className="mx-4 mb-4">
            <button
              onClick={() => setScriptExpanded(!scriptExpanded)}
              aria-label={scriptExpanded ? 'Collapse call script' : 'Show call script'}
              aria-expanded={scriptExpanded}
              data-action="toggle-script"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
            >
              <span>📋 Live Call Script</span>
              {scriptExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {scriptExpanded && (
              <div
                className="mt-2 bg-card border border-border rounded-3xl overflow-hidden animate-in-up"
                data-section="call-script"
                aria-label="Call script steps"
              >
                {CALL_SCRIPT_STEPS.map((step, i) => (
                  <div
                    key={step.step}
                    className="px-4 py-3 border-b border-border last:border-0"
                    data-step={step.step}
                    role="listitem"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground flex items-center justify-center flex-shrink-0">
                        {step.step}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{step.title}</span>
                      {step.duration && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">{step.duration}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-7 line-clamp-3">{step.script}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Keyboard shortcut hint */}
        <p className="text-center text-[10px] text-muted-foreground pb-4 px-4">
          Desktop shortcuts: Space = call/end · L = log · S = skip
        </p>
      </div>

      {/* ================================================================
          DESKTOP LAYOUT (lg+)
          ================================================================ */}
      <div className="hidden lg:block p-6 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">Power Dialer</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {remaining} of {queue.length} prospects remaining
            </p>
          </div>
          <div className="flex items-center gap-3">
            {justLogged && (
              <span
                className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-400 px-3 py-1.5 rounded-full animate-in-up"
                role="status"
                aria-live="polite"
              >
                ✓ {justLogged}
              </span>
            )}
            {isCalling && (
              <div
                className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/30"
                data-state="calling"
                role="status"
                aria-label={`Call in progress: ${formatTimer(callTimer)}`}
              >
                <span className="status-dot status-dot-live bg-white" />
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold text-base">{formatTimer(callTimer)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-5">
          {/* Left: Prospect Card + Controls */}
          <div className="col-span-3 space-y-4">

            {/* Prospect card */}
            <div
              className={cn(
                'rounded-3xl p-6 transition-all duration-300 glass-card',
                isCalling
                  ? 'border-2 border-emerald-400/60 shadow-xl shadow-emerald-500/10'
                  : 'border border-border'
              )}
              data-entity="prospect"
              data-entity-id={currentProspect?.id}
              data-entity-stage={currentProspect?.stage}
              data-section="prospect-card"
              aria-label="Current prospect"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="section-label mb-1.5">Current Prospect</p>
                  <h2 className="text-2xl font-black tracking-tight text-foreground leading-tight">
                    {currentProspect?.businessName}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{currentProspect?.ownerName}</p>
                </div>
                <span
                  className="pill bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                  data-status="business-type"
                  data-value={currentProspect?.businessType}
                >
                  {currentProspect?.businessType}
                </span>
              </div>

              {/* Phone */}
              <a
                href={`tel:${currentProspect?.phone?.replace(/\D/g, '')}`}
                aria-label={`Call ${currentProspect?.phone}`}
                className="flex items-center justify-center gap-3 w-full py-4 rounded-2xl bg-muted hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors mb-5 group"
              >
                <Phone className="w-5 h-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                <span className="font-mono text-2xl font-bold text-foreground tracking-wide">
                  {currentProspect?.phone}
                </span>
              </a>

              {/* Call button */}
              <div
                className="flex gap-3"
                data-section="call-controls"
                aria-label="Call controls"
              >
                {!isCalling ? (
                  <button
                    onClick={startCall}
                    data-action="start-call"
                    data-testid="dialer-call-button-desktop"
                    data-state="idle"
                    data-prospect-id={currentProspect?.id}
                    aria-label={`Start call with ${currentProspect?.businessName}`}
                    className="flex-1 flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white rounded-2xl h-14 font-bold text-base transition-all btn-glow shadow-lg shadow-emerald-500/20"
                  >
                    <Phone className="w-5 h-5" />
                    CALL
                  </button>
                ) : (
                  <button
                    onClick={endCall}
                    data-action="end-call"
                    data-testid="dialer-end-call-button-desktop"
                    data-state="calling"
                    aria-label="End call and log outcome"
                    className="flex-1 flex items-center justify-center gap-2.5 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white rounded-2xl h-14 font-bold text-base transition-all shadow-lg shadow-red-500/20"
                  >
                    <PhoneOff className="w-5 h-5" />
                    END CALL
                  </button>
                )}
                <button
                  onClick={handleSkip}
                  data-action="skip"
                  aria-label="Skip to next prospect"
                  className="flex items-center gap-2 border border-border hover:bg-muted text-foreground rounded-2xl px-5 h-14 font-semibold transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip
                </button>
              </div>

              <p className="text-[10px] text-muted-foreground text-center mt-3">
                Space = call/end · L = log · S = skip
              </p>
            </div>

            {/* Queue controls */}
            <div className="glass-card rounded-2xl p-4 border border-border flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span className="font-medium">Queue Progress</span>
                  <span className="font-bold text-foreground">{currentIndex + 1} / {queue.length}</span>
                </div>
                <div
                  className="w-full bg-muted rounded-full h-2 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={currentIndex + 1}
                  aria-valuemin={1}
                  aria-valuemax={queue.length}
                  aria-label="Queue progress"
                >
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <button
                onClick={handleShuffle}
                data-action="shuffle-queue"
                aria-label="Shuffle remaining queue"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:bg-muted rounded-xl px-3 py-2 transition-colors font-medium"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Shuffle
              </button>
              <button
                onClick={() => setLogOpen(true)}
                data-action="log-call"
                aria-label="Open log call dialog"
                className="flex items-center gap-1.5 text-xs bg-foreground text-background rounded-xl px-3 py-2 transition-opacity hover:opacity-80 font-semibold"
              >
                <LogIn className="w-3.5 h-3.5" />
                Log & Next
              </button>
            </div>

            {/* Live script (during call) */}
            {isCalling && (
              <div
                className="glass-card rounded-2xl border border-border overflow-hidden animate-in-up"
                data-section="call-script"
                aria-label="Call script steps"
              >
                <p className="px-4 py-3 section-label border-b border-border">Live Script</p>
                {CALL_SCRIPT_STEPS.slice(0, 3).map(step => (
                  <div
                    key={step.step}
                    className="px-4 py-3 border-b border-border last:border-0"
                    data-step={step.step}
                    role="listitem"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full bg-muted text-[10px] font-bold text-muted-foreground flex items-center justify-center flex-shrink-0">
                        {step.step}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{step.title}</span>
                      {step.duration && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full ml-auto">
                          {step.duration}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-7 line-clamp-2">
                      {step.script}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Objections + Response */}
          <div className="col-span-2 space-y-4">
            <div
              className="glass-card rounded-2xl border border-border overflow-hidden"
              data-section="objections"
              aria-label="Objection handler"
            >
              <p className="px-4 py-3 section-label border-b border-border">Objection Handler</p>
              <div className="p-3 space-y-1.5">
                {OBJECTIONS.map(obj => (
                  <button
                    key={obj.text}
                    onClick={() => handleObjection(obj.text)}
                    data-objection={obj.text}
                    data-action="get-objection-response"
                    aria-label={`Get response for: ${obj.label}`}
                    aria-pressed={activeObjection === obj.text}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-xs font-medium border',
                      activeObjection === obj.text
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-800 dark:text-emerald-300 shadow-sm'
                        : 'border-border text-foreground hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    )}
                  >
                    <span className="text-sm">{obj.emoji}</span>
                    <span>{obj.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {(objLoading || objResponse) && (
              <div
                className="glass-card rounded-2xl border border-border p-4 animate-in-up"
                data-section="objection-response"
                aria-label="AI objection response"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="section-label">Response</p>
                  {objResponse && (
                    <button
                      onClick={copyResponse}
                      aria-label="Copy response to clipboard"
                      data-action="copy-response"
                      className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      {copiedResponse ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedResponse ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                {objLoading ? (
                  <div className="space-y-2" data-state="loading" aria-busy="true">
                    <div className="skeleton h-3 w-full rounded" />
                    <div className="skeleton h-3 w-4/5 rounded" />
                    <div className="skeleton h-3 w-3/4 rounded" />
                  </div>
                ) : (
                  <p className="text-sm text-foreground leading-relaxed">{objResponse}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          LOG CALL DIALOG (shared mobile + desktop)
          ================================================================ */}
      {logOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Log call outcome"
          data-section="log-call"
          data-testid="dialer-log-dialog"
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setLogOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-card rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-in-up border border-border">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-foreground">Log Call</h3>
              <button
                onClick={() => setLogOpen(false)}
                aria-label="Close log call dialog"
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-5">
              {currentProspect?.businessName} — {currentProspect?.ownerName}
            </p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="section-label mb-2 block">Outcome</label>
                <div className="grid grid-cols-2 gap-2" data-field="outcome-grid">
                  {OUTCOMES.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setLogForm({ ...logForm, outcome: o.value })}
                      data-field="outcome"
                      data-value={o.value}
                      aria-label={`Select outcome: ${o.label}`}
                      aria-pressed={logForm.outcome === o.value}
                      className={cn(
                        'text-xs py-2.5 px-3 rounded-xl font-semibold transition-all border text-left',
                        logForm.outcome === o.value
                          ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 shadow-sm'
                          : `${o.color} border-transparent hover:border-border`
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <select
                  className="sr-only"
                  name="outcome"
                  data-field="outcome"
                  value={logForm.outcome}
                  onChange={e => setLogForm({ ...logForm, outcome: e.target.value })}
                  aria-label="Call outcome"
                >
                  {OUTCOMES.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="section-label mb-2 block" htmlFor="call-notes">Notes</label>
                <textarea
                  id="call-notes"
                  name="notes"
                  data-field="notes"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none resize-none transition-shadow"
                  rows={2}
                  value={logForm.notes}
                  onChange={e => setLogForm({ ...logForm, notes: e.target.value })}
                  placeholder="Optional notes..."
                  aria-label="Call notes"
                />
              </div>
            </div>

            <button
              onClick={handleLogAndNext}
              data-action="save-log"
              data-testid="dialer-save-log-button"
              aria-label="Save call log and advance to next prospect"
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white rounded-2xl py-3.5 font-bold text-sm transition-all btn-glow shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Save & Next Prospect
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
