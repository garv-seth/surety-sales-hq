import { NextRequest } from 'next/server';

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
    message: 'Stats are computed client-side from localStorage. Use the analytics page or call getCallLogs() and getProspects() from lib/storage.ts.',
    endpoints: {
      prospects: 'GET /api/agents/prospects',
      callLog: 'POST /api/agents/call-log',
      stats: 'GET /api/agents/stats',
    },
  });
}
