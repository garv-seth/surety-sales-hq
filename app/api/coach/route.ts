import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Hardcoded Hormozi-style responses — instant, zero API latency
// Based on what actually works in B2B SaaS cold sales for SMB trade contractors
const HARDCODED_RESPONSES: Record<string, string> = {
  "Too expensive": `Quick math — if you've got even one invoice over $500 sitting unpaid right now, the first month pays for itself 10x over. Most contractors we work with have 5–15 open invoices at any time. The question isn't whether $49 is expensive. It's whether the $3k+ sitting uncollected is. Worth 15 minutes to run the numbers on your actual pipeline?`,

  "We already handle this in-house": `Respect that — most do. This doesn't replace whoever's doing it. It handles the first 3 automated follow-ups so your person only gets involved when someone's actually being difficult. How many hours a week is that taking right now? Because if it's more than 2–3 hours, we're probably saving you that entire block.`,

  "Not the right time": `Totally get it. Here's the thing though — the invoices aging right now don't care about timing. Every week without follow-up drops collection probability by about 15%. I'm not asking you to change anything today — just 15 minutes to see the dashboard in action, you can shelf it until the timing makes sense. What's Monday afternoon look like?`,

  "I don't trust AI": `Completely understand — most people who say that have been burned by tech that overpromised. What Surety does is simple: sends a professional reminder in your name, sounds like a person, has a payment link. It's not trying to have a conversation — just nudging at the right time. Can I show you exactly what your customers actually receive? Takes 2 minutes.`,

  "My customers don't text": `You'd actually be surprised — we see 78% open rates on SMS for contractors vs under 20% on email. These are homeowners, not corporate AP departments. And for customers who genuinely don't text, we do the AI voice call too. You're covering both bases automatically. What's your current invoice email open rate look like?`,

  "I use QuickBooks already": `Good — that actually makes setup faster. We sync directly with QuickBooks, so invoices flow in automatically, zero manual entry. We're not replacing QBO, we're the automated follow-up layer on top of it that QBO doesn't have built in. Most QuickBooks users are live in under 10 minutes.`,

  "How does it work?": `Super clean — you connect QuickBooks or just paste in a phone number and invoice amount. Surety auto-schedules the first reminder at the optimal time, sends a text or makes a quick AI voice call with a payment link. Customer taps, pays. You see it in your dashboard. Nothing to manage on your end. Want me to pull up the dashboard and show you the 60-second version?`,

  "I've tried something like this before": `What didn't work with it? [Pause — genuinely curious.] Because most of what's out there is email automation, which barely moves the needle for trade contractors. We're the only one doing AI voice calls plus SMS with payment links. It's a fundamentally different mechanism — not just another email drip. What specifically fell flat last time?`,

  "They would have paid anyway": `Some of them, sure. Our dashboard tracks called-vs-uncalled payment velocity side by side, so after 30 days you can see exactly what the lift is for your specific business. We average a 23-day reduction in time-to-collect. But honestly — prove me wrong. 14-day free trial, you run your own numbers, you see the data yourself.`,

  "Just send me information": `Absolutely — but real talk, a PDF isn't going to show you what 15 minutes on the dashboard does. I could send you 10 pages and you'd still have questions. What's your calendar look like this week? I'll send you a quick Calendly link, 15 minutes, and if it's not a fit I'll leave you alone.`,

  "Call me back another time": `Of course. When's genuinely better — I'll book it right now so neither of us has to think about it again. Tuesday morning or Wednesday afternoon work for you?`,

  "We don't have that many invoices": `How many jobs a month are you running? Even at 10 jobs at $400 average — that's $4k in receivables you're managing every month. Even recovering one late invoice a month more than covers the cost. And honestly the bigger ROI is usually the 3–4 hours a week you stop spending chasing.`,
};

export async function POST(req: NextRequest) {
  try {
    const { objection } = await req.json();

    // Return hardcoded response instantly if we have one
    if (HARDCODED_RESPONSES[objection]) {
      return Response.json({ response: HARDCODED_RESPONSES[objection], cached: true });
    }

    // AI fallback for custom/unknown objections
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `You are helping Garv sell Surety (joinsurety.com) — AI invoice follow-up for trade contractors. $49/mo, syncs with QuickBooks, gets invoices paid via AI SMS + voice calls in ~3 weeks. 14-day guarantee.

A prospect just said: "${objection}"

Give a 2–3 sentence response. Be direct, confident, conversational — like Alex Hormozi handles objections. Don't be sycophantic. Acknowledge briefly, reframe to value, move to low-commitment next step (15-min Zoom).`
      }]
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return Response.json({ response: text, cached: false });
  } catch (error) {
    console.error('Coach API error:', error);
    return Response.json({ error: 'Failed to get response' }, { status: 500 });
  }
}
