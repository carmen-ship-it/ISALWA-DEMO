# Agent 11 receipt — Infrastructure / ownership / costs / production readiness

**Agent:** 11 ONLY  
**Date:** 2026-09-15  
**Mode:** READ-ONLY (no implementation)  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Hosted web (evidence):** `https://os-web-staging.onrender.com` @ SHA `e5e9cac82a0e2ba82f3633386393598220471da0`  
**Purpose:** Feed later permanent `OWNER_INFRASTRUCTURE_MAP.md`. Secret **names** only.

---

## Verdict

| Question | Answer |
|----------|--------|
| **PRODUCTION ENVIRONMENT** | **NOT EVIDENCED** |
| Staging OS stack | **EVIDENCED** (Render web + API + Postgres + Supabase Auth staging) |
| `render.yaml` / Blueprint in repo | **ABSENT** — live control plane is Render Dashboard/API |
| Current verified monthly invoice totals | **UNKNOWN / UNVERIFIED** — **VERIFY EXTERNALLY** (no invoice/SKU dollars in repo) |
| Planning cost bands (not invoices) | Documented ~USD 80–200/mo staging+prod combined (ex WhatsApp/AI/maps) |

**Stale-doc note:** `docs/operations/ENVIRONMENT_MAP.md` (2026-09-13) still says hosted os-web/os-api + managed Postgres “not provisioned.” Later Wave 2 + ops evidence contradicts that for **staging**. Prefer Wave 2 / backup runbook / onboarding-pass receipts for staging truth.

---

## Sources consulted (no billing dashboards opened this pass)

| Path | Role |
|------|------|
| `docs/operations/PRODUCTION_OWNERSHIP_AND_COSTS.md` | Ownership + planning bands |
| `docs/operations/ENVIRONMENT_MAP.md` | Env contract / secret names (topology partially stale) |
| `docs/operations/STAGING_HOST_OPERATOR_CHECKLIST.md` | Personal Carmen gate / Vercel note / Render key |
| `docs/operations/BACKUP_RESTORE_RUNBOOK.md` | Staging Postgres id, plan class, PITR API state |
| `docs/operations/AI_PILOT_BOUNDARY.md` | AI off + key name + USD 20 policy cap |
| `docs/operations/MAP_GEO_BOUNDARY.md` | No live map token |
| `docs/operations/OVERDUE_ATTENTION_CLOCK.md` | In-process clock, no cron provider |
| `docs/github/REPOSITORY_READINESS.md` | GitHub remote ownership |
| `docs/architecture/PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md` §§15–16, topology |
| `docs/architecture/WAVE2_PREDEPLOY_MIGRATE_OWNERSHIP.md` | No prod services; no `render.yaml` |
| `docs/architecture/WAVE2_STAGING_DEPLOYMENT_CHECKLIST.md` | Staging hostnames + env names |
| `docs/architecture/WAVE2_HOSTED_ACCEPTANCE_RESUME_EF7EEAB.md` | Service ids |
| `docs/operations/onboarding-pass-2026-09-15/shots/receipt.json` | Hosted URL proof |
| `apps/os-api/.env.example`, `apps/os-web/.env.example` | Secret **names** |
| `apps/os-web/app/(app)/sistema/page.tsx` | System Health UI state |
| `apps/os-web/app/(app)/administracion/**` | Admin / Capacidades (not infra console) |
| Repo root | **No** `render.yaml` |

---

## PRODUCTION ENVIRONMENT: NOT EVIDENCED

Evidence that production OS is **not** provisioned in this Render workspace:

- `WAVE2_PREDEPLOY_MIGRATE_OWNERSHIP.md`: “No `os-api-prod` / `os-web-prod` services exist… only staging web/api + postgres.”
- `PRODUCTION_OWNERSHIP_AND_COSTS.md`: production Render / Auth / Postgres “**not** evidenced.”
- No company domain / `app.<domain>` cutover evidenced; staging uses `*.onrender.com`.
- Planned names only: `os-web-prod`, `os-api-prod`, `isalwa-os-prod`, `isalwa-os-auth-prod`.

Staging **is** evidenced (see rows below). Do not collapse staging proof into production.

---

## Cost truth (do not invent invoices)

