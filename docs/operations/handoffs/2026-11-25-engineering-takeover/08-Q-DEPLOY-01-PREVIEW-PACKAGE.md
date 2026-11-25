# Q-DEPLOY-01 — separate overnight preview package (sanitized)

Prepared: 2026-11-25 · Builder only · **Independent review of code candidate still open**

## Review candidate (preserve)

| Field | Value |
| --- | --- |
| Commit | `eb8c6428793c11cef094ffd76888ea86da343241` |
| Tree | `a97ed01722d4e5f25c6e420c36d2208798ff108f` |
| Branch | `wip/overnight-handoff-20261125` |
| Allowlisted export | Built **outside** GitHub under operator vault `overnight-preview-20261125/export/` (sha256 in vault receipts). Not uploaded here. |

## Forbidden (evaluation untouched)

| Resource | Status |
| --- | --- |
| `https://isalwa-os-web-evaluation.vercel.app` (`isalwa-os-web-evaluation`) | **UNTOUCHED** — listed on Vercel; last production update 2026-11-17 |
| Railway `isalwa-os-api-evaluation` `/v1/health` | **UNTOUCHED** — liveness HTTP 200 rechecked |
| Supabase `isalwa-os-evaluation-db` | **Do not reuse** for overnight preview |
| AWS disposable overnight DB | Local proof only — never hosted |
| `OS_AUTH_MODE=dev` on hosted | Forbidden |

## Destination / access / paid (confirm)

| Layer | Separate destination | Access | Paid decision | Ready |
| --- | --- | --- | --- | --- |
| Web | **New** Vercel project `isalwa-os-web-overnight-preview` (team `carmen-ship-its-projects`, Hobby). CLI/archive deploy — **no** Git link to public repo. | CLI `carmen-ship-it` OK. Project **does not exist**. | Hobby project create is free; Terms risk is owner call. | Prepared; create after API+DB+auth |
| API | **New** always-on Node host (Railway new service preferred; Docker recipe from prior evaluation transfer package). Not evaluation service. Not Vercel serverless. | Railway CLI **missing** on Mac; no new-service token evidenced. | **Paid** — needs Carmen authorization | **BLOCKED** — Carmen |
| DB | **New** empty Postgres 16 + migrate (47 migrations at candidate) + synthetic seed | Evaluation DB healthy but **isolated** — must not point preview at it | **Paid** if always-on | **BLOCKED** — Carmen |
| Auth | Synthetic Q-LOGIN-01 seats; staging Auth `isalwa-os-auth-staging` ACTIVE_HEALTHY **or** new Auth project; redirect = new origin only | Supabase CLI inventory OK | Existing staging may suffice | **PARTIAL** — Carmen chooses reuse vs new |
| Workers | In-process on API (`OS_OUTBOX_WORKER`, `OS_PROJECTION_WORKER`, `OS_ATTENTION_CLOCK`, `OS_ELAPSED_NOTICE_CLOCK`) | — | With API | Blocked with API |

## Env names only (no values)

Web: `NEXT_PUBLIC_OS_API_URL`, `NEXT_PUBLIC_OS_AUTH_MODE`, `NEXT_PUBLIC_OS_WEB_ORIGIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `OS_RUNTIME_PROFILE`, `NODE_ENV`.

API: `OS_DATABASE_URL`, `OS_AUTH_MODE`, `OS_RUNTIME_PROFILE`, `OS_CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `OS_API_HOST`, `PORT`/`OS_API_PORT`, worker/clock flags, `NODE_ENV`.

## Deploy gate

Do **not** deploy until: (1) independent verdict on `eb8c6428`, (2) Carmen paid/API/DB/auth decisions above, (3) new Vercel project created without touching evaluation.

If blocked at deploy time, owners are in the destination table (Carmen for paid API/DB/auth; reviewer for verdict; builder for Vercel create after those).

## Full operator package

Private vault path (not GitHub): `~/.isalwa-secrets/overnight-preview-20261125/package/Q-DEPLOY-01-PREVIEW-PACKAGE.md` plus export + env-name templates.
