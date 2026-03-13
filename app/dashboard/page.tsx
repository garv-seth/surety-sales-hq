'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getProspects, addProspect, updateProspect, deleteProspect, getCallsToday, incrementCallsToday, Prospect, BusinessStage } from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';
import { useRouter } from 'next/navigation';

const STAGES: { key: BusinessStage; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: 'bg-slate-100 text-slate-700' },
  { key: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { key: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-amber-100 text-amber-700' },
  { key: 'negotiating', label: 'Negotiating', color: 'bg-orange-100 text-orange-700' },
  { key: 'closed_won', label: 'Closed Won', color: 'bg-emerald-100 text-emerald-700' },
];

function AddProspectDialog({ defaultStage, onAdd }: { defaultStage: BusinessStage; onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ businessName: '', ownerName: '', phone: '', businessType: 'Plumber', notes: '' });

  const handleSubmit = () => {
    if (!form.businessName || !form.ownerName || !form.phone) return;
    addProspect({ ...form, stage: defaultStage, lastContact: new Date().toISOString().split('T')[0] });
    setForm({ businessName: '', ownerName: '', phone: '', businessType: 'Plumber', notes: '' });
    setOpen(false);
    onAdd();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="w-full mt-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 rounded-md transition-colors">
        + Add Prospect
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Prospect</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Business Name *" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
          <Input placeholder="Owner Name *" value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} />
          <Input placeholder="Phone *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Select value={form.businessType} onValueChange={v => { if (v) setForm(f => ({ ...f, businessType: v })); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BUSINESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          <Button onClick={handleSubmit} className="w-full bg-emerald-500 hover:bg-emerald-600">Add Prospect</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [callsToday, setCallsToday] = useState(0);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const router = useRouter();

  const refresh = () => {
    setProspects(getProspects());
    setCallsToday(getCallsToday());
  };

  useEffect(() => { refresh(); }, []);

  const byStage = (stage: BusinessStage) => prospects.filter(p => p.stage === stage);
  const demoCount = byStage('demo_scheduled').length;
  const closedCount = byStage('closed_won').length;

  const handleDrop = (stage: BusinessStage) => {
    if (!draggedId) return;
    updateProspect(draggedId, { stage });
    setDraggedId(null);
    refresh();
  };

  const moveNext = (prospect: Prospect) => {
    const idx = STAGES.findIndex(s => s.key === prospect.stage);
    if (idx < STAGES.length - 1) {
      updateProspect(prospect.id, { stage: STAGES[idx + 1].key, lastContact: new Date().toISOString().split('T')[0] });
      refresh();
    }
  };

  const stageColor = (stage: BusinessStage) => STAGES.find(s => s.key === stage)?.color || '';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Pipeline</h1>
        <p className="text-slate-500 mt-1">Drag cards between columns to update stages</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500 mb-1">Calls Made Today</div>
            <div className="text-4xl font-bold text-slate-900">{callsToday}</div>
            <Button
              size="sm"
              className="mt-3 bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => { incrementCallsToday(); refresh(); }}
            >
              +1 Call
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500 mb-1">Demos Scheduled</div>
            <div className="text-4xl font-bold text-amber-500">{demoCount}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500 mb-1">Deals Closed</div>
            <div className="text-4xl font-bold text-emerald-500">{closedCount}</div>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-sm text-slate-500 mb-1">Pipeline Value</div>
            <div className="text-4xl font-bold text-slate-900">${(closedCount * 49).toLocaleString()}</div>
            <div className="text-xs text-slate-400 mt-1">MRR at $49/mo</div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4">
        {STAGES.map((stage) => (
          <div
            key={stage.key}
            className="min-h-96"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(stage.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700 text-sm">{stage.label}</h3>
              <Badge variant="secondary" className="text-xs">{byStage(stage.key).length}</Badge>
            </div>

            <div className="space-y-2">
              {byStage(stage.key).map(prospect => (
                <Card
                  key={prospect.id}
                  draggable
                  onDragStart={() => setDraggedId(prospect.id)}
                  className="rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-3">
                    <div className="font-semibold text-slate-800 text-sm truncate">{prospect.businessName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{prospect.ownerName}</div>
                    <div className="text-xs text-slate-500">{prospect.phone}</div>
                    <Badge className={`mt-2 text-xs ${stageColor(prospect.stage)}`}>{prospect.businessType}</Badge>
                    {prospect.lastContact && (
                      <div className="text-xs text-slate-400 mt-1">{prospect.lastContact}</div>
                    )}
                    <div className="flex gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => router.push(`/coach?prospect=${encodeURIComponent(prospect.ownerName)}&phone=${encodeURIComponent(prospect.phone)}`)}
                      >
                        📞
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 text-slate-600 hover:bg-slate-50"
                        onClick={() => moveNext(prospect)}
                      >
                        Move ▶
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2 text-red-400 hover:bg-red-50"
                        onClick={() => { deleteProspect(prospect.id); refresh(); }}
                      >
                        ✕
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <AddProspectDialog defaultStage={stage.key} onAdd={refresh} />
          </div>
        ))}
      </div>
    </div>
  );
}
