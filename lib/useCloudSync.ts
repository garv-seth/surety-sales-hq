'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getProspects, saveProspects, type Prospect } from './storage';

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'synced' | 'error';

export function useCloudSync() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialized = useRef(false);

  // Merge cloud + local prospects (union by ID, cloud wins for conflicts)
  const mergeProspects = useCallback((cloud: Prospect[], local: Prospect[]): Prospect[] => {
    const merged = new Map<string, Prospect>();
    // Local first
    for (const p of local) merged.set(p.id, p);
    // Cloud overwrites (cloud is truth for cross-device sync)
    for (const p of cloud) merged.set(p.id, p);
    return Array.from(merged.values());
  }, []);

  // Push local prospects to cloud
  const pushToCloud = useCallback(async (): Promise<boolean> => {
    try {
      setStatus('syncing');
      setError(null);
      const prospects = getProspects();
      const res = await fetch('/api/sync/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setStatus('synced');
      setLastSynced(new Date());
      return true;
    } catch (err) {
      setStatus('error');
      setError(String(err));
      return false;
    }
  }, []);

  // Pull from cloud and merge into local
  const pullFromCloud = useCallback(async (): Promise<boolean> => {
    try {
      setStatus('loading');
      setError(null);
      const res = await fetch('/api/sync/load');
      if (!res.ok) throw new Error(`Load failed: ${res.status}`);
      const data = await res.json();

      if (data.found && Array.isArray(data.prospects) && data.prospects.length > 0) {
        const local = getProspects();
        const merged = mergeProspects(data.prospects, local);
        saveProspects(merged);
      }

      setStatus('synced');
      setLastSynced(new Date());
      return true;
    } catch (err) {
      setStatus('error');
      setError(String(err));
      return false;
    }
  }, [mergeProspects]);

  // Full sync: pull then push (ensures both directions)
  const syncNow = useCallback(async () => {
    await pullFromCloud();
    await pushToCloud();
  }, [pullFromCloud, pushToCloud]);

  // On first mount: pull from cloud to get other devices' data
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    pullFromCloud().then(() => {
      // After initial pull, push local state back so cloud is up to date
      pushToCloud();
    });
  }, [pullFromCloud, pushToCloud]);

  // Auto-sync every 60 seconds
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      pushToCloud();
    }, 300_000);

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [pushToCloud]);

  return { status, lastSynced, error, syncNow, pushToCloud, pullFromCloud };
}

