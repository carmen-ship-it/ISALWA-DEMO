-- ISALWA Architect — Link Auth users → profiles + ISALWA membership
--
-- Run AFTER:
--   1) 001_pilot_persistence.sql
--   2) Creating Carmen + Álvaro in Supabase Dashboard → Authentication → Users
--
-- Emails must match exactly (case-insensitive):
--   carmen@isalwa.demo  (Consultant)
--   alvaro@isalwa.demo  (Client)
--
-- Safe to re-run (upserts).

insert into public.architect_profiles (id, email, display_name, role)
select
  u.id,
  lower(trim(u.email)),
  case lower(trim(u.email))
    when 'carmen@isalwa.demo' then 'Carmen'
    when 'alvaro@isalwa.demo' then 'Álvaro'
  end,
  case lower(trim(u.email))
    when 'carmen@isalwa.demo' then 'consultant'
    when 'alvaro@isalwa.demo' then 'client'
  end
from auth.users u
where lower(trim(u.email)) in ('carmen@isalwa.demo', 'alvaro@isalwa.demo')
on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      role = excluded.role;

insert into public.architect_workspace_members (user_id, workspace_id, kind)
select
  p.id,
  'ws_isalwa',
  case p.role
    when 'consultant' then 'consultant'
    else 'owner'
  end
from public.architect_profiles p
where p.email in ('carmen@isalwa.demo', 'alvaro@isalwa.demo')
on conflict (user_id, workspace_id) do update
  set kind = excluded.kind;

-- Verify (optional — inspect results in SQL Editor)
-- select p.email, p.role, m.workspace_id, m.kind
-- from public.architect_profiles p
-- join public.architect_workspace_members m on m.user_id = p.id;
