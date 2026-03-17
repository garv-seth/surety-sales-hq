import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractJSON(text: string): string {
  let t = text.trim();
  if (t.startsWith('```json')) t = t.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  else if (t.startsWith('```')) t = t.replace(/^```\n?/, '').replace(/\n?```$/, '');
  t = t.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) t = t.substring(start, end + 1);
  return t.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { businessName, businessType, city, phone, rating, reviewCount, website } = await req.json();

    if (!businessName && !businessType) {
      return Response.json({ error: 'Missing business info' }, { status: 400 });
    }

    const contextParts = [
      businessName && `Business name: "${businessName}"`,
      businessType && `Type: ${businessType}`,
      city && `City: ${city}`,
      rating && `Google rating: ${rating}★ (${reviewCount || '?'} reviews)`,
      website && `Has website: ${website}`,
    ].filter(Boolean).join('\n');

    const industryContext: Record<string, string> = {
      Plumber: 'Plumbers do emergency + routine work. Commercial clients pay net-30/60. Residential clients sometimes ghost after work is done. Owner usually on the tools themselves.',
      HVAC: 'HVAC has seasonal cash flow crunch. Summer and winter are busy, spring/fall are slow but invoices from the rush are still outstanding. Owner often managing crews and admin.',
      Electrician: 'Electricians often do commercial work with slow AP departments. Residential permits can delay final payment. High invoice values mean one slow client is painful.',
      Landscaper: 'Recurring clients are the core — monthly billing. A few who stop paying but keep getting service is common. Owner handles billing on evenings/weekends.',
      'House Cleaner': 'Weekly clients, lots of small invoices. Some clients pay immediately, others need reminders. Owner is often the operator and the biller.',
      Contractor: 'Large invoices, milestone billing. Clients sometimes dispute charges or delay final payment. One unpaid $10k+ invoice can kill cash flow.',
      Roofer: 'High-value one-time jobs. Customers may push back after work is done. Insurance jobs add complexity. Cash flow tied to project completion.',
      default: 'Service business with recurring and one-time invoices. Owner-operated, limited admin bandwidth.',
    };

    const industryNote = industryContext[businessType] || industryContext.default;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{
        role: 'user',
        content: `You're preparing Garv for a cold call. He sells Surety — AI invoice follow-up for trade contractors ($49/mo, syncs QuickBooks, collects invoices via AI SMS + voice calls in ~3 weeks vs 60-90 days).

BUSINESS INFO:
${contextParts}

INDUSTRY CONTEXT:
${industryNote}

Generate a pre-call brief. Return JSON only, no preamble:
{
  "businessProfile": "1-2 sentences: what they likely do, estimated size (solo/small crew/mid-size), how established they seem based on name and review count",
  "painSignals": ["3 specific signals this business probably has the invoice follow-up problem", "signal 2", "signal 3"],
  "personalizedOpener": "The exact first sentence Garv says after 'Hey [name], this is Garv at Surety' — reference something specific about this business. Make it feel researched, not generic.",
  "likelyObjection": "The single most likely objection from this specific business type and how to handle it in one line",
  "callAngle": "The specific pain angle most likely to resonate — e.g. 'seasonal cash crunch' for HVAC, 'recurring clients ghosting' for landscapers, etc."
}`
      }]
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const cleanText = extractJSON(rawText);

    try {
      const data = JSON.parse(cleanText);
      return Response.json(data);
    } catch {
      console.error('Pre-call research parse error:', cleanText.substring(0, 200));
      return Response.json({ error: 'Failed to parse research' }, { status: 500 });
    }
  } catch (error) {
    console.error('Pre-call research error:', error);
    return Response.json({ error: 'Research failed' }, { status: 500 });
  }
}
