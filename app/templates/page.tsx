'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Plus, Trash2, FileText, MessageSquare, Mail, Phone, Save, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
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
      aria-label={copied ? 'Copied to clipboard' : 'Copy template'}
      data-action="copy-template"
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
  searchQuery,
}: {
  title: string;
  content: string;
  tag?: string;
  onDelete?: () => void;
  isCustom?: boolean;
  searchQuery?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = content.length > 140 ? content.slice(0, 140) + '…' : content;

  // Highlight search matches
  const matchesSearch = !searchQuery ||
    title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tag && tag.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!matchesSearch) return null;

  return (
    <div
      className="glass-card rounded-2xl p-4 transition-all hover:shadow-md"
      data-entity="template"
      data-template-type={isCustom ? 'custom' : 'default'}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <h3 className="text-sm font-semibold text-gray-800 truncate">{title}</h3>
          {tag && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
              {tag}
            </span>
          )}
          {isCustom && (
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
              custom
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <CopyButton text={content} />
          {onDelete && (
            <button
              onClick={onDelete}
              aria-label={`Delete template: ${title}`}
              data-action="delete-template"
              className="text-gray-300 hover:text-red-500 transition-colors p-0.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
          {expanded ? content : preview}
        </p>
      </div>

      {content.length > 140 && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Show less' : 'Show more'}
          data-action="toggle-template-expand"
          className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-3 h-3" /> Show less</>
          ) : (
            <><ChevronDown className="w-3 h-3" /> Show more</>
          )}
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
    <div
      className="glass-card rounded-2xl p-5 mb-4 border border-emerald-200/60 bg-emerald-50/40"
      data-section="add-template-form"
    >
      <h4 className="text-sm font-bold text-emerald-800 mb-4">Add Custom Template</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="template-title" className="text-xs font-semibold text-gray-700 mb-1.5 block">
              Title
            </label>
            <input
              id="template-title"
              data-field="template-title"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Template name"
              required
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="template-business-type" className="text-xs font-semibold text-gray-700 mb-1.5 block">
              Business Type
            </label>
            <select
              id="template-business-type"
              data-field="template-business-type"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white"
              value={form.businessType}
              onChange={e => setForm({ ...form, businessType: e.target.value })}
              aria-label="Filter by business type"
            >
              <option value="All">All Types</option>
              {BUSINESS_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="template-content" className="text-xs font-semibold text-gray-700 mb-1.5 block">
            Content
          </label>
          <textarea
            id="template-content"
            data-field="template-content"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none bg-white"
            rows={4}
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="Template content..."
            required
            aria-required="true"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            data-action="save-template"
            aria-label="Save custom template"
            className="btn-glow flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save Template
          </button>
          <button
            type="button"
            onClick={onCancel}
            data-action="cancel-add-template"
            aria-label="Cancel adding template"
            className="px-5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl py-2.5 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
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
  const [searchQuery, setSearchQuery] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setCustomTemplates(getCustomTemplates());
  }, [tick]);

  function refresh() { setTick(t => t + 1); }

  const currentCustom = customTemplates.filter(t => t.type === activeTab);

  return (
    <main data-page="templates" role="main" className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Ready-to-use scripts and messages</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          data-action="add-template"
          aria-label="Add custom template"
          aria-expanded={showAddForm}
          className="btn-glow flex items-center gap-1.5 text-sm bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Template</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          data-field="search"
          aria-label="Search templates"
          placeholder="Search templates..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tabs — full width on mobile */}
      <div
        className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-5 overflow-x-auto"
        role="tablist"
        aria-label="Template categories"
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`tabpanel-${tab.key}`}
              onClick={() => { setActiveTab(tab.key); setShowAddForm(false); }}
              data-action="select-tab"
              data-tab={tab.key}
              className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl font-semibold transition-all flex-shrink-0 ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
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

      {/* Template lists */}
      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-label={`${TABS.find(t => t.key === activeTab)?.label} templates`}
        className="space-y-3"
      >
        {/* Custom templates first */}
        {currentCustom.length > 0 && (
          <div className="space-y-3" data-section="custom-templates">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">Your Templates</p>
            {currentCustom.map(t => (
              <TemplateCard
                key={t.id}
                title={t.title}
                content={t.content}
                tag={t.businessType !== 'All' ? t.businessType : undefined}
                isCustom
                searchQuery={searchQuery}
                onDelete={() => { deleteCustomTemplate(t.id); refresh(); }}
              />
            ))}
          </div>
        )}

        {/* Default templates */}
        <div data-section="default-templates">
          {currentCustom.length > 0 && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 mb-3">Default Templates</p>
          )}

          {activeTab === 'cold_call' && (
            <div className="space-y-3">
              {Object.entries(COLD_CALL_SCRIPTS).map(([key, { title, script }]) => (
                <TemplateCard
                  key={key}
                  title={`Cold Call: ${title}`}
                  content={script}
                  tag={title}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}

          {activeTab === 'sms' && (
            <div className="space-y-3">
              {COLD_TEXT_TEMPLATES.map((t, i) => (
                <TemplateCard
                  key={i}
                  title={`SMS: ${t.type}`}
                  content={t.text}
                  tag={t.type}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-3">
              <div
                className="glass-card rounded-2xl p-4"
                data-entity="template"
                data-template-type="default"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Cold Email</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Subject: {COLD_EMAIL.subject}</p>
                  </div>
                  <CopyButton text={`Subject: ${COLD_EMAIL.subject}\n\n${COLD_EMAIL.body}`} />
                </div>
                <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-bold mb-2 uppercase tracking-wide">
                    Subject: {COLD_EMAIL.subject}
                  </p>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">
                    {COLD_EMAIL.body}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'follow_up' && (
            <div className="space-y-3">
              {FOLLOW_UP_SCRIPTS.map((s, i) => (
                <TemplateCard
                  key={i}
                  title={s.title}
                  content={s.script}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}
        </div>

        {/* Empty state when search has no results */}
        {searchQuery && activeTab === 'cold_call' && Object.keys(COLD_CALL_SCRIPTS).length === 0 && currentCustom.length === 0 && (
          <div className="text-center py-10 text-gray-400" data-state="empty">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No templates match &ldquo;{searchQuery}&rdquo;</p>
          </div>
        )}
      </div>
    </main>
  );
}
