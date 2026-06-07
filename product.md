# LexBot CRM Product Brief

## One-Line Positioning

LexBot CRM is a WhatsApp-native legal case communication and workflow automation platform that helps law firms give clients verified access to case status, hearing dates, documents, and court updates without requiring clients to download a new app.

## Recommended Hackathon Track

Selected track: Problem Statement 2 - AI for Legal Governance.

Why this track fits:

- The product improves legal workflow efficiency, client communication, case tracking, and governance.
- It automates a real operational pain point for law firms and legal aid organizations.
- It uses AI as a controlled assistant layer over verified case data rather than as an unsupported legal-advice engine.
- It demonstrates a practical workflow: lawyer creates case, client verifies over WhatsApp, bot responds using live case context, and the firm monitors activity from a dashboard.

Do not pitch this as Problem Statement 1 unless the product is changed into a contract review and redlining tool. The current codebase is not a contract redlining product.

## Elevator Pitch

In many Indian legal workflows, clients still depend on calls, office visits, and fragmented WhatsApp messages just to know their next hearing date or case status. This creates missed hearings, repeated manual work for lawyers, and confusion for clients who may not understand legal language or court portals.

LexBot CRM solves this by giving every law firm a secure WhatsApp bot connected to its case database. A client sends their Case ID, verifies their name, and instantly receives case status, hearing date, document information, and plain-language updates. Lawyers manage everything from a CRM dashboard and can take over any conversation manually when needed.

The result is a legal communication layer that is simple for clients, useful for lawyers, and practical enough to deploy beyond the hackathon.

## 10-Second Pitch

LexBot is a legal CRM with a WhatsApp bot that lets verified clients ask for case status, hearing dates, documents, and court updates in the app they already use.

## 30-Second Pitch

Law firms waste hours answering repetitive client questions like "What is my next hearing date?" or "What happened in court?" Clients often travel to court or repeatedly call lawyers just for basic updates. LexBot CRM gives each firm a WhatsApp-native assistant connected to its case records. Clients verify using Case ID plus name, then get live updates in plain language. Lawyers get a dashboard for cases, documents, conversations, court monitoring, and human takeover. It is not a generic chatbot. It is a verified legal workflow automation system.

## 60-Second Pitch

In legal practice, especially for smaller firms and legal aid teams, communication is a serious governance problem. Clients miss hearings because they do not receive timely updates. Lawyers lose time answering repetitive status calls. Court information is fragmented, technical, and often inaccessible to non-lawyers.

LexBot CRM solves this with a WhatsApp-first legal case management platform. A lawyer creates a client and case in the dashboard. The client messages the firm's WhatsApp number with their Case ID. The bot verifies identity using the registered name, then responds with case status, next hearing date, lawyer details, uploaded document information, and AI-assisted plain-language explanations. Lawyers can monitor conversations, switch to human mode, and send manual replies from the dashboard.

For the hackathon demo, court monitoring uses a simulated provider with realistic court updates. The architecture is provider-based, so an official eCourts API or legal data service can replace the mock provider later. The core value is clear: fewer missed updates, less manual work, better client access, and a scalable legal governance workflow.

## Problem

Legal communication is still highly manual.

Clients often do not know:

- The current status of their case.
- Their next hearing date.
- Which lawyer is assigned.
- Whether documents have been uploaded.
- What a court update actually means.

Lawyers and staff face:

- Repeated calls for basic case information.
- Missed hearing reminders.
- Manual WhatsApp follow-ups.
- No structured audit trail of client communication.
- No easy way to separate AI responses from human takeover.

Legal aid and smaller firms face an even bigger problem:

- Clients may not use portals.
- Clients may not understand English legal language.
- Clients may not be comfortable with dashboards or new apps.
- WhatsApp is already the default communication channel.

## Target Users

### Law Firms

Need a simple CRM for client records, case records, hearing dates, documents, and client communication.

### Legal Aid Organizations

Need scalable client communication for people who may not use formal legal portals.

### Solo Lawyers and Small Practices

