'use client';

import { useState, useEffect } from 'react';
import {
  Settings, User, Phone, Key, Download, Upload, Trash2,
  Copy, Check, RefreshCw, Plus, X, Eye, EyeOff, Save,
  ChevronRight, Moon, Sun, Database, Pencil, Terminal
} from 'lucide-react';
import {
  getSettings, saveSettings, getAgentToken, generateAgentToken,
  exportAllData, importAllData, clearAllData, AppSettings
} from '@/lib/storage';
import { CALL_SCRIPT_STEPS, OBJECTIONS } from '@/lib/surety-content';

const SECTIONS = [
  { key: 'Personalization', icon: User, desc: 'Name, phone, business info' },
  { key: 'Call Script', icon: Pencil, desc: 'Customize your script steps' },
  { key: 'Objections', icon: Terminal, desc: 'Add custom objection responses' },
  { key: 'Agent API', icon: Key, desc: 'Token and API endpoints' },
  { key: 'Data Management', icon: Database, desc: 'Export, import, or clear data' },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    businessName: 'Surety HQ',
    repName: 'Garv',
    phone: '',
    customCallScript: [],
    customObjections: [],
  });
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newObjection, setNewObjection] = useState({ emoji: '❓', label: '', text: '' });
  const [showObjForm, setShowObjForm] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
    setToken(getAgentToken() || generateAgentToken());
    const saved = localStorage.getItem('surety_theme');
    setDarkMode(saved === 'dark');
    // Default: desktop shows first section
    if (window.innerWidth >= 768) setActiveSection('Personalization');
  }, []);

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  }

  function regenerateToken() {
    const newToken = generateAgentToken();
    setToken(newToken);
  }

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('surety_theme', next ? 'dark' : 'light');
  }

  function exportData() {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surety-hq-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const success = importAllData(text);
      setImportMsg(success ? '✓ Data imported successfully' : '✗ Invalid file format');
      if (success) setSettings(getSettings());
      setTimeout(() => setImportMsg(''), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleClearAll() {
    clearAllData();
    setSettings({ businessName: 'Surety HQ', repName: 'Garv', phone: '', customCallScript: [], customObjections: [] });
    setConfirmClear(false);
  }

  function addObjection() {
    if (!newObjection.label) return;
    const updated = [...(settings.customObjections || []), {
      ...newObjection,
      text: newObjection.text || newObjection.label,
    }];
    setSettings({ ...settings, customObjections: updated });
    setNewObjection({ emoji: '❓', label: '', text: '' });
    setShowObjForm(false);
  }

  function removeObjection(i: number) {
    const updated = (settings.customObjections || []).filter((_, idx) => idx !== i);
    setSettings({ ...settings, customObjections: updated });
  }

  // Mobile: show section list when no section is active
  const isMobileList = activeSection === null;

  return (
    <main data-page="settings" role="main" className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Mobile: back button or title */}
        <div className="flex items-center gap-3">
          {activeSection && (
            <button
              onClick={() => setActiveSection(null)}
              aria-label="Back to settings menu"
              className="md:hidden w-8 h-8 glass-card rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {activeSection || 'Settings'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeSection
                ? SECTIONS.find(s => s.key === activeSection)?.desc
                : 'Customize your Surety HQ experience'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={darkMode}
            data-action="toggle-dark-mode"
            className="w-9 h-9 glass-card rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Save button — only when section is open */}
          {activeSection && ['Personalization', 'Call Script', 'Objections'].includes(activeSection) && (
            <button
              onClick={handleSave}
              data-action="save-settings"
              aria-label={saved ? 'Settings saved' : 'Save settings changes'}
              className="btn-glow flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4 py-2.5 text-sm font-bold transition-all"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span className="hidden sm:inline">{saved ? 'Saved!' : 'Save'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar — desktop always visible; mobile visible when no section active */}
        <div className={`${isMobileList ? 'block' : 'hidden'} md:block w-full md:w-48 flex-shrink-0`}>
          <nav
            className="space-y-1"
            role="navigation"
            aria-label="Settings sections"
          >
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  aria-current={activeSection === s.key ? 'page' : undefined}
                  data-action="navigate-section"
                  data-section={s.key}
                  className={`w-full text-left px-3 py-3 rounded-xl font-medium transition-all flex items-center justify-between group ${
                    activeSection === s.key
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${activeSection === s.key ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm leading-tight">{s.key}</p>
                      <p className="text-[10px] text-gray-400 font-normal md:hidden">{s.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-300 md:hidden ${activeSection === s.key ? 'text-emerald-400' : ''}`} />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content — hidden on mobile when showing section list */}
        {activeSection && (
          <div className="flex-1 space-y-5 min-w-0">

            {/* Personalization */}
            {activeSection === 'Personalization' && (
              <div className="glass-card rounded-2xl p-5" data-section="personalization">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-800">Personalization</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="setting-business-name" className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      Business Name
                    </label>
                    <input
                      id="setting-business-name"
                      data-field="business-name"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      value={settings.businessName}
                      onChange={e => setSettings({ ...settings, businessName: e.target.value })}
                      placeholder="Surety HQ"
                      aria-label="Business name"
                    />
                  </div>
                  <div>
                    <label htmlFor="setting-rep-name" className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      Your Name (Rep Name)
                    </label>
                    <input
                      id="setting-rep-name"
                      data-field="rep-name"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      value={settings.repName}
                      onChange={e => setSettings({ ...settings, repName: e.target.value })}
                      placeholder="Garv"
                      aria-label="Sales rep name"
                    />
                  </div>
                  <div>
                    <label htmlFor="setting-phone" className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      Your Phone (for SMS signature)
                    </label>
                    <input
                      id="setting-phone"
                      data-field="phone"
                      type="tel"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      value={settings.phone}
                      onChange={e => setSettings({ ...settings, phone: e.target.value })}
                      placeholder="(206) 555-0142"
                      aria-label="Phone number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Call Script Editor */}
            {activeSection === 'Call Script' && (
              <div className="glass-card rounded-2xl p-5" data-section="call-script-editor">
                <h2 className="text-sm font-bold text-gray-800 mb-1">Call Script Editor</h2>
                <p className="text-xs text-gray-500 mb-5">
                  Edit each step of your call script. Leave empty to use the default script.
                </p>
                <div className="space-y-5">
                  {CALL_SCRIPT_STEPS.map(step => {
                    const customStep = settings.customCallScript?.find(s => s.step === step.step);
                    return (
                      <div key={step.step} data-step={step.step}>
                        <label
                          htmlFor={`script-step-${step.step}`}
                          className="text-xs font-bold text-gray-700 mb-2 block"
                        >
                          Step {step.step}: {step.title}
                          {step.duration && (
                            <span className="ml-2 text-gray-400 font-normal">({step.duration})</span>
                          )}
                        </label>
                        <textarea
                          id={`script-step-${step.step}`}
                          data-field={`script-step-${step.step}`}
                          aria-label={`Script for step ${step.step}: ${step.title}`}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
                          rows={3}
                          placeholder={step.script}
                          value={customStep?.script || ''}
                          onChange={e => {
                            const updated = [...(settings.customCallScript || []).filter(s => s.step !== step.step)];
                            if (e.target.value) updated.push({ step: step.step, title: step.title, script: e.target.value });
                            setSettings({ ...settings, customCallScript: updated });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Objections */}
            {activeSection === 'Objections' && (
              <div className="glass-card rounded-2xl p-5" data-section="objections-settings">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-bold text-gray-800">Objection Responses</h2>
                  <button
                    onClick={() => setShowObjForm(true)}
                    data-action="add-objection"
                    aria-label="Add custom objection"
                    className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-3 py-2 font-bold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Custom
                  </button>
                </div>

                {showObjForm && (
                  <div className="mb-4 glass-card rounded-xl p-4 space-y-3 border border-emerald-200/60 bg-emerald-50/40" data-section="add-objection-form">
                    <div className="flex gap-2">
                      <input
                        data-field="objection-emoji"
                        aria-label="Objection emoji"
                        className="w-16 border border-gray-200 rounded-xl px-2 py-2.5 text-center text-lg focus:outline-none focus:border-emerald-400"
                        placeholder="😤"
                        value={newObjection.emoji}
                        onChange={e => setNewObjection({ ...newObjection, emoji: e.target.value })}
                        maxLength={2}
                      />
                      <input
                        data-field="objection-label"
                        aria-label="Objection label"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                        placeholder="e.g. I already have software"
                        value={newObjection.label}
                        onChange={e => setNewObjection({ ...newObjection, label: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addObjection}
                        data-action="save-objection"
                        aria-label="Save custom objection"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-bold transition-all"
                      >
                        Save Objection
                      </button>
                      <button
                        onClick={() => setShowObjForm(false)}
                        data-action="cancel-objection"
                        aria-label="Cancel"
                        className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl py-2.5 text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Default Objections
                  </p>
                  {OBJECTIONS.map(obj => (
                    <div
                      key={obj.text}
                      className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl"
                    >
                      <span className="text-base">{obj.emoji}</span>
                      <span className="text-sm text-gray-700 flex-1">{obj.label}</span>
                      <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded-full font-semibold">
                        default
                      </span>
                    </div>
                  ))}

                  {(settings.customObjections || []).length > 0 && (
                    <>
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 mt-4">
                        Custom Objections
                      </p>
                      {settings.customObjections?.map((obj, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200/60 rounded-xl"
                        >
                          <span className="text-base">{obj.emoji}</span>
                          <span className="text-sm text-gray-700 flex-1">{obj.label}</span>
                          <button
                            onClick={() => removeObjection(i)}
                            aria-label={`Remove objection: ${obj.label}`}
                            data-action="remove-objection"
                            className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Agent API */}
            {activeSection === 'Agent API' && (
              <div className="glass-card rounded-2xl p-5" data-section="agent-api-settings">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Key className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">Agent API</h2>
                    <p className="text-xs text-gray-500">For Claude CoWork automation</p>
                  </div>
                </div>

                {/* Token */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                  <label className="text-xs font-bold text-gray-600 mb-2 block">API Token</label>
                  <div className="flex items-center gap-2">
                    <code
                      className="flex-1 text-xs font-mono text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2.5 overflow-hidden"
                      aria-label="API token"
                    >
                      {showToken ? token : `${token.slice(0, 8)}${'•'.repeat(20)}`}
                    </code>
                    <button
                      onClick={() => setShowToken(!showToken)}
                      aria-label={showToken ? 'Hide token' : 'Show token'}
                      data-action="toggle-token-visibility"
                      className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={copyToken}
                      aria-label={tokenCopied ? 'Token copied' : 'Copy token'}
                      data-action="copy-token"
                      className="w-9 h-9 border border-gray-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      {tokenCopied
                        ? <Check className="w-4 h-4 text-emerald-500" />
                        : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={regenerateToken}
                  data-action="regenerate-token"
                  aria-label="Regenerate API token"
                  className="flex items-center gap-2 text-sm border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl px-4 py-2.5 font-semibold transition-colors mb-5"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Token
                </button>

                {/* Endpoints */}
                <div className="border-t border-gray-100 pt-5">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Available Endpoints
                  </p>
                  <div className="space-y-2 mb-4">
                    {[
                      { method: 'GET', path: '/api/agents/stats', desc: 'Calls today, demos, pipeline MRR' },
                      { method: 'GET', path: '/api/agents/prospects', desc: 'List all prospects' },
                      { method: 'POST', path: '/api/agents/prospects', desc: 'Create a new prospect' },
                      { method: 'POST', path: '/api/agents/call-log', desc: 'Log a call outcome' },
                      { method: 'GET', path: '/api/agents/queue', desc: 'Get dialer queue' },
                      { method: 'POST', path: '/api/agents/queue', desc: 'Set dialer queue order' },
                    ].map(ep => (
                      <div key={ep.path} className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${
                          ep.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {ep.method}
                        </span>
                        <div className="min-w-0">
                          <code className="text-xs font-mono text-gray-700">{ep.path}</code>
                          <p className="text-[11px] text-gray-400 mt-0.5">{ep.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* curl example */}
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Example Request
                  </p>
                  <div className="bg-gray-900 rounded-xl p-3 overflow-x-auto">
                    <pre className="text-xs font-mono text-green-400 whitespace-pre">{`curl -X GET \\
  https://your-app.vercel.app/api/agents/stats \\
  -H "Authorization: Bearer ${token.slice(0, 12)}..."
`}</pre>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Add header:{' '}
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                      Authorization: Bearer {'{'+'token'+'}'}
                    </code>
                  </p>
                </div>
              </div>
            )}

            {/* Data Management */}
            {activeSection === 'Data Management' && (
              <div className="glass-card rounded-2xl p-5" data-section="data-management">
                <h2 className="text-sm font-bold text-gray-800 mb-5">Data Management</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Export All Data</p>
                      <p className="text-xs text-gray-400 mt-0.5">Download prospects, logs, campaigns as JSON</p>
                    </div>
                    <button
                      onClick={exportData}
                      data-action="export-data"
                      aria-label="Export all data as JSON"
                      className="flex items-center gap-2 text-xs bg-gray-800 hover:bg-gray-900 text-white rounded-xl px-3 py-2 font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Import Data</p>
                      <p className="text-xs text-gray-400 mt-0.5">Restore from a JSON backup file</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs border border-gray-200 hover:bg-white text-gray-700 rounded-xl px-3 py-2 font-semibold transition-colors cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Import
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImport}
                        aria-label="Select JSON file to import"
                        data-field="import-file"
                      />
                    </label>
                  </div>

                  {importMsg && (
                    <p
                      className={`text-xs font-semibold px-4 py-3 rounded-xl ${
                        importMsg.startsWith('✓')
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-red-50 text-red-700 border border-red-200/60'
                      }`}
                      role="status"
                      aria-live="polite"
                    >
                      {importMsg}
                    </p>
                  )}

                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                    <div>
                      <p className="text-sm font-semibold text-red-700">Clear All Data</p>
                      <p className="text-xs text-red-400 mt-0.5">Permanently delete all prospects, logs, and settings</p>
                    </div>
                    {!confirmClear ? (
                      <button
                        onClick={() => setConfirmClear(true)}
                        data-action="clear-data-prompt"
                        aria-label="Clear all data (will ask for confirmation)"
                        className="flex items-center gap-2 text-xs bg-red-500 hover:bg-red-600 text-white rounded-xl px-3 py-2 font-semibold transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleClearAll}
                          data-action="confirm-clear-data"
                          aria-label="Confirm delete all data"
                          className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-xl px-3 py-2 font-bold transition-colors"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setConfirmClear(false)}
                          data-action="cancel-clear-data"
                          aria-label="Cancel data deletion"
                          className="text-xs border border-gray-200 hover:bg-white text-gray-600 rounded-xl px-3 py-2 font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