| Bucket | Status | Notes |
|--------|--------|-------|
| **CURRENT VERIFIED MONTHLY COST** | **NONE in repo** | No invoice numbers, billed USD, or confirmed SKU prices found. Mark **VERIFY EXTERNALLY** in Render / Supabase / GitHub / registrar dashboards. |
| **UNKNOWN / UNVERIFIED COST** | **YES** | Render compute SKUs, exact Postgres billed amount, Supabase Auth plan (Free vs Pro), GitHub seats, DNS/registrar, secret-manager product — all unconfirmed as invoices. |
| **PILOT RECOMMENDED COST (planning band, not invoice)** | ~USD **80–200**/mo staging+prod combined excluding WhatsApp / AI / maps (`PRODUCTION_OWNERSHIP_AND_COSTS.md`, plan §15) | Label: **BAND ONLY** |
| **PRODUCTION BASELINE COST (planning band)** | Compute ~USD 25–50 + Postgres+PITR ~USD 20–50 + Auth ~USD 0–25 (+ optional Sentry/R2/DNS) | **BAND ONLY** — VERIFY EXTERNALLY before budgeting |
| **VARIABLE USAGE COSTS** | AI policy hard cap **USD 20**/mo if enabled; maps Architect band USD 0–50 if live; WhatsApp deferred / not in register | Caps ≠ invoices |

Observed non-dollar plan class (still **not** a monthly invoice): Render Postgres `isalwa-os-staging` plan string **`0.1c-256mb`**, disk 1 GB, HA disabled (`BACKUP_RESTORE_RUNBOOK.md`).

---

## Provider / System Health UI state

| Surface | Path | State |
|---------|------|-------|
| Controles del sistema | `apps/os-web/app/(app)/sistema/page.tsx` (`/sistema`, `system.admin`) | **LIVE SHELL / EMPTY TOOLS** — confirms authority; copy says infra tools appear “cuando existan”; explicitly **does not** open “salud de integraciones.” |
| Administración | `/administracion` (+ Equipo / Accesos / Capacidades) | People + org capability read — **not** provider uptime/billing console |
| Capacidades | `/administracion/capacidades` | Read-only capability states for the org — product features, not Render/Supabase health |
| Map provider honesty | `apps/os-web/lib/map/provider-status.ts` + mapa desk | Desk-local “vista geográfica en preparación” — **not** a System Health page |
| API health endpoints | `GET /v1/health`, `/v1/health/ready` | Backend liveness/readiness (ops/scripts), not owner UI |
| Sentry / uptime UI | — | **MISSING** in `apps/os-web` deps; `OBSERVABILITY_READY` still open |

**Verdict:** Provider/System Health UI for owners = **MISSING** (placeholder `/sistema` only). Integration health is intentionally not exposed there today.

---

## Business Settings: configurable vs governed code

| Concern | Configurable in product UI? | Governed how? |
|---------|----------------------------|---------------|
| Org feature capabilities | **Read** via Capacidades (`GetCapabilityState`); UI may show `org_override` label | Capability catalog / assignment is product+API governed — **not** free-form “Business Settings” for infra |
| Employee invite / roles / lifecycle | **Configurable** under Administración (people.admin) | Workforce commands + scopes |
| Auth provider, DB URL, CORS, runtime profile | **Host env only** | Fail-closed startup validation in os-api |
| Domain, DNS, billing, Render plan, Sentry, email vendor | **Not in OS UI** | Provider dashboards + company accounts (desired) |
| AI enable / map token / WhatsApp | **Env / future approval** — AI off unless `AI_ENABLED=true` | Code gates + ops docs |
| Prices, tax, fiscal, WhatsApp send | Not owner-tunable infra settings | Business rules / deferred providers |

**Verdict:** No general “Business Settings” panel for infrastructure. People/ops config lives in Administración; infra/provider knobs are **governed code + host secrets**, not owner toggles.

---

## OWNER_INFRASTRUCTURE_MAP — row seed (for permanent map)

Columns match planned permanent map. Values are evidence-backed; costs unmarked as invoices.

### 1. Render `os-web-staging`

