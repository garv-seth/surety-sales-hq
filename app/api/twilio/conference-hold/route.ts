import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// TwiML: put answered prospect into a named conference room with hold music
export async function POST(req: NextRequest) {
  return handleRequest(req);
}
export async function GET(req: NextRequest) {
  return handleRequest(req);
}

function handleRequest(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || 'default-room';

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  twiml.say({ voice: 'alice' }, 'Please hold just a moment.');

  const dial = twiml.dial();
  // Use type assertion to avoid strict Twilio type issues
  (dial as any).conference(room, {
    startConferenceOnEnter: false,
    endConferenceOnExit: true,
    waitUrl: 'https://twimlets.com/holdmusic?Bucket=com.twilio.music.classical',
    waitMethod: 'GET',
    maxParticipants: 2,
  });

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
