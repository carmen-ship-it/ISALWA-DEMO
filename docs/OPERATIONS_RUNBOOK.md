# ISALWA Architect — Operations Runbook

**Status:** Permanent operational reference for `apps/architect`.
**Related:** [`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md) ·
[`docs/RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md) ·
[`apps/architect/DEPLOYMENT.md`](../apps/architect/DEPLOYMENT.md) ·
[`apps/architect/supabase/OPERATOR_GUIDE.md`](../apps/architect/supabase/OPERATOR_GUIDE.md)

This runbook is the day-to-day "how do I actually do this" companion to `DEPLOYMENT.md` (which
covers the reference configuration) and `SECURITY_POSTURE.md` (which covers the rules). Where they
disagree, `DEPLOYMENT.md` and `SECURITY_POSTURE.md` win — file an update here.

---

## 1. Local development

```bash
# From the monorepo root
pnpm install
pnpm --filter @isalwa/architect dev

# Or from apps/architect directly
cd apps/architect
pnpm install   # prefer the root install in this monorepo
pnpm dev
```

- Next.js serves on **port 3100** by default (kept clear of ISALWA OS's port 3000).
- Copy environment defaults before first run:

  ```bash
  cd apps/architect
  cp .env.example .env.local
  ```

- **No secrets are required** for local discovery work. With no AI key and no Supabase config,
  Architect runs fully on `LocalHeuristicProvider` (deterministic, no network) and
  pilot-cookie auth + `localStorage` persistence (solo/dev only — not shared between two logged-in
  users).
- Useful local commands:

  ```bash
  pnpm typecheck   # tsc -p tsconfig.json --noEmit
  pnpm lint        # eslint .
  pnpm build       # production Next.js build
  ```

## 2. Supabase (shared pilot persistence)

Use Supabase when you need two roles (Carmen/Álvaro, or their equivalents) to see the **same**
live data, or when testing anything auth-related beyond the pilot-cookie fallback.

1. Follow [`apps/architect/supabase/OPERATOR_GUIDE.md`](../apps/architect/supabase/OPERATOR_GUIDE.md)
   end to end — it covers creating the Supabase project, applying
   `supabase/migrations/001_pilot_persistence.sql`, creating the pilot users in the Supabase
   dashboard, then applying `002_link_pilot_users.sql`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (local) or
   Vercel Project Settings (deployed).
3. **Never** set `SUPABASE_SERVICE_ROLE_KEY` in a browser-reachable context. It has exactly one
   reviewed, server-only use (the Mission 24 overnight cron route, §3a below) — leave it unset
   locally unless you are specifically testing that route (see
   [`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md) §5).
4. Realtime sync between roles rides on the `architect-company-memory` Postgres Changes channel on
   `architect_workspaces` — a save from one role should appear for the other without a manual
   refresh once Realtime is enabled per the operator guide.
5. New SQL migrations go in `supabase/migrations/` as the next numbered file, and must be reviewed
   for the RLS `kind`-awareness gap noted in `SECURITY_POSTURE.md` §6 if they touch write policies.

## 3. Vercel

- Architect is its **own** Vercel project, Root Directory `apps/architect`, Framework Preset
  Next.js. Never point the ISALWA OS Vercel project at this folder, and never point this project's
  root at the monorepo root.
- `vercel.json` in `apps/architect` scopes install/build to this app.
- Environment variables are set per environment (Production / Preview / Development) under
  Project → Settings → Environment Variables. **Redeploy after changing any env var** — a running
  deployment does not pick up new values without a redeploy.
- Optional CLI flow from `apps/architect`:

  ```bash
  vercel        # creates/updates a Preview deployment
  ```

  Promote a Preview to Production only after it's green and the
  [Release Checklist](./RELEASE_CHECKLIST.md) has been run against it.

### 3a. Autonomous Consulting Cycle (Mission 24) — enabling the nightly cron

`GET /api/cron/consulting-review` re-runs the Consulting Intelligence Agent overnight for any
workspace that's due; `vercel.json`'s `crons` entry already schedules it (`0 6 * * *`, UTC — no
action needed there). Two env vars make it actually run instead of honestly no-opping:

1. In Vercel Project Settings → Environment Variables (Production), set:
   - `CRON_SECRET` — any random string, 16+ characters (e.g. generate with
     `openssl rand -hex 32`). Vercel Cron automatically sends this back as
     `Authorization: Bearer <CRON_SECRET>` on every scheduled invocation — you only need to set
     the value, not wire up the header yourself.
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Project Settings → API → `service_role` secret.
     Required alongside the `NEXT_PUBLIC_SUPABASE_URL` you've likely already set per §2/§5 below.
2. **Redeploy** after setting both (same rule as any other env var — see §3).
3. Verify:

   ```bash
   # Missing/wrong secret → 401, no admin client is ever constructed
   curl -i https://isalwa-architect.vercel.app/api/cron/consulting-review

   # Correct secret → 200 with either an honest no-op (Supabase env absent) or per-workspace results
   curl -i -H "Authorization: Bearer <CRON_SECRET>" \
     https://isalwa-architect.vercel.app/api/cron/consulting-review
   ```

   A `200` with `"ran": false` and a `reason` string is a valid, honest outcome (Supabase admin
   env not configured on that environment) — it is not a bug. A `200` with `"ran": true` and a
   `results` array (one entry per workspace, `due`/`changed`/`headline`) means the cycle actually
   ran.
4. Not required for a demo where the cron doesn't need to fire live — Architect works identically
   without it; the client-visible cycle re-run still happens on every real interview answer or
   document upload regardless of whether the schedule is configured. See
   `apps/architect/PILOT_READINESS_CHECKLIST.md`.
5. Security context for why this route alone is allowed to use `SUPABASE_SERVICE_ROLE_KEY`:
   [`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md) §5.

## 4. Production deploy checklist (operational steps)

1. Create/confirm the dedicated Vercel project for Architect (Root Directory `apps/architect`).
2. Confirm Install/Build commands match `vercel.json`.
3. Confirm Supabase is configured per the Operator Guide (SQL migrations applied, pilot users
   created).
4. Set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Vercel for the target
   environment.
5. Add optional LLM keys (`ARCHITECT_LLM_*` / `OPENAI_API_KEY`) only if live model completions are
   wanted for that environment.
6. Deploy a Preview. Log in as both Carmen and Álvaro; confirm both land on the same
   `/workspace/ws_isalwa` and see the correct tab set for their role.
7. Promote to Production.
8. Keep ISALWA web/API Vercel projects pointed at their own roots (`apps/web`, `apps/api`) —
   confirm this deploy did not touch those projects' configuration.

## 5. Environment setup reference

| Variable | Required | Notes |
| --- | --- | --- |
| `ARCHITECT_LLM_PROVIDER` | No | `gemini` \| `openai` \| `anthropic` \| `local`; inferred from base URL if unset |
| `ARCHITECT_LLM_API_KEY` / `OPENAI_API_KEY` | No | Falls back to deterministic local provider when unset |
| `ARCHITECT_LLM_BASE_URL` | No | Provider endpoint |
| `ARCHITECT_LLM_MODEL` | No | Model id |
| `NEXT_PUBLIC_SUPABASE_URL` | For shared pilot | Enables Supabase Auth + shared persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For shared pilot | Browser-safe, RLS-enforced |
| `SUPABASE_SERVICE_ROLE_KEY` | For the overnight cron (Mission 24) | Server-only; one reviewed use (`/api/cron/consulting-review`) — see Security Posture §5 and §3a above |
| `ARCHITECT_PILOT_CARMEN_PASSWORD` / `ARCHITECT_PILOT_ALVARO_PASSWORD` | No | Pilot-cookie fallback only; dead once Supabase Auth is configured |
| `NEXT_PUBLIC_ARCHITECT_URL` | No | Absolute site URL when needed |

Full list with comments: `apps/architect/.env.example`. Never fill this table (or any doc) with
real values — names and purpose only.

## 6. Auth (operational notes)

- Two pilot roles today: Carmen (`consultant`) and Álvaro (`client`), both land on
  `/workspace/ws_isalwa` — there is no company picker in the current pilot.
- Auth source of truth is `getServerSession()` (`lib/auth/actions.ts`) — always re-derives role
  from Supabase's `auth.getUser()` when Supabase is configured.
- To reset a pilot password: do it in the **Supabase Auth dashboard**, not in code —
  `ARCHITECT_PILOT_*_PASSWORD` env vars are inert once Supabase Auth is active.
- To add a new pilot user/company: follow the same pattern as `PILOT_USERS` /
  `PILOT_MEMBERSHIPS` (`lib/auth/constants.ts`) plus the Supabase migration pattern in
  `002_link_pilot_users.sql` — do not invent a second auth mechanism.

## 7. Troubleshooting

| Symptom | Likely cause | What to check |
| --- | --- | --- |
| Data looks stale after a normal reload | **Not a caching bug** — HTML is already `private, no-store`. Do not advise a hard refresh. | The actual data/logic path: is the workspace load reading the row you expect? Is a heal step in `lib/repositories/migrate.ts` firing unexpectedly? |
| Client sees an unexpected tab | `CLIENT_VISIBLE_TAB_IDS` / `CONSULTANT_ONLY_PATHS` misconfigured, or `session.role` resolved incorrectly | `components/workspace/workspace-tabs.tsx`, `lib/auth/constants.ts`, confirm `getServerSession()` output for that user |
| Dashboard shows a score that seems too high/low for the evidence given | Check whether a heal step should exist for a newly-discovered fabrication pattern (see ADR-A2) | `lib/repositories/migrate.ts`, `NO_FABRICATED_CONTENT.md` |
| English text leaking into client-visible copy | A new enum/value added without an entry in `coverageAreaLabel()` / `phaseLabel()` / `moduleLabel()` or the i18n dictionaries | `lib/presentation/executive-language.ts`, `lib/i18n/messages/{es,en}.ts`, `I18N_100.md` |
| Login fails for a pilot user in production but works locally | Supabase env vars missing/mismatched on that Vercel environment, or the dashboard password differs from what's assumed | Vercel env vars for that environment; Supabase dashboard user list |
| LLM-dependent feature (OCR/embeddings) silently no-ops | No AI key configured — this is the intended honest-degrade behavior (`available: false`), not a bug | `apps/architect/AI_DOCUMENT_PROCESSING_PIPELINE.md`, `REAL_DOCUMENT_UPLOADS.md` |
| Build fails on Vercel but passes locally | Usually a Node/pnpm version mismatch or an env var only set locally | `vercel.json`, Vercel build logs, confirm env parity between local `.env.local` and the target Vercel environment |

## 8. Recovery

- **Bad deploy:** use Vercel's Instant Rollback / "Promote to Production" on the last known-good
  deployment — see [`docs/SECURITY_POSTURE.md`](./SECURITY_POSTURE.md) §9 for the full rollback
  process, including the schema-change caveat.
- **Corrupted/fabricated data in a persisted workspace:** prefer adding a heal-on-load detector in
  `lib/repositories/migrate.ts` (the established pattern — see `NO_FABRICATED_CONTENT.md` and
  `PILOT_FAKE_PCT_AND_ENGLISH_FIX.md`) over a manual one-off Supabase edit, so the fix also covers
  any other row with the same shape of problem, automatically, on next load.
- **Lost/forgotten Supabase pilot password:** reset via the Supabase Auth dashboard directly — do
  not attempt to "recover" it through the pilot-cookie fallback path, which is a different,
  weaker auth mechanism reserved for when Supabase isn't configured at all.

## 9. Daily ops checklist (for an active pilot)

- [ ] Confirm the latest `main` commit matches the live Vercel Production deployment
      (`vercel ls`, or the Vercel dashboard).
- [ ] Skim for any new commit touching `middleware.ts`, `lib/auth/*`, or `supabase/migrations/*`
      since the last check — these are always security-relevant (see Security Posture §11).
- [ ] If either pilot user reports something "looks wrong," reproduce in both roles before
      concluding it's role-specific.
- [ ] Confirm no `.env.local` or secret value was accidentally staged in any recent commit
      (`git status`, `git diff --stat`) before pushing.
- [ ] If a new mission shipped, confirm its `MISSION*.md` (or equivalent feature doc) landed in the
      same commit/PR as the code — documentation is part of Definition of Done, not a follow-up.
