'use client';

import { useState, useEffect } from 'react';
import {
  Settings, User, Phone, Key, Download, Upload, Trash2,
  Copy, Check, RefreshCw, Plus, X, Eye, EyeOff, Save
} from 'lucide-react';
import {
  getSettings, saveSettings, getAgentToken, generateAgentToken,
  exportAllData, importAllData, clearAllData, AppSettings
} from '@/lib/storage';
import { CALL_SCRIPT_STEPS, OBJECTIONS } from '@/lib/surety-content';

const SECTIONS = ['Personalization', 'Call Script', 'Objections', 'Agent API', 'Data Management'];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('Personalization');
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
  const [saved, setSaved] = useState(false);
  const [newObjection, setNewObjection] = useState({ emoji: '❓', label: '', text: '' });
  const [showObjForm, setShowObjForm] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  useEffect(() => {
    setSettings(getSettings());
    setToken(getAgentToken() || generateAgentToken());
  }, []);

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function copyToken() {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function regenerateToken() {
    const newToken = generateAgentToken();
    setToken(newToken);
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Customize your Surety HQ experience</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="hidden md:block w-44 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map(s => (
              <button
                key={s}
                onClick={() => setActiveSection(s)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg font-medium transition-colors ${
                  activeSection === s ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6">
          {/* Personalization */}
          {activeSection === 'Personalization' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-slate-900">Personalization</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Business Name</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={settings.businessName}
                    onChange={e => setSettings({ ...settings, businessName: e.target.value })}
                    placeholder="Surety HQ"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Your Name (Rep Name)</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={settings.repName}
                    onChange={e => setSettings({ ...settings, repName: e.target.value })}
                    placeholder="Garv"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Your Phone (for SMS signature)</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                    value={settings.phone}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="(206) 555-0142"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Call Script Editor */}
          {activeSection === 'Call Script' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-5">Call Script Editor</h2>
              <p className="text-xs text-gray-500 mb-4">
                Edit each step of your call script. Leave empty to use the default.
              </p>
              <div className="space-y-4">
                {CALL_SCRIPT_STEPS.map(step => {
                  const customStep = settings.customCallScript?.find(s => s.step === step.step);
                  return (
                    <div key={step.step}>
                      <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                        Step {step.step}: {step.title}
                        {step.duration && <span className="ml-2 text-gray-400 font-normal">({step.duration})</span>}
                      </label>
                      <textarea
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 resize-none"
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
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold text-slate-900">Objections</h2>
                <button
                  onClick={() => setShowObjForm(true)}
                  className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-3 py-2 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />Add Custom
                </button>
              </div>

              {showObjForm && (
                <div className="mb-4 bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex gap-2">
                    <input
                      className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-center text-lg focus:outline-none focus:border-emerald-400"
                      placeholder="😤"
                      value={newObjection.emoji}
                      onChange={e => setNewObjection({ ...newObjection, emoji: e.target.value })}
                      maxLength={2}
                    />
                    <input
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
                      placeholder="Objection label (e.g. I already have software)"
                      value={newObjection.label}
                      onChange={e => setNewObjection({ ...newObjection, label: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addObjection} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 text-xs font-semibold transition-colors">Add</button>
                    <button onClick={() => setShowObjForm(false)} className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg py-2 text-xs font-semibold transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Default Objections</p>
                {OBJECTIONS.map(obj => (
                  <div key={obj.text} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="text-base">{obj.emoji}</span>
                    <span className="text-sm text-slate-700 flex-1">{obj.label}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">default</span>
                  </div>
                ))}

                {(settings.customObjections || []).length > 0 && (
                  <>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 mt-4">Custom Objections</p>
                    {settings.customObjections?.map((obj, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="text-base">{obj.emoji}</span>
                        <span className="text-sm text-slate-700 flex-1">{obj.label}</span>
                        <button onClick={() => removeObjection(i)} className="text-gray-400 hover:text-red-500 transition-colors">
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
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Key className="w-4 h-4 text-gray-500" />
                <h2 className="text-sm font-semibold text-slate-900">Agent API</h2>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Use this token to authenticate with the /api/agents/* endpoints.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <label className="text-xs font-medium text-gray-700 mb-2 block">API Token</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-slate-700 bg-white border border-gray-200 rounded-lg px-3 py-2 overflow-hidden">
                    {showToken ? token : `${token.slice(0, 8)}${'•'.repeat(20)}`}
                  </code>
                  <button onClick={() => setShowToken(!showToken)} className="text-gray-400 hover:text-gray-600 p-2">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={copyToken} className="text-gray-400 hover:text-emerald-600 p-2 transition-colors">
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                onClick={regenerateToken}
                className="flex items-center gap-2 text-sm border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-lg px-4 py-2.5 font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />Regenerate Token
              </button>

              <div className="mt-5 pt-5 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Available Endpoints</p>
                <div className="space-y-2">
                  {[
                    'GET /api/agents/prospects',
                    'POST /api/agents/prospects',
                    'POST /api/agents/call-log',
                    'GET /api/agents/stats',
                  ].map(ep => (
                    <code key={ep} className="block text-xs font-mono text-slate-600 bg-gray-50 px-3 py-2 rounded-lg">{ep}</code>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Use header: <code className="bg-gray-100 px-1 py-0.5 rounded">Authorization: Bearer {'{token}'}</code>
                </p>
              </div>
            </div>
          )}

          {/* Data Management */}
          {activeSection === 'Data Management' && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-5">Data Management</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Export All Data</p>
                    <p className="text-xs text-gray-400 mt-0.5">Download all prospects, logs, campaigns as JSON</p>
                  </div>
                  <button onClick={exportData}
                    className="flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-800 text-white rounded-lg px-3 py-2 font-medium transition-colors">
                    <Download className="w-3.5 h-3.5" />Export
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Import Data</p>
                    <p className="text-xs text-gray-400 mt-0.5">Restore from a JSON backup file</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs border border-gray-200 hover:bg-white text-slate-700 rounded-lg px-3 py-2 font-medium transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />Import
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                  </label>
                </div>

                {importMsg && (
                  <p className={`text-xs font-medium px-3 py-2 rounded-lg ${importMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {importMsg}
                  </p>
                )}

                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <p className="text-sm font-medium text-red-700">Clear All Data</p>
                    <p className="text-xs text-red-400 mt-0.5">Permanently delete all prospects, logs, settings</p>
                  </div>
                  {!confirmClear ? (
                    <button onClick={() => setConfirmClear(true)}
                      className="flex items-center gap-2 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-2 font-medium transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />Clear
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={handleClearAll} className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-2 font-medium transition-colors">
                        Confirm Delete
                      </button>
                      <button onClick={() => setConfirmClear(false)} className="text-xs border border-gray-200 hover:bg-white text-gray-600 rounded-lg px-3 py-2 font-medium transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
