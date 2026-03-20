import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';

async function getCalendlyTokens() {
  const { blobs } = await list({ prefix: 'calendly-tokens.json' });
  if (!blobs.length) throw new Error('Not connected to Calendly');
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const res = await fetch(blobs[0].url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return await res.json();
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
