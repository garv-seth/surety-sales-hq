'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Trophy, Star, ChevronRight } from 'lucide-react';
import { BUSINESS_TYPES } from '@/lib/surety-content';

const SCENARIOS = [
  { value: 'Skeptical Owner', label: '😤 Skeptical Owner', desc: 'Tough questions, needs convincing' },
  { value: 'Busy Owner', label: '⏰ Busy Owner', desc: 'Wants to hang up fast' },
  { value: 'Price-Sensitive', label: '💸 Price-Sensitive', desc: 'Keeps pushing back on $49' },
  { value: 'Tech-Averse', label: '🔒 Tech-Averse', desc: 'Skeptical of AI' },
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function startSession() {
    const opener = getOpener(businessType, scenario);
    setMessages([{ role: 'ai', content: opener }]);
    setStarted(true);
    setScores([]);
    setReport(null);
  }

  function getOpener(bt: string, sc: string): string {
    const openers: Record<string, string> = {
      'Skeptical Owner': `Yeah... who's this? What are you selling?`,
      'Busy Owner': `Hello? Look, I'm in the middle of a job, make it quick.`,
      'Price-Sensitive': `Sure, I'm listening, but if it costs anything I'm probably not interested.`,
      'Tech-Averse': `Hello? If this is some tech thing, I'm probably not your guy.`,
    };
    return openers[sc] || `Yeah, hello?`;
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    // Build conversation history for API
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
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Error connecting to AI. Check your API key.' }]);
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

  if (!started) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Practice Mode</h1>
          <p className="text-sm text-gray-500 mt-0.5">AI roleplay to sharpen your pitch and get scored feedback</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-3 block">Business Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BUSINESS_TYPES.filter(t => t !== 'Other').map(t => (
                <button key={t} onClick={() => setBusinessType(t)}
                  className={`text-sm py-2 px-3 rounded-lg font-medium transition-colors border ${
                    businessType === t ? 'bg-emerald-500 text-white border-emerald-500' : 'border-gray-200 text-slate-700 hover:border-emerald-300'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 mb-3 block">Scenario / Difficulty</label>
            <div className="space-y-2">
              {SCENARIOS.map(s => (
                <button key={s.value} onClick={() => setScenario(s.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    scenario === s.value ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'
                  }`}>
                  <span className="text-base">{s.label.split(' ')[0]}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.label.slice(s.label.indexOf(' ') + 1)}</p>
                    <p className="text-xs text-gray-400">{s.desc}</p>
                  </div>
                  {scenario === s.value && <ChevronRight className="w-4 h-4 text-emerald-500 ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSession}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3.5 font-bold text-base transition-colors flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            Start Practice Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Practice: {scenario}</h1>
          <p className="text-xs text-gray-500">{businessType} owner · {messages.filter(m => m.role === 'user').length} exchanges</p>
        </div>
        <div className="flex items-center gap-3">
          {avgScore && (
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-sm font-bold text-amber-700">{avgScore}/10</span>
            </div>
          )}
          <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg px-3 py-1.5 transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* Final Report */}
      {report && (
        <div className="mb-4 bg-white border border-emerald-200 rounded-xl p-5 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Practice Report</h3>
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <Trophy className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">{report.finalScore}/10</span>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4 italic">{report.summary}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-2">✓ Strengths</p>
              <ul className="space-y-1">
                {report.strengths?.map((s, i) => (
                  <li key={i} className="text-xs text-slate-700 flex gap-1.5">
                    <span className="text-emerald-500">•</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-600 mb-2">→ Improve</p>
              <ul className="space-y-1">
                {report.improvements?.map((s, i) => (
                  <li key={i} className="text-xs text-slate-700 flex gap-1.5">
                    <span className="text-amber-500">•</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <button onClick={reset} className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">
            Try Again
          </button>
        </div>
      )}

      {generatingReport && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3 flex-shrink-0">
          <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
          <p className="text-sm text-emerald-700 font-medium">Generating your practice report...</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] space-y-2">
              <div className={`rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white border border-gray-200 text-slate-700 shadow-sm'
              }`}>
                {msg.role === 'ai' && <p className="text-[10px] font-semibold text-gray-400 mb-1">MIKE ({businessType.toUpperCase()} OWNER)</p>}
                {msg.content}
              </div>
              {msg.feedback && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-amber-700 uppercase">Feedback</p>
                    {msg.score !== undefined && (
                      <span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" />{msg.score}/10
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-amber-800">{msg.feedback}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="text-sm">Mike is typing...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!report && (
        <div className="flex gap-3 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your pitch or response..."
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl px-4 py-3 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