Need automation without building their own tech stack.

### Court-Facing Agencies

Need structured tracking, reminders, and communication around case workflows.

### Clients

Need simple access to legal case information through WhatsApp, without logging into a dashboard.

## Product Thesis

Legal AI should not blindly give legal conclusions. It should first organize verified legal workflow data, then communicate it clearly and safely.

LexBot follows this principle:

- Structured case data is the source of truth.
- WhatsApp is the client interface.
- AI explains and summarizes only within controlled context.
- Lawyers keep control through dashboard monitoring and human takeover.
- Every sensitive workflow is scoped to an organization.

## Core User Flow

1. A law firm admin signs up and creates an organization.
2. The firm creates a client profile with phone number and preferred language.
3. The firm creates a case with case number, court, status, hearing date, assigned lawyer, and notes.
4. The client messages the firm's WhatsApp number.
5. The bot asks for the Case ID.
6. The bot asks the client to confirm their registered name.
7. If verification succeeds, the bot links the conversation to the client and case.
8. The client can ask:
   - What is my case status?
   - When is my next hearing?
   - Who is my lawyer?
   - What documents are uploaded?
   - What does this update mean?
9. The lawyer can monitor the conversation from the dashboard.
10. The lawyer can switch a conversation from AI mode to human mode.
11. Court updates can generate notifications and WhatsApp updates.

## Product Modules

### 1. Organization Onboarding

Current implementation:

- Email/password signup.
- Organization creation.
- Admin member creation.
- Default bot settings creation.
- Supabase Auth based session handling.

Pitch value:

- Multi-tenant SaaS foundation.
- Every firm gets its own workspace.
- Organization-specific settings allow each firm to bring its own WhatsApp and AI credentials.

### 2. Client Management

Current implementation:

- Create client profile.
- Store name, phone, preferred language, address, ID proof type, notes.
- Client listing with search/filter patterns.
- Client detail pages.
- Client to case relationship.

Pitch value:

- Lawyers can maintain structured client records.
- Client phone number becomes the WhatsApp identity anchor.
- Preferred language supports future multilingual communication.

### 3. Case Management

Current implementation:

- Create and list cases.
- Store case number, court name, court city, type, status, hearing date, assigned lawyer, eCourts URL, and notes.
- Case detail page.
- Case timeline through case events.
- Status updates and hearing updates.

Pitch value:

- Case record becomes the verified source of truth for bot answers.
- Hearing date and status updates become instantly queryable by clients.
- Timeline supports accountability and auditability.

### 4. Document Management

Current implementation:

- Dashboard upload route.
- Document metadata stored with case and client linkage.
- Supabase Storage path support.
- Signed URL generation for secure downloads.
- Document listing.

Pitch value:

- Documents are attached to the legal matter.
- Access can remain private through signed URLs.
- Bot can list available documents for a verified client.

Important demo honesty:

- WhatsApp media intake is acknowledged but not fully implemented as storage upload from Meta media API.
- For the pitch, say: "Dashboard document upload is implemented; WhatsApp media ingestion is planned for production using Meta media download API."

### 5. WhatsApp Bot

Current implementation:

- Meta webhook endpoint.
- Message parsing for text and media-like messages.
- Conversation creation.
- Deduplication by WhatsApp message ID.
- State machine:
  - new
  - awaiting_case_id
  - awaiting_name
  - verified
- Case ID verification.
- Fuzzy name verification.
- 24-hour session expiry.
- Rule-based intents:
  - case status
  - hearing date
  - lawyer contact
  - documents
  - upload acknowledgement
  - AI fallback
- Human mode support.

Pitch value:

- The bot is not open-ended from the start.
- It verifies the client before revealing case information.
- It answers from structured case records.
- It supports escalation to humans.

### 6. AI Layer

Current implementation:

- OpenRouter-compatible AI client.
- Per-organization AI key/model support.
- System prompt template support.
- Context injection with organization, client, case, court, hearing, status, lawyer, and recent conversation messages.
- Court update summarization.
- Fallback messages when AI is unavailable.

