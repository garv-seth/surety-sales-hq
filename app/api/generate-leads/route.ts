import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLACE_TYPE_MAP: Record<string, string> = {
  'Plumber': 'plumber',
  'HVAC': 'hvac_contractor',
  'Electrician': 'electrician',
  'Landscaper': 'landscaping',
  'House Cleaner': 'cleaning_service',
  'Contractor': 'general_contractor',
  'Roofer': 'roofing_contractor',
  'Pressure Washer': 'general_contractor',
  'Pest Control': 'pest_control_service',
  'Other': 'home_goods_store',
};

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
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
}

async function fetchRealLeadsFromGoogle(
  city: string,
  state: string,
  businessType: string,
  count: number,
  minReviews: number = 10
) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('NO_GOOGLE_KEY');

  const placeType = PLACE_TYPE_MAP[businessType] || 'general_contractor';
  const query = `${businessType} in ${city} ${state}`;

  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=${placeType}&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json() as { results: PlaceResult[]; status: string };

  if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places error: ${searchData.status}`);
  }

  const places = (searchData.results || []).slice(0, Math.min(count * 3, 40));

  const detailPromises = places.map(async (place) => {
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,formatted_address,rating,user_ratings_total,website&key=${apiKey}`;
      const detailsRes = await fetch(detailsUrl);
      const detailsData = await detailsRes.json() as { result: PlaceDetails; status: string };

      if (detailsData.status !== 'OK') return null;
      const details = detailsData.result;

      if (!details?.formatted_phone_number) return null;

      const reviewCount = details.user_ratings_total || 0;
      if (reviewCount < minReviews) return null;

      const ratingBonus = Math.round((details.rating || 3) * 2);
      const reviewBonus = Math.min(20, Math.floor(reviewCount / 10) * 2);
      const confidenceScore = Math.min(98, 65 + ratingBonus + reviewBonus);

      const reasonParts = [];
      if (reviewCount) reasonParts.push(`${reviewCount} Google reviews`);
      if (details.rating) reasonParts.push(`${details.rating}★`);
      if (details.website) reasonParts.push('has website');

      return {
        businessName: details.name || place.name,
        ownerName: 'Ask for owner/manager',
        phone: details.formatted_phone_number,
        address: details.formatted_address || place.formatted_address,
        confidenceScore,
        reason: reasonParts.join(' · '),
        rating: details.rating,
        reviewCount,
        website: details.website,
        isReal: true,
      };
    } catch {
      return null;
    }
  });

  const results = (await Promise.all(detailPromises)).filter(Boolean);
  results.sort((a: any, b: any) => (b.reviewCount || 0) - (a.reviewCount || 0));
  return results.slice(0, count);
}

async function fetchFictionalLeads(
  city: string,
  state: string,
  businessType: string,
  count: number,
  confidenceMin: number
) {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Generate ${count} realistic fictional ${businessType} business leads in ${city}, ${state || 'USA'}.

For sales practice. Use realistic but fictional business names, owner names, and phone numbers.

Return a JSON array:
[
  {
    "businessName": "Jake's Plumbing",
    "ownerName": "Jake Morrison",
    "phone": "(206) 555-0142",
    "address": "1234 Main St, ${city}, ${state || 'USA'} 98101",
    "confidenceScore": 88,
    "reason": "High volume service business in competitive market"
  }
]

Requirements:
- Only include leads with confidenceScore >= ${confidenceMin}
- Use realistic local area codes for ${city}, ${state || 'USA'}
- Business names should sound like real small businesses
- Vary confidence scores between ${confidenceMin} and 95
- Reasons under 10 words

Return ONLY the JSON array, no other text.`,
      },
    ],
  });

  let text = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]';

  if (text.startsWith('```json')) text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  else if (text.startsWith('```')) text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');

  const jsonStart = text.indexOf('[');
  const jsonEnd = text.lastIndexOf(']');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    text = text.substring(jsonStart, jsonEnd + 1);
  }
  text = text.trim();

  let leads = JSON.parse(text);
  if (!Array.isArray(leads)) leads = [];
  return leads.map((l: Record<string, unknown>) => ({ ...l, isReal: false }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { city, state, businessType, count = 10, confidenceMin = 70 } = body;

    if (!city || !businessType) {
      return Response.json({ error: 'Missing city or businessType' }, { status: 400 });
    }

    let leads;
    let source = 'google';

    try {
      leads = await fetchRealLeadsFromGoogle(city, state || 'USA', businessType, count);
      if (!leads || leads.length === 0) throw new Error('No results from Google');
    } catch (googleError) {
      const errMsg = googleError instanceof Error ? googleError.message : '';
      source = errMsg === 'NO_GOOGLE_KEY' ? 'fictional_no_key' : 'fictional_fallback';
      leads = await fetchFictionalLeads(city, state, businessType, count, confidenceMin);
    }

    return Response.json({ leads, source });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'API error';
    console.error('Generate leads error:', error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
