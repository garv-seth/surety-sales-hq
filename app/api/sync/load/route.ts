import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const REDIS_KEY = 'surety-prospects';

function getRedis(): Redis {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV env vars not set');
  return new Redis({ url, token });
}

export async function GET() {
  try {
    const redis = getRedis();
    const prospects = await redis.get<unknown[]>(REDIS_KEY);

    if (!prospects || !Array.isArray(prospects)) {
      return NextResponse.json({ prospects: [], found: false });
    }

    return NextResponse.json({
      prospects,
      found: true,
      count: prospects.length,
    });
  } catch (err) {
    console.error('Sync load error:', err);
    return NextResponse.json({ prospects: [], found: false, error: String(err) });
  }
}
