import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { city, state, businessType, count = 10, confidenceMin = 70 } = body;

    if (!city || !businessType) {
      return Response.json({ error: 'Missing city or businessType' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Generate ${count} realistic fictional ${businessType} business leads in ${city}, ${state || 'USA'}.

These are for sales practice purposes — use realistic but fictional business names, owner names, and phone numbers.

Return a JSON array of leads with this exact structure:
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
- Use realistic local phone area codes for ${city}, ${state || 'USA'}
- Use realistic street addresses in ${city}
- Business names should sound like real small businesses
- Owner names should be realistic
- Vary confidence scores between ${confidenceMin} and 95
- Keep reasons under 10 words

Return ONLY the JSON array, no other text.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const leads = JSON.parse(text);
    return Response.json({ leads });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'API error';
    console.error('Generate leads error:', error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
