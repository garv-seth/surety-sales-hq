// lib/blob-store.ts
// Server-side Redis helpers for prospects — uses Upstash REST API via KV_REDIS_URL
import { Redis } from '@upstash/redis';
import type { Prospect } from './storage';

const REDIS_KEY = 'surety-prospects';

function getRedis(): Redis {
  // Vercel KV integration creates KV_REDIS_URL in format:
  // rediss://default:TOKEN@HOST.upstash.io:PORT
  const redisUrl = process.env.KV_REDIS_URL;
  const restUrl = process.env.KV_REST_API_URL;
  const restToken = process.env.KV_REST_API_TOKEN;

  // If REST API vars are set directly, use them
  if (restUrl && restToken) {
    return new Redis({ url: restUrl, token: restToken });
  }

  // Parse KV_REDIS_URL to extract Upstash REST credentials
  if (redisUrl) {
    try {
      // Format: rediss://default:TOKEN@HOST.upstash.io:6379
      const url = new URL(redisUrl);
      const token = url.password; // the password is the Upstash token
      const host = url.hostname;  // e.g. us1-xyz.upstash.io
      const apiUrl = `https://${host}`;
      return new Redis({ url: apiUrl, token });
    } catch (e) {
      throw new Error(`Failed to parse KV_REDIS_URL: ${e}`);
    }
  }

  throw new Error('No Redis env vars found. Set KV_REDIS_URL or KV_REST_API_URL+KV_REST_API_TOKEN');
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

export async function pruneWeakProspects(minScore = 60): Promise<{ pruned: number; kept: number }> {
  const prospects = await readProspectsFromBlob();
  const kept = prospects.filter(
    p => !p.confidenceScore || p.confidenceScore >= minScore || p.stage !== 'new'
  );
  const pruned = prospects.length - kept.length;
  if (pruned > 0) await writeProspectsToBlob(kept);
  return { pruned, kept: kept.length };
}
