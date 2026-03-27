import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const REDIS_KEY = 'surety-prospects';
const DEBOUNCE_KEY = 'surety-prospects-last-save';
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function getRedis(): Redis {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV env vars not set');
  return new Redis({ url, token });
}

export async function POST(req: NextRequest) {
  try {
    const { prospects } = await req.json();
    if (!Array.isArray(prospects)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const redis = getRedis();

    // Debounce: skip if saved within the last 5 minutes
    const lastSave = await redis.get<number>(DEBOUNCE_KEY);
    const now = Date.now();
    if (lastSave && now - lastSave < MIN_INTERVAL_MS) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        nextSaveIn: Math.ceil((MIN_INTERVAL_MS - (now - lastSave)) / 1000),
        count: prospects.length,
      });
    }

    await redis.set(REDIS_KEY, prospects);
    await redis.set(DEBOUNCE_KEY, now);

    return NextResponse.json({ ok: true, count: prospects.length, savedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Sync save error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
