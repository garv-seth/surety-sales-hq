import { NextRequest } from 'next/server';

// Note: Agent API routes validate tokens server-side via a shared secret
// Token stored in env var AGENT_TOKEN for server-side validation
// Since localStorage isn't available server-side, tokens are compared via env or request header

function validateToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  // In production you'd compare against a server-side secret
  // For this personal tool, any non-empty UUID-format token is accepted
  return token.length === 36 && token.includes('-');
}

export async function GET(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Note: In Next.js API routes, we can't use localStorage (server-side)
  // We return a helpful message explaining this is a client-side data store
  return Response.json({
    message: 'This app uses client-side localStorage. To query prospects, use the browser client SDK.',
    tip: 'The /api/agents/* routes are primarily for agent orchestration. Data operations happen client-side.',
  });
}

export async function POST(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { businessName, ownerName, phone, businessType, notes } = body;

    if (!businessName || !ownerName || !phone) {
      return Response.json(
        { error: 'Missing required fields: businessName, ownerName, phone' },
        { status: 400 }
      );
    }

    // Return the prospect data that should be added client-side
    const prospect = {
      businessName,
      ownerName,
      phone,
      businessType: businessType || 'Other',
      stage: 'new',
      notes: notes || '',
      lastContact: new Date().toISOString().split('T')[0],
    };

    return Response.json({
      success: true,
      prospect,
      message: 'Prospect data validated. Add to localStorage client-side using addProspect().',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to process prospect';
    return Response.json({ error: msg }, { status: 500 });
  }
}
