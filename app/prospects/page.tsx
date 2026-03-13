'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProspects, addProspect, deleteProspect, exportProspectsCSV, Prospect, BusinessStage } from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';

const STAGE_LABELS: Record<BusinessStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  demo_scheduled: 'Demo Scheduled',
  negotiating: 'Negotiating',
  closed_won: 'Closed Won',
};

const STAGE_COLORS: Record<BusinessStage, string> = {
  new: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  demo_scheduled: 'bg-amber-100 text-amber-700',
  negotiating: 'bg-orange-100 text-orange-700',
  closed_won: 'bg-emerald-100 text-emerald-700',
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ businessName: '', ownerName: '', phone: '', businessType: 'Plumber', notes: '' });
  const router = useRouter();

  const refresh = () => setProspects(getProspects());
  useEffect(() => { refresh(); }, []);

  const handleAdd = () => {
    if (!form.businessName || !form.ownerName || !form.phone) return;
    addProspect({ ...form, stage: 'new', lastContact: new Date().toISOString().split('T')[0] });
    setForm({ businessName: '', ownerName: '', phone: '', businessType: 'Plumber', notes: '' });
    setShowAdd(false);
    refresh();
  };

  const handleBulkAdd = () => {
    const lines = bulkText.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        addProspect({
          businessName: parts[0] || '',
          ownerName: parts[1] || '',
          phone: parts[2] || '',
          businessType: parts[3] || 'Other',
          stage: 'new',
          notes: '',
          lastContact: new Date().toISOString().split('T')[0],
        });
      }
    });
    setBulkText('');
    setShowBulk(false);
    refresh();
  };

  const handleExport = () => {
    const csv = exportProspectsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'surety-prospects.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopied(phone);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Prospects</h1>
          <p className="text-slate-500 mt-1">{prospects.length} total prospects</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulk(!showBulk)}>Bulk Add</Button>
          <Button variant="outline" onClick={handleExport}>Export CSV</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => setShowAdd(!showAdd)}>
            + Add Prospect
          </Button>
        </div>
      </div>

      {showAdd && (
        <Card className="rounded-xl shadow-sm mb-6">
          <CardHeader><CardTitle className="text-base">Add New Prospect</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Business Name *" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} />
              <Input placeholder="Owner Name *" value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} />
              <Input placeholder="Phone *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <Select value={form.businessType} onValueChange={v => { if (v) setForm(f => ({ ...f, businessType: v })); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{BUSINESS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="col-span-2" rows={2} />
              <div className="col-span-2 flex gap-2">
                <Button onClick={handleAdd} className="bg-emerald-500 hover:bg-emerald-600">Save Prospect</Button>
                <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showBulk && (
        <Card className="rounded-xl shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-base">Bulk Add Prospects</CardTitle>
            <p className="text-xs text-slate-500">One per line: Business Name, Owner Name, Phone, Business Type</p>
          </CardHeader>
          <CardContent>
            <Textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={"ABC Plumbing, John Smith, 555-1234, Plumber\nXYZ HVAC, Jane Doe, 555-5678, HVAC"}
              rows={6}
              className="font-mono text-sm"
            />
            <div className="flex gap-2 mt-3">
              <Button onClick={handleBulkAdd} className="bg-emerald-500 hover:bg-emerald-600">Import All</Button>
              <Button variant="outline" onClick={() => setShowBulk(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl shadow-sm">
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left p-4 text-sm font-semibold text-slate-600">Business</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">Owner</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">Phone</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">Type</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">Stage</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">Last Contact</th>
                <th className="text-left p-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {prospects.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No prospects yet. Add your first one above!
                  </td>
                </tr>
              )}
              {prospects.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800">{p.businessName}</td>
                  <td className="p-4 text-slate-600">{p.ownerName}</td>
                  <td className="p-4">
                    <button
                      onClick={() => copyPhone(p.phone)}
                      className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                      title="Click to copy"
                    >
                      {copied === p.phone ? '✓ Copied!' : p.phone}
                    </button>
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className="text-xs">{p.businessType}</Badge>
                  </td>
                  <td className="p-4">
                    <Badge className={`text-xs ${STAGE_COLORS[p.stage]}`}>{STAGE_LABELS[p.stage]}</Badge>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{p.lastContact}</td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600"
                        onClick={() => router.push(`/coach?prospect=${encodeURIComponent(p.ownerName)}&phone=${encodeURIComponent(p.phone)}`)}
                      >
                        Coach
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-red-500 hover:bg-red-50"
                        onClick={() => { deleteProspect(p.id); refresh(); }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
