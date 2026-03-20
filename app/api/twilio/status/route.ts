import { NextRequest, NextResponse } from 'next/server';

// Called by Twilio for every call status change
// Used to detect no-answer, completed, etc.
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const callSid = params.get('CallSid') || '';
    const callStatus = params.get('CallStatus') || '';
    const to = params.get('To') || '';
    const duration = params.get('CallDuration') || '0';

    console.log(`[Twilio Status] SID=${callSid} | To=${to} | Status=${callStatus} | Duration=${duration}s`);

    // Twilio expects 200 OK
    return new NextResponse('', { status: 200 });
  } catch (err) {
    console.error('Status webhook error:', err);
    return new NextResponse('', { status: 200 }); // Always 200 to Twilio
  }
}