| Field | Value |
|-------|--------|
| SERVICE | `os-web-staging` |
| PROVIDER | Render |
| PURPOSE | Employee web shell (Next.js OS) |
| ENVIRONMENT | STAGING (pilot host) |
| CURRENT OWNER | Carmen personal Render account |
| BILLING OWNER | Carmen personal (desired: company) |
| RECOVERY OWNER | Carmen only evidenced |
| CURRENT PLAN | SKU **unconfirmed** as invoice |
| CURRENT VERIFIED COST | **UNKNOWN — VERIFY EXTERNALLY** |
| COST UNKNOWN? | YES |
| PILOT REQUIRED? | YES |
| PRODUCTION REQUIRED? | YES (as `os-web-prod` — **not** evidenced) |
| WHAT BREAKS IF REMOVED? | No hosted employee UI |
| TRANSFER TO COMPANY? | YES |
| PRIORITY | CRITICAL BEFORE PILOT (billing/admin redundancy) |
| HOW TO TRANSFER | Company Render team; transfer or recreate; 2 admins |
| SECRET NAMES | `NEXT_PUBLIC_OS_AUTH_MODE`, `NEXT_PUBLIC_OS_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public-by-design; no server secrets in `NEXT_PUBLIC_*`) |
| MONITORING | None productized |
| BACKUP RESPONSIBILITY | N/A (stateless app); rebuild from git |
| EVIDENCE | `https://os-web-staging.onrender.com`; service id `srv-dajddb67bikc73bl42q0`; onboarding/visual receipts; Auto-Deploy historically **ON** (ops risk noted in Wave 2) |

### 2. Render `os-api-staging`

| Field | Value |
|-------|--------|
| SERVICE | `os-api-staging` |
| PROVIDER | Render |
| PURPOSE | Commands/queries; co-hosted outbox worker + attention clock |
| ENVIRONMENT | STAGING |
| CURRENT OWNER | Carmen personal Render |
| BILLING OWNER | Carmen personal |
| RECOVERY OWNER | Carmen |
| CURRENT PLAN | SKU **unconfirmed** |
| CURRENT VERIFIED COST | **UNKNOWN — VERIFY EXTERNALLY** (bundled with web in planning band ~USD 14–50 staging compute) |
| COST UNKNOWN? | YES |
| PILOT REQUIRED? | YES |
| PRODUCTION REQUIRED? | YES (`os-api-prod` **not** evidenced) |
| WHAT BREAKS IF REMOVED? | API, auth resolution, worker, attention clock |
| TRANSFER TO COMPANY? | YES |
| PRIORITY | CRITICAL BEFORE PILOT |
| HOW TO TRANSFER | Move with Render team; rotate service role after |
| SECRET NAMES | `OS_RUNTIME_PROFILE`, `OS_AUTH_MODE`, `OS_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OS_CORS_ORIGINS`, `PORT`, `OS_OUTBOX_WORKER`, `OS_OUTBOX_POLL_MS`, `OS_OUTBOX_BATCH_SIZE`, `OS_ATTENTION_CLOCK_MS`, `OS_AUTH_INVITE_REDIRECT_URL` |
| MONITORING | `/v1/health`, `/v1/health/ready` only |
| BACKUP RESPONSIBILITY | N/A app; DB separate |
| EVIDENCE | `https://os-api-staging.onrender.com`; `srv-dajd64gae00c739gpk20`; Auto-Deploy **OFF** in Wave 2 notes; `preDeployCommand` migrate historically live (config ownership doc) |

### 3. Render managed Postgres `isalwa-os-staging`

| Field | Value |
|-------|--------|
| SERVICE | `isalwa-os-staging` / DB `isalwa_os_staging` |
| PROVIDER | Render Postgres |
| PURPOSE | **Business truth** (`OS_DATABASE_URL`) — parties, quotes, orders, audit, outbox |
| ENVIRONMENT | STAGING |
| CURRENT OWNER | Carmen personal Render |
| BILLING OWNER | Carmen personal |
| RECOVERY OWNER | Carmen + operator laptop dumps |
| CURRENT PLAN | Documented class **`0.1c-256mb`**, PG 16, region virginia, disk 1 GB, HA off — **not** an invoice line |
| CURRENT VERIFIED COST | **UNKNOWN — VERIFY EXTERNALLY** (planning band ~USD 7–20 staging) |
| COST UNKNOWN? | YES |
| PILOT REQUIRED? | YES |
| PRODUCTION REQUIRED? | YES (`isalwa-os-prod` + PITR **not** evidenced) |
| WHAT BREAKS IF REMOVED? | All OS business data / API readiness |
| TRANSFER TO COMPANY? | YES |
| PRIORITY | CRITICAL BEFORE PILOT |
| HOW TO TRANSFER | Company billing same instance family; do **not** use Supabase Auth DB as SoR |
| SECRET NAMES | `OS_DATABASE_URL`; operator files under `~/.isalwa-secrets/isalwa-os-staging.*` (names only) |
| MONITORING | Provider recovery API previously: `recoveryStatus=AVAILABLE` (2026-09-13) |
| BACKUP RESPONSIBILITY | Provider recovery/export + operator `pg_dump` (`BACKUP_RESTORE_RUNBOOK.md`, `scripts/verify-staging-hosted-backup-restore.sh`); R2 off-host **planned not provisioned** |
| EVIDENCE | Instance id `dpg-dajd3kh5efls738falcg-a` |

