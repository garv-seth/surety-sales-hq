'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Trophy, Star, ChevronRight, Mic, ArrowLeft } from 'lucide-react';
import { BUSINESS_TYPES } from '@/lib/surety-content';

const SCENARIOS = [
  { value: 'Skeptical Owner', label: 'Skeptical Owner', emoji: '😤', desc: 'Tough questions, needs convincing' },
  { value: 'Busy Owner', label: 'Busy Owner', emoji: '⏰', desc: 'Wants to hang up fast' },
  { value: 'Price-Sensitive', label: 'Price-Sensitive', emoji: '💸', desc: 'Keeps pushing back on $49' },
  { value: 'Tech-Averse', label: 'Tech-Averse', emoji: '🔒', desc: 'Skeptical of AI software' },
];

interface Message {
  role: 'user' | 'ai';
  content: string;
  feedback?: string;
  score?: number;
}

interface Report {
  finalScore: number;
  strengths: string[];
  improvements: string[];
  summary: string;
}

function ScoreBadge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) {
  const color = score >= 8 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                score >= 6 ? 'text-amber-700 bg-amber-50 border-amber-200' :
                             'text-red-700 bg-red-50 border-red-200';
  return (
    <div className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 ${color}`}>
      <Star className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      <span className={`font-bold ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>{score}/10</span>
    </div>
  );
}

export default function PracticePage() {
  const [businessType, setBusinessType] = useState('Plumber');
  const [scenario, setScenario] = useState('Skeptical Owner');
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (started && !loading) {
      inputRef.current?.focus();
    }
  }, [started, loading]);

  function startSession() {
    const openers: Record<string, string> = {
      'Skeptical Owner': `Yeah... who's this? What are you selling?`,
      'Busy Owner': `Hello? Look, I'm in the middle of a job, make it quick.`,
      'Price-Sensitive': `Sure, I'm listening, but if it costs anything I'm probably not interested.`,
      'Tech-Averse': `Hello? If this is some tech thing, I'm probably not your guy.`,
    };
    setMessages([{ role: 'ai', content: openers[scenario] || `Yeah, hello?` }]);
    setStarted(true);
    setScores([]);
    setReport(null);
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    try {
      const res = await fetch('/api/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: userMsg,
          businessType,
          scenario,
          conversationHistory: history,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, {
        role: 'ai',
        content: data.response,
        feedback: data.feedback,
        score: data.score,
      }]);
      setScores(prev => [...prev, data.score]);

      if (!data.shouldContinue) {
        setGeneratingReport(true);
        await generateReport([...scores, data.score]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: 'Error connecting to AI. Check your API key in settings.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function generateReport(allScores: number[]) {
    try {
      const res = await fetch('/api/practice', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: messages,
          scores: allScores,
          businessType,
          scenario,
        }),
      });
      const data = await res.json();
      setReport(data);
    } catch {}
    setGeneratingReport(false);
  }

  function reset() {
    setStarted(false);
    setMessages([]);
    setScores([]);
    setReport(null);
    setInput('');
  }

  const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;

  // Setup screen
  if (!started) {
    return (
      <main data-page="practice" role="main" className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Practice Mode</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI roleplay to sharpen your pitch and get scored feedback</p>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-6" data-section="practice-setup">
          {/* Business Type */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-3 block">
              Business Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-label="Select business type">
              {BUSINESS_TYPES.filter(t => t !== 'Other').map(t => (
                <button
                  key={t}
                  onClick={() => setBusinessType(t)}
                  aria-pressed={businessType === t}
                  data-action="select-business-type"
                  data-value={t}
                  className={`text-sm py-2.5 px-3 rounded-xl font-semibold transition-all border ${
                    businessType === t
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-3 block">
              Scenario / Difficulty
            </label>
            <div className="space-y-2" role="group" aria-label="Select scenario difficulty">
              {SCENARIOS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setScenario(s.value)}
                  aria-pressed={scenario === s.value}
                  data-action="select-scenario"
                  data-value={s.value}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                    scenario === s.value
                      ? 'border-emerald-400 bg-emerald-50/60'
                      : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl w-7 flex-shrink-0">{s.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{s.label}</p>
                    <p className="text-xs text-gray-400">{s.desc}</p>
                  </div>
                  {scenario === s.value && (
                    <ChevronRight className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSession}
            data-action="start-practice"
            aria-label={`Start practice session as ${businessType} owner with ${scenario} scenario`}
            className="btn-glow w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-4 font-black text-base transition-all flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            Start Practice Session
          </button>
        </div>
      </main>
    );
  }

  // Chat screen
  return (
    <main
      data-page="practice"
      data-state="active"
      data-scenario={scenario}
      data-business-type={businessType}
      role="main"
      className="flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100dvh-6rem)] max-w-2xl mx-auto px-4 md:px-6 pt-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            aria-label="Back to practice setup"
            data-action="reset-practice"
            className="w-8 h-8 glass-card rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">{scenario}</h1>
            <p className="text-xs text-gray-500">
              {businessType} · {messages.filter(m => m.role === 'user').length} exchanges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {avgScore && (
            <ScoreBadge score={parseFloat(avgScore)} />
          )}
        </div>
      </div>

      {/* Final Report */}
      {report && (
        <div
          className="mb-3 glass-card rounded-2xl p-5 flex-shrink-0 border border-emerald-200/60 bg-emerald-50/40"
          data-section="practice-report"
          role="region"
          aria-label="Practice report"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-black text-gray-900">Practice Report</h3>
            <ScoreBadge score={report.finalScore} size="lg" />
          </div>
          <p className="text-sm text-gray-600 mb-4 italic leading-relaxed">{report.summary}</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wide">Strengths</p>
              <ul className="space-y-1.5">
                {report.strengths?.map((s, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                    <span className="text-emerald-500 flex-shrink-0">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-wide">Improve</p>
              <ul className="space-y-1.5">
                {report.improvements?.map((s, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                    <span className="text-amber-500 flex-shrink-0">→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button
            onClick={reset}
            data-action="try-again"
            aria-label="Try practice again"
            className="btn-glow w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-bold transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {generatingReport && (
        <div
          className="mb-3 glass-card rounded-xl p-3.5 flex items-center gap-3 flex-shrink-0 border border-emerald-200/60 bg-emerald-50/40"
          data-state="loading"
          role="status"
          aria-live="polite"
        >
          <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin flex-shrink-0" />
          <p className="text-sm text-emerald-700 font-semibold">Generating your practice report…</p>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto space-y-4 mb-3"
        role="log"
        aria-label="Practice conversation"
        aria-live="polite"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-message-role={msg.role}
          >
            <div className="max-w-[82%] space-y-2">
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-500 text-white'
                  : 'glass-card text-gray-700'
              }`}>
                {msg.role === 'ai' && (
                  <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wide">
                    Mike ({businessType.toUpperCase()} OWNER)
                  </p>
                )}
                {msg.content}
              </div>

              {msg.feedback && (
                <div className="bg-amber-50 border border-amber-200/60 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Feedback</p>
                    {msg.score !== undefined && <ScoreBadge score={msg.score} />}
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">{msg.feedback}</p>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start" data-state="loading" aria-busy="true">
            <div className="glass-card rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="text-sm">Mike is typing…</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!report && (
        <div className="flex gap-2 flex-shrink-0 pb-1">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your pitch or response…"
            data-field="practice-input"
            aria-label="Your response to the prospect"
            disabled={loading}
            className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            data-action="send-message"
            aria-label="Send message"
            className="btn-glow bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl px-4 py-3 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </main>
  );
}
