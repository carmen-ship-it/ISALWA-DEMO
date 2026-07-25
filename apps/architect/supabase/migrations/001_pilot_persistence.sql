-- ISALWA Architect — Pilot persistence (Mission: shared Supabase company memory)
-- Single company: ISALWA (ws_isalwa). Carmen + Álvaro only.
--
-- Run in Supabase SQL Editor (or via CLI) BEFORE linking users.
-- Order: 001_pilot_persistence.sql → create Auth users → 002_link_pilot_users.sql

-- ---------------------------------------------------------------------------
-- Profiles (maps auth.users → role)
-- ---------------------------------------------------------------------------
create table if not exists public.architect_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('consultant', 'client')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Workspace membership (ISALWA only for pilot)
-- ---------------------------------------------------------------------------
create table if not exists public.architect_workspace_members (
  user_id uuid not null references public.architect_profiles (id) on delete cascade,
  workspace_id text not null,
  kind text not null check (kind in ('consultant', 'owner', 'member')),
  primary key (user_id, workspace_id)
);

-- ---------------------------------------------------------------------------
-- Company memory — JSONB document per workspace (full CompanyWorkspace)
-- ---------------------------------------------------------------------------
create table if not exists public.architect_workspaces (
  id text primary key,
  company_name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists architect_workspaces_updated_at_idx
  on public.architect_workspaces (updated_at desc);

-- ---------------------------------------------------------------------------
-- Conversation records — JSONB document per conversation
-- ---------------------------------------------------------------------------
create table if not exists public.architect_conversations (
  id text primary key,
  workspace_id text not null references public.architect_workspaces (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists architect_conversations_workspace_idx
  on public.architect_conversations (workspace_id);

-- ---------------------------------------------------------------------------
-- In-progress interview autosave (replaces localStorage interview key)
-- ---------------------------------------------------------------------------
create table if not exists public.architect_active_interviews (
  workspace_id text primary key references public.architect_workspaces (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Optional workspace settings document (pilot-ready; unused until needed)
-- ---------------------------------------------------------------------------
create table if not exists public.architect_settings (
  workspace_id text primary key references public.architect_workspaces (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Membership helper (SECURITY DEFINER so RLS policies stay simple)
-- ---------------------------------------------------------------------------
create or replace function public.architect_is_member(ws_id text)
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
  );
$$;

revoke all on function public.architect_is_member(text) from public;
grant execute on function public.architect_is_member(text) to authenticated;
grant execute on function public.architect_is_member(text) to service_role;

-- ---------------------------------------------------------------------------
-- Auto-link allowlisted Auth users → profiles + ISALWA membership
-- Fires when Carmen creates users in the dashboard (or on first login).
-- ---------------------------------------------------------------------------
create or replace function public.architect_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(new.email));
  pilot_role text;
  pilot_name text;
  pilot_kind text;
begin
  if normalized = 'carmen@isalwa.demo' then
    pilot_role := 'consultant';
    pilot_name := 'Carmen';
    pilot_kind := 'consultant';
  elsif normalized = 'alvaro@isalwa.demo' then
    pilot_role := 'client';
    pilot_name := 'Álvaro';
    pilot_kind := 'owner';
  else
    return new;
  end if;

  insert into public.architect_profiles (id, email, display_name, role)
  values (new.id, normalized, pilot_name, pilot_role)
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        role = excluded.role;

  insert into public.architect_workspace_members (user_id, workspace_id, kind)
  values (new.id, 'ws_isalwa', pilot_kind)
  on conflict (user_id, workspace_id) do update
    set kind = excluded.kind;

  return new;
end;
$$;

drop trigger if exists architect_on_auth_user_created on auth.users;
create trigger architect_on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.architect_handle_new_user();

-- ---------------------------------------------------------------------------
-- Seed empty ISALWA workspace shell (app fills full CompanyWorkspace on first use)
-- ---------------------------------------------------------------------------
insert into public.architect_workspaces (id, company_name, data, updated_at)
values (
  'ws_isalwa',
  'ISALWA',
  jsonb_build_object('id', 'ws_isalwa', 'companyName', 'ISALWA', '_seedPending', true),
  now()
)
on conflict (id) do nothing;

insert into public.architect_settings (workspace_id, data)
values ('ws_isalwa', '{}'::jsonb)
on conflict (workspace_id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security — Carmen & Álvaro only via membership on ws_isalwa
-- ---------------------------------------------------------------------------
alter table public.architect_profiles enable row level security;
alter table public.architect_workspace_members enable row level security;
alter table public.architect_workspaces enable row level security;
alter table public.architect_conversations enable row level security;
alter table public.architect_active_interviews enable row level security;
alter table public.architect_settings enable row level security;

-- Profiles: read own row
drop policy if exists architect_profiles_select_own on public.architect_profiles;
create policy architect_profiles_select_own
  on public.architect_profiles for select
  to authenticated
  using (id = auth.uid());

-- Memberships: read own rows
drop policy if exists architect_members_select_own on public.architect_workspace_members;
create policy architect_members_select_own
  on public.architect_workspace_members for select
  to authenticated
  using (user_id = auth.uid());

-- Workspaces
drop policy if exists architect_workspaces_select on public.architect_workspaces;
create policy architect_workspaces_select
  on public.architect_workspaces for select
  to authenticated
  using (public.architect_is_member(id));

drop policy if exists architect_workspaces_insert on public.architect_workspaces;
create policy architect_workspaces_insert
  on public.architect_workspaces for insert
  to authenticated
  with check (public.architect_is_member(id));

drop policy if exists architect_workspaces_update on public.architect_workspaces;
create policy architect_workspaces_update
  on public.architect_workspaces for update
  to authenticated
  using (public.architect_is_member(id))
  with check (public.architect_is_member(id));

drop policy if exists architect_workspaces_delete on public.architect_workspaces;
create policy architect_workspaces_delete
  on public.architect_workspaces for delete
  to authenticated
  using (public.architect_is_member(id));

-- Conversations
drop policy if exists architect_conversations_select on public.architect_conversations;
create policy architect_conversations_select
  on public.architect_conversations for select
  to authenticated
  using (public.architect_is_member(workspace_id));

drop policy if exists architect_conversations_insert on public.architect_conversations;
create policy architect_conversations_insert
  on public.architect_conversations for insert
  to authenticated
  with check (public.architect_is_member(workspace_id));

drop policy if exists architect_conversations_update on public.architect_conversations;
create policy architect_conversations_update
  on public.architect_conversations for update
  to authenticated
  using (public.architect_is_member(workspace_id))
  with check (public.architect_is_member(workspace_id));

drop policy if exists architect_conversations_delete on public.architect_conversations;
create policy architect_conversations_delete
  on public.architect_conversations for delete
  to authenticated
  using (public.architect_is_member(workspace_id));

-- Active interviews
drop policy if exists architect_active_interviews_select on public.architect_active_interviews;
create policy architect_active_interviews_select
  on public.architect_active_interviews for select
  to authenticated
  using (public.architect_is_member(workspace_id));

drop policy if exists architect_active_interviews_upsert on public.architect_active_interviews;
create policy architect_active_interviews_insert
  on public.architect_active_interviews for insert
  to authenticated
  with check (public.architect_is_member(workspace_id));

drop policy if exists architect_active_interviews_update on public.architect_active_interviews;
create policy architect_active_interviews_update
  on public.architect_active_interviews for update
  to authenticated
  using (public.architect_is_member(workspace_id))
  with check (public.architect_is_member(workspace_id));

drop policy if exists architect_active_interviews_delete on public.architect_active_interviews;
create policy architect_active_interviews_delete
  on public.architect_active_interviews for delete
  to authenticated
  using (public.architect_is_member(workspace_id));

-- Settings
drop policy if exists architect_settings_select on public.architect_settings;
create policy architect_settings_select
  on public.architect_settings for select
  to authenticated
  using (public.architect_is_member(workspace_id));

drop policy if exists architect_settings_insert on public.architect_settings;
create policy architect_settings_insert
  on public.architect_settings for insert
  to authenticated
  with check (public.architect_is_member(workspace_id));

drop policy if exists architect_settings_update on public.architect_settings;
create policy architect_settings_update
  on public.architect_settings for update
  to authenticated
  using (public.architect_is_member(workspace_id))
  with check (public.architect_is_member(workspace_id));

-- ---------------------------------------------------------------------------
-- Realtime (optional live sync). Refresh-shared works without this.
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.architect_workspaces;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.architect_conversations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.architect_active_interviews;
  exception when duplicate_object then null;
  end;
end $$;
