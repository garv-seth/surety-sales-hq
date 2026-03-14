// lib/storage.ts
export type BusinessStage = 'new' | 'contacted' | 'demo_scheduled' | 'negotiating' | 'closed_won';

export interface Prospect {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  businessType: string;
  stage: BusinessStage;
  notes: string;
  lastContact: string;
  createdAt: string;
  campaignId?: string;
}

export interface CallLog {
  id: string;
  prospectName: string;
  outcome: 'no_answer' | 'not_interested' | 'follow_up' | 'demo_booked' | 'closed_won' | 'voicemail' | 'callback';
  notes: string;
  timestamp: string;
  date: string;
  businessType?: string;
}

export interface Campaign {
  id: string;
  name: string;
  businessType: string;
  targetCity: string;
  targetState: string;
  goal: number;
  status: 'in_progress' | 'paused' | 'completed';
  createdAt: string;
  startDate: string;
}

export interface AppSettings {
  businessName: string;
  repName: string;
  phone: string;
  customCallScript: Array<{ step: number; title: string; script: string }>;
  customObjections: Array<{ emoji: string; label: string; text: string }>;
  twilioSid?: string;
  twilioToken?: string;
  twilioPhone?: string;
}

// Storage Keys
const PROSPECTS_KEY = 'surety_prospects';
const CALL_LOGS_KEY = 'surety_call_logs';
const CALLS_TODAY_KEY = 'surety_calls_today';
const CALLS_TODAY_DATE_KEY = 'surety_calls_today_date';
const CAMPAIGNS_KEY = 'campaigns';
const SETTINGS_KEY = 'settings';
const AGENT_TOKEN_KEY = 'agent_token';
const CACHED_OBJECTIONS_KEY = 'cached_objections';
const DIALER_QUEUE_KEY = 'dialer_queue';
const CUSTOM_TEMPLATES_KEY = 'custom_templates';

