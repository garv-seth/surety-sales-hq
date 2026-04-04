import { NextRequest, NextResponse } from 'next/server';
import IORedis from 'ioredis';

const CALLS_STATE_KEY = 'twilio-parallel-calls';

let _redis: IORedis | null = null;
function getRedis(): IORedis {
  if (!_redis) {
    const url = process.env.KV_REDIS_URL;
    if (!url) throw new Error('KV_REDIS_URL not set');
    _redis = new IORedis(url, { maxRetriesPerRequest: 3 });
  }
  return _redis;
}

async function readState() {
  try {
    const redis = getRedis();
    const data = await redis.get(CALLS_STATE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch { return null; }
}

async function writeState(state: object) {
  const redis = getRedis();
  await redis.set(CALLS_STATE_KEY, JSON.stringify(state), 'EX', 3600); // expire after 1 hour
}

// Called by Twilio status webhook for each parallel call
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const prospectId = searchParams.get('prospectId');
    const isAmd = searchParams.get('amd') === 'true';

    const body = await req.text();
    const params = new URLSearchParams(body);
    const callSid = params.get('CallSid') || '';
    const callStatus = params.get('CallStatus') || '';
    const answeredBy = params.get('AnsweredBy') || '';

    const state = await readState();
    if (state && state.sessionId === sessionId) {
      const callIdx = state.calls.findIndex(
        (c: any) => c.prospectId === prospectId || c.sid === callSid
      );

      if (callIdx >= 0) {
        const prev = state.calls[callIdx].status;
        state.calls[callIdx].sid = callSid;
        state.calls[callIdx].status = callStatus === 'in-progress' ? 'in-progress' : callStatus;

        // Mark if answered by human vs machine
        if (callStatus === 'in-progress' && answeredBy) {
          state.calls[callIdx].answeredBy = answeredBy;
          if (!state.calls[callIdx].answeredAt) {
            state.calls[callIdx].answeredAt = new Date().toISOString();
          }
        }

        // AMD callback
        if (isAmd && answeredBy) {
          state.calls[callIdx].answeredBy = answeredBy;
        }

        state.updatedAt = new Date().toISOString();

        // Only write if something changed
        if (prev !== callStatus || isAmd) {
          await writeState(state);
        }
      }
    }

    return new NextResponse('', { status: 200 });
  } catch (err) {
    console.error('Parallel status error:', err);
    return new NextResponse('', { status: 200 }); // Always 200 to Twilio
  }
}
