// lib/blob-store.ts
// Server-side Redis helpers for prospects — uses ioredis with KV_REDIS_URL
import IORedis from 'ioredis';
import type { Prospect } from './storage';

const REDIS_KEY = 'surety-prospects';

// Module-level singleton — reused across warm invocations
let _redis: IORedis | null = null;

function getRedis(): IORedis {
  if (!_redis) {
    const url = process.env.KV_REDIS_URL;
    if (!url) throw new Error('KV_REDIS_URL env var not set');
    _redis = new IORedis(url, { maxRetriesPerRequest: 3, lazyConnect: false });
  }
  return _redis;
}

export async function readProspectsFromBlob(): Promise<Prospect[]> {
  try {
    const r = getRedis();
    const data = await r.get(REDIS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeProspectsToBlob(prospects: Prospect[]): Promise<void> {
  const r = getRedis();
  await r.set(REDIS_KEY, JSON.stringify(prospects));
}

export async function addProspectsToBlob(
  newProspects: Prospect[]
): Promise<{ added: number; skipped: number; total: number }> {
  const existing = await readProspectsFromBlob();
  const existingPhones = new Set(existing.map(p => p.phone?.replace(/\D/g, '')));
  const existingNames = new Set(existing.map(p => p.businessName?.toLowerCase().trim()));

  let added = 0;
  let skipped = 0;

  for (const prospect of newProspects) {
    const cleanPhone = prospect.phone?.replace(/\D/g, '');
    const cleanName = prospect.businessName?.toLowerCase().trim();

    if (cleanPhone && existingPhones.has(cleanPhone)) { skipped++; continue; }
    if (cleanName && existingNames.has(cleanName)) { skipped++; continue; }

    existing.push(prospect);
    if (cleanPhone) existingPhones.add(cleanPhone);
    if (cleanName) existingNames.add(cleanName);
    added++;
  }

  if (added > 0) {
    await writeProspectsToBlob(existing);
  }

  return { added, skipped, total: existing.length };
}

export async function pruneWeakProspects(minScore = 60): Promise<{ pruned: number; kept: number }> {
  const prospects = await readProspectsFromBlob();
  const kept = prospects.filter(
    p => !p.confidenceScore || p.confidenceScore >= minScore || p.stage !== 'new'
  );
  const pruned = prospects.length - kept.length;
  if (pruned > 0) await writeProspectsToBlob(kept);
  return { pruned, kept: kept.length };
}
