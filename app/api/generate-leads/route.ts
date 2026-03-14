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
      stream: false,
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

    // Extract text from response
    if (!message.content || message.content.length === 0) {
      throw new Error('Empty response from Claude');
    }

    if (message.content[0].type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let text = message.content[0].text.trim();

    // Strip markdown code fences if present
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    text = text.trim();

    // Parse JSON
    let leads;
    try {
      leads = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Text that failed to parse:', text);
      throw new Error(`Invalid JSON from Claude: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Validate leads is an array
    if (!Array.isArray(leads)) {
      throw new Error('Response is not a JSON array');
    }

    return Response.json({ leads });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'API error';
    console.error('Generate leads error:', error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
