# Receipt — Vercel / hosting preparation (Batch 9, continuation §17)

Date: 2026-11-16. Source: `ct3/v1-repairs` @ `fd11db98` (parent of the Batch 9 commit; the Batch 9 commit is recorded in the checkpoint ledger by the next commit). Docs only. **Nothing was deployed, pushed, purchased, resumed, deleted or changed at any provider.** No export was built (see §5: the source is not reviewed).

## 0. State (kept distinct)

| Dimension | State |
|---|---|
| Release manifest | **PREPARED (this document)** |
| Allowlisted export | **NOT BUILT.** A fresh export is built after the reviewed integrated SHA exists (§5). The existing `isalwa-source-44958998.tar.gz` is older and must not be deployed. |
| Independent review of the source to deploy | **NOT DONE** |
| Deployment | **NOT DEPLOYED**, no authorization exists for any destination |
| Provider activation (WhatsApp, email, AI, maps) | **NOT ACTIVATED**; all disabled in the manifest |
| Human acceptance | **NOT DONE** |

## 1. Current provider inventory

| Provider | Last known (read 2026-11-13, `HOSTING_RECOVERY_INVENTORY.md`, `RENDER_EXIT_PLAN.md`) | Today (2026-11-16) |
|---|---|---|
| Vercel `carmen-ship-it` | Hobby, team `carmen-ship-its-projects`, **0 projects** | **NOT RE-INVENTORIED.** The Vercel MCP namespace reports `needsAuth` and no `vercel` CLI is installed; signing in needs Carmen's browser. A historical "zero projects" is not current proof. Blocker type: AUTH_BLOCKED (read-only). |
| Render | Postgres and both web services suspended by billing since 2026-10-11; live data inaccessible without payment | Unchanged by this run. Not touched. |
| Supabase Auth | Project restored free on 2026-11-13; free projects pause after 1 week idle | **UNKNOWN today**; may be paused again. Check before use. |

Do not delete Render resources or its database; retirement and invoices are separate owner decisions (`RENDER_EXIT_PLAN.md` §3).

## 2. What Vercel can and cannot host

- **os-web (Next.js, `apps/os-web`)**: hostable on Vercel. Build: `next build` from the monorepo (`outputFileTracingRoot` = repository root, `transpilePackages: @isalwa/ui, @isalwa/os-contracts`). Needs pnpm 9.15.4 and Node >= 22; workspace packages are built by the repo's build graph.
- **os-api (NestJS, `apps/os-api`) is not a Vercel function.** It is a long-running server with an in-process outbox worker (`OS_OUTBOX_POLL_MS`, default 5 s), a projection worker and an attention clock (60 s). In-process timers do not run between function invocations; a serverless bootstrap plus Cron (1 min minimum) would change behavior and is a reviewed backend change, not hosting preparation. Not recommended; not done.
- **Database**: Postgres 16 with Prisma, 44 migrations at this SHA (`ls packages/os-database/prisma/migrations`, excluding `migration_lock.toml`). A new database is a new environment (`prisma migrate deploy`), not a migration of the Render data.
- **Auth**: Supabase Auth (identities only). The hosted API must run `OS_AUTH_MODE=supabase`; `os-api` env validation refuses `dev` when `OS_RUNTIME_PROFILE` is `staging` or `production`.
- **File storage**: none in code. Payment evidence is stored privately by the API (Batch 6); a storage provider decision is part of T12 media.
- **Free-tier suitability (UNPROVEN):** Vercel Hobby is "personal or non-commercial" (Terms §4). Whether a protected, non-revenue evaluation of a business app is non-commercial is not defined; only Vercel can say. Pro is $20/seat/month. The current Vercel terms and pricing were **not re-read today** (no authenticated or web check in this run); re-verify before any decision.

## 3. Blockers (affected action, exact missing fact, accountable role, smallest decision)

