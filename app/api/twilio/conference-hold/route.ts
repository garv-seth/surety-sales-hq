import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// TwiML: put answered prospect into a conference room with hold music
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room') || 'default-room';

  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();

  // Brief message then hold music in conference
  twiml.say({ voice: 'alice' }, 'Please hold for just a moment.');

  const dial = twiml.dial();
  const conf = dial.conference(room, {
    startConferenceOnEnter: false, // don't start until agent joins
    endConferenceOnExit: true,
    waitUrl: 'https://twilio.com/resources/sounds/music/oldmcdonald.mp3', // hold music
    waitMethod: 'GET',
    maxParticipants: '2',
  });
  void conf;

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
