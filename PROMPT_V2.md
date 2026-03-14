# Surety Sales HQ v2 - Complete Rebuild Prompt

## PROJECT OVERVIEW
**App Name:** Surety HQ  
**Current Version:** v1 (Dashboard, Coach, Prospects, Templates, Analytics pages exist)  
**Target:** Complete redesign + major feature additions  
**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Anthropic Claude API  
**Storage:** localStorage only (no database)  
**Use Case:** Sales rep tool for calling prospects in service businesses (plumbing, HVAC, etc) and selling Surety ($49/month invoice automation)  
**Personal Use:** No auth, no payments, no subscriptions

---

## DESIGN OVERHAUL (PRIORITY #1)

### Current Problem
The existing v1 design is inconsistent, uses vibe-coded styling, and doesn't follow a cohesive system. Everything needs to be rebuilt with a modern, professional aesthetic.

### Design System: Dark Sidebar + Light Content

#### **Colors**
- **Sidebar Background:** `#030712` (bg-gray-950)
- **Accent Color:** `#10b981` (emerald-500) - used for active states, CTAs, highlights
- **Content Background:** White (#ffffff)
- **Text on Dark:** gray-100, gray-200
- **Text on Light:** slate-700, slate-900
- **Borders/Dividers:** gray-200 (light), gray-800 (dark)
- **Status Colors:**
  - Success: emerald-500
  - Warning: amber-500
  - Danger: red-500
  - Info: blue-500

#### **Typography**
- **Font:** Inter (default in Tailwind)
- **H1:** 24px / font-bold / line-height 1.2
- **H2:** 20px / font-semibold / line-height 1.3
- **H3:** 16px / font-semibold / line-height 1.4
- **Body:** 14px / font-normal / line-height 1.6
- **Small:** 12px / font-normal / text-gray-500
- **Label:** 12px / font-medium / uppercase

#### **Layout & Spacing**
- **Sidebar Width:** 256px (fixed on desktop)
- **Content Padding:** 24px (p-6)
- **Card Padding:** 20px (p-5)
- **Gap/Spacing Scale:** Use Tailwind: gap-2, gap-4, gap-6, gap-8
- **Border Radius:** 12px for major elements (rounded-lg), 8px for smaller (rounded-md)
- **Shadows:** Use subtle shadows (shadow-sm)

#### **Components & States**

**Buttons:**
- Primary (CTA): bg-emerald-500, hover:bg-emerald-600, text-white, rounded-lg, h-10 (or h-12 for large)
- Secondary (outline): border border-gray-300, text-slate-700, hover:bg-gray-50
- Ghost: transparent bg, hover:bg-gray-100, text-slate-600
- All buttons: smooth transitions, focus states with ring-2 ring-emerald-400

**Cards:**
- White background, rounded-lg (12px), border: 1px solid #e2e8f0, shadow-sm
- Hover: shadow-md, border-gray-300
- Active/Selected: border-2 border-emerald-400

**Badges:**
- Rounded-full, py-1 px-2, text-xs font-medium
- Color variants: emerald (success), amber (warning), blue (info), red (danger)

**Input Fields:**
- Border: 1px solid gray-300, focus: border-emerald-400 ring-2 ring-emerald-100
- Rounded-md (8px)
- Padding: 8px 12px
- Clear placeholder text

**Navigation & Sidebar:**
- Sidebar items: flex gap-2, py-2 px-4, rounded-lg
- Active item: bg-emerald-500 text-white (or bg-emerald-100 text-emerald-700)
- Icon + label aligned vertically
- Lucide-react icons, size 20px

#### **Mobile Responsive Design**
- **Desktop (lg+):** Fixed sidebar, main content area
- **Mobile (below lg):** 
  - Hidden sidebar, replaced with bottom navigation bar
  - Bottom nav: fixed at bottom, bg-gray-950, 60px height
  - Show 4-5 most important nav items only
  - Sidebar accessible via Sheet/Drawer component (swipe or hamburger)
- **Tablet:** Same as desktop or use Sheet drawer depending on width

**Mobile-Specific:**
- Buttons: slightly larger (h-12)
- Cards: less padding on small screens
- Text: responsive sizes using Tailwind's sm: / md: / lg: prefixes
- Use `hidden md:block` / `md:hidden` for switching layouts

#### **Animations & Interactions**
- Page transitions: fade (opacity)
- Button hover: scale-105 on desktop, none on mobile (prevents jumping)
- Card drag (Kanban): cursor-grab, active:cursor-grabbing
- Loading spinners: 4px border, emerald-400 top color, 1s rotation
- Toast notifications: slide in from top/bottom, auto-dismiss 3s
- Transitions: all changes use `transition` class (200ms default)

#### **Empty States**
- Icon (lucide-react, size 48px)
- Title (16px bold)
- Description (14px gray-500)
- CTA button below
- Example: If no prospects exist, show icon + "No prospects yet. Add one to get started."

#### **Shadows & Depth**
- shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05)
- shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1)
- Avoid shadow-lg/xl for this design

---

## FEATURE REQUIREMENTS

### 1. Cached AI Objection Responses

**Behavior:**
- User clicks an objection button (e.g., "Too expensive")
- First time: Call `/api/coach` endpoint and wait for response
- Cache response in localStorage under key `cached_objections` (JSON object keyed by objection text)
- Subsequent clicks: Show cached response instantly (no API call)
- Show small badge or indicator: "🔄 Cached" or "Refresh" button next to response
- Add "Pre-load All Responses" button to Coach page - calls API for all 8 objections and caches them in one go
- Show loading toast while pre-loading

**localStorage Structure:**
```json
{
  "cached_objections": {
    "Too expensive": "Here's how I'd handle that...",
    "I handle it myself": "Totally get it...",
    ...
  }
}
```

**Implementation:**
- Create utility function `getCachedObjectionResponse(objectionText)` in lib/
- Check cache first; if not found, call API
- After API response, update cache and save to localStorage
- Pre-load button fetches all 8 in parallel, shows progress toast

---

### 2. Power Dialer Mode (NEW PAGE: /dialer)

