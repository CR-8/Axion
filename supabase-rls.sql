-- ============================================================
-- LexBot CRM — Row-Level Security (RLS) Policies
-- Run this in Supabase SQL Editor AFTER supabase-schema.sql
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- HELPER FUNCTION
-- Returns the org_id of the currently authenticated user.
-- Used by all RLS policies below.
-- ─────────────────────────────────────────────────────────────
create or replace function auth_user_org_id()
returns uuid
language sql
stable
security definer
as $$
  select org_id
  from public.org_members
  where user_id = auth.uid()
  limit 1;
$$;

-- ─────────────────────────────────────────────────────────────
-- ORGANIZATIONS
-- ─────────────────────────────────────────────────────────────
alter table organizations enable row level security;

create policy "org_members can view their org"
  on organizations for select
  using (id = auth_user_org_id());

create policy "org_admins can update their org"
  on organizations for update
  using (id = auth_user_org_id())
  with check (id = auth_user_org_id());

-- ─────────────────────────────────────────────────────────────
-- ORG MEMBERS
-- ─────────────────────────────────────────────────────────────
alter table org_members enable row level security;

create policy "members can view their org members"
  on org_members for select
  using (org_id = auth_user_org_id());

create policy "admins can insert members to their org"
  on org_members for insert
  with check (org_id = auth_user_org_id());

create policy "admins can update members in their org"
  on org_members for update
  using (org_id = auth_user_org_id())
  with check (org_id = auth_user_org_id());

create policy "admins can delete members from their org"
  on org_members for delete
  using (org_id = auth_user_org_id());

-- ─────────────────────────────────────────────────────────────
-- ORG SETTINGS
-- ─────────────────────────────────────────────────────────────
alter table org_settings enable row level security;

create policy "members can view their org settings"
  on org_settings for select
  using (org_id = auth_user_org_id());

create policy "admins can upsert their org settings"
  on org_settings for insert
  with check (org_id = auth_user_org_id());

create policy "admins can update their org settings"
  on org_settings for update
  using (org_id = auth_user_org_id())
  with check (org_id = auth_user_org_id());

-- ─────────────────────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────────────────────
alter table clients enable row level security;

create policy "members can view their org clients"
  on clients for select
  using (org_id = auth_user_org_id());

create policy "members can create clients in their org"
  on clients for insert
  with check (org_id = auth_user_org_id());

create policy "members can update their org clients"
  on clients for update
  using (org_id = auth_user_org_id())
  with check (org_id = auth_user_org_id());

create policy "members can delete their org clients"
  on clients for delete
  using (org_id = auth_user_org_id());

-- ─────────────────────────────────────────────────────────────
-- CASES
-- ─────────────────────────────────────────────────────────────
alter table cases enable row level security;

create policy "members can view their org cases"
  on cases for select
  using (org_id = auth_user_org_id());

create policy "members can create cases in their org"
  on cases for insert
  with check (org_id = auth_user_org_id());

create policy "members can update their org cases"
  on cases for update
  using (org_id = auth_user_org_id())
  with check (org_id = auth_user_org_id());

-- ─────────────────────────────────────────────────────────────
-- CASE EVENTS
-- ─────────────────────────────────────────────────────────────
alter table case_events enable row level security;

create policy "members can view events for their org cases"
  on case_events for select
  using (
    exists (
      select 1 from cases
      where cases.id = case_events.case_id
        and cases.org_id = auth_user_org_id()
    )
  );

create policy "members can insert events for their org cases"
  on case_events for insert
  with check (
    exists (
      select 1 from cases
      where cases.id = case_events.case_id
        and cases.org_id = auth_user_org_id()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- DOCUMENTS
-- ─────────────────────────────────────────────────────────────
alter table documents enable row level security;

create policy "members can view their org documents"
  on documents for select
  using (org_id = auth_user_org_id());

create policy "members can upload documents to their org"
  on documents for insert
  with check (org_id = auth_user_org_id());

create policy "members can delete their org documents"
  on documents for delete
  using (org_id = auth_user_org_id());

-- ─────────────────────────────────────────────────────────────
-- CONVERSATIONS
-- (Bot creates conversations via service role — dashboard reads them)
-- ─────────────────────────────────────────────────────────────
alter table conversations enable row level security;

create policy "members can view their org conversations"
  on conversations for select
  using (org_id = auth_user_org_id());

create policy "members can update their org conversations"
  on conversations for update
  using (org_id = auth_user_org_id())
  with check (org_id = auth_user_org_id());

-- ─────────────────────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────────────────────
alter table messages enable row level security;

create policy "members can view messages in their org conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and conversations.org_id = auth_user_org_id()
    )
  );

create policy "members can send messages in their org conversations"
  on messages for insert
  with check (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
        and conversations.org_id = auth_user_org_id()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- STORAGE POLICIES (case-documents bucket)
-- Note: Run "insert into storage.buckets (id, name, public)
--       values ('case-documents', 'case-documents', false);"
--       FIRST if the bucket does not exist yet.
-- ─────────────────────────────────────────────────────────────

-- Allow org members to upload files under their own org_id/ prefix
create policy "org members can upload documents"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = auth_user_org_id()::text
  );

-- Allow org members to read (download) their org's documents
create policy "org members can download their documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = auth_user_org_id()::text
  );

-- Allow org members to delete their org's documents
create policy "org members can delete their documents"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'case-documents'
    and (storage.foldername(name))[1] = auth_user_org_id()::text
  );

-- ─────────────────────────────────────────────────────────────
-- VERIFICATION STEPS (run these after applying the above)
-- ─────────────────────────────────────────────────────────────
-- 1. As org-A user, try: select * from clients; -> only org-A clients
-- 2. As org-A user, try: select * from clients where org_id = '<org-B-uuid>';
--    -> should return 0 rows (RLS enforces this)
-- 3. Test upload: upload a file as org-A user -> should succeed
-- 4. Test cross-org download: request signed URL for org-B doc as org-A user
--    -> API should return 403 (auth-guard check), DB row should also be blocked by RLS
