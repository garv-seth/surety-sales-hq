import { NextRequest } from 'next/server';
import { readProspectsFromBlob, addProspectsToBlob } from '@/lib/blob-store';
import type { Prospect } from '@/lib/storage';

function validateToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  return token.length >= 32;
}

function makeId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(request: NextRequest) {
  if (!validateToken(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const minScore = parseInt(searchParams.get('minScore') || '0');
    const limit = parseInt(searchParams.get('limit') || '500');

    let prospects = await readProspectsFromBlob();

    if (stage) prospects = prospects.filter(p => p.stage === stage);
    if (minScore > 0) prospects = prospects.filter(p => (p.confidenceScore || 0) >= minScore);

    // Sort by confidence score desc, then by createdAt desc
    prospects.sort((a, b) => ((b.confidenceScore || 0) - (a.confidenceScore || 0)) || (b.createdAt > a.createdAt ? 1 : -1));

    return Response.json({
      prospects: prospects.slice(0, limit),
      total: prospects.length,
      returned: Math.min(prospects.length, limit),
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!validateToken(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();

    // Support both single prospect and array of prospects
    const incoming: Partial<Prospect>[] = Array.isArray(body) ? body : [body];

    if (!incoming.length) return Response.json({ error: 'No prospects provided' }, { status: 400 });

    // Validate and build prospect objects
    const prospects: Prospect[] = [];
    const errors: string[] = [];

    for (const raw of incoming) {
      if (!raw.businessName || !raw.phone) {
        errors.push(`Skipped: missing businessName or phone (got: ${raw.businessName})`);
        continue;
      }

      prospects.push({
        id: raw.id || makeId(),
        businessName: raw.businessName,
        ownerName: raw.ownerName || 'Owner / Manager',
        phone: raw.phone,
        businessType: raw.businessType || 'Contractor',
        stage: (raw.stage as any) || 'new',
        notes: raw.notes || '',
        lastContact: raw.lastContact || new Date().toISOString().split('T')[0],
        createdAt: raw.createdAt || new Date().toISOString(),
        address: raw.address,
        website: raw.website,
        googleRating: raw.googleRating,
        reviewCount: raw.reviewCount,
        confidenceScore: raw.confidenceScore,
        googleMapsUrl: raw.googleMapsUrl,
        research: raw.research,
      });
    }

    if (!prospects.length) {
      return Response.json({ error: 'All prospects failed validation', details: errors }, { status: 400 });
    }

    const result = await addProspectsToBlob(prospects);

    return Response.json({
      ok: true,
      added: result.added,
      skipped: result.skipped,
      total: result.total,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
