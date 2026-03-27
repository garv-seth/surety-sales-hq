'use client';
import { useState } from 'react';
import { Phone, PhoneOff, Zap, Loader2, UserCheck, Volume2 } from 'lucide-react';
import { useParallelDial, ParallelCallInfo } from '@/lib/useParallelDial';
import { cn } from '@/lib/utils';
import type { Prospect } from '@/lib/storage';

interface Props {
  prospects: Prospect[];
  currentIndex: number;
  deviceRef?: React.MutableRefObject<any>;
  onProspectConnected?: (prospectId: string) => void;
}

function callStatusColor(status: string) {
  if (status === 'in-progress') return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
  if (status === 'ringing') return 'text-amber-400 bg-amber-500/10 border-amber-400/30 animate-pulse';
  if (status === 'queued' || status === 'connecting') return 'text-blue-400 bg-blue-500/10 border-blue-400/30';
  if (['no-answer', 'busy', 'failed', 'canceled'].includes(status)) return 'text-gray-400 bg-gray-100 border-gray-200';
  return 'text-gray-400 bg-gray-100 border-gray-200';
}

function callStatusLabel(status: string, answeredBy?: string) {
  if (status === 'in-progress') {
    return answeredBy === 'machine' ? '📬 Voicemail' : '🟢 PICKED UP';
  }
  if (status === 'ringing') return '📞 Ringing…';
  if (status === 'queued') return '⏳ Queued';
  if (status === 'no-answer') return '📵 No Answer';
  if (status === 'busy') return '🔴 Busy';
  if (status === 'failed') return '⚠ Failed';
  if (status === 'canceled') return '✕ Canceled';
  return status;
}

export function ParallelDialPanel({ prospects, currentIndex, deviceRef, onProspectConnected }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const { calls, dialing, error, hasAnswer, answeredCalls, dialThree, connectTo, cancelAll } = useParallelDial();

  const nextProspects = prospects
    .slice(currentIndex, currentIndex + 3)
    .map(p => ({ id: p.id, name: p.businessName, phone: p.phone }));

  const isActive = calls.length > 0 && calls.some(c => ['queued', 'ringing', 'in-progress'].includes(c.status));

  async function handleConnect(call: ParallelCallInfo) {
    setConnecting(call.sid);
    try {
      await connectTo(call, deviceRef?.current);
      onProspectConnected?.(call.prospectId);
    } catch {}
    setConnecting(null);
  }

  return (
    <div className={cn(
      'rounded-2xl border-2 overflow-hidden transition-all',
      hasAnswer ? 'border-emerald-400 shadow-emerald-100 shadow-lg' : isActive ? 'border-amber-300' : 'border-dashed border-gray-300 bg-white'
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3.5 transition-colors',
          hasAnswer ? 'bg-emerald-50' : isActive ? 'bg-amber-50' : 'bg-white hover:bg-gray-50'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center',
            hasAnswer ? 'bg-emerald-500' : isActive ? 'bg-amber-500' : 'bg-gray-100'
          )}>
            <Zap className={cn('w-5 h-5', hasAnswer || isActive ? 'text-white' : 'text-gray-400')} />
          </div>
          <div className="text-left">
            <p className={cn('text-sm font-bold', hasAnswer ? 'text-emerald-800' : isActive ? 'text-amber-800' : 'text-slate-700')}>
              {hasAnswer ? `🔥 ${answeredCalls.length} PICKED UP — TAP TO CONNECT` :
               isActive ? '⚡ Parallel Dialing 3 Leads…' :
               'Parallel Dial (3 at once)'}
            </p>
            <p className="text-[11px] text-gray-500">
              {isActive
                ? `${calls.filter(c => c.status === 'ringing').length} ringing · ${calls.filter(c => c.status === 'in-progress').length} answered`
                : 'Dials 3 leads simultaneously, you pick who to connect to'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasAnswer && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full animate-pulse">
              ANSWER NOW
            </span>
          )}
          {isActive && !hasAnswer && <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />}
        </div>
      </button>

      {/* Expanded: live call cards or start button */}
      {(expanded || hasAnswer || isActive) && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Active call cards */}
          {calls.length > 0 && (
            <div className="space-y-2">
              {calls.map(call => {
                const isAnswered = call.status === 'in-progress' && call.answeredBy !== 'machine';
                return (
                  <div
                    key={call.sid || call.prospectId}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all',
                      callStatusColor(call.status)
                    )}
                  >
                    <div>
                      <p className={cn('text-sm font-bold', isAnswered ? 'text-emerald-800' : 'text-slate-700')}>
                        {call.prospectName}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">{call.phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold">{callStatusLabel(call.status, call.answeredBy)}</span>
                      {isAnswered && (
                        <button
                          onClick={() => handleConnect(call)}
                          disabled={!!connecting}
                          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {connecting === call.sid
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Volume2 className="w-3.5 h-3.5" />}
                          CONNECT
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            {!isActive ? (
              <button
                onClick={() => dialThree(nextProspects)}
                disabled={dialing || nextProspects.length === 0}
                className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl py-3 font-bold text-sm transition-colors"
              >
                {dialing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting…</>
                  : <><Zap className="w-4 h-4" /> Dial {nextProspects.length} At Once</>}
              </button>
            ) : (
              <button
                onClick={cancelAll}
                className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              >
                <PhoneOff className="w-4 h-4" /> Cancel All
              </button>
            )}
          </div>

          {!isActive && (
            <p className="text-[10px] text-gray-400 text-center">
              Dials next {nextProspects.length} leads simultaneously · When one picks up → tap Connect · Others dropped automatically
            </p>
          )}
        </div>
      )}
    </div>
  );
}
