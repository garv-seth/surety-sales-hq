import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

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

    // Save tokens to Vercel Blob (persists across devices)
    await put('calendly-tokens.json', JSON.stringify({
      ...tokenData,
      saved_at: new Date().toISOString(),
    }), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.redirect(`${baseUrl}/settings?calendly=connected`);
  } catch (err) {
    console.error('Calendly callback error:', err);
    return NextResponse.redirect(`${baseUrl}/settings?error=callback_failed`);
  }
}
