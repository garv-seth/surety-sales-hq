import { NextResponse } from 'next/server';
import { list } from '@vercel/blob';

export async function GET() {
  try {
    const { blobs } = await list({ prefix: 'surety-prospects.json' });
    if (!blobs || blobs.length === 0) {
      return NextResponse.json({ prospects: [], found: false });
    }

    const blob = blobs[0];
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    // Private blobs require the token as auth header
    const res = await fetch(blob.url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) {
      return NextResponse.json({ prospects: [], found: false, status: res.status });
    }

    const text = await res.text();
    const prospects = JSON.parse(text);

    return NextResponse.json({
      prospects: Array.isArray(prospects) ? prospects : [],
      found: true,
      updatedAt: blob.uploadedAt,
      count: Array.isArray(prospects) ? prospects.length : 0,
    });
  } catch (err) {
    console.error('Sync load error:', err);
    return NextResponse.json({ prospects: [], found: false, error: String(err) });
  }
}
