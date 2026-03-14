'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Plus, Trash2, FileText, MessageSquare, Mail, Phone, Edit3, Save, X } from 'lucide-react';
import {
  COLD_CALL_SCRIPTS, COLD_TEXT_TEMPLATES, COLD_EMAIL, FOLLOW_UP_SCRIPTS
} from '@/lib/surety-content';
import {
  getCustomTemplates, addCustomTemplate, deleteCustomTemplate, CustomTemplate
} from '@/lib/storage';
import { BUSINESS_TYPES } from '@/lib/surety-content';

const TABS = [
  { key: 'cold_call', label: 'Cold Call', icon: Phone },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'follow_up', label: 'Follow-Up', icon: FileText },
];

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${className || 'text-gray-400 hover:text-gray-700'}`}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function TemplateCard({
  title,
  content,
  tag,
  onDelete,
  isCustom,
}: {
  title: string;
  content: string;
  tag?: string;
  onDelete?: () => void;
  isCustom?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = content.length > 120 ? content.slice(0, 120) + '...' : content;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-gray-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
          {tag && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">{tag}</span>}
          {isCustom && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">custom</span>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <CopyButton text={content} />
          {onDelete && (
            <button onClick={onDelete} className="text-gray-300 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
          {expanded ? content : preview}
        </p>
      </div>
      {content.length > 120 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function AddTemplateForm({
  tabKey,
  onAdd,
  onCancel,
}: {
  tabKey: string;
  onAdd: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    businessType: 'All',
    content: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.content) return;
    addCustomTemplate({
      title: form.title,
      type: tabKey as CustomTemplate['type'],
      businessType: form.businessType,
      content: form.content,
    });
    onAdd();
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
      <h4 className="text-sm font-semibold text-emerald-800 mb-3">Add Custom Template</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Title</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Template name" required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Business Type</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 bg-white"
              value={form.businessType}
              onChange={e => setForm({ ...form, businessType: e.target.value })}
            >
              <option value="All">All Types</option>
              {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">Content</label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400 resize-none"
            rows={4}
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="Template content..." required
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
            <Save className="w-3 h-3" />Save Template
          </button>
          <button type="button" onClick={onCancel} className="px-4 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg py-2 text-xs font-semibold transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState('cold_call');
  const [showAddForm, setShowAddForm] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setCustomTemplates(getCustomTemplates());
  }, [tick]);

  function refresh() { setTick(t => t + 1); }

  const currentCustom = customTemplates.filter(t => t.type === activeTab);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ready-to-use scripts and messages</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2.5 font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Template
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setShowAddForm(false); }}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <AddTemplateForm
          tabKey={activeTab}
          onAdd={() => { refresh(); setShowAddForm(false); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Cold Call Templates */}
      {activeTab === 'cold_call' && (
        <div className="space-y-4">
          {currentCustom.map(t => (
            <TemplateCard key={t.id} title={t.title} content={t.content} tag={t.businessType !== 'All' ? t.businessType : undefined}
              isCustom onDelete={() => { deleteCustomTemplate(t.id); refresh(); }} />
          ))}
          {Object.entries(COLD_CALL_SCRIPTS).map(([key, { title, script }]) => (
            <TemplateCard key={key} title={`Cold Call: ${title}`} content={script} tag={title} />
          ))}
        </div>
      )}

      {/* SMS Templates */}
      {activeTab === 'sms' && (
        <div className="space-y-4">
          {currentCustom.map(t => (
            <TemplateCard key={t.id} title={t.title} content={t.content} tag={t.businessType !== 'All' ? t.businessType : undefined}
              isCustom onDelete={() => { deleteCustomTemplate(t.id); refresh(); }} />
          ))}
          {COLD_TEXT_TEMPLATES.map((t, i) => (
            <TemplateCard key={i} title={`SMS: ${t.type}`} content={t.text} tag={t.type} />
          ))}
        </div>
      )}

      {/* Email Templates */}
      {activeTab === 'email' && (
        <div className="space-y-4">
          {currentCustom.map(t => (
            <TemplateCard key={t.id} title={t.title} content={t.content} tag={t.businessType !== 'All' ? t.businessType : undefined}
              isCustom onDelete={() => { deleteCustomTemplate(t.id); refresh(); }} />
          ))}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Cold Email</h3>
                <p className="text-xs text-gray-500 mt-0.5">Subject: {COLD_EMAIL.subject}</p>
              </div>
              <div className="flex gap-2">
                <CopyButton text={`Subject: ${COLD_EMAIL.subject}\n\n${COLD_EMAIL.body}`} />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 font-medium mb-2 uppercase">Subject: {COLD_EMAIL.subject}</p>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{COLD_EMAIL.body}</p>
            </div>
          </div>
        </div>
      )}

      {/* Follow-Up Templates */}
      {activeTab === 'follow_up' && (
        <div className="space-y-4">
          {currentCustom.map(t => (
            <TemplateCard key={t.id} title={t.title} content={t.content} tag={t.businessType !== 'All' ? t.businessType : undefined}
              isCustom onDelete={() => { deleteCustomTemplate(t.id); refresh(); }} />
          ))}
          {FOLLOW_UP_SCRIPTS.map((s, i) => (
            <TemplateCard key={i} title={s.title} content={s.script} />
          ))}
        </div>
      )}
    </div>
  );
}
