# Render exit plan

Owner direction 2026-11-13: exit Render. Do not resume, pay invoices, add a payment method or upgrade. The replacement is built from the cleared export (`isalwa-source-44958998.tar.gz`, see `TRANSFER_CLEARANCE.md`) and the local integrator branch, never from GitHub `main` `1f767fa1`.

Nothing has been deleted, resumed, paid or purchased. Everything below is PLANNED unless marked otherwise.

## 1. Charges

| Item | Rate (render.com/pricing, read 2026-11-13) | While billing-suspended |
|---|---|---|
| Postgres `isalwa-os-staging`, plan `0.1c-256mb` | $6/month, prorated by the second | Render support says suspended instances are not billed for compute. Not confirmed for billing suspensions. |
| Postgres storage, 1 GB | $0.30/GB/month | **UNPROVEN.** Render's cost guide lists storage separately from compute. Assume ≈ $0.30/month may still accrue. |
| Web `os-api-staging`, plan `0.5c-512mb` (Starter) | $7/month, prorated | Compute not billed while suspended (Render support). |
| Web `os-web-staging`, plan `free` | $0 | $0 |
| Disks, Key Value, cron, env groups | none exist | $0 |
| Workspace subscription | Hobby $0; paid tiers flat per month | Render FAQ: the fee is waived only for a month with **no services (live or suspended)** and no activity. While any suspended resource exists, a paid workspace plan keeps billing. **Workspace tier: UNKNOWN.** |
| Outstanding invoices | — | **UNKNOWN.** Not exposed by the Render API (`/billing`, `/invoices` → 404). The dashboard is not signed in for the agent, and Gmail access was declined. Deleting resources does not cancel invoices already issued. |

Blocked lane: exact invoice amounts and workspace tier. Type: AUTH_BLOCKED. Unblock: Carmen opens Render → Billing and reads "Outstanding", "Projected" and the plan name, or grants read access to the Render invoice emails.

## 2. Data preservation

| Asset | Status | Evidence |
|---|---|---|
| Live database contents | **INACCESSIBLE, UNKNOWN.** Recovery requires payment. | `GET …/export` → `[]`. `POST /v1/postgres/dpg-dajd3kh5efls738falcg-a/export` → `400 cannot trigger a backup for a suspended database`. Point-in-time recovery creates a new paid database. Path stopped per owner direction. |
| Real customer import on staging | Exists per records, **not preserved**. | `V1_LAUNCH_SUPPORT_READINESS.md`: real `xls_datos_clientes` batch, source `DATOS CLIENTES (1).xls`. Rows created by it, and any later staff edits, exist only in the suspended database. |
| Source spreadsheet | Partially preserved. | One local copy: `isalwa-source/2026-09-14-isa-data/DATOS_CLIENTES_ISA_2026-09-14.xls` (43,008 bytes, sha256 `52dadbdc…414e54f`). Whether it equals `DATOS CLIENTES (1).xls` is UNKNOWN; no hash of that file was recorded. Re-importing it would recreate the import, not edits made afterwards. |
| 2026-09-13 dump | Preserved and restore-verified (TESTED). | `~/.isalwa-secrets/staging-backups/isalwa-os-staging-20260913T174629Z.dump`, sha256 `6dbf0555…3f71213`. Isolated socket-only PG16 restore: exit 0, 43 tables, 9 of 40 migrations, 1 organization, 1 party (Step17 seed), 2 identities, both `@isalwa.demo`. **Synthetic only; no customer data.** |
| Service configuration | Preserved (TESTED). | `~/.isalwa-secrets/render-config-export/` (mode 700, files 600): `os-api-staging-20261113T150402Z.env` (15 vars, sha256 prefix `9a3aac58d174ef94`) and `os-web-staging-…env` (10 vars, `5982540a6e316e14`), plus service metadata JSON. Values never printed. |
| Uploaded files | None. | No disks, no object storage in code. |
| Source code | Preserved. | The cleared export and the local branches. Render's deployed commits (`52a9f9e9`, `93a9ca1f`) are older and not needed. |

