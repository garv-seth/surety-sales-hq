import { NextRequest, NextResponse } from 'next/server';
import IORedis from 'ioredis';

const REDIS_KEY = 'surety-prospects';
const DEBOUNCE_KEY = 'surety-prospects-last-save';
const MIN_INTERVAL_MS = 5 * 60 * 1000;

let _redis: IORedis | null = null;
function getRedis(): IORedis {
  if (!_redis) {
    const url = process.env.KV_REDIS_URL;
    if (!url) throw new Error('KV_REDIS_URL not set');
    _redis = new IORedis(url, { maxRetriesPerRequest: 3 });
  }
  return _redis;
}

export async function POST(req: NextRequest) {
  try {
    const { prospects } = await req.json();
    if (!Array.isArray(prospects)) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    const redis = getRedis();
    const lastSaveStr = await redis.get(DEBOUNCE_KEY);
    const lastSave = lastSaveStr ? parseInt(lastSaveStr) : 0;
    const now = Date.now();
    if (lastSave && now - lastSave < MIN_INTERVAL_MS) {
      return NextResponse.json({ ok: true, skipped: true, nextSaveIn: Math.ceil((MIN_INTERVAL_MS - (now - lastSave)) / 1000), count: prospects.length });
    }
    await redis.set(REDIS_KEY, JSON.stringify(prospects));
    await redis.set(DEBOUNCE_KEY, now.toString());
    return NextResponse.json({ ok: true, count: prospects.length, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Sync save error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
