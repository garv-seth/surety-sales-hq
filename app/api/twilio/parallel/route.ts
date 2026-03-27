import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { put, list } from '@vercel/blob';

const CALLS_STATE_KEY = 'twilio-parallel-calls.json';
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
  userConnectedTo?: string; // call SID user joined
  updatedAt: string;
}

async function readCallsState(): Promise<CallsState | null> {
  try {
    const { blobs } = await list({ prefix: CALLS_STATE_KEY });
    if (!blobs.length) return null;
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(blobs[0].url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return await res.json();
  } catch { return null; }
}

async function writeCallsState(state: CallsState): Promise<void> {
  await put(CALLS_STATE_KEY, JSON.stringify(state), {
    access: 'private', contentType: 'application/json',
    addRandomSuffix: false, allowOverwrite: true,
  });
}

// POST /api/twilio/parallel — initiate 3 simultaneous calls
export async function POST(req: NextRequest) {
  try {
    const { prospects } = await req.json();
    // prospects: [{ id, name, phone }] — max 3
    if (!prospects?.length) return NextResponse.json({ error: 'prospects required' }, { status: 400 });

    const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
    const sessionId = `session_${Date.now()}`;
    const calls: ParallelCall[] = [];

    const batch = prospects.slice(0, 3);

    await Promise.allSettled(batch.map(async (p: { id: string; name: string; phone: string }) => {
      const conferenceRoom = `conf_${sessionId}_${p.id}`;
      const cleanPhone = p.phone.replace(/[^\d+]/g, '');

      try {
        const call = await client.calls.create({
          to: cleanPhone,
          from: process.env.TWILIO_PHONE_NUMBER!,
          url: `${BASE_URL}/api/twilio/conference-hold?room=${encodeURIComponent(conferenceRoom)}&prospectId=${p.id}`,
          statusCallback: `${BASE_URL}/api/twilio/parallel-status?sessionId=${sessionId}&prospectId=${p.id}`,
          statusCallbackMethod: 'POST',
          statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
          timeout: 25,
          machineDetection: 'Enable', // detect voicemail
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
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET /api/twilio/parallel?sessionId=xxx — poll for call status updates
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  const state = await readCallsState();
  if (!state || (sessionId && state.sessionId !== sessionId)) {
    return NextResponse.json({ calls: [], sessionId: null });
  }
  return NextResponse.json(state);
}