### 4. Supabase Auth `isalwa-os-auth-staging`

| Field | Value |
|-------|--------|
| SERVICE | `isalwa-os-auth-staging` |
| PROVIDER | Supabase Auth **only** (not business DB) |
| PURPOSE | Login, invite, password reset, sessions |
| ENVIRONMENT | STAGING |
| CURRENT OWNER | Personal org `carmenaburoda@gmail.com` |
| BILLING OWNER | Carmen personal |
| RECOVERY OWNER | Carmen |
| CURRENT PLAN | Free/Pro **unconfirmed as invoice**; provider status historically `ACTIVE_HEALTHY` |
| CURRENT VERIFIED COST | **UNKNOWN — VERIFY EXTERNALLY** (band USD 0–25) |
| COST UNKNOWN? | YES |
| PILOT REQUIRED? | YES |
| PRODUCTION REQUIRED? | YES (`isalwa-os-auth-prod` **not** evidenced) |
| WHAT BREAKS IF REMOVED? | Hosted login / invite mail |
| TRANSFER TO COMPANY? | YES |
| PRIORITY | CRITICAL BEFORE PILOT |
| HOW TO TRANSFER | Company Supabase org; re-invite users; never copy Auth Postgres into OS |
| SECRET NAMES | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Auth DB password (store only) |
| MONITORING | Provider dashboard |
| BACKUP RESPONSIBILITY | Auth credentials only — not OS SoR |
| EVIDENCE | ref `qbpxuywtoycjpitxoblo`, region `sa-east-1`; do **not** use Architect `efolotcrdaqdixfiqbek` |

### 5. GitHub repository

| Field | Value |
|-------|--------|
| SERVICE | `carmen-ship-it/ISALWA-DEMO` |
| PROVIDER | GitHub |
| PURPOSE | Source, CI |
| ENVIRONMENT | ALL (code); deploy approval envs **not** fully company-modeled |
| CURRENT OWNER | Carmen GitHub user `carmen-ship-it` |
| BILLING OWNER | Personal / seat billing **VERIFY EXTERNALLY** |
| RECOVERY OWNER | Carmen |
| CURRENT PLAN | Private user remote; CI on push/PR to `main` (`.github/workflows/ci.yml`) |
| CURRENT VERIFIED COST | **UNKNOWN — VERIFY EXTERNALLY** |
| COST UNKNOWN? | YES |
| PILOT REQUIRED? | YES (source of truth) |
| PRODUCTION REQUIRED? | YES (org + protected production env desired) |
| WHAT BREAKS IF REMOVED? | No CI / no deploy source |
| TRANSFER TO COMPANY? | YES |
| PRIORITY | TRANSFER SOON (second owner before production approval is real); pilot can run on current remote if access shared |
| HOW TO TRANSFER | Org transfer/mirror; 2 owners; Environments `staging`/`production` with reviewers |
| SECRET NAMES | GitHub Environment secrets (names mirrored to Render — none committed) |
| MONITORING | Actions CI only |
| BACKUP RESPONSIBILITY | Git remote + clones |

### 6. Domain / DNS

| Field | Value |
|-------|--------|
| SERVICE | Company hostname / mail DNS |
| PROVIDER | Planned Cloudflare; current = Render subdomain |
| PURPOSE | Brand URL, TLS, SPF/DKIM later |
| ENVIRONMENT | Staging uses `onrender.com` only |
| CURRENT OWNER | **Unset / undocumented** company zone in repo |
| BILLING OWNER | UNKNOWN |
| RECOVERY OWNER | UNKNOWN |
| CURRENT PLAN | Provider hostname; Cloudflare free planned |
| CURRENT VERIFIED COST | **UNKNOWN — VERIFY EXTERNALLY** (DNS free band if Cloudflare) |
| COST UNKNOWN? | YES |
| PILOT REQUIRED? | Optional exception if written (onrender.com OK for pilot) |
| PRODUCTION REQUIRED? | YES before calling hostname “production” |
| WHAT BREAKS IF REMOVED? | Brand URL / mail auth |
| TRANSFER TO COMPANY? | YES when domain exists |
| PRIORITY | CAN WAIT for staging pilot on onrender.com; **TRANSFER SOON** before production brand cutover |
| HOW TO TRANSFER | Company registrar + Cloudflare zone; 2 admins |
| SECRET NAMES | None in app |
| MONITORING | N/A |
| BACKUP RESPONSIBILITY | Zone export at registrar |

