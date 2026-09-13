# Staging host — operator checklist (personal Carmen)

**Date:** 2026-09-13  
**Status:** **BLOCKED** on Render account API access  
**Auth project (ready):** `isalwa-os-auth-staging` · ref `qbpxuywtoycjpitxoblo` · `sa-east-1` · AUTH ONLY  
**Vercel (web host ready to use):** team `carmen-ship-its-projects` · user `carmen-ship-it`  
**Do not:** use Supabase Auth Postgres as OS SoR · reuse `Isalwa-Arquitect` · import real XLS data

---

## Why blocked

Cursor can authenticate:

| Provider | Status |
|----------|--------|
| Supabase CLI (personal) | PASS — Auth staging project exists |
| Vercel (`carmen-ship-it` / `carmen-ship-its-projects`) | PASS — suitable for **os-web hosting only** |
| Render CLI / `RENDER_API_KEY` | **MISSING** |

Without Render (preferred for managed Postgres + long-running `os-api` + outbox worker), staging cannot be completed safely. Local Postgres is **forbidden** for this mission.

---

## HUMAN GATE — exact steps (do once)

### A. Render account + API key

1. Open **https://dashboard.render.com/** in your browser.
2. Sign in with Carmen’s **personal** account (same ownership model as Supabase personal org). If no account: **Sign up** with that personal email.
3. Open **https://dashboard.render.com/u/settings#api-keys**  
   (Account Settings → **API Keys**).
4. Click **Create API Key** (or **New API Key**).
5. Name it: `isalwa-os-staging-cursor`.
6. Copy the key **once** (starts with `rnd_…`). Store in password manager — **never commit to git**.
7. In the Cursor terminal / chat for the next prompt, export for the session only:

```bash
export RENDER_API_KEY='paste-here'
```

   Or tell Cursor: “RENDER_API_KEY is set in my shell” after exporting locally.

8. Reply to Cursor with: **Render API key ready** (do not paste the key into chat if avoidable — env export is better).

### B. Optional — create Postgres yourself (if Cursor still cannot create)

If you prefer dashboard create:

1. Dashboard → **New** → **PostgreSQL**.
2. Name: **`isalwa-os-staging`** (exact).
3. Database: PostgreSQL **16** if offered.
4. Region: prefer **Oregon** or closest available to São Paulo / South America (match Auth region when possible; `sa-east-1` peers if listed).
5. Plan: any always-on staging plan with automated backups if available (avoid free ephemeral if it sleeps / no backup).
6. Create.
7. Copy the **Internal** Database URL for `OS_DATABASE_URL` into password manager (not chat).
8. Tell Cursor the **non-secret** identifiers: service name, region, Postgres version.

### C. Do not create yet (Cursor will after key)

- `os-api-staging` web service  
- `os-web` on Vercel or Render  
- Carmen / Isa / Álvaro users  

---

## What Cursor will do after the key exists

1. Create Render Postgres `isalwa-os-staging` (if not already).
2. `pnpm --filter @isalwa/os-database migrate:deploy` against staging (`OS_DATABASE_URL`).
3. Load synthetic fixtures (**not** plain Step17 as-is — see first-admin note below).
4. Deploy `os-api-staging` with:
   - `OS_RUNTIME_PROFILE=staging`
   - `OS_AUTH_MODE=supabase`
   - `SUPABASE_URL=https://qbpxuywtoycjpitxoblo.supabase.co`
   - anon + service_role from Auth project (server-only)
   - `OS_CORS_ORIGINS=<exact os-web origin>`
5. Deploy `os-web` (Vercel team `carmen-ship-its-projects` preferred for simplicity) with public Supabase + API HTTPS URL — **no** secrets in `NEXT_PUBLIC_*`.
6. Patch Supabase redirect allowlist to the real os-web origin.
7. Create Carmen Supabase user → AuthIdentity → Person → active OrganizationMember (`people.admin`).
8. External security + commercial smoke.
9. Invite Isa / Álvaro only after Carmen login PASS.

### First-admin chicken-egg (must solve on empty staging DB)

`/v1/dev/bootstrap` is **off** when `OS_RUNTIME_PROFILE=staging`.

Current Step17 seed (`packages/os-database/src/step17-restore-seed.ts`) creates AuthIdentity with `provider: local-dev` — **not** usable for hosted Supabase login.

Verified link pattern (from Step 10.3 / 14.6B evidence):

1. Create Supabase Auth user (Admin API) for Carmen.
2. Seed org + Person + OrganizationMember + AuthIdentity with `provider=supabase`, `providerSubject=<supabase user uuid>`, `status=active`.
3. Confirm password sign-in → JWT → os-api membership check.

InviteMember later requires `SUPABASE_SERVICE_ROLE_KEY` on os-api (not validated at boot; fails at invite runtime if missing).

**Repo gaps still open for next slice (code):** no `render.yaml` / os-web `vercel.json`; no staging GitHub deploy workflow; no committed first-admin Supabase bootstrap script for empty DB (must be written when host is available).

---

## Env contract (non-secret names)

### os-api

| Variable | Notes |
|----------|--------|
| `OS_RUNTIME_PROFILE` | `staging` |
| `OS_AUTH_MODE` | `supabase` |
| `OS_DATABASE_URL` | Render Postgres — **not** Supabase Auth DB |
| `SUPABASE_URL` | `https://qbpxuywtoycjpitxoblo.supabase.co` |
| `SUPABASE_ANON_KEY` | JWT verify |
| `SUPABASE_SERVICE_ROLE_KEY` | Invite/admin only — never browser |
| `OS_CORS_ORIGINS` | Exact os-web origin(s), no `*` |
| `PORT` | Honored by os-api |

### os-web

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_OS_AUTH_MODE` | `supabase` |
| `NEXT_PUBLIC_OS_API_URL` | `https://<os-api-host>/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | same project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon only |

---

## Safety reminders

- `REAL_DATA_ALLOWED = NO` until backup + restore drill.
- G-02 DECISION PENDING · G-08 NOT APPROVED · Location/GPS DEFERRED.
- No `OS_AUTH_MODE=dev` on public hosts.
- Architect Supabase / Vercel Architect app: **do not touch**.
