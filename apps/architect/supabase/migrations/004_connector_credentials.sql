-- ISALWA Architect — Real Integrations: connector OAuth credential storage
-- (Mission 23).
--
-- Run AFTER 001_pilot_persistence.sql (needs public.architect_is_member()).
-- Safe to re-run.
--
-- Holds one row per (workspace, provider): the OAuth access/refresh token
-- for a connected account (e.g. Google Drive). Never queried with the
-- service-role key — every read/write in `lib/connectors/store.ts` goes
-- through `createServerSupabaseClient()`, the signed-in user's own session,
-- exactly like every other table in this schema (SECURITY_POSTURE.md §1).
--
-- Stricter than the other pilot tables on purpose: connector credentials
-- are OAuth tokens, not workspace content, so RLS here requires the caller
-- be a *consultant* member of the workspace (`kind = 'consultant'`), not
-- just any member — matching the application-layer check every
-- `/api/connectors/*` route handler already makes
-- (`session.role === "consultant"`). This is defense in depth, not a
-- replacement for that check.

create table if not exists public.architect_connector_credentials (
  workspace_id text not null references public.architect_workspaces (id) on delete cascade,
  provider text not null check (provider in ('google_drive', 'microsoft_365', 'quickbooks', 'hubspot')),
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  account_label text,
  scopes text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_sync_summary text,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, provider)
);

alter table public.architect_connector_credentials enable row level security;

-- ---------------------------------------------------------------------------
-- Consultant-only membership helper (SECURITY DEFINER so RLS stays simple)
-- ---------------------------------------------------------------------------
create or replace function public.architect_is_consultant_member(ws_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.architect_workspace_members m
    where m.workspace_id = ws_id
      and m.user_id = auth.uid()
      and m.kind = 'consultant'
  );
$$;

revoke all on function public.architect_is_consultant_member(text) from public;
grant execute on function public.architect_is_consultant_member(text) to authenticated;
grant execute on function public.architect_is_consultant_member(text) to service_role;

drop policy if exists architect_connector_credentials_select on public.architect_connector_credentials;
create policy architect_connector_credentials_select
  on public.architect_connector_credentials for select
  to authenticated
  using (public.architect_is_consultant_member(workspace_id));

drop policy if exists architect_connector_credentials_insert on public.architect_connector_credentials;
create policy architect_connector_credentials_insert
  on public.architect_connector_credentials for insert
  to authenticated
  with check (public.architect_is_consultant_member(workspace_id));

drop policy if exists architect_connector_credentials_update on public.architect_connector_credentials;
create policy architect_connector_credentials_update
  on public.architect_connector_credentials for update
  to authenticated
  using (public.architect_is_consultant_member(workspace_id))
  with check (public.architect_is_consultant_member(workspace_id));

drop policy if exists architect_connector_credentials_delete on public.architect_connector_credentials;
create policy architect_connector_credentials_delete
  on public.architect_connector_credentials for delete
  to authenticated
  using (public.architect_is_consultant_member(workspace_id));
