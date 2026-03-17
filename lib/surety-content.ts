// lib/surety-content.ts
// Garv's exact call script — tuned for skilled trade contractors

export const CALL_SCRIPT_STEPS = [
  {
    step: 1,
    title: "OPENER",
    duration: "30 sec",
    script: `"Hey [NAME]... this is Garv at Surety. I know I'm calling out of the blue — do you mind if I grab like literally half a minute? I'll tell you why I called, and you can tell me if it's relevant or not."

[WAIT — let them respond.]
• "Sure" / "Go ahead" → move to Step 2
• "Busy right now" → "Totally, when's a better time?" → book it and hang up
• "What's this about?" → "Totally fair — it's about invoice follow-up. Half a minute?"`,
  },
  {
    step: 2,
    title: "PATTERN INTERRUPT",
    duration: "60 sec",
    script: `"Quick honest question — when you finish a job and the customer just goes quiet... do you end up writing it off, or does someone on your team spend time chasing it?"

[WAIT — let them answer. Either way, you win:]
→ "We chase it" — "Right, so you're burning time on it."
→ "We write it off" — "Yeah, most guys do. That's exactly the problem we're solving."

"Ok... so this should be right in your wheelhouse — but cut me off at any point if it's not."`,
  },
  {
    step: 3,
    title: "THUMBNAIL PITCH",
    duration: "90 sec",
    script: `"So — quick thumbnail on us... Surety is an AI system built specifically for skilled trade contractors like you. What we're seeing is that most of your customers know they owe you, but invoices just... sit. And following up yourself takes time you don't have between jobs.

(pause)

So we built AI that automatically times reminders — calls and texts — when customers are actually most likely to respond. And it syncs directly with QuickBooks, so there's zero extra work on your end. Instead of chasing someone for 60, 90 days — you're collecting in about 3 weeks."

[Pause. Let it land. Don't fill the silence.]`,
  },
  {
    step: 4,
    title: "DOWNSELL & CLOSE",
    duration: "",
    script: `"But super simple [NAME] — look, I know you might already be managing this somehow, and that's exactly why we're doing quick 20-minute Zoom walkthroughs just to show you the dashboard in action. And then from there, maybe you keep us in the back pocket for down the road.

Are you open to jumping on one maybe Monday afternoon? Should take like 14, 15 minutes."

[SHUT UP. Wait for yes or no. Do NOT speak first.]`,
  },
  {
    step: 5,
    title: "HANDLE OBJECTIONS",
    duration: "",
    script: `[→ Click the objection button on the right for an instant response]

Quick handles if you're in the moment:
• "In-house already" → "This sits on top, takes it off their plate."
• "Bad time" → "When's genuinely better? I'll book it right now."
• "Just send info" → "Info won't show it like 15 min does. Tuesday work?"
• "Not enough invoices" → "Even 10 jobs at $400 each is $4k in receivables."`,
  },
];

// Objections that cover 95% of calls — all hardcoded responses in /api/coach
export const OBJECTIONS = [
  { emoji: "💸", label: "Too expensive", text: "Too expensive" },
  { emoji: "🤷", label: "We handle it in-house", text: "We already handle this in-house" },
  { emoji: "⏰", label: "Bad timing right now", text: "Not the right time" },
  { emoji: "🔒", label: "Don't trust AI", text: "I don't trust AI" },
  { emoji: "📱", label: "Customers don't text", text: "My customers don't text" },
  { emoji: "🏢", label: "Already use QuickBooks", text: "I use QuickBooks already" },
  { emoji: "❓", label: "How does it work?", text: "How does it work?" },
  { emoji: "😤", label: "Tried something before", text: "I've tried something like this before" },
  { emoji: "💬", label: "They'd have paid anyway", text: "They would have paid anyway" },
  { emoji: "📧", label: "Just send me info", text: "Just send me information" },
  { emoji: "📞", label: "Call me later", text: "Call me back another time" },
  { emoji: "🤝", label: "Not enough invoices", text: "We don't have that many invoices" },
];

export const QUICK_REFERENCE = [
  { icon: "💰", label: "Price", value: "from $49/month" },
  { icon: "⏱️", label: "Setup", value: "under 10 min" },
  { icon: "🔄", label: "Guarantee", value: "14-day money-back" },
  { icon: "📊", label: "Result", value: "Collect in ~3 weeks vs 60-90 days" },
  { icon: "🔗", label: "QuickBooks", value: "Direct sync, zero manual entry" },
  { icon: "🎯", label: "ICP", value: "Plumbers, HVAC, Electricians, Landscapers, Contractors" },
  { icon: "📅", label: "Close ask", value: "20-min Zoom to show dashboard" },
  { icon: "🔗", label: "Signup", value: "joinsurety.com" },
];

export const BUSINESS_TYPES = [
  "Plumber",
  "HVAC",
  "Electrician",
  "Landscaper",
  "House Cleaner",
  "Contractor",
  "Roofer",
  "Pressure Washer",
  "Pest Control",
  "Other"
];

