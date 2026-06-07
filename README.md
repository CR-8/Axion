# LexBot CRM

**WhatsApp-native legal case management for Indian law firms — verified case updates, AI-powered communication, and a full CRM dashboard.**

LexBot CRM turns every law firm's WhatsApp number into a secure client portal. Clients verify their identity using a Case ID + name, then ask for case status, hearing dates, documents, and court updates in plain language — without installing a new app. Lawyers manage everything from a centralized dashboard and can take over any conversation manually.

---

## Table of Contents

- [What It Does](#what-it-does)
- [Current Capabilities](#current-capabilities)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Future Roadmap](#future-roadmap)
- [Pricing & Monetization](#pricing--monetization)
- [Installation Guide](#installation-guide)
- [Demo Flow](#demo-flow)
- [Security](#security)

---

## What It Does

### The Problem

In Indian legal practice, especially for smaller firms and legal aid teams, client communication is broken:

- Clients repeatedly call lawyers just to ask "What's my next hearing date?"
- Court information is fragmented and written in technical legal language
- Clients miss hearings because they don't get timely updates
- Lawyers waste hours on repetitive status queries
- No structured audit trail exists for client-lawyer communication

### The Solution

LexBot CRM replaces fragmented phone calls, missed updates, and manual WhatsApp follow-ups with a single, verified, automated system:

1. **Lawyers** manage clients, cases, documents, and hearings in a CRM dashboard
2. **Clients** message the firm's WhatsApp number and verify using their Case ID + name
3. **Bot** responds with live case data — status, hearing date, lawyer info, documents
4. **AI** explains updates in plain language (supports Hindi, English, and more)
5. **Lawyers** monitor all conversations and can switch to human mode at any time
6. **Court monitoring** syncs updates and notifies clients automatically

---

## Current Capabilities

### Organization Onboarding
- Email/password signup with Supabase Auth
- 2-step wizard: personal details → firm details (name, type, city)
- Automatic org + admin member creation
- Default bot settings with configurable AI model, bot name, system prompt
- Organization types: law_firm, legal_aid, court_agency, other

### Client Management
- Full CRUD: name, phone (WhatsApp identity anchor), language, address, ID proof
- 10 supported languages: English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi
- Search, filter by status, CSV export, bulk selection
- Auto-generates WhatsApp onboarding message with Case ID
- Auto-creates conversation record + sends WhatsApp welcome

### Case Management
- Full CRUD with fields: case number, court name/city, type, status, hearing date, assigned lawyer, eCourts URL, notes
- Case types: Civil, Criminal, Family, Property, Other
- Statuses: Active → Hearing Scheduled → Adjourned → Judgement Pending → Closed
- Case "Control Cockpit" with 3-panel layout (summary, timeline + docs, actions)
- Case audit timeline via case_events (status_change, hearing_updated, lawyer_changed, note_added, document_uploaded, court_update)
- Court monitoring with CaseUpdate records

### Document Management
- Upload via dashboard (PDF, JPG, PNG, DOC, DOCX)
- Document types: FIR, Affidavit, PAN, Aadhaar, Court Order, Petition, Other
- Stored in Supabase Storage (`case-documents` bucket), org-scoped
- Signed URLs for secure download
- Delete with confirmation

### WhatsApp Bot
- **State machine**: new → awaiting_case_id → awaiting_name → verified
- 24-hour session expiry
- Fuzzy name verification for identity matching
- **Rule-based intents**: case_status, hearing_date, lawyer_contact, documents, upload
- **AI fallback** for unhandled queries (OpenRouter-compatible)
- **Human mode toggle** — lawyers can take over any conversation
- **Multilingual** — AI responds in the user's preferred language
- Configurable bot name per org (default: "LexAssist")

### AI Layer
- OpenRouter-compatible per org (bring-your-own-key)
- System prompt with template variables: `{{bot_name}}`, `{{org_name}}`, `{{client_name}}`, `{{case_number}}`, `{{case_status}}`, `{{next_hearing}}`, `{{assigned_lawyer}}`
- Context injection: org settings, client info, case record, last 20 messages
- Court update summarization via AI
- Safety: system prompt prohibits giving legal advice; responses marked informational

### Court Monitoring (Demo)
- Pluggable `CourtDataProvider` interface
- `MockCourtProvider` with 3 realistic update types (Hearing Adjourned, Order Copy Available, Next Hearing Date Fixed)
- Full sync workflow: fetch updates → AI summarize → insert case_updates → create timeline events → create notifications → send WhatsApp to client
- Manual sync button in case cockpit

### Dashboard & Analytics
- "Command Center" with upcoming hearings, recent changes, unverified sessions, live messages feed, AI vs human triage stats
- Hearing Calendar with month grid view
- Theme toggle (light/dark)
- Command palette (Ctrl+K)
- Notification bell with unread count

### Settings
- Tabbed: WhatsApp, AI Config, Persona, Notifications
- Per-org credential management (WhatsApp + AI keys)
- Bot name and customizable system prompt
- Notification toggles (hearing, status change, document)
- Setup progress wizard (25% increments)
- Connection test button
- 1-click demo seed data

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS v4, shadcn/ui, Radix UI |
| **Language** | TypeScript 5 |
| **Database** | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| **Auth** | Supabase Auth (cookie-based SSR sessions) |
| **WhatsApp** | Meta Cloud API / Twilio (dual payload support) |
| **AI** | OpenRouter / OpenAI-compatible (per-org BYOK) |
| **Icons** | Lucide React, Remixicon |
| **Charts** | Recharts |
| **Tables** | TanStack React Table |
| **Validation** | Zod |
| **Fonts** | Inter, Geist Mono, Cormorant Garamond, DM Sans, Outfit, JetBrains Mono |

---

## Architecture

```
User Browser (Dashboard)
  └── Next.js App (src/app/)
        ├── (auth)/          Login / Signup pages
        ├── (dashboard)/     Main CRM (clients, cases, docs, chat, calendar, settings)
        └── api/
              ├── onboard/       Create org + admin on signup
              ├── clients/       Org-scoped CRUD
              ├── cases/         Org-scoped CRUD + monitoring
              ├── documents/     Upload/download/delete + signed URLs
              ├── conversations/ Chat + messages + send + mode toggle
              ├── settings/      WhatsApp + AI + persona + notifications
              ├── webhook/       WhatsApp inbound (public)
              ├── notify/        Manual notification trigger
              └── demo/seed     One-click seed data

WhatsApp Client
  └── Meta Cloud API / Twilio
        └── POST /api/webhook
              └── bot-flow.ts (state machine)
                    └── whatsapp.ts (outbound send)

Supabase
  ├── PostgreSQL (orgs, clients, cases, docs, conversations, messages, events)
  ├── Auth (email/password, cookie sessions)
  ├── Storage (case-documents bucket, signed URLs)
  └── Realtime (live message feed on dashboard)
```

### Database Tables

`organizations` → `org_members` → `org_settings` → `clients` → `cases` → `case_events` → `documents` → `conversations` → `messages` → `case_monitoring` → `case_updates` → `notifications`

All data is org-scoped via `org_id` with Supabase RLS enforcing isolation.

---

## Future Roadmap

### Phase 1 — Production Hardening
- Webhook signature verification (Meta + Twilio)
- Organization + phone scoping for conversations
- Admin-only settings & credential management
- Comprehensive test suite
- ESLint/build cleanup
- Demo-safe WhatsApp mode (simulated delivery fallback)

### Phase 2 — Legal Integrations
- **Official eCourts API adapter** — replace MockCourtProvider with real court data
- Scheduled hearing reminders via cron
- WhatsApp media ingestion (download from Meta API → store in Supabase)
- Multilingual rule-based templates (beyond English)
- Calendar sync (Google Calendar / Outlook)

### Phase 3 — Scale & Team Features
- Team invites with role-based access (Admin / Lawyer / Staff)
- Role-based dashboards and permissions
- Analytics & reporting for firm operations
- Multi-branch firm support
- White-label deployment options

### Phase 4 — Advanced AI & Ecosystem
- Document AI / RAG over case PDFs
- Predictive hearing scheduling
- Third-party legal data provider integrations
- API marketplace for extensions
- Mobile companion apps (optional)

---

## Pricing & Monetization

### Business Model

LexBot CRM follows a **multi-tenant SaaS model** with **bring-your-own-key (BYOK)** AI infrastructure to keep platform costs low.

### Pricing Tiers

| Tier | Price | For | Features |
|------|-------|-----|----------|
| **Free Trial** | ₹0 | Small firms testing the platform | Up to 10 active cases, 1 lawyer, 1 org, community support |
| **Starter** | ₹999/mo | Solo lawyers & small practices | Up to 50 active cases, 3 lawyers, WhatsApp bot, AI fallback, email support |
| **Professional** | ₹2,499/mo | Growing law firms | Up to 200 active cases, 10 lawyers, court monitoring, notifications, priority support |
| **Enterprise** | Custom | Large firms & legal aid orgs | Unlimited cases, unlimited lawyers, white-label, dedicated support, SLA |

### Revenue Streams

1. **Monthly SaaS subscriptions** — primary revenue, tiered by case/lawyer count
2. **Court data integration add-on** — ₹499/mo per org for real eCourts API sync
3. **WhatsApp message bundles** — pay-per-use above included quota (or BYO WhatsApp number)
4. **White-label deployment** — one-time setup fee + custom pricing for large firms
5. **Professional services** — custom integrations, training, migration support

### Cost Efficiencies

- **BYOK AI** — firms bring their own OpenRouter / OpenAI key; we don't pay for inference
- **BYO WhatsApp** — firms use their own WhatsApp Business number; no per-message markup
- **Supabase free tier** — generous free tier covers small deployments
- **Vercel hosting** — efficient serverless architecture scales with usage

### Target Customers

- Solo lawyers and small practices (tier 2 / tier 3 cities)
- Mid-sized law firms (5-20 lawyers)
- Legal aid NGOs and court-facing agencies
- Compliance teams and case-heavy corporate legal departments

---

## Installation Guide

### Prerequisites

- **Node.js** 18+ (recommended: 20 LTS)
- **npm** 9+ or **pnpm** 8+
- **Git**
- **Supabase account** (free tier at [supabase.com](https://supabase.com))
- **WhatsApp Business Account** (via Meta Business Platform or Twilio)
- **OpenRouter API key** (or any OpenAI-compatible provider)

### Step 1: Clone the Repository

```bash
git clone https://github.com/CR-8/Axion.git
cd Axion
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all dependencies including Next.js 16, React 19, Tailwind CSS v4, Supabase client, Radix UI components, and all other required packages.

### Step 3: Set Up Supabase

#### 3a. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New project**
3. Enter project name (e.g., "LexBot CRM")
4. Set a secure database password (**save this — you'll need it**)
5. Choose a region close to your users
6. Click **Create new project** (takes ~2 minutes)

#### 3b. Get Your Supabase Credentials

In your Supabase project dashboard:

1. **Project Settings → API**:
   - Copy `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - Copy `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`

#### 3c. Run the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Open `supabase-schema.sql` from the cloned repo and paste it
3. Click **Run** — this creates all tables, indexes, and enables Realtime
4. Then open `supabase-rls.sql` and run it — this enables Row Level Security

#### 3d. Create the Storage Bucket

Run this in SQL Editor:

```sql
insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', false);
```

#### 3e. Configure Authentication

1. In Supabase dashboard, go to **Authentication → Settings**
2. Under **Site URL**, enter: `http://localhost:3000`
3. Under **Redirect URLs**, add: `http://localhost:3000/**`
4. Enable **Email + Password** sign-in method
5. (Optional) Configure email confirmation settings

### Step 4: Set Up Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

Fill in the values:

```env
# Meta WhatsApp Business API (if using Meta directly)
WHATSAPP_ACCESS_TOKEN=       # Permanent token from Meta Business > System Users
WHATSAPP_PHONE_NUMBER_ID=    # Phone Number ID from Meta App > WhatsApp > API Setup
WHATSAPP_VERIFY_TOKEN=       # Any string — used for webhook verification

# OR Twilio (if using Twilio for WhatsApp)
TWILIO_ACCOUNT_SID=          # From Twilio Console
TWILIO_AUTH_TOKEN=           # From Twilio Console
TWILIO_WHATSAPP_NUMBER=      # Your Twilio WhatsApp-enabled number

# AI (OpenRouter or OpenAI-compatible)
OPENROUTER_API_KEY=          # From openrouter.ai
AI_MODEL=openai/gpt-4o-mini  # Or any OpenRouter-supported model

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: for notification security
NOTIFY_SECRET=any-long-random-string
```

### Step 5: Set Up WhatsApp

#### Option A: Meta Cloud API (Direct)

1. Create a Meta Business Account at [business.facebook.com](https://business.facebook.com)
2. Create a WhatsApp Business App in [Meta for Developers](https://developers.facebook.com)
3. Go to **WhatsApp → API Setup** and get your **Phone Number ID**
4. Create a **System User** in Meta Business → Users → System Users
5. Generate a **Permanent Access Token** with `whatsapp_business_messaging` and `whatsapp_business_management` permissions
6. Set your **WHATSAPP_VERIFY_TOKEN** to any string you choose
7. Configure the **Webhook**:
   - **Callback URL:** `https://your-domain.com/api/webhook`
   - **Verify Token:** same as `WHATSAPP_VERIFY_TOKEN`
   - **Subscribe to:** `messages` field

#### Option B: Twilio (Alternative)

1. Sign up at [twilio.com](https://twilio.com)
2. Get a WhatsApp-enabled number (or sandbox number)
3. Find your **Account SID** and **Auth Token** in the Twilio Console
4. Configure the webhook URL in Twilio Console → WhatsApp → Sender → Webhook URL: `https://your-domain.com/api/webhook`

### Step 6: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 7: Sign Up and Configure

1. Click **Sign up** and create an account
2. Fill in personal details → firm details (name, type, city)
3. Go to **Settings** to configure:
   - **WhatsApp tab** — enter your WhatsApp credentials and test connection
   - **AI Config tab** — enter your OpenRouter API key and test connection
   - **Persona tab** — set bot name and customize system prompt
   - **Notifications tab** — toggle reminder preferences

### Step 8: Add Demo Data (Optional)

Go to **Settings → Setup** and click **"Seed Demo Data"** — this creates a sample firm with clients, cases, documents, conversations, and court updates for testing.

### Step 9: Create Your First Client & Case

1. Go to **Clients → New Client**
2. Fill in client name, phone number, preferred language
3. Go to **Cases → New Case**
4. Select the client, enter case number, court, status, hearing date
5. The client will automatically receive a WhatsApp message with their Case ID

### Step 10: Test the WhatsApp Bot

1. Message the firm's WhatsApp number from the client's phone
2. Send the Case ID
3. Confirm your name when asked
4. Try queries like: "What is my case status?", "Next hearing date?", "My documents"

### Deployment (Production)

#### Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set all environment variables in Vercel dashboard → Project Settings → Environment Variables.

#### Deploy with Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Demo Flow

1. **Sign up** → firm org and admin account created
2. **Add a client** → enter name, phone, language → WhatsApp welcome sent automatically
3. **Create a case** → assign case number, court, status, hearing date, lawyer
4. **Client messages WhatsApp** → sends Case ID
5. **Bot verifies identity** → asks for registered name → fuzzy match
6. **Client queries** → "What is my hearing date?", "Case status?", "List documents"
7. **AI explains** → plain-language response with live case context
8. **Human takeover** → lawyer switches to human mode → replies manually
9. **Court update** → admin clicks Sync → mock provider generates update → AI summarizes → notification sent

### Demo Credentials (After Seeding)

- **Firm:** LexBot Demo Law Firm (Mumbai)
- **Client:** Rahul Sharma (+91 99999 88877, Hindi)
- **Case:** CC/2026/0042 — High Court of Bombay, Civil, Hearing Scheduled
- **Lawyer:** Adv. Priya Mehta

---

## Security

- **Session-based auth** — all dashboard routes require Supabase cookie session
- **Org-scoped data** — `org_id` derived from session, never from request body
- **Supabase RLS** — double enforcement at database level
- **Signed URLs** — document downloads require org ownership
- **Client verification** — Case ID + name fuzzy match before disclosing case data
- **AI guardrails** — system prompt prevents legal advice; responses marked informational
- **Human override** — lawyers can stop bot responses at any time

### Known Security Gaps (Acknowledged)

- Webhook signature verification not yet implemented (needed before production)
- Admin-only controls for credentials not fully enforced
- Phone + org conversation scoping needs hardening

---

## Project Status

This project was built for a hackathon (Problem Statement 2: AI for Legal Governance). It is a functional prototype (v0.1.0) demonstrating the complete end-to-end workflow. See the [Future Roadmap](#future-roadmap) for the production-hardening path.

---

## License

MIT