Pitch value:

- AI is controlled by case context.
- AI does not replace the lawyer.
- AI explains case data in plain language.
- The system can support multiple models through OpenAI-compatible APIs.

Safety framing:

- LexBot should not provide final legal advice.
- It should provide case information, reminders, summaries, and escalation paths.
- Every AI response should be positioned as informational and lawyer-supervised.

### 7. Human Takeover

Current implementation:

- Conversations have mode: agent or human.
- If a conversation is in human mode, inbound messages are stored but the bot does not auto-reply.
- Lawyers can send messages manually from the dashboard.

Pitch value:

- Lawyers remain in control.
- Sensitive or complex matters can be escalated.
- AI is an assistant, not an unchecked legal decision-maker.

### 8. Notifications

Current implementation:

- Notification table and API.
- Unread count support.
- Mark read and mark all read support.
- Court update notification creation through case sync.
- Manual notification endpoint for hearing reminders and status changes.

Pitch value:

- Firms can track important updates.
- Notifications support operational governance.
- Future cron jobs can automate hearing reminders.

### 9. Court Monitoring

Current implementation:

- Case monitoring table migration.
- Case update table migration.
- Court data provider interface.
- MockCourtProvider with realistic court update examples.
- Manual sync route.
- AI summary of court update.
- Case timeline event creation.
- Notification creation.
- Optional WhatsApp send to client.

Pitch value:

- Shows a credible path toward automated court update workflows.
- Provider interface makes the system extensible.
- Demonstrates how legal updates can be converted into plain-language client communication.

Important demo honesty:

- Court monitoring is simulated for hackathon demo.
- It is not scraping real eCourts data today.
- The right framing is: "provider-based architecture, demo uses mock provider, official API integration is roadmap."

### 10. Dashboard

Current implementation:

- Main dashboard.
- Sidebar navigation.
- Clients.
- Cases.
- Documents.
- Calendar.
- WhatsApp chat.
- Settings.
- Notifications.
- Command palette.

Pitch value:

- Judges can see a complete workflow, not only an API.
- Lawyers get a usable operational interface.
- Dashboard is the firm-side control center while WhatsApp is the client-side interface.

## Demo Story

Use this demo story in the pitch deck and live demo.

Demo firm:

- LexBot Demo Law Firm
- City: Mumbai
- Assigned lawyer: Adv. Priya Mehta

Demo client:

- Rahul Sharma
- Phone: +91 99999 88877
- Preferred language: Hindi

Demo case:

- Case number: CC/2026/0042
- Court: High Court of Bombay
- Case type: Civil
- Status: Hearing Scheduled
- Next hearing: 7 days from demo date
- Context: Property dispute, parties moving toward mediation

Demo sequence:

1. Show dashboard summary.
2. Show client record for Rahul Sharma.
3. Show case CC/2026/0042 with court, status, hearing date, lawyer, and timeline.
4. Show WhatsApp conversation where Rahul asks for case status.
5. Show verified response with source: case record.
6. Ask in Hindi: "Mujhe agli sunvayi kab hai?"
7. Show response with next hearing date.
8. Show documents page with Property Deed.pdf.
9. Show court monitoring update: Next Hearing Date Fixed.
10. Show notification or case event created from court update.
11. Switch a conversation to human mode to prove lawyer control.

## Slide Deck Structure

Use this exact outline for a 12-14 slide deck.

### Slide 1 - Title

Title: LexBot CRM

Subtitle: WhatsApp-native legal case communication and workflow automation.

One-liner: Verified case updates for clients. Less manual follow-up for lawyers.

### Slide 2 - Problem

Clients miss updates because legal communication is fragmented.

Key points:

- Clients repeatedly call lawyers for hearing dates and status.
- Lawyers spend time answering repetitive questions.
- Court information is hard for non-lawyers to understand.
- Many clients already use WhatsApp but not legal portals.

### Slide 3 - Why It Matters

Legal communication failure creates real harm.

Impact:

