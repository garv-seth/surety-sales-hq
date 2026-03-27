// lib/blob-store.ts
// Server-side Vercel Blob helpers for prospects — used by agent automation
import { put, list } from '@vercel/blob';
import type { Prospect } from './storage';

const BLOB_KEY = 'surety-prospects.json';

async function blobFetch(url: string): Promise<Response> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function readProspectsFromBlob(): Promise<Prospect[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (!blobs.length) return [];
    const res = await blobFetch(blobs[0].url);
    if (!res.ok) return [];
    const text = await res.text();
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function writeProspectsToBlob(prospects: Prospect[]): Promise<void> {
  await put(BLOB_KEY, JSON.stringify(prospects), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function addProspectsToBlob(newProspects: Prospect[]): Promise<{ added: number; skipped: number; total: number }> {
  const existing = await readProspectsFromBlob();
  const existingPhones = new Set(existing.map(p => p.phone?.replace(/\D/g, '')));
  const existingNames = new Set(existing.map(p => p.businessName?.toLowerCase().trim()));

  let added = 0;
  let skipped = 0;

  for (const prospect of newProspects) {
    const cleanPhone = prospect.phone?.replace(/\D/g, '');
    const cleanName = prospect.businessName?.toLowerCase().trim();

    // Skip duplicates by phone or by name
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

// Purge low-confidence prospects (score < threshold) from the blob
export async function pruneWeakProspects(minScore = 60): Promise<{ pruned: number; kept: number }> {
  const prospects = await readProspectsFromBlob();
  const kept = prospects.filter(p => !p.confidenceScore || p.confidenceScore >= minScore || p.stage !== 'new');
  const pruned = prospects.length - kept.length;
  if (pruned > 0) await writeProspectsToBlob(kept);
  return { pruned, kept: kept.length };
}
