import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prospectName, businessType } = body;

    if (!businessType) {
      return Response.json({ error: 'Missing businessType' }, { status: 400 });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `You are a sales coach helping prepare for a cold call to a ${businessType} business owner${prospectName ? ` named ${prospectName}` : ''}.

We sell Surety ($49/month), an AI-powered invoice follow-up tool that sends SMS reminders and makes voice calls to help service businesses get paid faster.

Return a JSON object with exactly these keys:
{
  "painPoints": ["pain point 1", "pain point 2", "pain point 3"],
  "bestOpener": "one-sentence opener question",
  "commonObjections": ["objection 1", "objection 2", "objection 3"],
  "whatTheyCareMost": ["thing 1", "thing 2", "thing 3"]
}

Be specific to ${businessType} owners. Keep each item under 10 words. Return ONLY the JSON, no other text.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const data = JSON.parse(text);
    return Response.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'API error';
    console.error('Research API error:', error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
