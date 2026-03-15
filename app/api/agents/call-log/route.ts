import { NextRequest } from 'next/server';

function validateToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  return token.length === 36 && token.includes('-');
}

export async function POST(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    // Accept both prospect_id (agent-preferred) and prospectName (legacy)
    const { prospect_id, prospectName, outcome, notes } = body;

    if (!outcome) {
      return Response.json(
        { error: 'Missing required field: outcome' },
        { status: 400 }
      );
    }

    if (!prospect_id && !prospectName) {
      return Response.json(
        { error: 'Missing required field: prospect_id (or prospectName for legacy)' },
        { status: 400 }
      );
    }

    const validOutcomes = ['no_answer', 'not_interested', 'follow_up', 'demo_booked', 'closed_won', 'voicemail', 'callback'];
    if (!validOutcomes.includes(outcome)) {
      return Response.json(
        { error: `Invalid outcome. Must be one of: ${validOutcomes.join(', ')}` },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];
    const callLog = {
      id: `log_${Date.now()}`,
      prospect_id: prospect_id || null,
      prospectName: prospectName || null,
      outcome,
      notes: notes || '',
      date: today,
      timestamp: new Date().toISOString(),
    };

    return Response.json({
      success: true,
      callLog,
      localStorage_key: 'surety_call_logs',
      message: 'Call log validated. Append to localStorage array using addCallLog() from lib/storage.ts.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to process call log';
    return Response.json({ error: msg }, { status: 500 });
  }
}
