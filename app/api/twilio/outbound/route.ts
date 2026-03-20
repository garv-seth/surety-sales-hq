import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// Called by Twilio TwiML App when browser client places a call
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);
    const to = params.get('To');
    const from = process.env.TWILIO_PHONE_NUMBER!;

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    if (to) {
      const dial = twiml.dial({ callerId: from, timeout: 20, record: 'do-not-record' });
      dial.number(to);
    } else {
      twiml.say('No destination provided.');
    }

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err) {
    console.error('Outbound TwiML error:', err);
    return new NextResponse('<Response><Say>Error</Say></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
