import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { addProspectsToBlob } from '@/lib/blob-store';
import type { Prospect } from '@/lib/storage';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function validateToken(req: NextRequest): boolean {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') && h.slice(7).trim().length >= 32;
}

function makeId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Google Places Types ───────────────────────────────────────────────────────
interface PlaceSummary {
  place_id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
}

interface PlaceDetails {
  name: string;
  formatted_phone_number?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  opening_hours?: { weekday_text?: string[] };
  photos?: unknown[];
  business_status?: string;
  url?: string;
}

// ─── Google Places helpers ─────────────────────────────────────────────────────
const PLACE_TYPE_MAP: Record<string, string> = {
  Plumber: 'plumber',
  HVAC: 'hvac_contractor',
  Electrician: 'electrician',
  Roofer: 'roofing_contractor',
  Contractor: 'general_contractor',
  Landscaper: 'landscaping',
  'House Cleaner': 'house_cleaning_service',
  'Pest Control': 'pest_control_service',
  Painter: 'painter',
  Handyman: 'handyman',
};

async function searchPlaces(query: string, pageToken?: string): Promise<{ results: PlaceSummary[]; nextPageToken?: string }> {
  const key = process.env.GOOGLE_PLACES_API_KEY!;
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${key}`;
  if (pageToken) url += `&pagetoken=${encodeURIComponent(pageToken)}`;
  const res = await fetch(url);
  const data = await res.json() as { results: PlaceSummary[]; next_page_token?: string; status: string };
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') throw new Error(`Places API: ${data.status}`);
  return { results: data.results || [], nextPageToken: data.next_page_token };
}

async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY!;
  const fields = 'name,formatted_phone_number,formatted_address,rating,user_ratings_total,website,opening_hours,photos,business_status,url';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json() as { result: PlaceDetails; status: string };
  if (data.status !== 'OK') return null;
  return data.result;
}

// ─── Confidence scoring ────────────────────────────────────────────────────────
function scoreProspect(details: PlaceDetails): number {
  if (!details.formatted_phone_number) return 0; // no phone = skip
  let score = 30; // base: has phone

  if (details.website) score += 15;

  const rating = details.rating || 0;
  if (rating >= 4.5) score += 20;
  else if (rating >= 4.0) score += 15;
  else if (rating >= 3.5) score += 8;
  else if (rating > 0) score += 3;

  const reviews = details.user_ratings_total || 0;
  if (reviews >= 50) score += 20;
  else if (reviews >= 20) score += 15;
  else if (reviews >= 10) score += 10;
  else if (reviews >= 5) score += 5;

  if (details.opening_hours?.weekday_text?.length) score += 5;
  if (details.business_status === 'OPERATIONAL') score += 5;
  if ((details.photos?.length || 0) >= 3) score += 5;

  return Math.min(score, 98);
}

// ─── Per-prospect AI research ──────────────────────────────────────────────────
const INDUSTRY_CONTEXT: Record<string, string> = {
  Plumber: 'Emergency + routine work. High urgency jobs, customers often pay quickly but commercial clients can drag. Owner often on the tools themselves.',
  HVAC: 'Seasonal cash flow crunch. Summer/winter busy, but invoices from rush period still outstanding in slow season. Crews are expensive.',
  Electrician: 'Commercial jobs with slow AP departments. Permits delay final payment. High invoice values — one slow payer is painful.',
  Roofer: 'High-value one-time jobs. Customers sometimes dispute after work is done. Insurance jobs add complexity and delay.',
  Contractor: 'Large milestone invoices. Clients push back on final payment. One unpaid $15k invoice can kill cash flow for weeks.',
  Landscaper: 'Recurring clients, monthly billing. A few who stop paying but keep getting service is extremely common.',
  'House Cleaner': 'Lots of small invoices. Some clients pay immediately, others need 3+ reminders. Owner is operator and biller.',
  'Pest Control': 'Recurring service plans, customers forget to renew. No-shows on payment despite ongoing service.',
  Painter: 'Project-based, material costs upfront. Customers sometimes disappear after punch-list phase.',
  Handyman: 'Small jobs, many clients. Easy to let small invoices slide. Chasing $200 doesn\'t feel worth it but it adds up.',
};

async function researchProspect(business: {
  name: string;
  type: string;
  city: string;
  rating?: number;
  reviews?: number;
  website?: string;
}): Promise<Prospect['research']> {
  const industryNote = INDUSTRY_CONTEXT[business.type] || 'Service business, owner-operated.';

  const contextParts = [
    `Business: "${business.name}"`,
    `Type: ${business.type} in ${business.city}, WA`,
    business.rating ? `Google: ${business.rating}★ (${business.reviews || 0} reviews)` : '',
    business.website ? `Website: ${business.website}` : 'No website found',
  ].filter(Boolean).join('\n');

  const prompt = `You're briefing Garv for a cold call. He sells Surety — AI invoice follow-up for trade contractors ($49/mo, syncs QuickBooks, collects invoices via AI SMS + voice in ~3 weeks vs 60-90 days).

BUSINESS:
${contextParts}

INDUSTRY:
${industryNote}

Return JSON only:
{
  "businessProfile": "1-2 sentences on what they do, estimated size (solo op / small crew / mid-size), how established",
  "painPoints": ["specific pain #1 for this business", "pain #2", "pain #3"],
  "personalizedOpener": "Exact opener for the pattern-interrupt. Garv says: 'Do you want the good news or the bad news?' — if bad: 'Well, this is a cold call... but a very researched one.' Then this opener. Make it hyper-specific to THIS business name and type. Reference their reviews or size.",
  "talkingPoints": ["specific stat or angle that resonates", "point 2", "point 3"],
  "likelyObjection": "Most likely objection + one-line reframe",
  "callAngle": "The single sharpest angle: e.g. 'You have 47 reviews — you're busy enough that chasing invoices is killing your evenings'"
}`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });
    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '{}';
    const clean = text.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    const parsed = JSON.parse(clean.substring(start, end + 1));
    return { ...parsed, researchedAt: new Date().toISOString() };
  } catch {
    return {
      businessProfile: `${business.type} based in ${business.city}, WA.`,
      painPoints: ['Late invoice payments', 'Chasing unpaid invoices manually', 'Cash flow unpredictability'],
      personalizedOpener: `I was looking at ${business.name} — with your volume of work, are invoice follow-ups eating into your evenings?`,
      talkingPoints: ['Syncs with QuickBooks', 'AI does follow-ups automatically', 'Gets paid in ~3 weeks avg'],
      likelyObjection: '"We already have a system" → Ask: how long does it take to get paid on average?',
      callAngle: 'Time saved on invoice chasing = more jobs booked',
      researchedAt: new Date().toISOString(),
    };
  }
}

// ─── Main batch endpoint ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!validateToken(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const {
      cities = ['Seattle', 'Bellevue', 'Tacoma', 'Kirkland', 'Renton'],
      businessTypes = ['Plumber', 'HVAC', 'Electrician', 'Roofer', 'Contractor'],
      state = 'WA',
      maxPerCombo = 15,
      minScore = 60,
      runResearch = true,
      paginate = false, // set true to get up to 60 results per combo (costs more)
    } = body;

    const allResults: Prospect[] = [];
    const log: string[] = [];
    let searchCount = 0;
    let detailCount = 0;

    // Build all city x type combos and process in parallel for speed
    const combos: [string, string][] = [];
    for (const city of cities) for (const btype of businessTypes) combos.push([city, btype]);

    const comboResults = await Promise.allSettled(combos.map(async ([city, btype]) => {
      const localLog: string[] = [];
      const qualified: Prospect[] = [];
      try {
          const query = `${btype} near ${city} ${state}`;
          localLog.push(`Searching: ${query}`);

          let allPlaces: PlaceSummary[] = [];
          let nextToken: string | undefined;
          let pages = 0;
          const maxPages = paginate ? 3 : 1;

          do {
            const { results, nextPageToken } = await searchPlaces(query, nextToken);
            allPlaces = allPlaces.concat(results);
            nextToken = nextPageToken;
            pages++;
            if (nextToken && pages < maxPages) await new Promise(r => setTimeout(r, 2000));
          } while (nextToken && pages < maxPages && allPlaces.length < maxPerCombo * 2);

          const candidates = allPlaces.slice(0, Math.min(maxPerCombo * 2, 30));
          const detailResults = await Promise.allSettled(candidates.map(p => getPlaceDetails(p.place_id)));

          for (let i = 0; i < candidates.length; i++) {
            const result = detailResults[i];
            if (result.status !== 'fulfilled' || !result.value) continue;
            const details = result.value;
            const score = scoreProspect(details);
            if (score < minScore) continue;

            const prospect: Prospect = {
              id: makeId(),
              businessName: details.name || candidates[i].name,
              ownerName: 'Owner / Manager',
              phone: details.formatted_phone_number!,
              businessType: btype,
              stage: 'new',
              notes: '',
              lastContact: new Date().toISOString().split('T')[0],
              createdAt: new Date().toISOString(),
              address: details.formatted_address,
              website: details.website,
              googleRating: details.rating,
              reviewCount: details.user_ratings_total,
              confidenceScore: score,
              googleMapsUrl: details.url,
            };
            qualified.push(prospect);
            if (qualified.length >= maxPerCombo) break;
          }

          localLog.push(`  → ${qualified.length} qualified from ${candidates.length} candidates`);

          if (runResearch && qualified.length > 0) {
            const researchResults = await Promise.allSettled(
              qualified.map(p => researchProspect({
                name: p.businessName,
                type: btype,
                city,
                rating: p.googleRating,
                reviews: p.reviewCount,
                website: p.website,
              }))
            );
            for (let i = 0; i < qualified.length; i++) {
              const r = researchResults[i];
              if (r.status === 'fulfilled' && r.value) {
                qualified[i].research = r.value;
              }
            }
            localLog.push(`  → Research complete for ${qualified.length} prospects`);
          }
      } catch (err) {
        localLog.push(`  ⚠ Error for ${city}/${btype}: ${String(err)}`);
      }
      return { qualified, log: localLog, searched: 1, details: qualified.length };
    }));

    for (const r of comboResults) {
      if (r.status === 'fulfilled') {
        allResults.push(...r.value.qualified);
        log.push(...r.value.log);
        searchCount += r.value.searched;
        detailCount += r.value.details;
      }
    }
    // Write to Blob
    const blobResult = await addProspectsToBlob(allResults);

    return Response.json({
      ok: true,
      generated: allResults.length,
      added: blobResult.added,
      skipped: blobResult.skipped,
      totalInDb: blobResult.total,
      searchApiCalls: searchCount,
      detailApiCalls: detailCount,
      log,
    });
  } catch (err) {
    console.error('Lead gen error:', err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// GET: preview what a run would generate without writing
export async function GET(req: NextRequest) {
  if (!validateToken(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return Response.json({
    usage: 'POST with { cities, businessTypes, state, maxPerCombo, minScore, runResearch, paginate }',
    defaultCities: ['Seattle', 'Bellevue', 'Tacoma', 'Kirkland', 'Renton', 'Everett', 'Redmond', 'Bothell', 'Issaquah', 'Federal Way'],
    defaultTypes: ['Plumber', 'HVAC', 'Electrician', 'Roofer', 'Contractor', 'Landscaper', 'Pest Control', 'Painter'],
    minScore: 60,
    note: 'Researches each prospect with Claude before adding to the database',
  });
}


