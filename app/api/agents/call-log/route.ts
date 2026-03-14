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
    const { prospectName, outcome, notes } = body;

    if (!prospectName || !outcome) {
      return Response.json(
        { error: 'Missing required fields: prospectName, outcome' },
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

    const callLog = {
      prospectName,
      outcome,
      notes: notes || '',
    };

    return Response.json({
      success: true,
      callLog,
      message: 'Call log validated. Add to localStorage client-side using addCallLog().',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to process call log';
    return Response.json({ error: msg }, { status: 500 });
  }
}