- Missed hearings.
- Delayed document collection.
- Client anxiety and distrust.
- Increased workload for lawyers and staff.
- Poor access to justice for less tech-savvy clients.

### Slide 4 - Solution

LexBot CRM gives law firms a verified WhatsApp bot connected to their case database.

Core promise:

- Client asks on WhatsApp.
- Bot verifies identity.
- Bot answers from live case records.
- Lawyer monitors and can take over.

### Slide 5 - Product Workflow

Workflow:

1. Lawyer creates client and case.
2. Client messages WhatsApp with Case ID.
3. Bot verifies name.
4. Bot responds with case status, hearing date, documents, and updates.
5. Lawyer monitors dashboard and takes over when needed.

### Slide 6 - Demo Use Case

Demo case:

- Rahul Sharma
- CC/2026/0042
- High Court of Bombay
- Hearing scheduled
- Client asks for next hearing in Hindi
- Bot replies from verified case record

### Slide 7 - Key Features

Features:

- Multi-tenant firm workspace.
- Client and case management.
- Dashboard document upload.
- WhatsApp identity verification.
- AI fallback with case context.
- Human takeover.
- Notifications.
- Court monitoring demo provider.

### Slide 8 - Legal and Governance Logic

Legal safety:

- Case data is the source of truth.
- Client must verify before receiving information.
- AI is informational, not legal advice.
- Lawyer can take over.
- Organization scoping protects firm data.
- Audit timeline records key case events.

### Slide 9 - Technical Architecture

Architecture:

- Next.js 16 app with React 19.
- Supabase Auth, Postgres, Storage, and Realtime.
- Meta WhatsApp Cloud API.
- OpenRouter-compatible AI layer.
- Provider interface for court data.
- Server routes enforce session-based organization scoping.

### Slide 10 - AI Approach

AI is used for controlled communication, not blind legal decision-making.

AI inputs:

- Organization settings.
- Client name and language.
- Case number.
- Court.
- Case status.
- Hearing date.
- Assigned lawyer.
- Recent conversation history.

AI outputs:

- Plain-language answers.
- Case-contextual explanations.
- Court update summaries.

### Slide 11 - Current Demo Status

Implemented:

- Auth and organization onboarding.
- Clients, cases, documents.
- WhatsApp webhook and bot state machine.
- Conversation dashboard.
- Human takeover mode.
- Settings.
- Notifications.
- Court monitoring with mock provider.
- Demo seed route.

Hackathon-simulated:

- Court data provider.

Planned:

- Real eCourts/API adapter.
- WhatsApp media download and storage.
- Scheduled cron reminders.
- Stronger role-based access.

### Slide 12 - Practical Utility

Who benefits:

- Law firms reduce repetitive calls.
- Clients get simple access to updates.
- Legal aid teams scale communication.
- Staff get structured records.
- Lawyers keep control over sensitive matters.

### Slide 13 - Market and Impact

Market angle:

- Small and mid-sized law firms.
- Legal aid organizations.
- Regional legal practices.
- Case-heavy offices.
- WhatsApp-first client bases.

Impact:

- Fewer missed hearings.
- Faster client communication.
- Better client trust.
- Lower administrative burden.
- More accessible legal information.

### Slide 14 - Roadmap

Next steps:

- Production-safe WhatsApp media ingestion.
- Official court data provider integration.
- Scheduled hearing reminders.
- Role-based permissions.
- Better multilingual rule-based responses.
- Legal reliability and confidence indicators.
- Analytics for firm operations.

## Technical Architecture

### Frontend

- Next.js 16.
- React 19.
- Tailwind CSS v4.
- shadcn-style UI components.
- Dashboard routes for clients, cases, chat, documents, calendar, settings, and notifications.

### Backend

- Next.js route handlers.
- API routes for:
  - onboarding
  - clients
  - cases
  - documents
  - conversations
  - webhook
  - notifications
  - settings
  - court monitoring
  - demo seeding

### Database

- Supabase Postgres.
- Tables:
  - organizations
  - org_members
  - org_settings
  - clients
  - cases
  - case_events
  - documents
  - conversations
  - messages
  - case_monitoring
  - case_updates
  - notifications

