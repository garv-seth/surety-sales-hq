'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone, PhoneOff, SkipForward, Clock, Users, Check, X,
  RefreshCw, ChevronDown, ChevronUp, Zap, Calendar,
  ExternalLink, ChevronRight, Mic, MicOff, Volume2, Wifi, WifiOff,
  Target, AlertCircle, BookOpen
} from 'lucide-react';
import {
  getProspects, getDialerQueue, saveDialerQueue, addCallLog,
  updateProspect, getCachedObjections, setCachedObjection, Prospect
} from '@/lib/storage';
import { OBJECTIONS, CALL_SCRIPT_STEPS } from '@/lib/surety-content';
import { useTwilioCall, CallStatus } from '@/lib/useTwilioCall';
import { ParallelDialPanel } from '@/components/ParallelDialPanel';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────
const NO_ANSWER_SECS = 22; // auto-log no-answer after this many seconds

const OUTCOMES = [
  { value: 'no_answer',     label: 'No Answer',        color: 'bg-gray-100 text-gray-700',    emoji: '📵' },
  { value: 'voicemail',     label: 'Left Voicemail',   color: 'bg-blue-100 text-blue-700',    emoji: '📬' },
  { value: 'not_interested',label: 'Not Interested',   color: 'bg-red-100 text-red-700',      emoji: '🚫' },
  { value: 'follow_up',     label: 'Follow Up',        color: 'bg-amber-100 text-amber-700',  emoji: '📅' },
  { value: 'demo_booked',   label: 'Demo Booked 🎉',   color: 'bg-emerald-100 text-emerald-700', emoji: '🎉' },
  { value: 'closed_won',    label: 'Closed Won 🏆',    color: 'bg-purple-100 text-purple-700',emoji: '🏆' },
];

// Pattern-interrupt opener lines
const OPENERS = {
  default: {
    setup: 'Hey [Name], quick question — do you want the good news or the bad news?',
    bad: '"Well, this is a cold call."',
    good: '"It\'s actually a well-researched call — I think I can genuinely help you."',
    pivot: 'Either way, I only need 27 seconds. Can I have them?',
  }
};

// Industry-specific pain points for empathy-first discovery
const INDUSTRY_PAIN: Record<string, string[]> = {
  plumber:    ['Bonds expiring mid-job?', 'Lost a bid because you didn\'t have surety?', 'Chasing down paperwork last-minute?'],
  hvac:       ['Missing bigger commercial contracts without bonding?', 'Customers demanding proof of bond before signing?', 'Bond renewals eating up your time?'],
  electrician:['Public works jobs requiring performance bonds?', 'Sub-contracting work requiring additional bonds?', 'License bond filing taking hours?'],
  roofer:     ['Insurance companies requiring bonds now?', 'Losing jobs to competitors with surety?', 'Dealing with bond claim threats?'],
  contractor: ['Performance bond delays costing you contracts?', 'Surety line not large enough for that big job?', 'Bonding company too slow for bid deadlines?'],
  landscaper: ['City/county requiring bond for commercial work?', 'Bigger property management contracts out of reach without surety?'],
  default:    ['Licensing bond renewals taking too long?', 'Missing contracts because surety wasn\'t in place?', 'Need a faster way to stay bonded?'],
};

function getPainPoints(businessType: string): string[] {
  const type = businessType.toLowerCase();
  for (const [key, points] of Object.entries(INDUSTRY_PAIN)) {
    if (type.includes(key)) return points;
  }
  return INDUSTRY_PAIN.default;
}

function formatTimer(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: CallStatus }) {
  const map: Record<CallStatus, { label: string; cls: string }> = {
    idle:         { label: '○ Idle',          cls: 'bg-gray-100 text-gray-500' },
    initializing: { label: '⟳ Warming up…',  cls: 'bg-slate-100 text-slate-500' },
    ready:        { label: '✓ Ready',         cls: 'bg-emerald-100 text-emerald-700' },
    connecting:   { label: '⟳ Connecting…',  cls: 'bg-blue-100 text-blue-600 animate-pulse' },
    ringing:      { label: '📞 Ringing…',    cls: 'bg-amber-100 text-amber-700 animate-pulse' },
    'in-call':    { label: '🔴 Live',         cls: 'bg-red-500 text-white' },
    ended:        { label: '✓ Ended',         cls: 'bg-gray-100 text-gray-500' },
    error:        { label: '⚠ Error',         cls: 'bg-red-100 text-red-600' },
  };
  const { label, cls } = map[status] || map.idle;
  return <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', cls)}>{label}</span>;
}

