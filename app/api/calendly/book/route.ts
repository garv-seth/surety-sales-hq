import { NextRequest, NextResponse } from 'next/server';
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

// Creates a single-use scheduling link for a specific event type
export async function POST(req: NextRequest) {
  try {
    const { eventTypeUri } = await req.json();

    if (!eventTypeUri) {
      return NextResponse.json({ error: 'eventTypeUri required' }, { status: 400 });
    }

    const tokens = await getCalendlyTokens();

    const res = await fetch('https://api.calendly.com/scheduling_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        max_event_count: 1,
        owner: eventTypeUri,
        owner_type: 'EventType',
      }),
    });

    const data = await res.json();

    if (!data.resource?.booking_url) {
      console.error('Calendly book error:', data);
      return NextResponse.json({ error: 'Failed to create booking link', raw: data }, { status: 500 });
    }

    return NextResponse.json({
      bookingUrl: data.resource.booking_url,
      slug: data.resource.slug,
    });
  } catch (err) {
    console.error('Calendly book error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