### 7. Transactional email (OS-sent)

| Field | Value |
|-------|--------|
| SERVICE | Resend (or Postmark/SES) — **not provisioned for OS** |
| PROVIDER | None |
| PURPOSE | Quote/alert mail OS sends (distinct from Auth invite mail) |
| ENVIRONMENT | N/A |
| CURRENT OWNER | none |
| BILLING OWNER | none |
| RECOVERY OWNER | none |
| CURRENT PLAN | None |
| CURRENT VERIFIED COST | **$0 evidenced** (not provisioned) |
| COST UNKNOWN? | Future band USD 10–50 — VERIFY EXTERNALLY when opened |
| PILOT REQUIRED? | NO until OS sends quotes |
| PRODUCTION REQUIRED? | Before quote email path |
| WHAT BREAKS IF REMOVED? | N/A today; Auth invites still via Supabase |
| TRANSFER TO COMPANY? | N/A → create company when approved |
| PRIORITY | CAN WAIT |
| SECRET NAMES | Future email API key (server-only) |
| MONITORING | N/A |
| BACKUP RESPONSIBILITY | N/A |

### 8. Map provider

| Field | Value |
|-------|--------|
| SERVICE | Mapbox (optional) / mock |
| PROVIDER | None live in os-web |
| PURPOSE | Basemap tiles if approved |
| ENVIRONMENT | OS uses preparation/mock honesty |
| CURRENT OWNER | none |
| CURRENT VERIFIED COST | **$0 evidenced** (no token configured on purpose) |
| COST UNKNOWN? | Live band USD 0–50 — VERIFY EXTERNALLY if purchased |
| PILOT REQUIRED? | NO |
| PRODUCTION REQUIRED? | Only if live tiles approved |
| WHAT BREAKS IF REMOVED? | Nothing — map desk already honest without provider |
| PRIORITY | CAN WAIT |
| SECRET NAMES | Future `NEXT_PUBLIC_MAPBOX_TOKEN` (public-by-design); optional `MAPBOX_ACCESS_TOKEN` |
| MONITORING | Desk `provider-status` copy only |

### 9. OpenAI (AI pilot)

| Field | Value |
|-------|--------|
| SERVICE | OpenAI OS pilot |
| PROVIDER | Not configured |
| PURPOSE | Summarize / ask / draft only — not actions |
| ENVIRONMENT | Off (`AI_ENABLED` unset/false) |
| CURRENT OWNER | none (pilot bill may be Carmen later) |
| CURRENT VERIFIED COST | **$0 evidenced** (key absent on purpose) |
| COST UNKNOWN? | Policy hard cap **USD 20**/mo if enabled — **not** an invoice |
| PILOT REQUIRED? | NO |
| PRODUCTION REQUIRED? | Optional |
| WHAT BREAKS IF REMOVED? | Only AI pauses; core OS continues |
| PRIORITY | CAN WAIT |
| SECRET NAMES | `OPENAI_ISALWA_API_KEY`, `AI_ENABLED` |
| MONITORING | Provider spend alerts at 25/50/75/90% of policy cap (wire before enable) |

### 10. WhatsApp / Meta Cloud API

| Field | Value |
|-------|--------|
| SERVICE | WhatsApp Cloud API |
| PROVIDER | Deferred — **explicitly excluded** from ownership cost register |
| PURPOSE | Future Señal send — not revenue truth |
| CURRENT VERIFIED COST | N/A deferred |
| PILOT REQUIRED? | NO (manual conversation labels only) |
| PRODUCTION REQUIRED? | Business decision later |
| PRIORITY | CAN WAIT |
| SECRET NAMES | None for OS send path today |
| UI | Mensajes honest “canal automático… no está habilitado” |

### 11. Monitoring (Sentry / uptime)

