'use client';

import { useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CALL_SCRIPT_STEPS, OBJECTIONS, QUICK_REFERENCE } from '@/lib/surety-content';
import { addCallLog } from '@/lib/storage';

type CallOutcome = 'no_answer' | 'not_interested' | 'follow_up' | 'demo_booked' | 'closed_won';

function CoachContent() {
  const searchParams = useSearchParams();
  const prospectName = searchParams.get('prospect') || '';
  const prospectPhone = searchParams.get('phone') || '';

  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [loadingObjection, setLoadingObjection] = useState<string | null>(null);
  const [objectionResponse, setObjectionResponse] = useState<string>('');
  const [activeObjection, setActiveObjection] = useState<string>('');
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    prospectName: prospectName,
    outcome: 'no_answer' as CallOutcome,
    notes: ''
  });
  const [saved, setSaved] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  const toggleStep = (step: number) => {
    setCheckedSteps(prev => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const handleObjection = async (objection: { emoji: string; label: string; text: string }) => {
    setLoadingObjection(objection.text);
    setObjectionResponse('');
    setActiveObjection(objection.label);
    try {
      const res = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objection: objection.text }),
      });
      const data = await res.json();
      setObjectionResponse(data.response || 'No response generated.');
    } catch {
      setObjectionResponse('Error getting response. Check your API key.');
    } finally {
      setLoadingObjection(null);
    }
    setTimeout(() => responseRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleSaveLog = () => {
    addCallLog({
      prospectName: logForm.prospectName,
      outcome: logForm.outcome,
      notes: logForm.notes,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); setLogOpen(false); }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">📞 Call Coach</h1>
        {prospectName && (
          <p className="text-slate-600 mt-1">
            Calling: <span className="font-semibold text-emerald-600">{prospectName}</span>
            {prospectPhone && <span className="text-slate-400 ml-2">{prospectPhone}</span>}
          </p>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN — Live Call Script */}
        <div className="space-y-4 mb-6 lg:mb-0">
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Live Call Script</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CALL_SCRIPT_STEPS.map((step) => {
                const checked = checkedSteps.has(step.step);
                return (
                  <div
                    key={step.step}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      checked ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => toggleStep(step.step)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                        checked ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {checked ? '✓' : step.step}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-slate-700">STEP {step.step} — {step.title}</span>
                          {step.duration && (
                            <Badge variant="secondary" className="text-xs">{step.duration}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-line italic">{step.script}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Log Call Button */}
          <Dialog open={logOpen} onOpenChange={setLogOpen}>
            <DialogTrigger
              className="w-full bg-slate-800 hover:bg-slate-900 text-white py-6 text-base rounded-md font-medium transition-colors"
            >
              📝 Log This Call
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Call Result</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Prospect Name</label>
                  <Input
                    value={logForm.prospectName}
                    onChange={e => setLogForm(f => ({ ...f, prospectName: e.target.value }))}
                    placeholder="Prospect name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Outcome</label>
                  <Select
                    value={logForm.outcome}
                    onValueChange={(v: CallOutcome | null) => { if (v) setLogForm(f => ({ ...f, outcome: v })); }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_answer">No Answer</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="demo_booked">Demo Booked</SelectItem>
                      <SelectItem value="closed_won">Closed Won 🎉</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Notes</label>
                  <Textarea
                    value={logForm.notes}
                    onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Call notes..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSaveLog}
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                >
                  {saved ? '✓ Saved!' : 'Save Call Log'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* RIGHT COLUMN — AI Coaching Panel */}
        <div className="space-y-4">
          {/* Quick Reference */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_REFERENCE.map((item) => (
                  <div key={item.label} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                    <span className="text-base">{item.icon}</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-600">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Objection Buttons */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Objection Handler</CardTitle>
              <p className="text-xs text-slate-500">Click when prospect raises an objection — AI responds instantly</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {OBJECTIONS.map((obj) => {
                  const isLoading = loadingObjection === obj.text;
                  return (
                    <Button
                      key={obj.text}
                      variant="outline"
                      className={`h-auto py-3 px-3 flex flex-col items-start gap-1 text-left border-2 transition-colors ${
                        activeObjection === obj.label && !isLoading
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => handleObjection(obj)}
                      disabled={loadingObjection !== null}
                    >
                      <span className="text-lg">{obj.emoji}</span>
                      <span className="text-xs font-medium text-slate-700 leading-tight">
                        {isLoading ? 'Getting response...' : obj.label}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* AI Response */}
          {(objectionResponse || loadingObjection) && (
            <div ref={responseRef}>
              <Card className="rounded-xl shadow-sm border-2 border-emerald-400">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-emerald-700">
                      💬 Response for: {activeObjection}
                    </CardTitle>
                    {objectionResponse && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => copyToClipboard(objectionResponse)}
                      >
                        📋 Copy
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingObjection ? (
                    <div className="flex items-center gap-2 text-slate-500">
                      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Generating response...</span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed">{objectionResponse}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}>
      <CoachContent />
    </Suspense>
  );
}