**Purpose:** Queue-based calling interface optimized for high-volume outbound calls with live script and quick logging.

**UI Layout:**
- **Desktop:**
  - Left side (60%): Large prospect card + call timer + script
  - Right side (40%): Objection buttons, outcome buttons, queue progress
- **Mobile:** Stack vertically, full width

**Key Components:**

**A. Prospect Card (top)**
```
┌─────────────────────────────┐
│ Current Prospect            │
│ Jake's Plumbing (PLUMBER)   │ ← Large badge
│ Jake Morrison               │ ← Owner name (gray)
│                             │
│ 📞 (206) 555-0142           │ ← Phone very large, clickable
│                             │
│ [CALL] [SKIP] [INFO]        │ ← Buttons
└─────────────────────────────┘
Queue: 3 of 47 prospects remaining
```

**B. CALL Button**
- Large, emerald-500, h-16 font-bold text-xl
- When clicked:
  1. Opens `tel:` link (phone number becomes clickable)
  2. Starts visible timer (00:00 at top right)
  3. Timer increments every second
  4. Button text changes to "CALLING..." with stop icon
- Space bar can also trigger call (keyboard shortcut)

**C. Live Call Script** (during call)
- Show current step of CALL_SCRIPT_STEPS in accordion/card
- Highlight the step they should be on
- When timer > step.duration, subtle yellow highlight to next step
- Collapses previous steps (show expandable)

**D. Objection Buttons** (during call)
- Grid of 8 objection buttons (emoji + label)
- Same as Coach page but in a vertical layout for mobile
- Show cached responses in a sidebar/panel next to buttons
- Clicking one doesn't stop the call timer

**E. LOG & NEXT Button**
- Large, bottom of screen or right side (fixed on desktop)
- When clicked, open outcome dialog:
  - Dropdown: Connected / Voicemail / No Answer / Not Interested / Demo Scheduled / Callback
  - Notes field (optional)
  - "Save & Next" button
- After save: remove from queue, timer resets, show next prospect

**F. Queue Controls**
- **Shuffle:** Randomize remaining queue order
- **Pause Queue:** Pause but don't lose place
- **Skip:** Move current to end of queue
- **Queue Status:** "3 of 47" displayed prominently

**G. Keyboard Shortcuts**
- **Space:** Call/end call
- **Enter/Return:** Log & Next (with default outcome)
- **L:** Open log dialog
- **S:** Skip
- **R:** Shuffle

**Data Flow:**
- Queue stored in localStorage as `dialer_queue` (array of prospect IDs in order)
- Call logs created via existing `addCallLog()` function
- When user clicks "Log & Next":
  - Call `addCallLog()` with outcome
  - Remove from dialer_queue
  - Load next prospect
  - Reset timer

---

### 3. AI Mock Call Practice (NEW PAGE: /practice)

**Purpose:** Interactive AI roleplay to practice sales pitch and get graded feedback.

**UI Layout:**
```
┌─────────────────────────┐
│ PRACTICE MODE           │
│ Select your scenario:   │
│ [Plumber] [HVAC] ...    │ ← Business type selector
│ Choose difficulty:      │
│ [Easy] [Medium] [Hard]  │ ← Easy = collaborative, Medium = realistic, Hard = aggressive
├─────────────────────────┤
│ MIKE (Plumber owner)    │
│ "Yeah... so what is this?"  ← AI response (chat bubble style)
│                         │
│ [You type your pitch]   │ ← Text input at bottom (like chat)
│                         │
│ FEEDBACK: "Good—you    │ ← Real-time feedback in card
│ asked about pain       │
│ points. Keep going."   │
│                         │
│ Score Progress: 3/10   │ ← Show progress
│ exchanges              │
└─────────────────────────┘
```

**Workflow:**

1. **Setup:**
   - User selects business type (Plumber, HVAC, Electrician, etc)
   - User selects scenario difficulty: "Skeptical Owner", "Busy Owner", "Price-Sensitive", "Tech-Averse"
   - AI initializes with a realistic opening ("Yeah... what is this about?")

2. **Live Exchange:**
   - User types their pitch/response in text input
   - On submit (Enter or Send button), call `/api/practice`
   - POST body:
     ```json
     {
       "userMessage": "Hey Mike, I'm calling about...",
       "businessType": "Plumber",
       "scenario": "Skeptical Owner",
       "conversationHistory": [...]
     }
     ```
   - AI responds with: `{ response: "...", feedback: "You did X well. Consider Y next.", score: 7/10 }`
   - Show AI response as chat bubble
   - Show feedback in highlighted card
   - Clear input for next message

3. **Grading System:**
   - Each exchange gets a 1-10 score
   - Feedback explains why: "Good — you addressed pain point. Keep momentum." or "Missed — should have asked about volume."
   - After 5-10 exchanges (AI decides when to end), show:
     ```
     ┌──────────────────┐
     │ PRACTICE REPORT  │
     │ Final Score: 7.2 │
     │ Exchanges: 8     │
     │ Strengths:       │
     │ • Good pain      │
     │   probing        │
     │ Areas to Improve:│
     │ • Handle price   │
     │   objections     │
     │   more firmly    │
     └──────────────────┘
     [Try Again] [Save] [Share]
     ```

4. **Data:**
   - Practice sessions NOT stored (no database, not needed)
   - User can screenshot or copy final report
   - Show a few practice history in localStorage if desired (optional)

---

### 4. AI Lead Generator (NEW PAGE: /leads)

**Purpose:** Generate realistic prospect lists from simple parameters.

