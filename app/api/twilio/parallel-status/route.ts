import { NextRequest, NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

const CALLS_STATE_KEY = 'twilio-parallel-calls.json';

async function readState() {
  try {
    const { blobs } = await list({ prefix: CALLS_STATE_KEY });
    if (!blobs.length) return null;
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const res = await fetch(blobs[0].url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return await res.json();
  } catch { return null; }
}

async function writeState(state: object) {
  await put(CALLS_STATE_KEY, JSON.stringify(state), {
    access: 'private', contentType: 'application/json',
    addRandomSuffix: false, allowOverwrite: true,
  });
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