| # | Blocker | Type | Affects | Safe state now | Accountable | Smallest unblocking decision |
|---|---|---|---|---|---|---|
| H1 | **Owner purchase.** Any host beyond free tiers: Vercel Pro (if Hobby is not acceptable), an always-on API host (about $3.69+/month on Fly.io, needs a payment method), a non-pausing database with backups ($20–35/month; Neon or Supabase Pro). Estimates are from `RENDER_EXIT_PLAN.md` §4, read 2026-11-13, not re-verified. | BUSINESS_DECISION_REQUIRED | Any working hosted evaluation | Local-only evaluation works | Carmen | Choose Option A (about $43/month) or B (about $59/month), or authorize a web-only non-functional preview |
| H2 | **API host.** No always-on host is authorized; os-web alone cannot run the journeys. | BUSINESS_DECISION_REQUIRED | Hosted journeys | None hosted | Carmen | Name the API host and approve its payment method, or approve a reviewed serverless adaptation of the worker |
| H3 | **Allowlisted export** must be rebuilt from the reviewed integrated SHA and scanned (§5). | PROCESS | Any upload | Procedure written | Integrator | Independent review of the commits after `44958998` (open since 2026-10-16) |
| H4 | **Vercel account state** not re-inventoried; needs sign-in. | AUTH_BLOCKED | Any project creation | Last known inventory recorded | Carmen | Sign in to Vercel (read-only inventory) or accept the 2026-11-13 state |
| H5 | **Private repository** for Vercel's Git integration. History must not be pushed. | BUSINESS_DECISION_REQUIRED | Connect Vercel to source | Local archive only | Carmen | Either a new private repository holding only the allowlisted export (single commit, no history) or Vercel CLI upload of the export; both are deploy actions and need authorization |
| H6 | **Supabase Auth** project state, redirect URLs, and per-environment keys (rotate; do not reuse the preserved Render values). | AUTH_BLOCKED | Hosted login | Local dev auth only | Carmen | Sign in to Supabase; confirm project is active |
| H7 | **Independent review** of the integrated source (all batches). | REVIEW_REQUIRED | "Reviewed release" | Local tests only | Independent reviewer | Run the review packets |
| H8 | **Real approver/Accounting/staff, approved prices, payment destination, WhatsApp** (see readiness map) | Several | Live pilot, not evaluation | Synthetic evaluation | Owner | Per row in the readiness map |

## 4. Release manifest (candidate, values withheld)

| Field | Value |
|---|---|
| Source SHA / tree | Final reviewed integrated SHA; **not yet decided**. Current local head before this receipt: `fd11db98` (tree `git rev-parse fd11db98^{tree}`). Not reviewed. |
| Export | Not built. Recipe in §5. Export hash recorded when built, outside the repository. |
| Proposed account / project | Vercel `carmen-ship-it` / team `carmen-ship-its-projects` / one project `isalwa-os-web`, root directory `apps/os-web`, production branch not applicable (CLI/archive deploy) |
| Environment | `evaluation` (synthetic data only, visible evaluation-data notice) |
| Web | Vercel (project above). Install `pnpm install --frozen-lockfile`; build runs the workspace build for `@isalwa/os-contracts`/`@isalwa/ui` then `next build` |
| API | **UNDECIDED (H2).** `node dist/main.js` after `tsc`; health `/v1/health`, readiness `/health/ready`; one instance only (in-process workers) |
| Database | **UNDECIDED (H1).** Postgres 16, new, empty, `prisma migrate deploy` (44 migrations); named synthetic seed only |
| Auth | Supabase Auth project (state UNKNOWN, H6); `OS_AUTH_MODE=supabase`, `NEXT_PUBLIC_OS_AUTH_MODE=supabase` |
| Storage | None configured; private payment evidence stays in the API/DB as built; no public bucket |
| Worker | In the API process: `OS_OUTBOX_WORKER`, `OS_PROJECTION_WORKER`, `OS_ATTENTION_CLOCK` |

### Environment variable names (no values; read from source on this SHA)

**os-web:** `NEXT_PUBLIC_OS_API_URL`, `NEXT_PUBLIC_OS_AUTH_MODE`, `NEXT_PUBLIC_OS_WEB_ORIGIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `OS_RUNTIME_PROFILE`, `NODE_ENV`. Optional (leave unset): `NEXT_PUBLIC_MAPS_PROVIDER`/`MAPS_PROVIDER`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_ACCESS_TOKEN`, `MESSAGING_PROVIDER`, `EMAIL_PROVIDER`, `AI_ENABLED`, `AUTHORITATIVE_REVENUE_LAYER`.

