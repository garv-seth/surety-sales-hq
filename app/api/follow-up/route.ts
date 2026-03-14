import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prospectName, businessType, outcome, callNotes, repName } = body;

    if (!prospectName || !outcome) {
      return Response.json({ error: 'Missing prospectName or outcome' }, { status: 400 });
    }

    const rep = repName || 'Garv';
    const firstName = prospectName.split(' ')[0];

    const outcomeContext: Record<string, string> = {
      no_answer: 'The rep called but got no answer.',
      voicemail: 'The rep left a voicemail.',
      not_interested: 'The prospect said they were not interested.',
      demo_booked: 'The prospect agreed to a demo.',
      callback: 'The prospect asked for a callback.',
      follow_up: 'The prospect wants to think about it.',
    };

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `Generate follow-up messages for a sales call with these details:
- Prospect: ${firstName} (${businessType} owner)
- Outcome: ${outcomeContext[outcome] || outcome}
- Rep name: ${rep}
- Notes: ${callNotes || 'None'}
- Product: Surety ($49/mo, AI invoice follow-up tool)

Return a JSON object:
{
  "sms": "SMS message (max 160 chars, casual, first name only)",
  "voicemail": "voicemail script (20-30 seconds, friendly)",
  "email": "email body (3-4 short paragraphs, professional)"
}

For "not_interested" outcome: make the follow-up a 30-day re-engagement message.
For "demo_booked": make confirmation messages.
For "no_answer" or "voicemail": make a friendly follow-up.

Keep SMS under 160 characters. Return ONLY the JSON.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const data = JSON.parse(text);
    return Response.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'API error';
    console.error('Follow-up API error:', error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
