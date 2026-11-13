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

### 2a. Evidence for the real import, and what deleting the database would lose (2026-11-13)

- **Why the classification changed:** past chats contain recorded live checks against staging. Chat c8777442 (2026-09-14) records "REAL 7 CUSTOMERS PRESERVED: Yes. Import cluster at 2026-09-13T21:24 is 7 locations: 2 with coordinates, 5 provenance-only", repeated in later checks with "No re-import" and "importer execute gate OFF". The import script (chat 8186d15e) read `~/Downloads/DATOS CLIENTES (1).xls` and recorded `source_fingerprint` = SHA-256 of the file bytes = `9de8112b…662446a`. Instructions up to 2026-09-20 said "do not mutate the protected seven Real customers". The earlier "synthetic only" statement came from an infrastructure map and was wrong.
- **Original import file:** gone. It is not in `~/Downloads`, Trash, a Spotlight search or Dropbox (filename search, 0 results).
- **Local spreadsheet:** `DATOS_CLIENTES_ISA_2026-09-14.xls` has SHA-256 `52dadbdc…`, which is **not** the imported file. It may contain the same customers, but that is unproven.
- **Existing backup:** the only dump (2026-09-13 13:46) predates the import (it has no import tables).
- **Deleting `dpg-dajd3kh5efls738falcg-a` would permanently lose:** the 7 imported customer parties with their contacts and 7 locations (2 with coordinates), the import batch receipt and row log, and any staging changes between 2026-09-14 and the 2026-10-11 suspension (UNKNOWN; policy said do not modify the real customers). Synthetic fixtures and smoke data lost with it have no unique value.
- **Cost of keeping it:** the Render FAQ lists "storage capacity for Render Postgres databases" as billed, with no exemption for suspended databases. Expect about $0.30/month (1 GB), plus a paid workspace plan staying billable. Compute is not billed while suspended. Exact amounts: AUTH_BLOCKED (Billing page).

### 2b. Web services: no unique persistent files (verified 2026-11-13)

Render API for both `srv-dajd64gae00c739gpk20` and `srv-dajddb67bikc73bl42q0`: no disk, 0 secret files, 0 custom domains, 0 jobs. The filesystems are ephemeral (Render FAQ). Configuration is preserved locally. Deletion is prepared but **not executed**: `DELETE https://api.render.com/v1/services/<id>` for each ID, run only on Carmen's go-ahead.

### 2c. Supabase Auth (updated 2026-11-13)

`isalwa-os-auth-staging` (`qbpxuywtoycjpitxoblo`, sa-east-1, free organization) was **paused**, not deleted. Restore was available. Restored 2026-11-13 11:11–11:16 EDT through the Supabase Management API (free, no plan change); status `ACTIVE_HEALTHY`. The preserved Render service keys authenticate against it. It has 23 auth users, all confirmed: 22 `@isalwa.demo` and 1 on another domain (values not read). Free projects pause again after 1 week of inactivity, so restore again before use if needed. Free-organization limit: 2 active projects. The other four paused projects are untouched.

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

Supabase Auth: recovered (see 2c).

## 5. Evaluation preview now vs commercial launch later (owner clarification 2026-11-13)

The current target is an unfinished development and evaluation preview, not production. No purchases or upgrades.

- **Vercel Hobby eligibility: UNCLEAR.** Current Terms §4: "You shall only use the Services under a Hobby plan for your personal or non-commercial use", and Vercel may remove Hobby deployments at its discretion. The current fair-use page no longer shows a definition of commercial use. The exact uncertainty: whether a protected, non-revenue preview of software built for a business, shown to that business for evaluation, counts as "non-commercial". Vercel does not say. Only Vercel can answer this authoritatively.
- **Free pieces available now:** web on Vercel Hobby (subject to the above, with Vercel Authentication deployment protection), Supabase Auth Free (restored), and a business database as a second Supabase Free project (500 MB, pauses after 1 week of inactivity; keeps auth and business data separate; within the 2-active-project limit).
- **Blocked lane: API host for the preview.** Type: BUSINESS_DECISION_REQUIRED. os-api must run as an always-on Node process for its in-process outbox worker. Vercel Functions would need backend changes, and Fly.io and similar hosts need a payment method. Without an API host the preview is web-only and non-functional. Unblock: Carmen picks a host that allows a payment method, or approves the serverless adaptation as a reviewed backend change.
- **Preview data and safety:** synthetic data only (the Sept 13 dump or a fresh `migrate deploy` plus synthetic seed); `OS_REAL_CLIENT_IMPORT_ENABLED` off; messaging and payment integrations disabled; auth mode `supabase` with tenant permissions unchanged; unfinished features keep their existing labels.
- **Commercial launch later:** Vercel Pro $20, an always-on API host about $3.69+, and a non-pausing database with backups ($20–35). See the table above.
