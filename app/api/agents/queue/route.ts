import { NextRequest } from 'next/server';

/**
 * Agent API — Dialer Queue
 *
 * GET  /api/agents/queue
 *   Returns guidance on reading the dialer queue from localStorage.
 *   Key: surety_dialer_queue (JSON array of prospect IDs)
 *
 * POST /api/agents/queue
 *   Body: { prospect_ids: string[] }
 *   Validates and returns the queue to be written to localStorage.
 *
 * Note: This app stores all data in browser localStorage.
 * Server-side routes validate and document the expected shape;
 * the Claude CoWork agent must read/write localStorage via browser tool calls.
 */

function validateToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  return token.length === 36 && token.includes('-');
}

export async function GET(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return Response.json({
    description: 'Dialer queue is stored in localStorage under key: surety_dialer_queue',
    schema: 'string[] — ordered array of prospect IDs (UUID strings)',
    read_instruction: 'In browser: JSON.parse(localStorage.getItem("surety_dialer_queue") || "[]")',
    write_instruction: 'POST /api/agents/queue with { prospect_ids } to validate, then write via browser tool',
    related: {
      prospects: 'GET /api/agents/prospects — get all prospects to find IDs',
      dialer_page: '/dialer — the dialer UI reads this queue on load',
    },
  });
}

export async function POST(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { prospect_ids } = body;

    if (!Array.isArray(prospect_ids)) {
      return Response.json(
        { error: 'Missing required field: prospect_ids (must be an array of prospect ID strings)' },
        { status: 400 }
      );
    }

    if (prospect_ids.some((id: unknown) => typeof id !== 'string' || !id.trim())) {
      return Response.json(
        { error: 'All items in prospect_ids must be non-empty strings' },
        { status: 400 }
      );
    }

    const uniqueIds = [...new Set(prospect_ids as string[])];

    return Response.json({
      success: true,
      queue: uniqueIds,
      count: uniqueIds.length,
      localStorage_key: 'surety_dialer_queue',
      write_instruction: `localStorage.setItem("surety_dialer_queue", JSON.stringify(${JSON.stringify(uniqueIds)}))`,
      message: 'Queue validated. Write to localStorage client-side using the write_instruction above.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to process queue';
    return Response.json({ error: msg }, { status: 500 });
  }
}
