// lib/surety-content.ts
export const CALL_SCRIPT_STEPS = [
  {
    step: 1,
    title: "OPENER",
    duration: "30 sec",
    script: `"Hey [Name], this is Garv from Surety — quick question, do you guys send invoices after jobs?"`
  },
  {
    step: 2,
    title: "PAIN PROBE",
    duration: "60 sec",
    script: `"How are you currently following up when someone hasn't paid?"\n"Roughly how many open invoices do you have right now?"\n"What does that cost you in time per week?"`
  },
  {
    step: 3,
    title: "PITCH",
    duration: "90 sec",
    script: `"So Surety automates that entire process. Our AI sends SMS reminders AND makes voice calls on your behalf with a payment link — customers just tap and pay. No more chasing. Most customers recover 40-60% of outstanding invoices in the first week."`
  },
  {
    step: 4,
    title: "HANDLE OBJECTIONS",
    duration: "",
    script: `"[Click an objection button on the right →]"`
  },
  {
    step: 5,
    title: "CLOSE",
    duration: "",
    script: `"Here's what I'd suggest — let's get you on a free 14-day trial. No credit card. If it doesn't work, you cancel, no hard feelings. Can I send you the signup link right now? → joinsurety.com"`
  }
];

export const OBJECTIONS = [
  { emoji: "💸", label: "Too expensive", text: "Too expensive" },
  { emoji: "🤷", label: "I handle it myself", text: "I handle it myself" },
  { emoji: "⏰", label: "Not the right time", text: "Not the right time" },
  { emoji: "🔒", label: "I don't trust AI", text: "I don't trust AI" },
  { emoji: "📱", label: "My customers don't text", text: "My customers don't text" },
  { emoji: "🏢", label: "I use QuickBooks/software", text: "I use QuickBooks/software" },
  { emoji: "❓", label: "How does it work?", text: "How does it work?" },
  { emoji: "😤", label: "I've tried this before", text: "I've tried this before" },
];