**UI Layout:**
```
┌─────────────────────────────┐
│ Lead Generator              │
├─────────────────────────────┤
│ City/State: [Seattle, WA]  │
│ Business Type: [Plumber ▼] │
│ Number of Leads: [10]       │
│ Confidence Score Min: [70%] │
│ [GENERATE LEADS]            │
├─────────────────────────────┤
│ Searching for plumbers in   │ ← AI thinking message (show during loading)
│ Seattle WA...               │
├─────────────────────────────┤
│ Results (10 leads)          │
│ ┌─────────────────────────┐ │
│ │ Jake's Plumbing         │ │
│ │ Owner: Jake Morrison    │ │
│ │ (206) 555-0142          │ │ ← All interactive, clickable
│ │ 1234 Main St, Seattle   │ │
│ │ Confidence: 88%         │ │
│ │ [Add to Pipeline]       │ │
│ └─────────────────────────┘ │
│ [✓] Lead 1                  │
│ [✓] Lead 2                  │ ← Checkboxes for bulk actions
│ [ ] Lead 3                  │
│ [Add Selected] [Add All]    │
└─────────────────────────────┘
```

**Workflow:**

1. **Input Form:**
   - City/State: text input with autocomplete (State dropdown)
   - Business Type: Select dropdown (Plumber, HVAC, etc)
   - Number of Leads: number input (5-100)
   - Confidence Score Min: slider or input (50-100%)

2. **Generation:**
   - On submit, call `/api/generate-leads`
   - POST body:
     ```json
     {
       "city": "Seattle",
       "state": "WA",
       "businessType": "Plumber",
       "count": 10,
       "confidenceMin": 70
     }
     ```
   - Show loading state with AI thinking message: "Searching for plumbers in Seattle WA..."
   - API returns:
     ```json
     {
       "leads": [
         {
           "businessName": "Jake's Plumbing",
           "ownerName": "Jake Morrison",
           "phone": "(206) 555-0142",
           "address": "1234 Main St, Seattle, WA 98101",
           "confidenceScore": 88,
           "reason": "High volume service business in market"
         }
       ]
     }
     ```

3. **Display Results:**
   - List as cards or table rows
   - Show confidence score as % or colored badge (green >80%, yellow 60-80%, red <60%)
   - Each lead has "Add to Pipeline" button
   - Or select multiple with checkboxes, "Add Selected" button

4. **Bulk Import CSV:**
   - File input at bottom
   - User uploads CSV with columns: Business Name, Owner Name, Phone, Address, Business Type
   - App maps columns intelligently (shows mapping UI if unclear)
   - Add all at once to Pipeline (calls `addProspect()` for each)

5. **Persist:**
   - Don't store generated leads (they're ephemeral)
   - Only save when user clicks "Add to Pipeline" (uses existing prospect system)

---

### 5. Pre-Call Research (Coach Page Enhancement)

**New Feature on Coach:**
- If URL query params include `prospect=NAME&businessType=TYPE`:
  - Show "Pre-Call Brief" section above the call script
  - Brief loads immediately on page load via `/api/research`

**Pre-Call Brief Card:**
```
┌──────────────────────────┐
│ 🎯 PRE-CALL BRIEF        │
│ (Plumber owner)          │
├──────────────────────────┤
│ PAIN POINTS              │
│ • Cash flow issues from  │
│   slow-paying customers  │
│ • Invoice tracking       │
│ • Collection labor       │
│                          │
│ BEST OPENER              │
│ "Do you guys send        │
│ invoices after jobs?"    │
│                          │
│ COMMON OBJECTIONS        │
│ • Too expensive          │
│ • I handle it myself     │
│ • My customers don't...  │
│                          │
│ WHAT THEY CARE ABOUT     │
│ • Time savings (not cost)│
│ • Invoice recovery rate  │
│ • Ease of setup          │
└──────────────────────────┘
```

**API Call:**
```
POST /api/research
{
  "prospectName": "Jake Morrison",
  "businessType": "Plumber"
}
```

**Response:**
```json
{
  "painPoints": ["Cash flow", "Invoice tracking", ...],
  "bestOpener": "Do you guys send invoices...",
  "commonObjections": ["Too expensive", ...],
  "whatTheyCareMost": ["Time savings", "Invoice recovery rate", ...]
}
```

---

### 6. Auto Follow-Up Drafter (Call Log Enhancement)

**Trigger:** After user logs a call with an outcome, show follow-up drafts.

**UI:**
```
┌──────────────────────────────┐
│ CALL LOGGED ✓               │
├──────────────────────────────┤
│ Outcome: No Answer           │
│                              │
│ SUGGESTED FOLLOW-UP          │
│ [SMS] [VOICEMAIL] [EMAIL]   │ ← Tabs based on outcome
│                              │
│ SMS TEMPLATE:                │
│ "Hey Jake, tried reaching..."│ ← Draft shown
│ [Copy] [Edit] [Send]         │
│                              │
│ or                           │
│                              │
│ VOICEMAIL SCRIPT:            │
│ "Hey Jake, this is Garv..."  │
│ [Copy] [Edit] [Leave Now]    │
└──────────────────────────────┘
```

**Outcomes & Follow-ups:**
- **No Answer:** SMS reminder + Voicemail script
- **Voicemail:** Follow-up SMS 24h later + Email backup
- **Not Interested:** Re-engagement email for 30 days later
- **Interested/Demo Scheduled:** Confirmation email + calendar invite draft
- **Callback Requested:** Reminder 1h before, draft follow-up email

**API Call:**
```
POST /api/follow-up
{
  "prospectName": "Jake Morrison",
  "businessType": "Plumber",
  "outcome": "no_answer",
  "callNotes": "Got voicemail, seems busy"
}
```

**Response:**
```json
{
  "sms": "Hey Jake, tried reaching you earlier about automating invoice follow-up...",
  "voicemail": "Hey Jake, this is Garv from Surety...",
  "email": null
}
```

---

### 7. Campaign Manager (NEW Page or Dashboard Section)

**Purpose:** Track and organize outbound campaigns.

**UI:**
```
┌──────────────────────────────────┐
│ CAMPAIGNS                        │
├──────────────────────────────────┤
│ [+ NEW CAMPAIGN]                 │
│                                  │
│ "Q1 Plumber Blitz" (In Progress) │
│ ├─ Type: Plumber                 │
│ ├─ City: Seattle, WA             │
│ ├─ Goal: 5 demos                 │
│ ├─ Progress: 2 of 5 demos        │
│ └─ Stats:                        │
│    • Leads Added: 47             │
│    • Called: 23                  │
│    • Demo Scheduled: 2           │
│    • Closed: 0                   │
│    [View Details]                │
│                                  │
│ "HVAC Spring (Paused)"           │
│ ├─ Type: HVAC                    │
│ ├─ City: Portland, OR            │
│ ...                              │
│                                  │
│ "Cleaner Q4 (Completed)"         │
│ ...                              │
└──────────────────────────────────┘
```

