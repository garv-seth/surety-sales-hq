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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://surety-sales-hq.vercel.app';

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/settings?error=no_code`);
  }

  try {
    const clientId = process.env.CALENDLY_CLIENT_ID!;
    const clientSecret = process.env.CALENDLY_CLIENT_SECRET!;
    const redirectUri = `${baseUrl}/api/auth/calendly/callback`;

    const tokenRes = await fetch('https://auth.calendly.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('Calendly token error:', tokenData);
      return NextResponse.redirect(`${baseUrl}/settings?error=token_failed`);
    }

    // Save tokens to Redis (persists across devices)
    const redis = getRedis();
    await redis.set(CALENDLY_TOKENS_KEY, JSON.stringify({
      ...tokenData,
      saved_at: new Date().toISOString(),
    }));

    return NextResponse.redirect(`${baseUrl}/settings?calendly=connected`);
  } catch (err) {
    console.error('Calendly callback error:', err);
    return NextResponse.redirect(`${baseUrl}/settings?error=callback_failed`);
  }
}
