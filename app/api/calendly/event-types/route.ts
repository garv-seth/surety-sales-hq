import { NextResponse } from 'next/server';
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
