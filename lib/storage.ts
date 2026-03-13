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
}

export interface CallLog {
  id: string;
  prospectName: string;
  outcome: 'no_answer' | 'not_interested' | 'follow_up' | 'demo_booked' | 'closed_won';
  notes: string;
  timestamp: string;
  date: string;
}

const PROSPECTS_KEY = 'surety_prospects';
const CALL_LOGS_KEY = 'surety_call_logs';
const CALLS_TODAY_KEY = 'surety_calls_today';
const CALLS_TODAY_DATE_KEY = 'surety_calls_today_date';

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

export function exportProspectsCSV(): string {
  const prospects = getProspects();
  const headers = ['Business Name', 'Owner Name', 'Phone', 'Business Type', 'Stage', 'Last Contact', 'Notes'];
  const rows = prospects.map(p => [
    p.businessName, p.ownerName, p.phone, p.businessType, p.stage, p.lastContact, p.notes
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}
