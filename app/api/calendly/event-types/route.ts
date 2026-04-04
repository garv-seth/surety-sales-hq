import { NextResponse } from 'next/server';
import IORedis from 'ioredis';

const CALENDLY_TOKENS_KEY = 'calendly-tokens';

let _redis: IORedis | null = null;
function getRedis(): IORedis {
  if (!_redis) {
    const url = process.env.KV_REDIS_URL;
    if (!url) throw new Error('KV_REDIS_URL not set');
    _redis = new IORedis(url, { maxRetriesPerRequest: 3 });
  }
  return _redis;
}

async function getCalendlyTokens() {
  const redis = getRedis();
  const data = await redis.get(CALENDLY_TOKENS_KEY);
  if (!data) throw new Error('Not connected to Calendly');
  return JSON.parse(data);
}

export async function GET() {
  try {
    const tokens = await getCalendlyTokens();

    // Get current user
    const meRes = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const meData = await meRes.json();
    const userUri = meData.resource?.uri;

    if (!userUri) {
      return NextResponse.json({ error: 'Could not get user URI', eventTypes: [] }, { status: 401 });
    }

    // Get active event types
    const etRes = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true&count=20`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const etData = await etRes.json();

    return NextResponse.json({
      eventTypes: etData.collection || [],
      userUri,
      userName: meData.resource?.name,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err), eventTypes: [], connected: false }, { status: 200 });
  }
}