**os-api:** `OS_DATABASE_URL` (or `DATABASE_URL`), `OS_AUTH_MODE`, `OS_RUNTIME_PROFILE`, `OS_CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `OS_API_HOST`, `OS_API_PORT`/`PORT`, `OS_OUTBOX_WORKER`, `OS_OUTBOX_POLL_MS`, `OS_OUTBOX_BATCH_SIZE`, `OS_PROJECTION_WORKER`, `OS_PROJECTION_POLL_MS`, `OS_ATTENTION_CLOCK`, `OS_ATTENTION_CLOCK_MS`, `NODE_ENV`; `OS_QA_CONTROL_ENABLED`, `OS_QA_SIGNING_SECRET` (QA only; see below); `AI_ENABLED` and the `AI_*`/`OPENAI_ISALWA_*` set (leave unset). The previously preserved Render list also names `SUPABASE_SERVICE_ROLE_KEY`; it is not read by the current code on this SHA (confirm before provisioning; do not create it if unused).

**Migration/import:** `OS_REAL_CLIENT_IMPORT_ENABLED` must stay unset/false.

### Settings

| Setting | Required value / rule |
|---|---|
| Redirect/CORS | `OS_CORS_ORIGINS` = exact web origin(s) only; Supabase redirect URLs = the deployed web origin only; no wildcards |
| Cookies | Secure, same-site as implemented by the web session layer; verified in hosted browser check (not yet) |
| Development login | `OS_AUTH_MODE=supabase` and `OS_RUNTIME_PROFILE=staging`; API env validation rejects dev mode. Verify a hosted request without a Supabase session returns 401, and that no `?dev`/hand-made session works |
| QA control | `OS_QA_CONTROL_ENABLED` unset/false in hosted; never ship `OS_QA_SIGNING_SECRET` with QA control on |
| Provider-disabled controls | `AI_ENABLED` unset; `MESSAGING_PROVIDER`, `EMAIL_PROVIDER`, maps keys unset; no WhatsApp adapter exists (`/sistema` shows "No conectado"); `OS_REAL_CLIENT_IMPORT_ENABLED` unset |
| Synthetic seed | Existing synthetic roster/seed mechanism applied to the new database only; real customer import stays off; show the evaluation-data notice; no `?datos=` or data-mode switch |
| Cost limits | AI off (no spend). Set hard spend alerts at each paid provider before purchase (owner action). Fly/Neon/Vercel caps are set in their consoles; none exist yet |
| Health checks | `GET /v1/health`, `GET /health/ready` (database check); web root after login wall is not proof |
| Rollback | Web: redeploy the previous Vercel deployment. API: redeploy the previous image/commit. Database: migrations are additive; restore from the pre-migration backup (below), never a down-migration |
| Backup/restore | `pg_dump` before every `migrate deploy`; a restore drill into an isolated cluster with row counts (same as the 2026-09-13 drill) before any real data. Provider backups only on non-free tiers; none exist yet |

## 5. Fresh allowlisted export procedure (run only after review; not run)

Preconditions: independent review verdict on the integrated SHA; `TRANSFER_CLEARANCE.md` re-read. Restricted material (`docs/**`, `.cursor/**`, `scripts/**`, `seed/`, `tests/`, `assets/`, `evidence`, project memory, chat indexes) stays out.

1. From the worktree, confirm `git rev-parse HEAD`, clean tracked tree, and note `.tmp/` and `apps/os-api/.tmp-stage-a/` are untracked and cannot enter `git archive`.
2. `git archive --format=tar.gz --prefix=isalwa-source-<sha8>/ -o <outside-repo>/isalwa-source-<sha8>.tar.gz <sha> $(cat ALLOWLIST.txt)` using `/Users/carmen/projects/isalwa-transfer-readiness/export/ALLOWLIST.txt` (`apps packages package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .npmrc .gitignore .prettierrc.json .env.example README.md LICENSE .github/workflows/ci.yml docker/docker-compose.yml`).
3. List the archive members and fail on any path outside the allowlist or matching `docs/`, `evidence`, `project-memory`, `.env` (non-example), `*.dump`, `*.pem`, `*.tgz`.
4. Run the value-free `export_scan.py` over the actual upload set; keep output outside the repository.
5. Record export sha256, tree, file count and migration count (44 expected, or more if later batches add migrations) in the checkpoint.
6. **Do not** push `ct3/v1-repairs`, its history, or the public `ISALWA-DEMO` repository. The export has no history.

Note: `.env.example` is allowlisted but is a legacy demo template (`NEXT_PUBLIC_API_URL`, `DATABASE_URL`, `REDIS_URL`, `ALLOW_MOCK_PROVIDERS`); the os-web/os-api variables above are not in it. Treat §4 as authoritative; updating `.env.example` is a separate small change if wanted.

## 6. After an authorized evaluation deployment (not authorized now)

Verify against hosted persistence and hosted auth: login with a real Supabase session, a tenant-A advisor creating a customer and quote, tenant-B refusal (404/403 without disclosure), reload persistence, Accounting verification queue, the evaluation-data notice, and no dev-login. A 200 on the home page or a login wall is not the deployed commercial outcome. Keep "connected WhatsApp" and "pilot ready" claims open.

## 7. What this receipt does not do

No deploy, push, export build, account change, purchase, provider call, or Vercel/Render/Supabase mutation. It does not clear anything for live customer use.
