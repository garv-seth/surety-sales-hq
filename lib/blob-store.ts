// lib/blob-store.ts
// Server-side Redis helpers for prospects — replaces @vercel/blob to avoid Advanced Op quotas
import { Redis } from '@upstash/redis';
import type { Prospect } from './storage';

const REDIS_KEY = 'surety-prospects';

function getRedis(): Redis {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN env vars not set');
  return new Redis({ url, token });
}

export async function readProspectsFromBlob(): Promise<Prospect[]> {
  try {
    const redis = getRedis();
    const data = await redis.get<Prospect[]>(REDIS_KEY);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function writeProspectsToBlob(prospects: Prospect[]): Promise<void> {
  const redis = getRedis();
  await redis.set(REDIS_KEY, prospects);
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

// Purge low-confidence new prospects (score < threshold)
export async function pruneWeakProspects(minScore = 60): Promise<{ pruned: number; kept: number }> {
  const prospects = await readProspectsFromBlob();
  const kept = prospects.filter(
    p => !p.confidenceScore || p.confidenceScore >= minScore || p.stage !== 'new'
  );
  const pruned = prospects.length - kept.length;
  if (pruned > 0) await writeProspectsToBlob(kept);
  return { pruned, kept: kept.length };
}
