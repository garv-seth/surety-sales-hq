import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const REDIS_KEY = 'surety-prospects';

function getRedis(): Redis {
  const redisUrl = process.env.KV_REDIS_URL;
  const restUrl = process.env.KV_REST_API_URL;
  const restToken = process.env.KV_REST_API_TOKEN;
  if (restUrl && restToken) return new Redis({ url: restUrl, token: restToken });
  if (redisUrl) {
    const u = new URL(redisUrl);
    return new Redis({ url: `https://${u.hostname}`, token: u.password });
  }
  throw new Error('No Redis env vars');
}

export async function GET() {
  try {
    const redis = getRedis();
    const prospects = await redis.get<unknown[]>(REDIS_KEY);
    if (!prospects || !Array.isArray(prospects)) {
      return NextResponse.json({ prospects: [], found: false });
    }
    return NextResponse.json({ prospects, found: true, count: prospects.length });
  } catch (err) {
    console.error('Sync load error:', err);
    return NextResponse.json({ prospects: [], found: false, error: String(err) });
  }
}