export const QUICK_REFERENCE = [
  { icon: "💰", label: "Price", value: "from $49/month" },
  { icon: "⏱️", label: "Setup", value: "under 10 min" },
  { icon: "🔄", label: "Guarantee", value: "14-day money-back" },
  { icon: "📊", label: "Result", value: "40-60% invoices paid in week 1" },
  { icon: "🎯", label: "Works for", value: "Plumbers, HVAC, Landscapers, Electricians, Cleaners, Contractors" },
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

export const COLD_CALL_SCRIPTS: Record<string, { title: string; script: string }> = {
  plumber: {
    title: "Plumber",
    script: `Hey [Name], this is [You] from Surety. Quick question — do you have customers that take forever to pay after a job?

Yeah, that's the #1 pain I hear from plumbers. You do the work, send the invoice, then spend hours chasing people down.

We built Surety to automate that entire process. Our AI sends SMS reminders AND makes voice calls on your behalf with a payment link — customers just tap and pay. No more chasing.

Most plumbers we work with recover 40-60% of their outstanding invoices in the first week alone.

It's $49/month and takes under 10 minutes to set up. 14-day free trial, no credit card needed. Want me to send you the link right now? It's joinsurety.com`
  },
  hvac: {
    title: "HVAC",
    script: `Hey [Name], this is [You] from Surety. Quick question — do you ever have cash flow issues between seasons because customers haven't paid their invoices yet?

Yeah, that seasonal crunch is brutal for HVAC businesses. You're running hard in summer and winter, then waiting months to get paid.

We built Surety to automate invoice follow-up. Our AI sends SMS reminders AND makes voice calls on your behalf with a payment link — customers tap and pay instantly.

Most HVAC companies we work with see 40-60% of outstanding invoices paid in the first week.

$49/month, under 10 minutes to set up. 14-day free trial, no credit card. Want the link? It's joinsurety.com`
  },
  landscaper: {
    title: "Landscaper",
    script: `Hey [Name], this is [You] from Surety. Quick question — with recurring clients, do you ever have people who just... stop paying but keep wanting service?

That's super common in landscaping. You've got 30, 40 recurring clients and tracking who paid who didn't becomes a part-time job.

Surety automates that entire follow-up process. Our AI sends SMS reminders AND makes voice calls with a payment link — your clients tap and pay, you stay focused on the work.

Most landscapers recover 40-60% of overdue invoices in week one.

$49/month, 10 minutes to set up, 14-day free trial. Want me to send you the link? joinsurety.com`
  },
  electrician: {
    title: "Electrician",
    script: `Hey [Name], this is [You] from Surety. Quick question — do you do any commercial work where the payment terms stretch out 30, 60, 90 days?

Yeah, commercial clients are the worst for slow pay. You did the work, passed inspection, and now you're waiting on accounting.

Surety automates the follow-up. Our AI sends SMS reminders AND makes AI voice calls with a payment link — way harder to ignore than an email invoice.

Most electricians we work with collect 40-60% of overdue invoices in the first week.

$49/month, takes 10 minutes to set up. 14-day free trial, no risk. Want the link? joinsurety.com`
  },
  cleaner: {
    title: "House Cleaner",
    script: `Hey [Name], this is [You] from Surety. Quick question — with all your weekly clients, how much time do you spend every month tracking down payments?

Yeah, when you've got 20+ clients paying different amounts on different schedules, it adds up fast.

Surety automates that whole process. Our AI sends SMS reminders AND makes voice calls with payment links — clients tap and pay in seconds.

Most cleaning businesses we work with collect 40-60% of overdue invoices in the first week. Saves hours every month.

$49/month, 10 minutes to set up, 14-day free trial. No risk. Want the link? joinsurety.com`
  },
  contractor: {
    title: "Contractor",
    script: `Hey [Name], this is [You] from Surety. Quick question — with the size of invoices you're dealing with, what's your follow-up process when a client is late on payment?

Yeah, one unpaid $10k invoice can seriously mess up your cash flow. And following up feels awkward when you want to keep the relationship.

Surety takes that awkwardness away. Our AI sends professional SMS reminders AND makes voice calls with payment links — so you stay the good guy and still get paid.

Most contractors recover 40-60% of overdue invoices in the first week. On big invoices, that ROI is massive.

$49/month. 10 minutes to set up. 14-day money-back guarantee. Want the link? joinsurety.com`
  }
};

export const COLD_TEXT_TEMPLATES = [
  {
    type: "Generic",
    text: "Hey [Name], do you chase late invoices? Surety automates it via SMS + AI calls. Free 14-day trial → joinsurety.com"
  },
  {
    type: "Plumber/HVAC",
    text: "Hi [Name], tired of chasing payments after jobs? Surety's AI handles it — SMS + voice calls. 14-day free trial → joinsurety.com"
  },
  {
    type: "Landscaper/Cleaner",
    text: "Hey [Name], Surety automates invoice follow-up for recurring clients. AI SMS + calls. Free 14-day trial → joinsurety.com"
  }
];

export const COLD_EMAIL = {
  subject: "Quick question about your invoices, [Name]",
  body: `Hi [Name],

Saw you run [Business]. Quick question — how much time do you spend chasing customers for payment after jobs?

We built Surety to automate exactly that. It sends AI-powered SMS reminders AND makes voice calls on your behalf with payment links. Customers tap and pay in seconds.

Most service businesses we work with recover 40-60% of outstanding invoices in the first week.

14-day money-back guarantee. Takes under 10 minutes to set up.

Worth a 10-minute call? → joinsurety.com/demo

– Garv`
};

export const FOLLOW_UP_SCRIPTS = [
  {
    title: "Follow-Up Call (No Answer)",
    script: `Hey [Name], this is Garv from Surety — tried you earlier. I'm working with [business type] owners who are tired of chasing late invoices, and wanted to share something that might help. Give me a call back at your convenience, or check out joinsurety.com. Talk soon.`
  },
  {
    title: "Follow-Up Text",
    script: `Hey [Name], Garv from Surety. Tried calling — wanted to share how we help [business type] owners get paid faster automatically. 5 min? Or → joinsurety.com`
  },
  {
    title: "Follow-Up Email",
    script: `Hi [Name],

Just following up on my earlier call. I help [business type] owners automate invoice follow-up so they stop losing money to slow-paying clients.

Surety sends AI-powered SMS reminders + voice calls with payment links on your behalf. 14-day free trial, no credit card.

Even if the timing isn't right — is invoice follow-up a problem for you right now?

→ joinsurety.com

– Garv`
  }
];
