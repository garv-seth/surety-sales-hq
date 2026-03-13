import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { objection } = await req.json();

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{
      role: 'user',
      content: `You are a sales coach for Surety (joinsurety.com) — AI accounts receivable automation for service businesses. It sends SMS reminders and AI voice calls with payment links so plumbers, HVAC, landscapers, electricians, and contractors get paid without chasing clients. Price: from $49/month. 14-day money-back guarantee. Setup: under 10 min.

A prospect on a live call just said: "${objection}"

Give me a CONCISE, natural response I can say RIGHT NOW. Max 3 sentences. No bullet points. Conversational tone. Directly address their concern, then pivot to value. Sound like a confident founder, not a script-reader.`
    }]
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return Response.json({ response: text });
}