**Features:**
- Create new campaign: name, business type, target city, goal (# demos), start date
- Auto-track progress: count prospects in pipeline with campaign tag, count calls, count demos booked
- Multiple campaigns can run in parallel
- Progress bar showing % toward goal
- Filter prospects by campaign

**Data Structure:**
```typescript
interface Campaign {
  id: string;
  name: string;
  businessType: string;
  targetCity: string;
  targetState: string;
  goal: number; // demos to book
  status: 'in_progress' | 'paused' | 'completed';
  createdAt: string;
  startDate: string;
}
```

**Storage:** localStorage key `campaigns`

---

### 8. Better Analytics (/analytics - Enhanced)

**Current State:** Likely has basic text summary. Needs real visualizations.

**Redesign with Charts:**

**Layout:**
```
┌─────────────────────────────────┐
│ ANALYTICS                       │
├─────────────────────────────────┤
│ [7 DAYS] [30 DAYS] [ALL TIME]  │ ← Tab selector
├─────────────────────────────────┤
│ KPI Cards (4 cols):             │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──┐ │
│ │ 47   │ │ 3    │ │ 6.4% │ │15│ │
│ │Calls │ │Demos │ │Convr │ │C2│ │
│ │ ↑ 5  │ │ ↑ 1  │ │ → 0  │ │D │ │
│ └──────┘ └──────┘ └──────┘ └──┘ │
├─────────────────────────────────┤
│ Call Volume (7-day)             │
│ [Bar Chart - recharts]          │
│  M T W Th F  S Su              │
│  8 12 9 11 10 5 2              │
├─────────────────────────────────┤
│ Outcomes Distribution           │
│ [Pie Chart - recharts]          │
│ Connected: 28 (60%)             │
│ Voicemail: 12 (25%)             │
│ No Answer: 7 (15%)              │
├─────────────────────────────────┤
│ Best Calling Hours (Heatmap)    │
│ [Heatmap - recharts]            │
│ Hours 8am-6pm, shows success %  │
│ Brightest = 10am-11am (70%)     │
├─────────────────────────────────┤
│ Pipeline Funnel                 │
│ [Funnel Chart - recharts]       │
│ Prospects: 120                  │
│ Called: 47 (39%)                │
│ Interested: 8 (17%)             │
│ Demo: 3 (6%)                    │
│ Closed: 1 (2%)                  │
├─────────────────────────────────┤
│ 💡 Pro Tip:                     │
│ Your best time to call is       │
│ between 10am-11am. 70% of calls │
│ in that window result in        │
│ connections.                    │
└─────────────────────────────────┘
```

**Components Needed:**
- recharts library (already in package.json)
- Import: `BarChart`, `PieChart`, `LineChart`, `ResponsiveContainer`
- 7-day call volume bar chart
- Outcomes pie chart (Connected / Voicemail / No Answer / Not Interested / Demo Scheduled / Callback)
- Best calling hours heatmap (hour of day x success rate)
- Pipeline funnel (prospects → called → interested → demo → closed)
- Tip generator (show actionable insight based on data)

**Calculation Rules:**
- Call volume: count logs by day (last 7 days)
- Outcomes: group call logs by outcome
- Best hours: for each hour (0-23), calculate % of calls that ended in "Connected" or "Demo Scheduled"
- Funnel: total prospects, filtered count (last contacted), count with stage demo_scheduled, count closed_won

---

### 9. Agent API Routes (NEW Routes - for automation)

**Purpose:** Allow AI agents (like Claude) to programmatically control the app.

**Routes:**

#### `GET /api/agents/prospects`
- Returns all prospects
- Query params: `?stage=demo_scheduled`, `?businessType=Plumber`
- Headers: `Authorization: Bearer {agent_token}`
- Response:
  ```json
  {
    "prospects": [
      {
        "id": "1234",
        "businessName": "Jake's Plumbing",
        "ownerName": "Jake",
        "phone": "(206) 555-0142",
        "stage": "contacted",
        "businessType": "Plumber"
      }
    ]
  }
  ```

#### `POST /api/agents/prospects`
- Add a prospect programmatically
- Headers: `Authorization: Bearer {agent_token}`
- Body:
  ```json
  {
    "businessName": "Mike's HVAC",
    "ownerName": "Mike",
    "phone": "(206) 555-0143",
    "businessType": "HVAC",
    "notes": "Added via agent"
  }
  ```
- Response: `{ success: true, prospectId: "5678" }`

#### `POST /api/agents/call-log`
- Log a call outcome
- Headers: `Authorization: Bearer {agent_token}`
- Body:
  ```json
  {
    "prospectName": "Jake Morrison",
    "outcome": "demo_booked",
    "notes": "Demo scheduled for Tuesday 2pm"
  }
  ```
- Response: `{ success: true, callLogId: "9999" }`

#### `GET /api/agents/stats`
- Get summary analytics
- Headers: `Authorization: Bearer {agent_token}`
- Response:
  ```json
  {
    "totalProspects": 120,
    "totalCalls": 47,
    "demosBooked": 3,
    "conversionRate": 6.4,
    "callsToday": 5,
    "callsThisWeek": 23
  }
  ```

#### `POST /api/agents/generate-leads`
- Trigger lead generation
- Headers: `Authorization: Bearer {agent_token}`
- Body:
  ```json
  {
    "city": "Seattle",
    "state": "WA",
    "businessType": "Plumber",
    "count": 10
  }
  ```
- Response:
  ```json
  {
    "leads": [
      {
        "businessName": "...",
        "ownerName": "...",
        "phone": "...",
        "confidence": 88
      }
    ]
  }
  ```

**Authentication:**
- Simple bearer token stored in localStorage under key `agent_token`
- Generate token: `crypto.randomUUID()` (36-char string)
- All agent routes check header `Authorization: Bearer {token}`
- Return 401 if token missing or invalid

**Error Handling:**
- 401: Invalid token → `{ error: "Unauthorized" }`
- 400: Missing fields → `{ error: "Missing required field: businessName" }`
- 500: Server error → `{ error: "Failed to add prospect" }`

---

### 10. Settings Page (/settings)

**Purpose:** Customization, API configuration, data backup.

**UI:**
```
┌──────────────────────────────┐
│ SETTINGS                     │
├──────────────────────────────┤
│ PERSONALIZATION              │
│ Business Name: [Surety HQ  ] │
│ Rep Name:      [Garv        ]│
│ Phone:         [(206) 555..] │ ← For SMS signature
│                              │
│ CALL SCRIPT (Editable)       │
│ Step 1 - Opener:             │
│ [Text editor field]          │
│ Step 2 - Pain Probe:         │
│ [Text editor field]          │
│ ...                          │
│                              │
│ CUSTOM OBJECTIONS            │
│ [Add custom objection +]     │
│ • Too expensive (default)    │
│ • I handle it myself (dflt)  │
│ • My objection #1            │ ← Custom, with delete
│ • My objection #2            │
│                              │
│ INTEGRATIONS                 │
│ Twilio Phone: [Setup]        │ ← For future SMS
│                              │
│ AGENT API                    │
│ Token: sk-...-***            │ ← Hidden, copy button
│ [Regenerate Token]           │
│ [View API Docs]              │
│                              │
│ DATA MANAGEMENT              │
│ [Export as JSON]             │
│ [Import from JSON]           │
│ [Clear All Data]             │
└──────────────────────────────┘
```

**Features:**
1. **Personalization:**
   - Business name (used in emails, scripts)
   - Rep name (in scripts, voicemail)
   - Phone number (for Twilio integration)
   - Stored in localStorage under key `settings`

2. **Call Script Editor:**
   - 5 text areas (one per step)
   - Save button
   - Default to CALL_SCRIPT_STEPS but user can customize
   - Stored in localStorage

3. **Custom Objections:**
   - Button: "+ Add Custom Objection"
   - Shows dialog: text input for objection, emoji picker
   - Delete button on each custom one
   - Custom objections also appear in Coach page objection grid
   - Stored in localStorage

4. **Twilio Setup:** (for future SMS)
   - Input for Twilio Account SID, Auth Token, Phone Number
   - Not used yet but store for future
   - Stored in localStorage under encryption (optional)

5. **Agent API:**
   - Display current token
   - Copy-to-clipboard button
   - Regenerate button (generates new token, old one invalidated)
   - Link to API docs (comment in route file explaining endpoints)

6. **Data Management:**
   - Export: Create JSON backup of all prospects, call logs, settings, campaigns
   - Import: Upload JSON file to restore data
   - Clear All: Confirm dialog, then wipe all localStorage for this app
   - These use existing `exportProspectsCSV()` and new export/import functions

---

## EXISTING FEATURES TO IMPROVE

### Dashboard (/dashboard)

**Current Issues:** Basic Kanban, small cards, unclear stats

**Redesign:**
1. **Stats Row** (use Card components):
   - 4 large cards: Calls Made Today, Demos Scheduled, Deals Closed, Pipeline Value
   - Add trend indicators: "↑ 5 from yesterday" in small gray text
   - Pipeline value in large bold emerald text
   - Use ProgressBar for visual % to goal

2. **Kanban Board:**
   - Better card design:
     - Business name: 16px bold (primary)
     - Owner name: 12px gray
     - Phone: 12px gray with icon
     - Business type: Small badge (colored)
     - Last contacted: "3 days ago" with color (red if > 7 days)
   - Drag handles visible (lucide-react icon)
   - Hover shows quick actions inline: [Call], [Move →], [Delete]
   - Column headers: stage label + count badge (emerald)

3. **Power User CTA:**
   - If prospects exist but 0 calls today, show banner at top:
     - "🔥 Ready to dial? Start here" → [START DIALING] button links to /dialer

### Call Coach (/coach) - Enhanced

**Current:** Works well, needs refinements

**Improvements:**
1. **Script Steps:**
   - Wrap in Accordion (shadcn/ui)
   - Each step collapsible
   - Checkboxes that animate on check
   - Current step auto-expanded
   - Completed steps collapse automatically

2. **Objection Buttons:**
   - Larger, better spacing (grid-cols-2 on desktop, cols-1 on mobile)
   - Show emoji + label (keep existing style but improve hit targets)
   - Last-used indicator: "✓ Recently used" under label
   - When hovering: show hint "Ctrl+O to see all"

3. **AI Response:**
   - Shown in chat-bubble style (darker background, rounded)
   - Copy button always visible
   - Show "🔄 Cached" or "Refresh" button if from cache
   - If refreshing: call API, update cache, show new response

4. **Pre-Call Brief:**
   - Only show if query params `?businessType=HVAC` present
   - Load via `/api/research` on mount
   - Show above script steps
   - Card style with icon, 3-4 sections

### Prospects (/prospects) - Redesigned

**Current:** Basic list, needs table & advanced features

**Redesign:**
1. **Search & Filter Row:**
   - Text input: search by business name, owner name, phone
   - Dropdown: filter by stage (All, New, Contacted, etc)
   - Dropdown: filter by business type (All, Plumber, HVAC, etc)
   - Badge showing active filters

2. **Table/List:**
   - Use shadcn/ui Table or list cards (decide based on space)
   - Columns: Business Name | Owner | Phone | Type | Stage | Last Contact | Actions
   - Row hover: background changes, inline actions appear
   - Actions: [Call], [Edit], [Delete]
   - "Last contacted: 3 days ago" with red text if > 7 days

3. **Bulk Actions:**
   - Checkboxes on left of each row
   - Header checkbox: select all
   - Bulk action bar appears when > 0 selected:
     - "X selected. [Move to Stage] [Delete] [Add to Campaign]"

4. **Import/Export:**
   - Prominent buttons at top
   - Import: CSV file with headers (Business Name, Owner Name, Phone, Business Type)
   - Smart column mapping (if headers don't exactly match, show mapping dialog)
   - Export: CSV with same format, auto-download with timestamp
   - Also note in header: "Prospect count: 47"

### Templates (/templates) - Tabbed System

**Current:** Likely single tab or scattered

**Redesign:**
1. **Tab Navigation:**
   - Tabs at top: [Cold Call Scripts] [SMS Templates] [Email Templates] [Follow-Up Scripts]
   - Use shadcn/ui Tabs component

2. **Each Tab:**
   - List of templates (cards or rows)
   - Template title (16px semibold)
   - Template content (preview, truncated)
   - Filter by business type (dropdown)
   - Copy button on each template (with toast "Copied to clipboard!")
   - Edit button: inline edit mode (textarea overlays template)
   - Delete button (with confirm)

3. **Add New Template:**
   - Button in each tab
   - Dialog: title, business type (multi-select or all), content (textarea)
   - Save button
   - Custom templates stored in localStorage under key `custom_templates`

4. **Built-in Templates:**
   - Populate from `COLD_CALL_SCRIPTS`, `COLD_TEXT_TEMPLATES`, `COLD_EMAIL`, `FOLLOW_UP_SCRIPTS` in surety-content.ts
   - Show as read-only unless user customizes

---

## TECHNICAL ARCHITECTURE

### File Structure (Finalized)

```
app/
  layout.tsx (wrap with Sidebar/MobileNav, style providers)
  page.tsx (dashboard redirect)
  dashboard/page.tsx (redesigned Kanban)
  coach/page.tsx (enhanced with pre-call brief, accordion)
  prospects/page.tsx (NEW - full redesign with table, search, bulk)
  templates/page.tsx (NEW - tabbed)
  analytics/page.tsx (NEW - charts with recharts)
  dialer/page.tsx (NEW - power dialer)
  practice/page.tsx (NEW - AI mock call)
  leads/page.tsx (NEW - lead generator)
  settings/page.tsx (NEW - customization)
  api/
    coach/route.ts (existing, keep)
    research/route.ts (NEW - pre-call research)
    practice/route.ts (NEW - mock call AI)
    generate-leads/route.ts (NEW - lead generation)
    follow-up/route.ts (NEW - follow-up drafts)
    agents/
      prospects/route.ts (NEW - GET/POST prospects)
      call-log/route.ts (NEW - POST call log)
      stats/route.ts (NEW - GET analytics)
components/
  Sidebar.tsx (NEW - complete redesign, dark with emerald accent)
  MobileNav.tsx (NEW - bottom nav for mobile)
  TopBar.tsx (NEW - page header with breadcrumb and title)
  ui/ (shadcn components as needed)
lib/
  storage.ts (expand with campaigns, cached objections, agent token, settings)
  surety-content.ts (keep + expand with more templates)
  ai.ts (NEW - shared AI call logic)
  utils.ts (NEW - helper functions like token validation, etc)
```

### Storage Schema (localStorage)

```javascript
// Existing
localStorage.setItem('surety_prospects', JSON.stringify([...]))
localStorage.setItem('surety_call_logs', JSON.stringify([...]))
localStorage.setItem('surety_calls_today', '5')
localStorage.setItem('surety_calls_today_date', '2026-03-13')

// New
localStorage.setItem('cached_objections', JSON.stringify({
  "Too expensive": "Here's the deal...",
  ...
}))

localStorage.setItem('agent_token', 'sk-...')

localStorage.setItem('settings', JSON.stringify({
  businessName: 'Surety HQ',
  repName: 'Garv',
  phone: '(206) 555-0142',
  customCallScript: [...],
  customObjections: [...]
}))

localStorage.setItem('campaigns', JSON.stringify([...]))

localStorage.setItem('dialer_queue', JSON.stringify(['prospect_id_1', 'prospect_id_2', ...]))

localStorage.setItem('custom_templates', JSON.stringify([...]))
```

### API Routes Implementation Details

All routes should:
1. Check for API key in .env.local (existing)
2. Use streaming for AI responses where possible
3. Show helpful errors, not generic ones
4. Return proper HTTP status codes

**Route Pattern:**
```typescript
// app/api/[route]/route.ts
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.objection) {
      return Response.json({ error: 'Missing objection' }, { status: 400 });
    }

    // Call Claude
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `You are a sales coach helping with objection handling. Respond to this objection with a 1-2 sentence rebuttal: "${body.objection}"`,
        },
      ],
    });

    const response = message.content[0].type === 'text' ? message.content[0].text : 'Error';
    return Response.json({ response });
  } catch (error: any) {
    console.error(error);
    return Response.json(
      { error: error.message || 'API error' },
      { status: 500 }
    );
  }
}
```

### Design System Components to Install

Run `npx shadcn-ui@latest add` for:
- card
- button
- badge
- dialog
- input
- textarea
- select
- tabs
- accordion
- progress
- separator
- sheet
- tooltip
- toast (sonner)
- avatar
- dropdown-menu
- command
- table
- scrollarea

Already installed (likely):
- lucide-react
- tailwindcss v4
- tailwind-merge

Add to package.json if not present:
- sonner (for toast notifications)
- recharts (for analytics charts)

### Tailwind Configuration

Ensure tailwind.config.ts has:
```typescript
export default {
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10b981', // Primary accent
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
```

---

## IMPLEMENTATION PRIORITY & CHECKLIST

### Phase 1: Design & Core (HIGH PRIORITY)
- [ ] Redesign Sidebar (dark sidebar, emerald accent, proper icons)
- [ ] Create MobileNav component (bottom bar on small screens)
- [ ] Create TopBar component (page header)
- [ ] Update layout.tsx with new components
- [ ] Redesign Dashboard (better stats, improved Kanban)
- [ ] Install all needed shadcn/ui components
- [ ] Setup color palette and typography system

### Phase 2: Features (HIGH PRIORITY)
- [ ] Cached AI objection responses (Coach page enhancement)
- [ ] Power Dialer mode (/dialer page)
- [ ] Pre-call research API (/api/research)
- [ ] Pre-call brief on Coach page

### Phase 3: AI & Automation (MEDIUM PRIORITY)
- [ ] AI Mock Call Practice (/practice page, /api/practice)
- [ ] Lead Generator (/leads page, /api/generate-leads)
- [ ] Follow-up drafts (/api/follow-up)
- [ ] Agent API routes (/api/agents/*)

### Phase 4: Content & Analytics (MEDIUM PRIORITY)
- [ ] Analytics page with recharts
- [ ] Campaign Manager
- [ ] Settings page
- [ ] Templates page (tabbed)
- [ ] Prospects page (table, search, bulk)
- [ ] Expand lib/surety-content.ts with more templates

### Phase 5: Polish & Testing (LOW PRIORITY but important)
- [ ] Mobile responsiveness testing
- [ ] Keyboard shortcuts throughout
- [ ] Error handling and validation
- [ ] Loading states on all AI calls
- [ ] Toast notifications for user feedback
- [ ] Empty states for all pages
- [ ] Copy-to-clipboard buttons everywhere needed

---

## CODE EXAMPLES FOR COMPLEX PARTS

### Mobile-Responsive Layout (Sidebar + MobileNav)

**layout.tsx:**
```typescript
'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MobileNav } from '@/components/MobileNav';
import { TopBar } from '@/components/TopBar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <html lang="en">
      <body className="bg-gray-50">
        <div className="flex h-screen flex-col md:flex-row">
          {/* Desktop Sidebar */}
          <div className="hidden md:block md:w-64 md:border-r md:border-gray-200 md:bg-gray-950">
            <Sidebar />
          </div>

          {/* Mobile Header with Hamburger */}
          <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
            <h1 className="text-lg font-bold text-slate-900">Surety HQ</h1>
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <button className="p-2">
                  <Menu className="w-6 h-6 text-slate-700" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <Sidebar />
              </SheetContent>
            </Sheet>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="hidden md:block border-b border-gray-200 bg-white">
              <TopBar />
            </div>
            <div className="flex-1 overflow-auto">
              {children}
            </div>
            {/* Mobile Bottom Nav */}
            <div className="md:hidden border-t border-gray-200 bg-white">
              <MobileNav />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
```

**Sidebar.tsx:**
```typescript
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Phone,
  Users,
  FileText,
  BarChart3,
  Zap,
  Cpu,
  Settings,
  Trophy,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach', label: 'Call Coach', icon: Phone },
  { href: '/dialer', label: 'Power Dialer', icon: Zap },
  { href: '/practice', label: 'Practice Mode', icon: Trophy },
  { href: '/leads', label: 'Generate Leads', icon: Lightbulb },
  { href: '/prospects', label: 'Prospects', icon: Users },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col bg-gray-950 text-gray-100 p-6">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-bold">S</span>
          </div>
          <span className="text-lg font-bold text-white">Surety HQ</span>
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="space-y-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm font-medium',
                isActive
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 pt-4">
        <p className="text-xs text-gray-400">Surety Sales HQ v2</p>
      </div>
    </div>
  );
}
```

**MobileNav.tsx:**
```typescript
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Phone, Users, FileText, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/coach', label: 'Coach', icon: Phone },
  { href: '/dialer', label: 'Dialer', icon: Phone },
  { href: '/prospects', label: 'Prospects', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-16 bg-gray-950 border-t border-gray-800">
      {MOBILE_NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              isActive ? 'text-emerald-500' : 'text-gray-400'
            )}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
