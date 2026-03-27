import { NextResponse } from 'next/server';
import IORedis from 'ioredis';

const REDIS_KEY = 'surety-prospects';

let _redis: IORedis | null = null;
function getRedis(): IORedis {
  if (!_redis) {
    const url = process.env.KV_REDIS_URL;
    if (!url) throw new Error('KV_REDIS_URL not set');
    _redis = new IORedis(url, { maxRetriesPerRequest: 3 });
  }
  return _redis;
}

export async function GET() {
  try {
    const redis = getRedis();
    const data = await redis.get(REDIS_KEY);
    if (!data) return NextResponse.json({ prospects: [], found: false });
    const prospects = JSON.parse(data);
    return NextResponse.json({ prospects: Array.isArray(prospects) ? prospects : [], found: true, count: Array.isArray(prospects) ? prospects.length : 0 });
  } catch (err) {
    console.error('Sync load error:', err);
    return NextResponse.json({ prospects: [], found: false, error: String(err) });
  }
}