export const INDUSTRY_OPENERS: Record<string, string> = {
  Plumber: `"Hey [NAME], quick honest question — when you finish a job and someone just goes quiet on the invoice... do you end up writing it off or chasing it yourself?"`,
  HVAC: `"Hey [NAME], do you ever hit a cash flow crunch between seasons because invoices from the last rush haven't cleared yet?"`,
  Electrician: `"Hey [NAME], do you do any commercial work where payment terms stretch 30, 60, 90 days? Because that's usually where guys are leaving the most money on the table."`,
  Landscaper: `"Hey [NAME], with recurring clients, do you ever have people who just... stop paying but keep expecting service?"`,
  "House Cleaner": `"Hey [NAME], with all your weekly clients paying different amounts on different schedules — how much time are you spending just tracking down who paid and who didn't?"`,
  Contractor: `"Hey [NAME], with the size of invoices you're dealing with, what does your follow-up process look like when a client is late?"`,
  Roofer: `"Hey [NAME], roofing jobs are big tickets — what happens when someone drags their feet on payment after you've already done the work?"`,
  default: `"Hey [NAME], quick honest question — when you finish a job and a customer just goes quiet on the invoice, do you write it off or chase it yourself?"`,
};

export const COLD_CALL_SCRIPTS: Record<string, { title: string; script: string }> = {
  plumber: {
    title: "Plumber",
    script: `Hey [Name], this is Garv at Surety. Quick honest question — when you finish a job and the customer just goes quiet... do you end up writing it off, or does someone on your team spend time chasing it?

[Wait]

Right. So that's exactly what we're solving. Surety is AI built specifically for trade contractors — it automatically times SMS reminders and voice calls when customers are most likely to respond, syncs with QuickBooks, zero extra work. Instead of chasing someone for 60, 90 days — you're collecting in about 3 weeks.

Look — I'm not asking you to change anything today. We're doing 20-minute Zoom walkthroughs to show the dashboard in action. Are you open to jumping on one maybe Monday afternoon? Takes like 15 minutes.`
  },
  hvac: {
    title: "HVAC",
    script: `Hey [Name], this is Garv at Surety. Quick honest question — do you ever hit a cash crunch between seasons because invoices from the last rush just haven't cleared yet?

[Wait]

That seasonal squeeze is brutal. Surety automates invoice follow-up — AI sends SMS reminders AND makes voice calls on your behalf with payment links. Customers tap and pay. Syncs with QuickBooks. Instead of waiting 60-90 days, you're collecting in 3 weeks.

Just asking for 20 minutes on a Zoom to show you the dashboard. Monday afternoon work?`
  },
  landscaper: {
    title: "Landscaper",
    script: `Hey [Name], this is Garv at Surety. Quick honest question — with recurring clients, do you ever have people who just stop paying but keep wanting service?

[Wait]

Yeah, that's super common. Surety automates the entire follow-up process — AI sends SMS and makes voice calls with payment links so clients pay before the next service. Syncs with QuickBooks, nothing to manage.

Can I grab 20 minutes to show you the dashboard? Monday or Tuesday this week?`
  },
  electrician: {
    title: "Electrician",
    script: `Hey [Name], this is Garv at Surety. Quick honest question — do you do commercial work where payment terms stretch 30, 60, 90 days?

[Wait]

Commercial clients are the worst for slow pay. You passed inspection, did the work, now you're waiting on accounting. Surety automates the follow-up — AI sends professional SMS reminders AND makes voice calls with payment links. Way harder to ignore than an email.

Can I grab 20 minutes to show you the dashboard in action? Takes like 15 minutes.`
  },
};

export const COLD_TEXT_TEMPLATES = [
  {
    type: "Generic",
    text: "Hey [Name], do you chase late invoices manually? Surety automates it — AI calls + texts with payment links. 14-day free trial → joinsurety.com"
  },
  {
    type: "Plumber/HVAC",
    text: "Hi [Name], tired of chasing payments after jobs? Surety's AI handles the follow-up — SMS + voice calls. 14-day free trial → joinsurety.com"
  },
  {
    type: "Landscaper/Cleaner",
    text: "Hey [Name], Surety automates invoice follow-up for recurring clients. AI SMS + calls, syncs with QuickBooks. 14-day free trial → joinsurety.com"
  }
];

export const COLD_EMAIL = {
  subject: "Quick question about your invoices, [Name]",
  body: `Hi [Name],

Saw you run [Business]. Quick question — how much time do you spend chasing customers for payment after jobs?

We built Surety to automate exactly that. AI-powered SMS reminders AND voice calls on your behalf with payment links. Customers tap and pay in seconds. Syncs directly with QuickBooks.

Most contractors we work with start collecting in 3 weeks vs 60-90 days.

14-day money-back guarantee. Takes under 10 minutes to set up.

Worth a 15-minute Zoom to see the dashboard? → joinsurety.com/demo

– Garv`
};

export const FOLLOW_UP_SCRIPTS = [
  {
    title: "Follow-Up Call (No Answer)",
    script: `Hey [Name], this is Garv from Surety — tried you earlier. I work with [business type] owners who are tired of chasing late invoices, wanted to share something that's been working. Give me a call back when you get a chance, or check out joinsurety.com. Talk soon.`
  },
  {
    title: "Follow-Up Text",
    script: `Hey [Name], Garv from Surety. Tried calling — wanted to show you how we help [business type] owners collect invoices 3x faster with AI. 15 min? → joinsurety.com`
  },
  {
    title: "Follow-Up Email",
    script: `Hi [Name],

Just following up on my earlier call. I help [business type] owners automate invoice follow-up so they stop losing money to slow-paying clients.

Surety sends AI-powered SMS reminders + voice calls with payment links on your behalf. Syncs with QuickBooks. 14-day free trial.

Even if the timing isn't right — is invoice follow-up eating time for you right now?

→ joinsurety.com

– Garv`
  }
];
