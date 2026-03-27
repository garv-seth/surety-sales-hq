import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { list } from '@vercel/blob';

// POST: connect browser client to a conference room (join an answered call)
// Also drops the other parallel calls
export async function POST(req: NextRequest) {
  try {
    const { conferenceRoom, dropSids } = await req.json();
    // conferenceRoom: the conference room name to join
    // dropSids: array of call SIDs to terminate (other parallel calls)

    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

    // Drop other calls first
    if (dropSids?.length) {
      await Promise.allSettled(
        dropSids.map((sid: string) =>
          client.calls(sid).update({ status: 'completed' })
        )
      );
    }

    // Return a TwiML token + conference name so the browser SDK can join
    // The browser will use Device.connect({ params: { ConferenceName: room } })
    // and the outbound TwiML will put browser into that conference

    return NextResponse.json({ ok: true, conferenceRoom });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