### Storage

- Supabase Storage bucket: case-documents.
- Dashboard document upload.
- Signed URLs for controlled document access.

### Auth and Access Control

- Supabase Auth.
- API routes resolve user organization from session.
- Most dashboard APIs scope queries by organization.
- RLS policies exist for core tables.

### WhatsApp

- Meta Cloud API webhook.
- Incoming message parsing.
- Outbound message sending.
- Per-organization credential support with environment fallback.

### AI

- OpenRouter-compatible client.
- Model configurable per organization.
- Default model fallback.
- Case-context prompt construction.
- Court update summarization.

## Legal Logic

LexBot is designed around legal information access, not automated legal representation.

Legal logic principles:

1. Verified identity before case disclosure.
2. Structured case record as the source of truth.
3. AI answers constrained by case context.
4. Plain-language communication for non-lawyers.
5. Human takeover for sensitive or complex issues.
6. Audit trail for important updates.
7. No claim that the bot replaces a lawyer.

Types of legal/governance support:

- Case status awareness.
- Hearing date reminders.
- Document availability.
- Lawyer contact routing.
- Court update summarization.
- Client communication audit trail.
- Reduced risk of missed information.

Recommended disclaimer:

"LexBot provides case information and workflow updates based on firm records. It does not provide independent legal advice. For legal strategy or interpretation, clients should contact their lawyer."

## AI Safety and Reliability

Current AI controls:

- AI receives case-specific context.
- AI system prompt tells it not to give legal advice.
- Rule-based intents handle common case information questions.
- Fallback responses direct users to lawyers when systems fail.

Recommended improvements:

- Add visible "Source: case record" labels in dashboard and WhatsApp responses.
- Add confidence levels for AI summaries.
- Add a lawyer review flag for uncertain AI responses.
- Store AI response metadata for audit.
- Block AI from answering unrelated legal strategy questions without escalation.

## Security and Privacy Framing

Current strengths:

- Organization-scoped data model.
- Session-based API access.
- Supabase RLS policies.
- Document signed URLs.
- Client verification before case access.

Known gaps to acknowledge internally:

- Webhook signature verification should be added before production.
- Conversation uniqueness should be scoped by organization and phone together.
- Case lookup inside bot should be scoped to the resolved organization.
- Admin-only controls should be enforced for settings and credentials.
- WhatsApp media ingestion needs secure download and storage implementation.

Pitch-safe wording:

"The prototype already uses organization-scoped data and verified client sessions. Before production, we would harden webhook signature verification, role-based permissions, and multi-tenant WhatsApp scoping."

## Implementation Status

### Built

- Signup and onboarding.
- Organization and member tables.
- Client CRUD.
- Case CRUD.
- Case timeline.
- Document upload/download metadata.
- WhatsApp webhook.
- Bot verification flow.
- Intent-based bot responses.
- AI fallback.
- Human takeover mode.
- Settings page.
- Notifications API.
- Court monitoring mock provider.
- Demo seed endpoint.

### Partially Built

- Multilingual support: preferred language exists; AI can respond based on prompt/context, but rule-based replies are mostly English.
- Proactive notifications: manual/internal endpoint exists; scheduled cron reminders are not fully automated.
- Court monitoring: architecture exists; current provider is simulated.
- Document access through WhatsApp: bot lists documents, but WhatsApp media upload storage is not fully implemented.

### Not Built Yet

- Real eCourts integration.
- WhatsApp media download and Supabase upload from inbound media.
- Team invite flow.
- Billing.
- Production-grade role enforcement.
- Full automated reminders.
- Webhook signature verification.
- Full test suite.

## Competitive Differentiation

LexBot is different from generic chatbots because:

- It starts from verified case data.
- It uses WhatsApp as the client interface.
- It includes a lawyer dashboard.
- It supports human takeover.
- It keeps AI in an assistant role.
- It targets legal workflow governance, not general Q&A.

LexBot is different from traditional CRMs because:

- The client does not need to log in.
- WhatsApp becomes the client portal.
- Case status can be queried conversationally.
- Court updates can be summarized and sent automatically.

## Business Model

Possible pricing:

- Free trial for small firms.
- Monthly SaaS subscription per firm.
- Tier based on number of active cases or conversations.
- Bring-your-own AI key to reduce platform compute costs.
- Optional premium integrations for court data providers.

Possible customer segments:

- Solo lawyers.
- Small law firms.
- Legal aid NGOs.
- Mid-sized firms.
- Case-heavy compliance teams.

## Product Metrics

Metrics to track:

- Number of active cases.
- Number of client conversations.
- Percentage of queries handled by bot.
- Number of human takeovers.
- Average response time to client.
- Number of hearing reminders sent.
- Number of missed/unverified conversations.
- Documents uploaded per case.
- Court updates processed.

Demo metrics to show:

- Active cases.
- Total clients.
- Bot messages handled.
- Upcoming hearings.
- Human takeover count.
- Recent court updates.

## Risks and Mitigations

### Risk: AI gives legal advice

Mitigation:

- Use system prompt guardrails.
- Keep structured case info as source of truth.
- Add disclaimers.
- Escalate complex questions to lawyer.
- Log responses.

### Risk: Wrong client accesses case data

Mitigation:

- Verify Case ID plus registered name.
- Add organization-scoped phone conversations.
- Add stronger OTP-based verification in future.

### Risk: WhatsApp API fails during demo

Mitigation:

- Use seeded conversation data.
- Add simulated delivery mode.
- Show dashboard flow even without live WhatsApp.

### Risk: Court integration is mocked

Mitigation:

- Be honest: provider interface is implemented, demo provider is simulated.
- Show that replacing the provider does not change the rest of the workflow.

### Risk: Legal trust concerns

Mitigation:

- Position as communication and workflow automation.
- Avoid claiming automated legal decisions.
- Keep lawyers in control.

## Roadmap

### Phase 1 - Hackathon Prototype

- Client and case management.
- WhatsApp bot verification.
- Case status and hearing date responses.
- Documents dashboard.
- Human takeover.
- AI fallback.
- Mock court monitoring.
- Demo seed data.

### Phase 2 - Production Hardening

- Webhook signature verification.
- Organization-plus-phone conversation scoping.
- Admin-only settings.
- Test suite.
- Scheduled reminders.
- WhatsApp media ingestion.
- Better multilingual templates.

### Phase 3 - Legal Integrations

- Official court data provider.
- eCourts API adapter where available.
- Third-party legal data provider support.
- Calendar integrations.
- Lawyer task management.

### Phase 4 - Scale

- Team invites.
- Role-based dashboards.
- Analytics.
- Billing.
- Multi-branch firms.
- White-label deployment.

## Judge Rubric Mapping

### Working Demo and Prototype Execution

Strength:

- End-to-end demo can show dashboard, client, case, WhatsApp conversation, AI response, and court update.

Improve:

- Make demo seed reliable.
- Avoid relying on live Meta API during judging.

### Problem Relevance and Legal Governance Impact

Strength:

- Real legal workflow problem.
- Clear target users.
- Strong fit for legal communication and case governance.

Improve:

- Use a clear story about missed hearings and repeated status calls.

### Practical Utility and Real-World Feasibility

Strength:

- WhatsApp-first approach is practical.
- Law firms already manage clients this way informally.
- CRM plus bot is deployable.

Improve:

- Add production hardening plan.

### Technical Implementation

Strength:

- Real full-stack implementation.
- Supabase, Auth, Storage, WhatsApp, AI, and dashboard are integrated.
- Provider pattern exists for court data.

Improve:

- Fix lint/build issues.
- Add tests.
- Strengthen multi-tenant scoping.

### Legal Logic and Reliability

Strength:

- Verification before disclosure.
- Case record as source of truth.
- Not legal advice framing.
- Human takeover.

Improve:

- Add visible source/confidence indicators.
- Add stricter AI refusal/escalation.

