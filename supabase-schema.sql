-- ============================================================
-- LexBot CRM — Full Schema
-- Run this in Supabase SQL Editor (replace existing schema)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- ORGANIZATIONS
-- ─────────────────────────────────────────────────────────────
create table if not exists organizations (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  type        text not null default 'law_firm' check (type in ('law_firm', 'legal_aid', 'court_agency', 'other')),
  city        text,
  plan        text not null default 'trial' check (plan in ('trial', 'paid')),
  created_at  timestamp with time zone default now()
);

-- ─────────────────────────────────────────────────────────────
-- ORG MEMBERS (links Supabase auth users to orgs with roles)
-- ─────────────────────────────────────────────────────────────
create table if not exists org_members (
  id          uuid default gen_random_uuid() primary key,
  org_id      uuid references organizations(id) on delete cascade not null,
  user_id     uuid not null,  -- references auth.users(id)
  role        text not null default 'staff' check (role in ('admin', 'lawyer', 'staff')),
  full_name   text,
  email       text,
  created_at  timestamp with time zone default now(),
  unique(org_id, user_id)
);

-- ─────────────────────────────────────────────────────────────
-- ORG SETTINGS (WhatsApp + AI configuration per org)
-- ─────────────────────────────────────────────────────────────
create table if not exists org_settings (
  id                    uuid default gen_random_uuid() primary key,
  org_id                uuid references organizations(id) on delete cascade not null unique,
  whatsapp_phone_id     text,
  whatsapp_access_token text,
  whatsapp_verify_token text,
  ai_provider           text default 'openrouter',
  ai_api_key            text,
  ai_model              text default 'openai/gpt-4o-mini',
  bot_name              text default 'LexAssist',
  default_language      text default 'en',
  system_prompt         text,
  notify_hearing        boolean default true,
  notify_status         boolean default true,
  notify_document       boolean default true,
  hearing_reminder_hours int default 24,
  updated_at            timestamp with time zone default now()
);

-- ─────────────────────────────────────────────────────────────
-- CLIENTS (legal clients managed by a firm)
-- ─────────────────────────────────────────────────────────────
create table if not exists clients (
  id                  uuid default gen_random_uuid() primary key,
  org_id              uuid references organizations(id) on delete cascade not null,
  name                text not null,
  phone               text not null,  -- WhatsApp number
  preferred_language  text not null default 'en',
  address             text,
  id_proof_type       text check (id_proof_type in ('aadhaar', 'pan', 'passport', 'voter_id', 'driving_license', 'other')),
  notes               text,
  created_by          uuid,  -- org_members.user_id
  created_at          timestamp with time zone default now(),
  updated_at          timestamp with time zone default now(),
  unique(org_id, phone)
);

-- ─────────────────────────────────────────────────────────────
-- CASES
-- ─────────────────────────────────────────────────────────────
create table if not exists cases (
  id                  uuid default gen_random_uuid() primary key,
  org_id              uuid references organizations(id) on delete cascade not null,
  client_id           uuid references clients(id) on delete cascade not null,
  case_number         text not null,
  court_name          text,
  court_city          text,
  case_type           text not null default 'other' check (case_type in ('civil', 'criminal', 'family', 'property', 'other')),
  status              text not null default 'active' check (status in ('active', 'hearing_scheduled', 'adjourned', 'judgement_pending', 'closed')),
  next_hearing_date   date,
  assigned_lawyer_id  uuid,  -- org_members.user_id
  assigned_lawyer_name text,
  ecourts_url         text,
  notes               text,
  created_by          uuid,
  created_at          timestamp with time zone default now(),
  updated_at          timestamp with time zone default now()
);

-- ─────────────────────────────────────────────────────────────
-- CASE EVENTS (timeline of status changes)
-- ─────────────────────────────────────────────────────────────
create table if not exists case_events (
  id          uuid default gen_random_uuid() primary key,
  case_id     uuid references cases(id) on delete cascade not null,
  event_type  text not null,  -- 'status_change', 'hearing_updated', 'lawyer_changed', 'note_added', 'document_uploaded'
  old_value   text,
  new_value   text,
  note        text,
  created_by  uuid,
  created_by_name text,
  created_at  timestamp with time zone default now()
);

-- ─────────────────────────────────────────────────────────────
-- DOCUMENTS
-- ─────────────────────────────────────────────────────────────
create table if not exists documents (
  id              uuid default gen_random_uuid() primary key,
  org_id          uuid references organizations(id) on delete cascade not null,
  case_id         uuid references cases(id) on delete cascade not null,
  client_id       uuid references clients(id) on delete cascade not null,
  name            text not null,
  doc_type        text not null default 'other' check (doc_type in ('fir', 'affidavit', 'pan', 'aadhaar', 'court_order', 'petition', 'other')),
  storage_path    text not null,  -- path in Supabase Storage
  mime_type       text,
  size_bytes      bigint,
  source          text not null default 'dashboard' check (source in ('dashboard', 'bot')),
  uploaded_by     uuid,
  uploaded_by_name text,
  created_at      timestamp with time zone default now()
);

-- ─────────────────────────────────────────────────────────────
-- CONVERSATIONS (modified — now linked to client + case)
-- ─────────────────────────────────────────────────────────────
create table if not exists conversations (
  id                  uuid default gen_random_uuid() primary key,
  org_id              uuid references organizations(id),
  phone               text unique not null,
  name                text,
  client_id           uuid references clients(id),
  case_id             uuid references cases(id),
  mode                text not null default 'agent' check (mode in ('agent', 'human')),
  session_state       text not null default 'new' check (session_state in ('new', 'awaiting_case_id', 'awaiting_name', 'verified')),
  session_expires_at  timestamp with time zone,
  preferred_language  text default 'en',
  updated_at          timestamp with time zone default now(),
  created_at          timestamp with time zone default now()
);

-- ─────────────────────────────────────────────────────────────
-- MESSAGES (unchanged structure, keep as is)
-- ─────────────────────────────────────────────────────────────
create table if not exists messages (
  id                  uuid default gen_random_uuid() primary key,
  conversation_id     uuid references conversations(id) on delete cascade not null,
  role                text not null check (role in ('user', 'assistant')),
  content             text not null,
  whatsapp_msg_id     text unique,
  created_at          timestamp with time zone default now()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────
create index if not exists idx_messages_conversation      on messages(conversation_id);
create index if not exists idx_conversations_updated      on conversations(updated_at desc);
create index if not exists idx_conversations_phone        on conversations(phone);
create index if not exists idx_clients_org               on clients(org_id);
create index if not exists idx_clients_phone             on clients(phone);
create index if not exists idx_cases_org                 on cases(org_id);
create index if not exists idx_cases_client              on cases(client_id);
create index if not exists idx_cases_status              on cases(status);
create index if not exists idx_case_events_case          on case_events(case_id);
create index if not exists idx_documents_case            on documents(case_id);
create index if not exists idx_org_members_user          on org_members(user_id);

-- ─────────────────────────────────────────────────────────────
-- REALTIME (for dashboard)
-- ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table cases;

-- ─────────────────────────────────────────────────────────────
-- STORAGE BUCKET for documents
-- ─────────────────────────────────────────────────────────────
-- Run this separately after creating the bucket in Supabase dashboard:
-- insert into storage.buckets (id, name, public) values ('case-documents', 'case-documents', false);