| Field | Value |
|-------|--------|
| SERVICE | Sentry (+ planned Better Stack) |
| PROVIDER | **Not integrated** in os-web/os-api deps |
| PURPOSE | Errors / uptime |
| CURRENT VERIFIED COST | **$0 evidenced** |
| COST UNKNOWN? | Plan “Team or free” — VERIFY EXTERNALLY |
| PILOT REQUIRED? | Strongly recommended before calling observability ready |
| PRODUCTION REQUIRED? | YES for `OBSERVABILITY_READY` |
| PRIORITY | TRANSFER SOON (create company org before enabling; alerts must not be Carmen-only) |
| SECRET NAMES | Future Sentry DSN (scrub PII) |

### 12. Backups / off-host storage

| Field | Value |
|-------|--------|
| SERVICE | Render recovery + `pg_dump`; planned R2 buckets |
| PROVIDER | Render + local `~/.isalwa-secrets/staging-backups/`; R2 **not provisioned** |
| PURPOSE | Restore drills / disaster recovery |
| CURRENT VERIFIED COST | Included in Postgres plan unknown $; R2 band ~USD 0–5 planned |
| PILOT REQUIRED? | YES — logical dump path evidenced |
| PRODUCTION REQUIRED? | YES — PITR + encrypted off-host |
| PRIORITY | CRITICAL BEFORE PILOT for restore drill discipline; R2 CAN WAIT if dumps exist |
| SECRET NAMES | Planned `R2_BACKUP_*` (plan doc); external DB URL file names only |
| BACKUP RESPONSIBILITY | Carmen operator laptop today — **single-laptop risk** |

### 13. File / object storage (product documents)

| Field | Value |
|-------|--------|
| SERVICE | Product file storage |
| PROVIDER | Legacy `STORAGE_PROVIDER=mock`; OS product storage **not** live S3/R2 |
| CURRENT VERIFIED COST | **$0 evidenced** |
| PILOT REQUIRED? | NO for current pilot surfaces |
| PRIORITY | CAN WAIT |
| SECRET NAMES | Legacy registry only (`STORAGE_PROVIDER`) — OS does not boot that registry today |

### 14. Scheduled jobs

| Field | Value |
|-------|--------|
| SERVICE | Outbox worker + Attention clock |
| PROVIDER | **In-process** inside `os-api` — no Render Cron / Vercel cron |
| PURPOSE | Projections / overdue_work aging |
| CURRENT VERIFIED COST | Included in API compute |
| PILOT REQUIRED? | YES (co-hosted) |
| SECRET NAMES | `OS_OUTBOX_WORKER`, `OS_OUTBOX_POLL_MS`, `OS_OUTBOX_BATCH_SIZE`, `OS_ATTENTION_CLOCK_MS` |
| PRIORITY | N/A transfer — architecture choice |

### 15. Secret manager / operator vault

| Field | Value |
|-------|--------|
| SERVICE | Informal `~/.isalwa-secrets/` + Render/Supabase env |
| PROVIDER | Product **unconfirmed** |
| PURPOSE | DB URLs, service role, passwords |
| CURRENT OWNER | Carmen operator |
| CURRENT VERIFIED COST | UNKNOWN |
| PILOT REQUIRED? | YES (at least shared break-glass) |
| PRODUCTION REQUIRED? | YES — company vault, 2 humans |
| PRIORITY | CRITICAL BEFORE PILOT if second operator joins; else TRANSFER SOON |
| SECRET NAMES (inventory — values never in git) | See consolidated list below |

### 16. Billing accounts (meta)

| Field | Value |
|-------|--------|
| SERVICE | Company vs personal cards |
| PROVIDER | Render / Supabase / GitHub / future vendors |
| CURRENT OWNER | Carmen personal evidenced |
| CURRENT VERIFIED COST | **VERIFY EXTERNALLY** |
| PILOT REQUIRED? | Billing can remain personal for short pilot **if** recovery shared — still CRITICAL risk |
| PRODUCTION REQUIRED? | Company billing + 2 payers |
| PRIORITY | CRITICAL BEFORE PILOT for production; TRANSFER SOON for staging longevity |

### 17. Vercel (non-authoritative for current OS host)

