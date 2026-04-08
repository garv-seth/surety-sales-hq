import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import IORedis from 'ioredis';

const CALLS_STATE_KEY = 'twilio-parallel-calls';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://surety-sales-hq.vercel.app';

interface ParallelCall {
  sid: string;
  phone: string;
  prospectId: string;
  prospectName: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'no-answer' | 'busy' | 'failed' | 'completed' | 'canceled';
  startedAt: string;
  answeredAt?: string;
  conferenceRoom: string;
}

interface CallsState {
  sessionId: string;
  calls: ParallelCall[];
  userConnectedTo?: string;
  updatedAt: string;
}

let _redis: IORedis | null = null;
function getRedis(): IORedis {
  if (!_redis) {
    const url = process.env.KV_REDIS_URL;
    if (!url) throw new Error('KV_REDIS_URL not set');
    _redis = new IORedis(url, { maxRetriesPerRequest: 3 });
  }
  return _redis;
}

async function readCallsState(): Promise<CallsState | null> {
  try {
    const redis = getRedis();
    const data = await redis.get(CALLS_STATE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch { return null; }
}

async function writeCallsState(state: CallsState): Promise<void> {
  const redis = getRedis();
  await redis.set(CALLS_STATE_KEY, JSON.stringify(state), 'EX', 3600);
}

export async function POST(req: NextRequest) {
  try {
    const { prospects } = await req.json();
    if (!prospects?.length) return NextResponse.json({ error: 'prospects required' }, { status: 400 });

    const client = twilio(process.env.TWILIO_ACCOUNT_SID!.trim(), process.env.TWILIO_AUTH_TOKEN!.trim());
    const sessionId = `session_${Date.now()}`;
    const calls: ParallelCall[] = [];

    const batch = prospects.slice(0, 3);

    await Promise.allSettled(batch.map(async (p: { id: string; name: string; phone: string }) => {
      const conferenceRoom = `conf_${sessionId}_${p.id}`;
      const cleanPhone = p.phone.replace(/[^\d+]/g, '');

      try {
        const call = await client.calls.create({
          to: cleanPhone,
          from: process.env.TWILIO_PHONE_NUMBER!.trim(),
          url: `${BASE_URL}/api/twilio/conference-hold?room=${encodeURIComponent(conferenceRoom)}&prospectId=${p.id}`,
          statusCallback: `${BASE_URL}/api/twilio/parallel-status?sessionId=${sessionId}&prospectId=${p.id}`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          timeout: 25,
          machineDetection: 'Enable',
          asyncAmd: 'true',
          asyncAmdStatusCallback: `${BASE_URL}/api/twilio/parallel-status?sessionId=${sessionId}&prospectId=${p.id}&amd=true`,
        });

        calls.push({
          sid: call.sid,
          phone: cleanPhone,
          prospectId: p.id,
          prospectName: p.name,
          status: 'queued',
          startedAt: new Date().toISOString(),
          conferenceRoom,
        });
      } catch (err) {
        console.error(`[parallel] calls.create failed for ${p.name}: ${String(err)}`);
        calls.push({
          sid: '',
          phone: cleanPhone,
          prospectId: p.id,
          prospectName: p.name,
          status: 'failed',
          startedAt: new Date().toISOString(),
          conferenceRoom,
        });
      }
    }));

    const state: CallsState = { sessionId, calls, updatedAt: new Date().toISOString() };
    await writeCallsState(state);

    return NextResponse.json({ sessionId, calls });
  } catch (err) {
    console.error('[parallel] route error:', String(err));
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  const state = await readCallsState();
  if (!state || (sessionId && state.sessionId !== sessionId)) {
    return NextResponse.json({ calls: [], sessionId: null });
  }
  return NextResponse.json(state);
}