// --- Prospects ---
export function getProspects(): Prospect[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PROSPECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveProspects(prospects: Prospect[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROSPECTS_KEY, JSON.stringify(prospects));
}

export function addProspect(prospect: Omit<Prospect, 'id' | 'createdAt'>): Prospect {
  const prospects = getProspects();
  const newProspect: Prospect = {
    ...prospect,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  prospects.push(newProspect);
  saveProspects(prospects);
  return newProspect;
}

export function updateProspect(id: string, updates: Partial<Prospect>): void {
  const prospects = getProspects();
  const idx = prospects.findIndex(p => p.id === id);
  if (idx !== -1) {
    prospects[idx] = { ...prospects[idx], ...updates };
    saveProspects(prospects);
  }
}

export function deleteProspect(id: string): void {
  const prospects = getProspects().filter(p => p.id !== id);
  saveProspects(prospects);
}

// --- Call Logs ---
export function getCallLogs(): CallLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(CALL_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addCallLog(log: Omit<CallLog, 'id' | 'timestamp' | 'date'>): CallLog {
  const logs = getCallLogs();
  const newLog: CallLog = {
    ...log,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
  };
  logs.push(newLog);
  localStorage.setItem(CALL_LOGS_KEY, JSON.stringify(logs));
  incrementCallsToday();
  return newLog;
}

// --- Calls Today ---
export function getCallsToday(): number {
  if (typeof window === 'undefined') return 0;
  const today = new Date().toISOString().split('T')[0];
  const storedDate = localStorage.getItem(CALLS_TODAY_DATE_KEY);
  if (storedDate !== today) {
    localStorage.setItem(CALLS_TODAY_DATE_KEY, today);
    localStorage.setItem(CALLS_TODAY_KEY, '0');
    return 0;
  }
  return parseInt(localStorage.getItem(CALLS_TODAY_KEY) || '0', 10);
}

export function incrementCallsToday(): number {
  if (typeof window === 'undefined') return 0;
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(CALLS_TODAY_DATE_KEY, today);
  const current = getCallsToday();
  const next = current + 1;
  localStorage.setItem(CALLS_TODAY_KEY, next.toString());
  return next;
}

// --- Campaigns ---
export function getCampaigns(): Campaign[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(CAMPAIGNS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveCampaigns(campaigns: Campaign[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(campaigns));
}

export function addCampaign(campaign: Omit<Campaign, 'id' | 'createdAt'>): Campaign {
  const campaigns = getCampaigns();
  const newCampaign: Campaign = {
    ...campaign,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  campaigns.push(newCampaign);
  saveCampaigns(campaigns);
  return newCampaign;
}

export function updateCampaign(id: string, updates: Partial<Campaign>): void {
  const campaigns = getCampaigns();
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx !== -1) {
    campaigns[idx] = { ...campaigns[idx], ...updates };
    saveCampaigns(campaigns);
  }
}

export function deleteCampaign(id: string): void {
  saveCampaigns(getCampaigns().filter(c => c.id !== id));
}

// --- Settings ---
const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'Surety HQ',
  repName: 'Garv',
  phone: '',
  customCallScript: [],
  customObjections: [],
};

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<AppSettings>): void {
  if (typeof window === 'undefined') return;
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
}

// --- Agent Token ---
export function getAgentToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(AGENT_TOKEN_KEY) || '';
}

export function generateAgentToken(): string {
  if (typeof window === 'undefined') return '';
  const token = crypto.randomUUID();
  localStorage.setItem(AGENT_TOKEN_KEY, token);
  return token;
}

// --- Cached Objections ---
export function getCachedObjections(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const data = localStorage.getItem(CACHED_OBJECTIONS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function setCachedObjection(objectionText: string, response: string): void {
  if (typeof window === 'undefined') return;
  const cache = getCachedObjections();
  cache[objectionText] = response;
  localStorage.setItem(CACHED_OBJECTIONS_KEY, JSON.stringify(cache));
}

// --- Dialer Queue ---
export function getDialerQueue(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(DIALER_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveDialerQueue(queue: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DIALER_QUEUE_KEY, JSON.stringify(queue));
}

// --- Custom Templates ---
export interface CustomTemplate {
  id: string;
  title: string;
  type: 'cold_call' | 'sms' | 'email' | 'follow_up';
  businessType: string;
  content: string;
  createdAt: string;
}

export function getCustomTemplates(): CustomTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addCustomTemplate(template: Omit<CustomTemplate, 'id' | 'createdAt'>): CustomTemplate {
  const templates = getCustomTemplates();
  const newTemplate: CustomTemplate = {
    ...template,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  templates.push(newTemplate);
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
  return newTemplate;
}

export function deleteCustomTemplate(id: string): void {
  const templates = getCustomTemplates().filter(t => t.id !== id);
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
}

// --- Export / Import ---
export function exportProspectsCSV(): string {
  const prospects = getProspects();
  const headers = ['Business Name', 'Owner Name', 'Phone', 'Business Type', 'Stage', 'Last Contact', 'Notes'];
  const rows = prospects.map(p => [
    p.businessName, p.ownerName, p.phone, p.businessType, p.stage, p.lastContact, p.notes
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function exportAllData(): string {
  const data = {
    prospects: getProspects(),
    callLogs: getCallLogs(),
    campaigns: getCampaigns(),
    settings: getSettings(),
    customTemplates: getCustomTemplates(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.prospects) saveProspects(data.prospects);
    if (data.campaigns) saveCampaigns(data.campaigns);
    if (data.settings) saveSettings(data.settings);
    if (data.customTemplates) localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(data.customTemplates));
    if (data.callLogs) localStorage.setItem(CALL_LOGS_KEY, JSON.stringify(data.callLogs));
    return true;
  } catch {
    return false;
  }
}

export function clearAllData(): void {
  if (typeof window === 'undefined') return;
  [PROSPECTS_KEY, CALL_LOGS_KEY, CALLS_TODAY_KEY, CALLS_TODAY_DATE_KEY,
   CAMPAIGNS_KEY, SETTINGS_KEY, CACHED_OBJECTIONS_KEY, DIALER_QUEUE_KEY,
   CUSTOM_TEMPLATES_KEY].forEach(key => localStorage.removeItem(key));
}
