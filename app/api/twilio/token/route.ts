import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const apiKeySid = process.env.TWILIO_API_KEY_SID!;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET!;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID!;

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: false,
    });

    const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
      identity: 'garv-dialer',
      ttl: 3600,
    });
    token.addGrant(voiceGrant);

    return NextResponse.json({ token: token.toJwt() });
  } catch (err) {
    console.error('Token error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
