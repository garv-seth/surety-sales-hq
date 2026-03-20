import { NextResponse } from 'next/server';

// Redirect user to Calendly OAuth authorization
export async function GET() {
  const clientId = process.env.CALENDLY_CLIENT_ID!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://surety-sales-hq.vercel.app';
  const redirectUri = `${baseUrl}/api/auth/calendly/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
  });

  return NextResponse.redirect(
    `https://auth.calendly.com/oauth/authorize?${params.toString()}`
  );
}
