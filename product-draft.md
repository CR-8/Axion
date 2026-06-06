# LexBot CRM — Product Feature Draft
> Legal-first CRM SaaS with WhatsApp bot layer  
> Hackathon: June 6–7 | Team: 4 members

---

## What This Product Is

A multi-tenant SaaS CRM built for legal agencies (law firms, legal aid NGOs, court-facing agencies) that gives their clients 24/7 WhatsApp-based access to their own case information — in any language — without building or downloading anything new.

**The core loop:**
> Lawyer creates client + case in CRM → Client messages WhatsApp bot → Bot identifies client via case ID → AI responds with live case data in client's language

---

## Who Uses It

| Role | Who They Are | What They Can Do |
|---|---|---|
| **Org Admin** | Firm owner / managing partner | Everything — analytics, user management, bot config, billing |
| **Lawyer** | Assigned advocate | View/edit their cases, upload documents, manage clients |
| **Staff** | Paralegal / receptionist | Create clients, create cases, upload documents |
| **Client** | End user (general public) | Interacts via WhatsApp bot only — never logs into the CRM |

---

## Module 1 — Org Onboarding (SaaS)

Every agency that signs up gets their own isolated workspace.

**Signup flow (admin):**
- Email + password signup
- Create organization (name, type, city)
- Choose plan (Free trial / Paid)
- Invite team members (lawyer / staff) via email

**Data isolation:**
- Every table scoped by `org_id`
- Supabase RLS — one org can never access another's data
- Each org brings their own WhatsApp Business number and AI API key

---

## Module 2 — CRM Core

### 2A. Client Management
- Create client: name, phone number (WhatsApp), preferred language, address, ID proof type
- Auto-generate shareable onboarding message:  
  *"Your Case ID is LF-2024-0042. Message us on WhatsApp at +91XXXXXXXXXX to track updates."*
- Client list with search and filter by case status
- View all cases under a client

### 2B. Case Management
- Create case: case number, court name, court city, case type (Civil / Criminal / Family / Property / Other), assigned lawyer, status
- Case statuses: Active → Hearing Scheduled → Adjourned → Judgement Pending → Closed
- Next hearing date with manual update
- Case timeline (log of all status changes with timestamps)
- Assign/reassign lawyer to a case

### 2C. Document Management
- Upload documents from CRM dashboard (drag and drop)
- Document types: FIR, Affidavit, PAN, Aadhaar, Court Order, Petition, Other
- Stored in Supabase Storage with signed URLs (not publicly accessible)
- Uploaded by: Lawyer / Staff / Client via bot (tagged)
- View and download documents by case

---

## Module 3 — WhatsApp Bot Layer

### 3A. Client Identification (First Message Flow)
When an unknown number messages the bot:
1. Bot: *"Welcome. Please share your Case ID to get started."*
2. User sends Case ID
3. Bot: *"Please confirm your name."*
4. Name + Case ID → composite key lookup in DB
5. Match found → session linked, proceed
6. No match → *"We couldn't find your case. Please contact your lawyer."*

Session persists for 24 hours (Meta conversation window).

### 3B. Bot Capabilities

| Command / Intent | What Bot Does |
|---|---|
| "Case status" / "What's my status" | Returns current status + next hearing date |
| "Documents" / "My documents" | Lists uploaded documents with download links |
| "Send document" (user uploads PDF/image) | Saves to Supabase Storage, links to case, confirms receipt |
| "Lawyer contact" | Returns assigned lawyer's name and contact |
| Free-text question | AI responds using case context + system prompt |
| Unrecognized input | Asks for clarification or escalates to human mode |