| Field | Value |
|-------|--------|
| SERVICE | Vercel team `carmen-ship-its-projects` |
| PURPOSE | Checklist historically allowed os-web on Vercel; **current hosted OS web is Render** |
| CURRENT OWNER | Carmen personal |
| PRIORITY | CAN WAIT / do not treat as OS SoR host |
| NOTE | Architect app separate — do not conflate |

---

## Consolidated secret **names** (never values)

**os-api / staging host:**  
`OS_DATABASE_URL`, `OS_RUNTIME_PROFILE`, `OS_AUTH_MODE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OS_CORS_ORIGINS`, `PORT`, `OS_API_PORT`, `OS_API_HOST`, `OS_OUTBOX_WORKER`, `OS_PROJECTION_WORKER`, `OS_OUTBOX_POLL_MS`, `OS_OUTBOX_BATCH_SIZE`, `OS_ATTENTION_CLOCK_MS`, `OS_AUTH_INVITE_REDIRECT_URL`

**os-web:**  
`NEXT_PUBLIC_OS_AUTH_MODE`, `NEXT_PUBLIC_OS_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Optional / future:**  
`AI_ENABLED`, `OPENAI_ISALWA_API_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_ACCESS_TOKEN`, Sentry DSN, email API key, `R2_BACKUP_*`, `RENDER_API_KEY` (operator CLI)

**Operator local file names (not git):**  
`~/.isalwa-secrets/isalwa-os-staging.external-database-url`, staging dump paths, fixture/password receipt filenames referenced in os-database staging scripts

---

## Carmen personal dependencies

| Dependency | Classification | Why |
|------------|----------------|-----|
| Carmen personal Render account + billing | **CRITICAL BEFORE PILOT** | Entire staging host + Postgres + API/web live here; single payer/admin |
| Carmen personal Supabase org (`carmenaburoda@gmail.com`) | **CRITICAL BEFORE PILOT** | All hosted login/invite |
| Carmen personal email as recovery | **CRITICAL BEFORE PILOT** | Break-glass for Render/Supabase/GitHub |
| `~/.isalwa-secrets` on single laptop | **CRITICAL BEFORE PILOT** | External DB URL + dumps; laptop loss = ops blind |
| Carmen GitHub `carmen-ship-it` | **TRANSFER SOON** | Source + CI; second owner needed before real production approval |
| Carmen personal billing card(s) | **CRITICAL BEFORE PILOT** (prod) / **TRANSFER SOON** (staging longevity) | No company billing evidenced |
| Single developer / Cursor-only knowledge | **TRANSFER SOON** | Hand-off docs exist but incomplete; Agent 12 owns depth |
| Undocumented company DNS / registrar | **CAN WAIT** for onrender.com pilot; **TRANSFER SOON** before branded production |
| Vercel personal team | **CAN WAIT** | Not current OS web host |
| OpenAI / Mapbox / Resend / WhatsApp personal | **CAN WAIT** | Not provisioned for OS |
| Architect Supabase/Vercel | **Out of scope** — do not use for OS |

---

## `render.yaml` / GitHub readiness (audit notes)

| Item | Finding |
|------|---------|
| `render.yaml` | **Missing** in repo; Blueprint not source of truth (`WAVE2_PREDEPLOY_MIGRATE_OWNERSHIP.md`) |
| Deploy automation | Manual/Dashboard; os-web Auto-Deploy risk documented historically |
| GitHub CI | Build + typecheck only — **no** staging/production deploy workflow in `.github/workflows/ci.yml` |
| GitHub Environments | Desired in plan; not evidenced as company production gate |
| Production | **NOT EVIDENCED** |

---

## Gaps for permanent `OWNER_INFRASTRUCTURE_MAP.md` writer

1. Pull **VERIFY EXTERNALLY** invoice/SKU dollars from Render + Supabase + GitHub (do not reuse bands as invoices).  
2. Confirm whether Postgres is still `0.1c-256mb` and whether PITR retention meets pilot policy.  
3. Confirm second human on every critical account before pilot expansion.  
4. Decide company legal entity billing emails.  
5. Reconcile stale `ENVIRONMENT_MAP.md` topology paragraph with Wave 2 staging truth.  
6. Provider/System Health UI remains a product gap (`/sistema` shell only).

---

## Explicit non-claims

- This receipt did **not** open provider billing dashboards.  
- No secret values recorded.  
- No implementation performed.  
- Staging browser SHA cited from mission/receipts; this agent did not re-browser-verify.  
- Production readiness = topology + ownership readiness only — **not** USER-ACCEPTED.
