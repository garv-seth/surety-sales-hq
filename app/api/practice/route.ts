import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text: string, bracket: '{' | '[' = '{'): string {
  let t = text.trim();
  if (t.startsWith('```json')) t = t.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  else if (t.startsWith('```')) t = t.replace(/^```\n?/, '').replace(/\n?```$/, '');
  t = t.trim();
  const close = bracket === '{' ? '}' : ']';
  const start = t.indexOf(bracket);
  const end = t.lastIndexOf(close);
  if (start !== -1 && end !== -1 && end > start) t = t.substring(start, end + 1);
  return t.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userMessage, businessType, scenario, conversationHistory } = body;

    if (!userMessage || !businessType) {
      return Response.json({ error: 'Missing userMessage or businessType' }, { status: 400 });
    }

    const difficultyMap: Record<string, string> = {
      'Skeptical Owner': 'You are skeptical but not rude. Ask tough questions.',
      'Busy Owner': 'You are very busy and want to get off the phone quickly.',
      'Price-Sensitive': 'You are very focused on price and keep pushing back on cost.',
      'Tech-Averse': 'You are skeptical of technology and AI in general.',
    };

    const difficultyPrompt = difficultyMap[scenario] || 'You are a realistic business owner.';

    const systemPrompt = `You are ${businessType} owner Mike. You run a small service business. You received a cold call from a sales rep selling Surety, an AI invoice follow-up tool for $49/month.

${difficultyPrompt}

Respond naturally as Mike would. Keep responses to 2-3 sentences max.

After your response as Mike, add a separator "---FEEDBACK---" and then give brief coaching feedback on the sales rep's message (1-2 sentences). Be specific about what they did well or what to improve.

Then add "---SCORE---" followed by a number from 1-10 rating their message.

Then add "---CONTINUE---" followed by "yes" if the conversation should continue, or "end" if this is a natural conclusion point (after 8+ exchanges or if they've clearly succeeded or failed).

Format exactly like:
[Mike's response]
---FEEDBACK---
[coaching feedback]
---SCORE---
[number]
---CONTINUE---
[yes/end]`;

    const messages = [
      ...(conversationHistory || []),
      { role: 'user' as const, content: userMessage },
    ];

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const parts = text.split('---FEEDBACK---');
    const response = parts[0].trim();
    const rest = parts[1] || '';
    const feedbackParts = rest.split('---SCORE---');
    const feedback = feedbackParts[0].trim();
    const scoreParts = (feedbackParts[1] || '').split('---CONTINUE---');
    const score = parseInt(scoreParts[0].trim()) || 5;
    const shouldContinue = (scoreParts[1] || 'yes').trim() !== 'end';

    return Response.json({ response, feedback, score, shouldContinue });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'API error';
    console.error('Practice API error:', error);
    return Response.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { scores, businessType, scenario } = body;

    const avg = scores.length ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : '5.0';

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `A sales rep just completed a practice call with a ${businessType} owner in a "${scenario}" scenario.
Scores per exchange: ${scores.join(', ')}
Average score: ${avg}/10

Provide a coaching report as JSON:
{
  "finalScore": ${avg},
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "summary": "one sentence overall assessment"
}

Return ONLY the JSON.`,
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    let data;
    try {
      data = JSON.parse(extractJSON(raw));
    } catch {
      data = { finalScore: parseFloat(avg), strengths: [], improvements: [], summary: 'Session complete.' };
    }
    return Response.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'API error';
    return Response.json({ error: msg }, { status: 500 });
  }
}
