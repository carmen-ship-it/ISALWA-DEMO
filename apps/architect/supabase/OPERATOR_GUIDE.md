# Supabase Pilot Setup — ISALWA Architect

Operator guide for Carmen. Shared persistence for **Carmen (Consultant)** and **Álvaro (Client)** on a single company: **ISALWA** (`ws_isalwa`).

This is **not** multi-tenant SaaS. No registration UI, invites, or org management.

---

## Exactly which SQL to run (order)

| Step | File | When |
| --- | --- | --- |
| 1 | [`migrations/001_pilot_persistence.sql`](./migrations/001_pilot_persistence.sql) | First — creates tables, RLS, trigger, ISALWA shell row |
| 2 | Create Auth users in dashboard (below) | After step 1 |
| 3 | [`migrations/002_link_pilot_users.sql`](./migrations/002_link_pilot_users.sql) | After users exist — links profiles + membership (also covered by trigger for *new* users) |
| 4 | [`migrations/003_document_storage.sql`](./migrations/003_document_storage.sql) | Any time after step 1 — creates the private `architect-documents` Storage bucket + RLS for real document uploads (see `../REAL_DOCUMENT_UPLOADS.md`) |

In Supabase Dashboard → **SQL Editor** → paste each file → Run.

---

## Every env var needed

| Variable | Where | Required for shared pilot |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + `.env.local` | **Yes** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel + `.env.local` | **Yes** |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel + `.env.local` (server only) | No for normal app use; keep for admin/SQL tooling — **never** `NEXT_PUBLIC_` |
| `ARCHITECT_PILOT_CARMEN_PASSWORD` | Optional | Only for local **pilot cookie** auth when Supabase unset |
| `ARCHITECT_PILOT_ALVARO_PASSWORD` | Optional | Same |
| `ARCHITECT_LLM_*` / `OPENAI_API_KEY` | Optional | LLM only |

When URL + anon key are **unset**: app uses pilot cookie login + **localStorage** company memory (solo/dev).  
When **set**: Auth + company memory + in-progress interviews use **Supabase** (localStorage not required).

---

## Exact dashboard setup before deploy

### 1. Create project

1. [supabase.com](https://supabase.com) → New project  
2. Note **Project URL** and **anon public** key (Settings → API)  
3. Copy **service_role** key to a password manager (server-only; never ship to browser)

### 2. Run SQL

1. Run `001_pilot_persistence.sql`  
2. Confirm tables exist: `architect_workspaces`, `architect_conversations`, `architect_active_interviews`, `architect_profiles`, `architect_workspace_members`, `architect_settings`

### 3. Create the two users (dashboard only — not in the app)

Authentication → Users → **Add user** → Create user:

| Display | Email | Password | Role in app |
| --- | --- | --- | --- |
| Carmen | `carmen@isalwa.demo` | Choose a strong password | Consultant |
| Álvaro | `alvaro@isalwa.demo` | Choose a strong password | Client |

Use **exactly** these emails (case-insensitive). The DB trigger / `002` script maps them to roles + `ws_isalwa` membership.

Disable “Confirm email” requirement for pilot if users cannot confirm (Auth → Providers → Email → turn off confirm, or confirm manually).

### 4. Link membership

Run `002_link_pilot_users.sql` (safe if trigger already linked them).

Verify:

```sql
select p.email, p.role, m.workspace_id, m.kind
from public.architect_profiles p
join public.architect_workspace_members m on m.user_id = p.id;
```

Expect two rows for `ws_isalwa`.

### 5. Auth redirect URLs (email/password login)

Architect uses email/password in-app (no OAuth). Still set Site URL for cookie sessions:

Authentication → URL Configuration:

- **Site URL**: your Vercel production URL (e.g. `https://architect.example.com`)  
- **Redirect URLs**: same origin + `http://localhost:3100/**` for local

### 6. Vercel env vars

Vercel → Architect project → Settings → Environment Variables (Production + Preview):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (optional but recommended server-side)

Redeploy after setting vars.

### 7. Smoke test

1. Carmen logs in → lands on `/workspace/ws_isalwa`  
2. Álvaro logs in → same workspace  
3. One user changes discovery / workspace data → other sees it after **refresh** (or live via Realtime)  
4. Hard refresh keeps data (not wiped to empty seed)

---

## How shared updates work

- **Source of truth**: Supabase tables (`architect_workspaces.data` JSONB = full `CompanyWorkspace`, plus conversations + active interviews).  
- **Minimum success**: both users load the same rows; changes visible after **browser refresh** or window **focus**.  
- **Better**: Realtime publication on workspace tables updates open workspace views without full reload when the channel is connected.  
- **One-time LS migration**: if a browser still has old `isalwa.architect.company_memory.v1` and Supabase only has the empty ISALWA shell, the first load uploads that local bundle once, then stops using LS as source of truth.

---

## RLS summary

- Authenticated users only read/write rows for workspaces they belong to.  
- Pilot membership is only `ws_isalwa` for Carmen + Álvaro.  
- Anon key is safe in the browser; RLS enforces access. Service role never goes to the client.
