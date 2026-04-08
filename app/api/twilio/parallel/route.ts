import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { redis } from '@/lib/redis';

const CALLS_STATE_KEY = 'twilio-parallel-calls';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prospects, conferenceRoom } = body;

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json({ error: 'No prospects provided' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID!.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN!.trim();
    const fromNumber = process.env.TWILIO_PHONE_NUMBER!.trim();
    const client = twilio(accountSid, authToken);

    const calls: any[] = [];

    for (const p of prospects) {
      const cleanPhone = p.phone?.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        calls.push({
          sid: '',
          phone: p.phone,
          prospectId: p.id,
          prospectName: p.name,
          status: 'failed',
          startedAt: new Date().toISOString(),
          conferenceRoom,
        });
        continue;
      }

      const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

      try {
        const call = await client.calls.create({
          to: formattedPhone,
          from: fromNumber,
          url: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/connect-to-conference?conferenceRoom=${encodeURIComponent(conferenceRoom)}`,
          statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/call-status`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          machineDetection: 'Enable',
          asyncAmd: 'true',
          asyncAmdStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/amd-status`,
          asyncAmdStatusCallbackMethod: 'POST',
        });

        calls.push({
          sid: call.sid,
          phone: formattedPhone,
          prospectId: p.id,
          prospectName: p.name,
          status: 'initiated',
          startedAt: new Date().toISOString(),
          conferenceRoom,
        });
      } catch (err) {
        console.error(`[parallel] calls.create failed for ${p.name}: ${String(err)}`);
        calls.push({
          sid: '',
          phone: formattedPhone,
          prospectId: p.id,
          prospectName: p.name,
          status: 'failed',
          startedAt: new Date().toISOString(),
          conferenceRoom,
        });
      }
    }

    // Store calls state in Redis
    await redis.set(CALLS_STATE_KEY, JSON.stringify(calls), { ex: 3600 });

    return NextResponse.json({ calls });
  } catch (err) {
    console.error('[parallel] route error:', String(err));
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const raw = await redis.get(CALLS_STATE_KEY);
    const calls = raw ? JSON.parse(raw as string) : [];
    return NextResponse.json({ calls });
  } catch (err) {
    console.error('[parallel] GET error:', String(err));
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
