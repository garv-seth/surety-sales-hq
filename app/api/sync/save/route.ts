import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  try {
    const { prospects } = await req.json();
    if (!Array.isArray(prospects)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    const blob = await put('surety-prospects.json', JSON.stringify(prospects), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return NextResponse.json({ ok: true, url: blob.url, count: prospects.length });
  } catch (err) {
    console.error('Sync save error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