## 3. Retirement list (awaiting Carmen's approval; nothing deleted)

| # | Resource | ID | Preservation | Deletion consequence | Effect on future charges |
|---|---|---|---|---|---|
| 1 | Web `os-web-staging` (free) | `srv-dajddb67bikc73bl42q0` | Config and source preserved | Loses the `onrender.com` URL, deploy history and logs. No data. | $0 compute. Helps the workspace-fee waiver. |
| 2 | Web `os-api-staging` (Starter) | `srv-dajd64gae00c739gpk20` | Config and source preserved | Loses the URL, deploy history and logs. No data (the API is stateless). | Removes the risk of $7/month if it is ever resumed. Helps the waiver. |
| 3 | Postgres `isalwa-os-staging` | `dpg-dajd3kh5efls738falcg-a` | **Live data not preserved** | **Permanent loss** of the real customer import batch, staff edits after Sept 13 and the recovery window. | Stops the ≈ $0.30/month storage risk and the $6/month exposure. Required for the workspace-fee waiver. |

Items 1 and 2 are ready to retire. Item 3 is ready only if Carmen accepts losing the live staging data. The alternatives are to re-import from the local spreadsheet (equivalence UNKNOWN) or to pay once to export (excluded by the current direction). Keep the workspace and account, the GitHub connection and any unrelated resources.

## 4. Replacement architecture

Runtime facts from the code: os-web is Next.js. os-api is a long-running NestJS server (`app.listen`) that runs the outbox worker (`setInterval`, `OS_OUTBOX_POLL_MS` default 5 s) and the attention clock (60 s) in-process. Postgres 16 with 40 Prisma migrations and no extensions (`os_location` notes "no PostGIS"). Auth is Supabase Auth only. No file storage.

**Vercel cannot host os-api reliably without backend changes.** In-process timers do not run between Vercel Function invocations. Moving it there would need a serverless bootstrap and a new cron route around `OutboxWorkerHost.runOnce()`. Vercel Cron's 1-minute minimum would stretch projection latency from 5 s to up to 60 s, which changes behavior. Not recommended.

Recommended (no backend rewrite):

| Part | Host | Monthly cost |
|---|---|---|
| os-web | Carmen's Vercel account, upgraded to **Pro** (Hobby terms forbid commercial use) | $20 (1 seat) |
| os-api with in-process outbox worker | One always-on container on Fly.io, shared-cpu-1x 512 MB, using the existing `node dist/main.js` | $3.69 (1 GB if 512 MB proves tight) |
| Business Postgres 16 | **Option A:** Neon Launch. The 5 s poll keeps compute awake: 0.25 CU × 730 h × $0.106 plus 1 GB × $0.35. The free tier's 100 CU-h runs out mid-month. | ≈ $19.70 |
| Auth | **Option A:** new or recovered Supabase project on Free (pauses after 1 week inactivity, no backups) | $0 |
| **Option A total** | | **≈ $43/month** |
| Business Postgres plus auth | **Option B:** Supabase Pro organization. Auth project on the included Micro, business database as a **separate** project on a second Micro (keeps the auth/business separation). Daily backups, no pausing. | $25 + $10 |
| **Option B total** | Vercel Pro + Fly + Supabase Pro | **≈ $59/month** |

Each option needs new purchases (Vercel Pro; a Fly payment method; Neon or Supabase Pro). These are owner decisions and have not been made. If Vercel is not mandatory, putting os-web on Fly as well saves about $16/month.

Steps once approved: publish the export to a private repository → create the database → `prisma migrate deploy` (40 migrations) → set env vars from the preserved names and values, rotating the Supabase keys and `OS_QA_SIGNING_SECRET` → deploy os-api, health `/v1/health` → deploy os-web with `NEXT_PUBLIC_OS_API_URL` → re-invite users → optionally re-import the customer spreadsheet. Each step stays PLANNED until it is DEPLOYED and BROWSER-VERIFIED.

Supabase Auth: the old project host does not resolve; whether it can be recovered is UNKNOWN until a Supabase dashboard sign-in.