// ─── Call Coach Overlay ────────────────────────────────────────────────────────
function CallCoachOverlay({
  prospect,
  duration,
  onEnd,
  onLog,
}: {
  prospect: Prospect;
  duration: number;
  onEnd: () => void;
  onLog: (outcome: string, notes: string) => void;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [activeObjection, setActiveObjection] = useState('');
  const [objResponse, setObjResponse] = useState('');
  const [objLoading, setObjLoading] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingUrl, setBookingUrl] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [eventTypes, setEventTypes] = useState<any[]>([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [logOutcome, setLogOutcome] = useState('follow_up');
  const [logNotes, setLogNotes] = useState('');
  const [phase, setPhase] = useState<'opener' | 'script' | 'close'>('opener');

  const painPoints = getPainPoints(prospect.businessType);

  // Use AI-researched data when available, fall back to defaults
  const researchedOpener = prospect.research?.personalizedOpener;
  const researchedPainPoints = prospect.research?.painPoints;
  const activePainPoints = researchedPainPoints?.length ? researchedPainPoints : painPoints;
  const callAngle = prospect.research?.callAngle;
  const hasResearch = !!prospect.research;

  // Preload Calendly event types
  useEffect(() => {
    fetch('/api/calendly/event-types')
      .then(r => r.json())
      .then(d => { if (d.eventTypes?.length) setEventTypes(d.eventTypes); })
      .catch(() => {});
  }, []);

  async function handleObjection(text: string) {
    setActiveObjection(text);
    setObjResponse('');
    const cache = getCachedObjections();
    if (cache[text]) { setObjResponse(cache[text]); return; }
    setObjLoading(true);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objection: text }),
      });
      const data = await res.json();
      if (data.response) {
        setObjResponse(data.response);
        setCachedObjection(text, data.response);
      }
    } catch {}
    setObjLoading(false);
  }

  async function handleBook(eventTypeUri: string) {
    setBookingLoading(true);
    try {
      const res = await fetch('/api/calendly/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventTypeUri }),
      });
      const data = await res.json();
      if (data.bookingUrl) {
        setBookingUrl(data.bookingUrl);
        setShowBooking(false);
        setLogOutcome('demo_booked');
      }
    } catch {}
    setBookingLoading(false);
  }

  function handleConfirmEnd() {
    onLog(logOutcome, logNotes);
  }

  const firstName = prospect.ownerName?.split(' ')[0] || prospect.ownerName;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <div>
            <p className="text-white font-bold text-sm leading-none">{prospect.businessName}</p>
            <p className="text-slate-400 text-[11px] mt-0.5">{firstName} · {prospect.businessType}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-3 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-bold text-sm">{formatTimer(duration)}</span>
          </div>
          <button
            onClick={() => setShowEndDialog(true)}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            End
          </button>
        </div>
      </div>

      {/* Phase tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900 flex-shrink-0">
        {(['opener', 'script', 'close'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={cn(
              'flex-1 py-2.5 text-xs font-semibold capitalize transition-colors',
              phase === p ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            {p === 'opener' ? '🎯 Opener' : p === 'script' ? '📋 Script' : '📅 Close'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── OPENER PHASE ── */}
        {phase === 'opener' && (
          <div className="p-4 space-y-4">
            {/* Pattern interrupt */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              {hasResearch && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">🔬 AI-Researched Opener</span>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">personalized</span>
                  </div>
                  <p className="text-blue-100 text-sm italic leading-relaxed">&#34;{researchedOpener}&#34;</p>
                  {callAngle && <p className="text-blue-300 text-[11px] mt-2">Angle: {callAngle}</p>}
                </div>
              )}
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Pattern Interrupt Opener</p>
              <p className="text-white text-base font-medium leading-relaxed">
                "Hey <span className="text-emerald-400 font-bold">{firstName}</span>, quick question — do you want the <span className="text-emerald-300">good news</span> or the <span className="text-red-400">bad news</span>?"
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                  <p className="text-[9px] text-red-400 uppercase font-bold mb-1">If: Bad News</p>
                  <p className="text-red-200 text-xs italic">"Well… this is a cold call."</p>
                  <p className="text-slate-400 text-[10px] mt-1">They laugh → you're in.</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5">
                  <p className="text-[9px] text-emerald-400 uppercase font-bold mb-1">If: Good News</p>
                  <p className="text-emerald-200 text-xs italic">"It's a well-researched call. I think I can help."</p>
                  <p className="text-slate-400 text-[10px] mt-1">Instant credibility.</p>
                </div>
              </div>
              <div className="mt-3 bg-white/5 rounded-lg p-2.5">
                <p className="text-[10px] text-slate-400 mb-1">Either way, follow with:</p>
                <p className="text-white text-sm italic">"I only need 27 seconds. Can I have them?"</p>
              </div>
            </div>

            {/* Pain discovery */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-3">Pain Discovery — Feel Their Problem</p>
              <p className="text-slate-300 text-xs mb-3 italic">Don't pitch yet. Ask one of these and listen:</p>
              <div className="space-y-2">
                {activePainPoints.map((pain, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-slate-700/50 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => setActiveStep(i)}
                  >
                    <span className="text-amber-400 text-sm mt-0.5">→</span>
                    <p className="text-slate-200 text-sm">{pain}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setPhase('script')}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              They're engaged → Go to Script <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── SCRIPT PHASE ── */}
        {phase === 'script' && (
          <div className="p-4 space-y-3">
            {CALL_SCRIPT_STEPS.map((step, idx) => (
              <button
                key={step.step}
                onClick={() => setActiveStep(activeStep === idx ? -1 : idx)}
                className={cn(
                  'w-full text-left rounded-xl border transition-all overflow-hidden',
                  activeStep === idx
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
                )}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0',
                      activeStep === idx ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                    )}>{step.step}</span>
                    <span className={cn('text-sm font-semibold', activeStep === idx ? 'text-emerald-300' : 'text-slate-300')}>
                      {step.title}
                    </span>
                    {step.duration && (
                      <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">{step.duration}</span>
                    )}
                  </div>
                  {activeStep === idx ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
                {activeStep === idx && (
                  <div className="px-4 pb-4">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{step.script}</p>
                  </div>
                )}
              </button>
            ))}

            {/* Objection buttons */}
            <div className="border border-slate-700 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hit an Objection?</p>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {OBJECTIONS.map(obj => (
                  <button
                    key={obj.text}
                    onClick={() => handleObjection(obj.text)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left',
                      activeObjection === obj.text
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-emerald-500/40'
                    )}
                  >
                    <span>{obj.emoji}</span>
                    <span className="leading-tight">{obj.label}</span>
                  </button>
                ))}
              </div>
              {(objLoading || objResponse) && (
                <div className="px-4 pb-4">
                  {objLoading ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" /> Loading…
                    </div>
                  ) : (
                    <div className="bg-slate-800 border border-emerald-500/20 rounded-lg p-3">
                      <p className="text-emerald-300 text-sm leading-relaxed">{objResponse}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CLOSE PHASE ── */}
        {phase === 'close' && (
          <div className="p-4 space-y-4">
            {/* The ask */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3">The Ask — Go For It</p>
              <p className="text-white text-sm leading-relaxed italic mb-2">
                "It sounds like this could actually be really helpful for you. I have a 20-minute Zoom I do with {prospect.businessType.toLowerCase()} owners where I walk through exactly how it works and what it costs. Would you be open to that?"
              </p>
              <p className="text-slate-400 text-xs">Then stop talking. Silence = pressure on them.</p>
            </div>

            {/* Calendly booking */}
            {bookingUrl ? (
              <div className="bg-emerald-500/10 border border-emerald-500/40 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <p className="text-emerald-400 font-bold text-sm">Booking Link Ready!</p>
                </div>
                <p className="text-slate-300 text-xs mb-3">Send this to {firstName} right now:</p>
                <div className="bg-slate-900 rounded-lg p-3 mb-3 border border-emerald-500/20">
                  <p className="text-emerald-300 text-xs font-mono break-all">{bookingUrl}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2.5 text-xs font-bold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open to Book
                  </a>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(bookingUrl); }}
                    className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2.5 text-xs font-semibold transition-colors"
                  >
                    📋 Copy Link
                  </button>
                </div>
              </div>
            ) : eventTypes.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">One-Tap Booking</p>
                <div className="space-y-2">
                  {eventTypes.map((et: any) => (
                    <button
                      key={et.uri}
                      onClick={() => handleBook(et.uri)}
                      disabled={bookingLoading}
                      className="w-full flex items-center justify-between bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl px-4 py-3.5 transition-colors"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <Calendar className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-sm">{et.name}</p>
                          <p className="text-emerald-100 text-[11px]">{et.duration} min · Zoom</p>
                        </div>
                      </div>
                      {bookingLoading
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <span className="text-emerald-200 text-xs font-semibold">Tap to Book →</span>
                      }
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-300 text-sm font-semibold mb-1">Connect Calendly first</p>
                <p className="text-slate-500 text-xs mb-3">Go to Settings → connect your Calendly account for one-tap booking</p>
                <a href="/settings" className="text-emerald-400 text-xs hover:underline">Open Settings →</a>
              </div>
            )}

            {/* Quick reference */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Reference</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {[
                  ['Price', 'from $49/mo'],
                  ['Setup', '< 10 minutes'],
                  ['Guarantee', '14-day refund'],
                  ['Result', 'Paid in ~3 weeks'],
                  ['QuickBooks', 'Direct sync'],
                  ['Meeting', '20-min Zoom'],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-bold text-slate-200">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* End call dialog */}
      {showEndDialog && (
        <div className="absolute inset-0 z-10 flex items-end justify-center bg-black/60" onClick={() => setShowEndDialog(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-t-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-base mb-1">Log this call</h3>
            <p className="text-slate-400 text-xs mb-4">{prospect.businessName} · {prospect.ownerName}</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {OUTCOMES.map(o => (
                <button
                  key={o.value}
                  onClick={() => setLogOutcome(o.value)}
                  className={cn(
                    'text-xs py-2.5 px-3 rounded-xl font-semibold transition-colors border text-left flex items-center gap-1.5',
                    logOutcome === o.value ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300' : 'border-slate-700 text-slate-300 bg-slate-800'
                  )}
                >
                  <span>{o.emoji}</span> {o.label}
                </button>
              ))}
            </div>
            <textarea
              className="w-full bg-slate-800 border border-slate-600 text-slate-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:outline-none focus:border-emerald-400 resize-none placeholder-slate-500"
              rows={2}
              value={logNotes}
              onChange={e => setLogNotes(e.target.value)}
              placeholder="Quick note (optional)…"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { onEnd(); setShowEndDialog(false); }}
                className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
              >
                Hang Up Only
              </button>
              <button
                onClick={handleConfirmEnd}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Log & Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dialer Page ──────────────────────────────────────────────────────────
export default function DialerPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoDial, setAutoDial] = useState(false);
  const [autoDialTimer, setAutoDialTimer] = useState(0);
  const [showCoach, setShowCoach] = useState(false);
  const [justLogged, setJustLogged] = useState('');
  const [sessionStats, setSessionStats] = useState({ dials: 0, connects: 0, booked: 0 });
  const autoDialRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { status, duration, error, call, hangup, reset } = useTwilioCall();

  useEffect(() => {
    const allProspects = getProspects();
    setProspects(allProspects);
    const saved = getDialerQueue();
    if (saved.length > 0) {
      const validIds = new Set(allProspects.map(p => p.id));
      setQueue(saved.filter(id => validIds.has(id)));
    } else {
      setQueue(allProspects.filter(p => p.stage === 'new' || p.stage === 'contacted').map(p => p.id));
    }
  }, []);

  useEffect(() => { saveDialerQueue(queue); }, [queue]);

  // Show call coach when call goes live
  useEffect(() => {
    if (status === 'in-call') {
      setShowCoach(true);
      setSessionStats(s => ({ ...s, connects: s.connects + 1 }));
    }
    if (status === 'ended' || status === 'error') {
      setShowCoach(false);
    }
  }, [status]);

  // Auto-dial no-answer timer
  useEffect(() => {
    if (!autoDial || status !== 'ringing') return;
    let secs = 0;
    setAutoDialTimer(NO_ANSWER_SECS);
    autoDialRef.current = setInterval(() => {
      secs++;
      setAutoDialTimer(NO_ANSWER_SECS - secs);
      if (secs >= NO_ANSWER_SECS) {
        clearInterval(autoDialRef.current!);
        // Auto-log no answer and advance
        hangup();
        logAndAdvance('no_answer', '');
      }
    }, 1000);
    return () => { if (autoDialRef.current) clearInterval(autoDialRef.current); };
  }, [autoDial, status]);

  const currentProspect = prospects.find(p => p.id === queue[currentIndex]);

  const logAndAdvance = useCallback((outcome: string, notes: string) => {
    if (!currentProspect) return;

    addCallLog({
      prospectName: currentProspect.ownerName,
      outcome: outcome as 'no_answer' | 'not_interested' | 'follow_up' | 'demo_booked' | 'closed_won' | 'voicemail' | 'callback',
      notes,
      businessType: currentProspect.businessType,
    });
    updateProspect(currentProspect.id, {
      stage: outcome === 'demo_booked' ? 'demo_scheduled' : outcome === 'closed_won' ? 'closed_won' : 'contacted',
      lastContact: new Date().toISOString().split('T')[0],
    });

    if (outcome === 'demo_booked') setSessionStats(s => ({ ...s, booked: s.booked + 1 }));

    const outcomeLabel = OUTCOMES.find(o => o.value === outcome)?.label || '';
    setJustLogged(outcomeLabel);
    setTimeout(() => setJustLogged(''), 2500);

    // Remove from queue, advance
    const newQueue = queue.filter((_, i) => i !== currentIndex);
    setQueue(newQueue);
    setCurrentIndex(prev => Math.min(prev, Math.max(0, newQueue.length - 1)));

    hangup();
    reset();
    setShowCoach(false);

    // If auto-dial is on, dial next after a brief pause
    if (autoDial && newQueue.length > 0) {
      const nextIndex = Math.min(currentIndex, newQueue.length - 1);
      const nextProspect = prospects.find(p => p.id === newQueue[nextIndex]);
      if (nextProspect) {
        setTimeout(() => {
          setSessionStats(s => ({ ...s, dials: s.dials + 1 }));
          call(nextProspect.phone);
        }, 1200);
      }
    }
  }, [currentProspect, queue, currentIndex, hangup, reset, autoDial, prospects, call]);

  function startCall() {
    if (!currentProspect) return;
    setSessionStats(s => ({ ...s, dials: s.dials + 1 }));
    call(currentProspect.phone);
  }

  function handleSkip() {
    hangup();
    reset();
    const newQueue = [...queue];
    const [skipped] = newQueue.splice(currentIndex, 1);
    newQueue.push(skipped);
    setQueue(newQueue);
    setCurrentIndex(0);
  }

  function toggleAutoDial() {
    if (!autoDial) {
      setAutoDial(true);
      // Start calling immediately
      if (currentProspect && (status === 'idle' || status === 'ready' || status === 'ended')) {
        startCall();
      }
    } else {
      setAutoDial(false);
      if (autoDialRef.current) clearInterval(autoDialRef.current);
    }
  }

  if (!prospects.length) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-96">
      <Users className="w-12 h-12 text-gray-300 mb-3" />
      <h2 className="text-lg font-semibold text-slate-700 mb-1">No Prospects</h2>
      <a href="/prospects" className="text-sm bg-emerald-500 text-white rounded-lg px-4 py-2 font-medium">Add Prospects →</a>
    </div>
  );

  if (!queue.length || currentIndex >= queue.length) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-96 text-center">
      <Check className="w-12 h-12 text-emerald-500 mb-3" />
      <h2 className="text-lg font-semibold text-slate-700 mb-1">Queue Complete!</h2>
      <div className="flex gap-4 text-sm text-gray-500 mb-4">
        <span>📞 {sessionStats.dials} dials</span>
        <span>🤝 {sessionStats.connects} connects</span>
        <span>🎉 {sessionStats.booked} booked</span>
      </div>
      <button
        onClick={() => {
          const all = getProspects().filter(p => p.stage === 'new' || p.stage === 'contacted').map(p => p.id);
          setQueue(all); setCurrentIndex(0); setProspects(getProspects());
        }}
        className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
      >
        Restart Queue
      </button>
    </div>
  );

  const isLive = status === 'in-call';
  const isBusy = ['connecting', 'ringing', 'in-call'].includes(status);
  const remaining = queue.length - currentIndex;

  return (
    <>
      {/* Call Coach — fullscreen overlay when live */}
      {showCoach && currentProspect && (
        <CallCoachOverlay
          prospect={currentProspect}
          duration={duration}
          onEnd={() => { hangup(); setShowCoach(false); reset(); }}
          onLog={logAndAdvance}
        />
      )}

      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Power Dialer</h1>
            <p className="text-xs text-gray-400 mt-0.5">{remaining} in queue · {sessionStats.dials} dials · {sessionStats.connects} connects</p>
          </div>
          <div className="flex items-center gap-2">
            {justLogged && (
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-pulse">
                ✓ {justLogged}
              </span>
            )}
            <StatusPill status={status} />
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error} — try refreshing if calls aren't connecting</span>
          </div>
        )}

        {/* Current Prospect Card */}
        <div className={cn(
          'bg-white border-2 rounded-2xl p-5 shadow-sm mb-4 transition-all',
          isLive ? 'border-red-400 shadow-red-100' : isBusy ? 'border-amber-300 shadow-amber-50' : 'border-gray-200'
        )}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Up Next</p>
              <h2 className="text-2xl font-bold text-slate-900 leading-none">{currentProspect?.businessName}</h2>
              <p className="text-sm text-gray-500 mt-1">{currentProspect?.ownerName}</p>
            </div>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
              {currentProspect?.businessType}
            </span>
          </div>

          {/* Phone number — big tap target */}
          <a
            href={`tel:${currentProspect?.phone?.replace(/\D/g, '')}`}
            className="block bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl p-4 mb-4 text-center transition-colors group"
          >
            <div className="flex items-center justify-center gap-2">
              <Phone className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              <span className="text-2xl font-bold font-mono text-slate-900 group-hover:text-emerald-700">
                {currentProspect?.phone}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Tap to open native dialer · or use CALL below for WebRTC</p>
          </a>

          {/* Call controls */}
          <div className="flex gap-3">
            {!isBusy ? (
              <button
                onClick={startCall}
                disabled={status === 'initializing'}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl h-14 font-bold text-lg transition-colors shadow-sm"
              >
                <Phone className="w-5 h-5" />
                {status === 'initializing' ? 'Warming up…' : 'CALL'}
              </button>
            ) : (
              <button
                onClick={() => { hangup(); setShowCoach(false); reset(); }}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-xl h-14 font-bold text-lg transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
                {isLive ? `END  ${formatTimer(duration)}` : 'CANCEL'}
              </button>
            )}
            <button
              onClick={handleSkip}
              disabled={isBusy}
              className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-gray-600 rounded-xl px-4 h-14 font-semibold transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          </div>

          {/* Ringing countdown */}
          {autoDial && status === 'ringing' && (
            <div className="mt-3 flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
              <span className="text-xs text-amber-700 font-medium">Auto no-answer in</span>
              <span className="font-mono font-bold text-amber-700">{autoDialTimer}s</span>
            </div>
          )}
        </div>

        {/* Auto-Dial Power Mode */}
        <ParallelDialPanel prospects={prospects} currentIndex={currentIndex} />

        <div className={cn(
          'rounded-2xl border-2 p-4 mb-4 transition-all',
          autoDial ? 'border-emerald-400 bg-emerald-50' : 'border-dashed border-gray-300 bg-white'
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', autoDial ? 'bg-emerald-500' : 'bg-gray-100')}>
                <Zap className={cn('w-5 h-5', autoDial ? 'text-white' : 'text-gray-400')} />
              </div>
              <div>
                <p className={cn('text-sm font-bold', autoDial ? 'text-emerald-800' : 'text-slate-700')}>
                  {autoDial ? '⚡ Auto-Dial ON' : 'Auto-Dial Mode'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {autoDial ? `Auto-advances after ${NO_ANSWER_SECS}s no answer` : `Auto-logs no-answer, instant next lead`}
                </p>
              </div>
            </div>
            <button
              onClick={toggleAutoDial}
              disabled={isBusy && !autoDial}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                autoDial ? 'bg-emerald-500' : 'bg-gray-300'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                autoDial ? 'translate-x-6' : 'translate-x-0.5'
              )} />
            </button>
          </div>
        </div>

        {/* Queue progress */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
          <div className="flex justify-between text-xs text-gray-500 mb-2">
            <span>Queue Progress</span>
            <span className="font-semibold text-slate-700">{currentIndex + 1} / {queue.length}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-gray-400">
            <span>📞 {sessionStats.dials} dialed</span>
            <span>🤝 {sessionStats.connects} connects</span>
            <span>🎉 {sessionStats.booked} booked</span>
          </div>
        </div>

        {/* Next up preview */}
        {queue.length > currentIndex + 1 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Up Next in Queue</p>
            </div>
            {queue.slice(currentIndex + 1, currentIndex + 4).map((id, i) => {
              const p = prospects.find(pr => pr.id === id);
              if (!p) return null;
              return (
                <div key={id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center">
                      {currentIndex + i + 2}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.businessName}</p>
                      <p className="text-[11px] text-gray-400">{p.ownerName} · {p.businessType}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{p.phone}</span>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-[10px] text-gray-400 mt-4">
          Space = call/end · S = skip · Calls go through browser (WebRTC)
        </p>
      </div>
    </>
  );
}
