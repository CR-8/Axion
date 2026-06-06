# LexBot CRM

**WhatsApp-native legal case management for Indian law firms.**

LexBot CRM lets lawyers register clients, manage case files, and automatically update clients on hearing dates and case status via WhatsApp — using the Meta Cloud API directly, with no third-party messaging markup.

---

## Features

- **Client & case management** — register clients, track case status, hearing dates, assigned lawyers, and uploaded documents
- **WhatsApp bot** — clients verify their identity by Case ID + name, then query their case live via chat
- **Per-org bot settings** — each firm configures its own Meta Cloud API credentials, AI model, and bot persona
- **AI fallback** — OpenRouter-powered legal assistant for queries outside the structured flow
- **Real-time dashboard** — Supabase Realtime powers live updates on case and conversation views
- **Row-level security** — all data is org-scoped at both API and database levels

---

## Demo Flow

1. **Sign up** → firm org and admin account are created
2. **Add a client** (Clients → New Client) → sends WhatsApp welcome message
3. **Create a case** for that client → assign a case number, court, and lawyer
4. **Client messages your WhatsApp number** with their Case ID
5. Bot asks for name verification → on match, sends live case summary
6. Client can ask: *"What is my hearing date?"*, *"Status update?"*, *"List my documents"*

---

## Stack

- **Frontend / API:** Next.js 16, React 19, Tailwind CSS v4, shadcn/ui
- **Database:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **WhatsApp:** Meta Cloud API (direct, no Twilio)
- **AI:** OpenRouter (OpenAI-compatible, configurable per org)

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd lexbot-crm
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

```env
# Meta WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=       # Permanent token from Meta Business > System Users
WHATSAPP_PHONE_NUMBER_ID=    # Phone Number ID from Meta App > WhatsApp > API Setup
WHATSAPP_VERIFY_TOKEN=       # Any string — used for webhook verification

# AI (OpenRouter)
OPENROUTER_API_KEY=          # From openrouter.ai
AI_MODEL=openai/gpt-4o-mini  # Or any OpenRouter-supported model

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: for internal cron-triggered notifications
NOTIFY_SECRET=any-long-random-string
```

### 3. Supabase schema

In the Supabase SQL editor, run **in order**:

1. `supabase-schema.sql` — creates all tables and indexes
2. `supabase-rls.sql` — enables RLS and applies all row-level and storage policies

Then create the storage bucket:

```sql
insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', false);
```

### 4. Meta webhook

In Meta for Developers → your app → WhatsApp → Configuration:

- **Callback URL:** `https://your-domain.com/api/webhook`
- **Verify token:** same value as `WHATSAPP_VERIFY_TOKEN`
- **Subscribe to:** `messages`

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up.

---

## Architecture

```
User browser
  └── Next.js App (src/app)
        ├── (auth)/          Sign up / login pages
        ├── (dashboard)/     Main CRM UI
        └── api/
              ├── onboard/   Create org + admin on signup
              ├── clients/   CRUD — org-scoped, session-guarded
              ├── cases/     CRUD — org-scoped, session-guarded
              ├── documents/ Upload/download/delete — org-scoped
              ├── settings/  Per-org WhatsApp + AI config
              ├── conversations/ + [id]/ + messages/ + send/
              ├── webhook/   Meta Cloud API inbound (public)
              └── notify/    Manual notification trigger

WhatsApp User
  └── Meta Cloud API
        └── POST /api/webhook
              └── bot-flow.ts (state machine: new → awaiting_case_id → awaiting_name → verified)
                    └── whatsapp.ts (Meta Graph API v19.0 outbound send)
```

---

## Security Notes

- All dashboard API routes require an authenticated Supabase session (cookie-based)
- org_id is **always** derived from the session, never trusted from the request body or query params
- Document signed URLs are scoped: you must own the org that owns the document
- Supabase RLS policies provide a second layer of enforcement at the database level
- The `/api/webhook` endpoint is intentionally public (Meta calls it); `/api/onboard` verifies the session user matches the supplied userId

---

## Known Limitations (Hackathon Scope)

- **No team invites** — org members must be added directly in the database
- **No scheduled reminders** — `/api/notify` must be called manually or via cron
- **No eCourts import** — case data is entered manually
- **WhatsApp media** — the bot acknowledges received documents but does not download/store them to Supabase Storage (would require Meta media download API)
- **Multilingual** — preferred language is stored per client but all rule-based bot replies are in English; AI fallback respects context

---

## License

MIT