### Innovation and Concept Strength

Strength:

- WhatsApp as legal client portal.
- AI plus CRM plus human takeover.
- Provider-based court update summarization.

Improve:

- Show why this is better than a generic chatbot.

### Presentation and Clarity

Strength:

- Demo story is easy to understand.
- Workflow is visual.

Improve:

- Keep slides focused.
- Do not overclaim mock features.

## Suggested Final Deck Narrative

Narrative arc:

1. Legal communication is broken.
2. Clients already use WhatsApp.
3. Law firms need verified, structured communication.
4. LexBot turns WhatsApp into a secure client access layer.
5. Lawyers keep control through the CRM dashboard.
6. AI makes updates understandable, not legally autonomous.
7. The prototype works today and can become production-ready with clear next steps.

## Best Demo Script

Opening:

"We are solving a simple but painful legal governance problem: clients do not get timely, understandable case updates, and lawyers spend hours repeating the same information."

Show dashboard:

"This is the law firm dashboard. The firm can manage clients, cases, documents, hearing dates, conversations, and notifications."

Show client and case:

"Here we have Rahul Sharma, whose case CC/2026/0042 is in the High Court of Bombay. The next hearing is scheduled and the assigned lawyer is Adv. Priya Mehta."

Show WhatsApp conversation:

"Rahul does not need a portal. He messages WhatsApp. The bot asks for Case ID and verifies his registered name before revealing case information."

Show answer:

"When he asks for status or hearing date, the response comes from the case record, not from an open-ended hallucinating chatbot."

Show AI/court update:

"For court updates, our demo uses a simulated court provider. The update is summarized in plain language, stored in the timeline, and can notify the client."

Show human takeover:

"If the issue becomes sensitive, the lawyer switches to human mode and the bot stops auto-replying."

Closing:

"LexBot is not trying to replace lawyers. It removes repetitive communication work and makes verified legal information easier for clients to access."

## Strong Closing Line

LexBot turns WhatsApp into a verified legal client portal, while keeping lawyers in control and case records as the source of truth.

## What To Avoid Saying

Do not say:

- "We provide legal advice automatically."
- "We scrape all court websites."
- "The court integration is fully live."
- "WhatsApp document upload is fully implemented."
- "This is a contract redlining tool."

Say instead:

- "We provide verified case information and plain-language workflow updates."
- "The court provider is simulated for hackathon demo and designed to be replaceable."
- "Dashboard document upload is implemented; WhatsApp media ingestion is a production roadmap item."
- "The product fits PS-2 legal governance and workflow automation."

## Improvement Plan To Raise Score

Priority 1:

- Fix lint/build readiness.
- Add .kilo ignore to ESLint.
- Fix JSX quote errors and Link warnings.
- Clean obvious any types.

Priority 2:

- Strengthen multi-tenant WhatsApp scoping:
  - conversation uniqueness by organization plus phone
  - case lookup scoped by organization
  - webhook maps phone number ID to organization

Priority 3:

- Add demo-safe WhatsApp mode:
  - if Meta API credentials are missing, store outbound messages and show them in dashboard
  - label them as simulated delivery

Priority 4:

- Add legal reliability UI:
  - Source: case record
  - Not legal advice
  - Escalate to lawyer button

Priority 5:

- Add admin-only controls for API keys and WhatsApp settings.

## Expected Score After Improvements

Current likely score as PS-2:

- Around 70 to 75 out of 100, depending on demo stability.

With stable demo, honest mock framing, and deck clarity:

- Around 80 to 84.

With lint/build fixed, demo mode, and stronger security story:

- Around 85 to 90.

## Final Product Summary

LexBot CRM is a practical legal governance tool for case communication. It helps firms reduce repetitive client follow-up, gives clients simple WhatsApp access to verified case information, and uses AI only where it adds clarity: summarizing and explaining known case updates. The current prototype demonstrates the core workflow end to end with a realistic demo. The strongest pitch is not that LexBot is the most complex AI system, but that it is useful, understandable, and deployable in the legal workflows people already use.