```

### Power Dialer Component (Key Parts)

**dialer/page.tsx (simplified structure):**
```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { getProspects, addCallLog, updateProspect } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Dialog, ... } from '@/components/ui/...';

export default function DialerPage() {
  const [queue, setQueue] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ outcome: 'no_answer', notes: '' });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const prospects = getProspects();
  const currentProspect = prospects.find(p => p.id === queue[currentIndex]);

  useEffect(() => {
    // Initialize queue from localStorage or all prospects
    const savedQueue = localStorage.getItem('dialer_queue');
    if (savedQueue) {
      setQueue(JSON.parse(savedQueue));
    } else {
      setQueue(prospects.filter(p => p.stage === 'new' || p.stage === 'contacted').map(p => p.id));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('dialer_queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    if (!isCalling) return;
    timerRef.current = setInterval(() => {
      setCallTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [isCalling]);

  const handleCall = () => {
    if (!currentProspect) return;
    setIsCalling(true);
    setCallTimer(0);
    // Open tel: link
    window.location.href = `tel:${currentProspect.phone}`;
  };

  const handleLogAndNext = () => {
    if (!currentProspect) return;
    addCallLog({
      prospectName: currentProspect.ownerName,
      outcome: logForm.outcome,
      notes: logForm.notes,
    });
    updateProspect(currentProspect.id, { stage: 'contacted', lastContact: new Date().toISOString().split('T')[0] });
    setQueue(q => q.filter((_, i) => i !== currentIndex));
    setCurrentIndex(0);
    setIsCalling(false);
    setCallTimer(0);
    setLogOpen(false);
  };

  const handleSkip = () => {
    const next = (currentIndex + 1) % queue.length;
    setCurrentIndex(next);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); handleCall(); }
      if (e.code === 'Enter') { setLogOpen(true); }
      if (e.key === 'l' || e.key === 'L') { setLogOpen(true); }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isCalling, currentProspect]);

  if (!currentProspect) {
    return <div className="p-8"><p>No prospects to call.</p></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Power Dialer</h1>
        <div className="text-2xl font-bold text-emerald-600">{formatTimer(callTimer)}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Prospect Card */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="rounded-lg border-2 border-emerald-400">
            <CardContent className="p-8 space-y-4">
              <div>
                <p className="text-sm text-gray-500 uppercase font-medium mb-1">Current Prospect</p>
                <h2 className="text-2xl font-bold text-slate-900">{currentProspect.businessName}</h2>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2 w-fit">
                <span className="text-xs font-medium text-emerald-700 uppercase">{currentProspect.businessType}</span>
              </div>
              <div>
                <p className="text-gray-500 text-sm">{currentProspect.ownerName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-3xl font-bold text-slate-900 font-mono text-center">{currentProspect.phone}</p>
              </div>
              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-16 font-bold"
                  onClick={handleCall}
                >
                  📞 CALL
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkip}
                >
                  SKIP
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Queue Status */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">
                Queue Progress: <span className="font-bold text-slate-900">{currentIndex + 1} of {queue.length}</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Quick Actions */}
        <div className="space-y-4">
          <Dialog open={logOpen} onOpenChange={setLogOpen}>
            <Button
              size="lg"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-14"
              onClick={() => setLogOpen(true)}
            >
              LOG & NEXT
            </Button>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Call</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Outcome</label>
                  <Select value={logForm.outcome} onValueChange={v => setLogForm({...logForm, outcome: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_answer">No Answer</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="demo_booked">Demo Scheduled</SelectItem>
                      <SelectItem value="closed_won">Closed Won</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={logForm.notes}
                    onChange={e => setLogForm({...logForm, notes: e.target.value})}
                    placeholder="Call notes..."
                  />
                </div>
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600"
                  onClick={handleLogAndNext}
                >
                  Save & Next
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setQueue(q => [...q].sort(() => Math.random() - 0.5))}
          >
            🔀 SHUFFLE QUEUE
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Agent API Route Example

**app/api/agents/prospects/route.ts:**
```typescript
import { getProspects, addProspect } from '@/lib/storage';
import { NextRequest } from 'next/server';

function validateToken(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  
  const token = authHeader.slice(7);
  const stored = typeof window !== 'undefined' ? localStorage.getItem('agent_token') : null;
  return token === stored;
}

export async function GET(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const stage = url.searchParams.get('stage');
  const businessType = url.searchParams.get('businessType');

  let prospects = getProspects();
  if (stage) prospects = prospects.filter(p => p.stage === stage);
  if (businessType) prospects = prospects.filter(p => p.businessType === businessType);

  return Response.json({ prospects });
}

export async function POST(request: NextRequest) {
  if (!validateToken(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { businessName, ownerName, phone, businessType, notes } = body;

  if (!businessName || !ownerName || !phone) {
    return Response.json(
      { error: 'Missing required fields: businessName, ownerName, phone' },
      { status: 400 }
    );
  }

  const prospect = addProspect({
    businessName,
    ownerName,
    phone,
    businessType: businessType || 'Other',
    stage: 'new',
    notes: notes || '',
    lastContact: new Date().toISOString().split('T')[0],
  });

  return Response.json({ success: true, prospectId: prospect.id });
}
```

### Cached Objections Helper

**lib/utils.ts (new file or added to existing):**
```typescript
export async function getCachedObjectionResponse(objectionText: string): Promise<string> {
  // Check cache
  const cached = localStorage.getItem('cached_objections');
  const cache = cached ? JSON.parse(cached) : {};

  if (cache[objectionText]) {
    return cache[objectionText];
  }

  // Call API
  const response = await fetch('/api/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ objection: objectionText }),
  });

  const data = await response.json();
  const reply = data.response || 'No response generated.';

  // Cache it
  cache[objectionText] = reply;
  localStorage.setItem('cached_objections', JSON.stringify(cache));

  return reply;
}

export async function preloadAllObjections(objections: Array<{ text: string }>): Promise<void> {
  await Promise.all(objections.map(obj => getCachedObjectionResponse(obj.text)));
}
```

---

## NOTES FOR CLAUDE

1. **This is a personal tool** — no auth, no database, no payments, no subscriptions. Keep it simple.

2. **Mobile-first mindset** — Every page must work on mobile. Use responsive classes extensively. Test with window resizing.

3. **AI API is bottleneck** — All AI calls should have:
   - Loading spinner/toast
   - Error handling with helpful message
   - Timeout handling (set 30s timeout)
   - Caching where possible (objections, research)

4. **localStorage as source of truth** — All data persists in localStorage. No need for backend, but handle quota limits (localStorage is ~5-10MB).

5. **Design consistency is key** — Use the emerald/dark gray palette throughout. Every button, badge, and card should match the system. Reference this prompt for colors/typography.

6. **Keyboard shortcuts** — Users expect power-user experience. Add them to dialer, coach, everywhere. Show hints in UI.

7. **Empty states matter** — Every page that can be empty (prospects, leads, analytics) needs a nice empty state with icon + CTA.

8. **Toast notifications** — Use sonner library for all feedback. Copy-to-clipboard, successful saves, errors, etc. Auto-dismiss in 3 seconds.

9. **Error messages** — Don't just say "Error occurred." Say what went wrong: "API key invalid" or "Network timeout" or "Failed to add prospect." Help the user fix it.

10. **Test everything on mobile** — The design is desktop-optimized but must work on mobile. Use md: breakpoint to toggle sidebar/nav.

11. **surety-content.ts is your seed data** — Expand it with more business type-specific scripts, objections, templates. Keep it organized by type.

12. **API key in .env.local** — Don't expose in code. All API routes use `process.env.ANTHROPIC_API_KEY`.

13. **Streaming responses** — For long AI responses (practice, research, leads), use streaming if possible to show incremental output.

14. **This is v2 — big redesign** — Don't worry about v1 code. Start fresh where possible. Keep the core logic (storage.ts, surety-content.ts) but redesign the UI.

---

## FINAL CHECKLIST BEFORE HANDING TO CLAUDE

- [ ] Read all existing files to understand current implementation
- [ ] Understand the target design system (dark sidebar, emerald accent, light content)
- [ ] Know the 10 feature priorities
- [ ] Know the tech stack and file structure
- [ ] Understand localStorage as the single source of truth
- [ ] Understand that this is a personal tool, no authentication needed
- [ ] Ready to build, one feature at a time, starting with design

Good luck building! 🚀