### 3C. Human Takeover Mode
- Lawyer can toggle any conversation from AI mode → Human mode from CRM dashboard
- In Human mode, bot stops auto-responding
- Lawyer types and sends manually from dashboard
- Toggle back to AI mode when done
- (From Hemang's repo — already built)

### 3D. Multilingual Support
- Preferred language stored per client at creation
- Bot detects language of incoming message as fallback
- All AI responses generated in client's preferred language
- Supported: Hindi, English, Tamil, Telugu, Bengali, Marathi, Gujarati, + any language the AI model supports

### 3E. Proactive Notifications (Outbound)
- 24 hours before hearing date: *"Reminder: Your case [LF-2024-0042] has a hearing tomorrow at [Court Name]. Please be present or inform your lawyer."*
- Status change notification: *"Update: Your case status has changed to Judgement Pending."*
- Document uploaded by lawyer: *"Your lawyer has uploaded a new document: Court Order dated 30 May 2024."*

> Requires WhatsApp Message Templates (pre-approved by Meta). Free to apply, takes 1-3 days for approval.

---

## Module 4 — AI Layer

### 4A. Provider Configuration (per org)
- Admin enters their own API key (OpenRouter, OpenAI, Gemini, Anthropic, or any OpenAI-compatible endpoint)
- Select model from dropdown (or enter custom model string)
- System prompt — fully editable text area with placeholder variables:
  - `{{org_name}}` — replaced with organization name
  - `{{client_name}}` — replaced with client name
  - `{{case_number}}` — replaced with case number
  - `{{case_status}}` — replaced with current status
  - `{{next_hearing}}` — replaced with next hearing date
  - `{{assigned_lawyer}}` — replaced with lawyer name

**Default system prompt (legal):**
```
You are a legal case assistant for {{org_name}}.
You are speaking with {{client_name}}.
Their case number is {{case_number}}, currently at status: {{case_status}}.
Next hearing: {{next_hearing}}. Assigned lawyer: {{assigned_lawyer}}.
Answer questions clearly and briefly. Do not give legal advice.
Always respond in the language the user is writing in.
```

### 4B. Context Injection
On every message, bot fetches:
- Client record (name, language)
- Active case record (status, court, hearing date, lawyer)
- Last 10 messages (conversation history)

All injected into system prompt before AI call. No RAG needed for basic use case.

### 4C. Generalization
The system prompt is the only thing that makes this "legal." Any org can rewrite it:
- Customer support agency → support agent persona
- Real estate firm → property query assistant  
- Hospital → appointment and report query bot

Same platform, different prompt.

---

## Module 5 — Bot Configuration UI

Multi-step setup wizard (Admin only):

**Step 1 — Connect WhatsApp**
- Enter Meta App credentials: Phone Number ID, Access Token, Verify Token
- Test connection button
- Webhook URL displayed (copy and paste into Meta dashboard)

**Step 2 — Configure AI**
- Select provider
- Enter API key
- Select or enter model
- Test AI button (sends a sample message)

**Step 3 — Bot Persona**
- Bot name (e.g. "LexAssist", "CaseBot")
- Default language
- Edit system prompt (with variable reference guide shown alongside)

**Step 4 — Notifications**
- Toggle hearing reminders on/off
- Toggle status change alerts on/off
- Customize reminder timing (24h / 48h before hearing)

---

## Module 6 — Admin Analytics Dashboard

Metrics visible to Admin only:

- Total active cases
- Total clients
- Bot messages this month (auto-handled vs escalated to human)
- Documents uploaded this month
- Cases by status (donut chart)
- New cases this week (bar chart)
- Top courts by case volume

---

## Module 7 — eCourts Integration

### Hackathon scope: Manual URL import
- Lawyer pastes case URL from ecourts.gov.in
- Backend fetches page once, parses next hearing date
- Auto-fills hearing date field in case form
- Not a live sync — one-time import per case update

### Product V1: Scheduled sync
- Cron job runs daily per active case
- Fetches latest status from eCourts
- Updates case status and hearing date automatically
- Notifies assigned lawyer if status changed
- Notifies client via WhatsApp if hearing date changed

### Roadmap: Official API
- Apply for access to api.ecourts.gov.in (government authorization required)
- Replace scraper with official data feed
- Covers all district courts, high courts, Supreme Court

> ⚠️ Note: Scraping government websites is a ToS gray area. Frame as "eCourts sync" in pitch, not "scraping." Position official API access as the roadmap destination.

---

## What Is NOT In Scope

| Feature | Reason |
|---|---|
| Telegram / Instagram bots | Phase 2 — same architecture, different API |
| Web chat window | Different product, contradicts core value prop |
| In-app lawyer-client messaging | Defeats the purpose of WhatsApp-first |
| Billing / subscription system | Post-hackathon |
| Document AI / RAG over PDFs | Phase 2 |
| Court hearing scraper for all courts | Too many court portals, too much variance |
| Mobile app | Not needed — WhatsApp IS the client app |

---

## Hackathon Build Scope (June 6–7)

**Must ship:**
- [ ] Org signup + auth (admin / lawyer / staff roles)
- [ ] Client creation form (multi-step)
- [ ] Case creation + case detail page
- [ ] Document upload from dashboard
- [ ] WhatsApp bot: first-message identification flow
- [ ] WhatsApp bot: case status query
- [ ] WhatsApp bot: document upload from WhatsApp
- [ ] AI response with case context injected
- [ ] Language auto-response (test with Hindi + English)

**Ship if time allows:**
- [ ] Bot configuration UI (Step 1 + 2 only)
- [ ] Admin analytics (4 static numbers)
- [ ] eCourts URL import (one-time parse)
- [ ] Proactive hearing reminder (manually triggered for demo)

**Do not touch:**
- Telegram, Instagram, web chat, billing, full eCourts sync

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend + Backend | Next.js 14, TypeScript |
| UI Components | Tailwind CSS + shadcn/ui |
| Database | Supabase (Postgres + RLS + Realtime) |
| File Storage | Supabase Storage (signed URLs) |
| Auth | Supabase Auth |
| WhatsApp | Meta Cloud API (direct, no Twilio) |
| AI | OpenRouter (BYOK, OpenAI-compatible) |
| Base Repo | github.com/Hemang2208/Whatsapp-Agent |
| Deployment | Vercel |

---

## Pitch Summary (60 seconds)

> In tier 2 and tier 3 cities across India — and in countless countries globally — people spend 2-3 hours daily traveling to courts just to find out their hearing was postponed. They can't reach their lawyer. Court websites crash. And the language barrier between lawyer and client causes dangerous miscommunication.
>
> LexBot is a legal CRM that gives law firms a WhatsApp bot their clients already know how to use. No new app. No new website. Clients message in Hindi, Tamil, or any language — and get real-time updates on their case, documents, and hearings.
>
> For lawyers: automated client communication, document collection, and case tracking in one dashboard. For clients: their court date in their language, on the app they already have.
>
> We connect directly to Meta's WhatsApp API — no per-message markups from Twilio or MSG91. And every firm brings their own AI key — we charge for the platform, not the compute.
