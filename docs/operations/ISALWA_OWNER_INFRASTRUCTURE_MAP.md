# ISALWA Owner Infrastructure Map

**Status:** Permanent owner / infrastructure / cost map  
**Date:** 2026-09-15  
**Scope:** Company OS hosting, ownership, billing, recovery, transfer priority  
**Secret rule:** Names only — never values  
**Primary sources:** `docs/operations/company-os-recon-2026-09-15/agent-11-infra-owner-cost.md`, `docs/operations/PRODUCTION_OWNERSHIP_AND_COSTS.md`  
**Supporting evidence:** Wave 2 staging receipts, `BACKUP_RESTORE_RUNBOOK.md`, `ENVIRONMENT_MAP.md` (topology partially stale — prefer Wave 2 / backup / onboarding receipts for staging host truth)

---

## Verdict

| Question | Answer |
|----------|--------|
| **PRODUCTION ENVIRONMENT** | **NOT EVIDENCED** — no `os-web-prod` / `os-api-prod` / `isalwa-os-prod` / `isalwa-os-auth-prod`; no company domain cutover |
| **Staging OS stack** | **EVIDENCED** — Render `os-web-staging` + `os-api-staging` + Postgres `isalwa-os-staging` + Supabase Auth `isalwa-os-auth-staging` |
| **`render.yaml` / Blueprint in repo** | **ABSENT** — live control plane is Render Dashboard/API |
| **Current verified monthly invoice totals** | **UNKNOWN / UNVERIFIED** — **VERIFY EXTERNALLY** (no invoice/SKU dollars in repo) |
| **Planning cost bands** | Documented ~USD **80–200**/mo staging+prod combined (ex WhatsApp / AI / maps) — **BAND ONLY**, not invoices |
| **Provider / System Health UI for owners** | **MISSING** — `/sistema` is a live shell with empty tools; not an infra console |
| **Business truth** | Managed PostgreSQL via `OS_DATABASE_URL` only. Supabase Auth = login credentials only. Architect / demo / laptop ≠ SoR |

Desired end state: every production account under the company (ISALWA legal entity), with **two** people who can pay, recover access, and rotate secrets. Current staging evidence remains personal Carmen ownership.

---

## Service table

| SERVICE | PROVIDER | PURPOSE | ENVIRONMENT | CURRENT OWNER | BILLING OWNER | RECOVERY OWNER | CURRENT PLAN | CURRENT VERIFIED COST | COST UNKNOWN? | PILOT REQUIRED? | PRODUCTION REQUIRED? | WHAT BREAKS IF REMOVED? | TRANSFER TO COMPANY? | PRIORITY | HOW TO TRANSFER | SECRET NAMES | MONITORING | BACKUP RESPONSIBILITY |
|---------|----------|---------|-------------|---------------|---------------|----------------|--------------|-----------------------|---------------|-----------------|----------------------|-------------------------|----------------------|----------|-----------------|--------------|------------|------------------------|
| `os-web-staging` | Render | Employee web shell (Next.js OS) | **STAGING** (pilot host). Production as `os-web-prod` **NOT EVIDENCED** | Carmen personal Render | Carmen personal (desired: company) | Carmen only evidenced | SKU **unconfirmed** as invoice | **UNKNOWN — VERIFY EXTERNALLY** | YES | YES | YES (prod service not evidenced) | No hosted employee UI | YES | **CRITICAL BEFORE PILOT** | Company Render team; transfer or recreate; 2 admins | `NEXT_PUBLIC_OS_AUTH_MODE`, `NEXT_PUBLIC_OS_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public-by-design) | None productized | N/A (stateless); rebuild from git |
| `os-api-staging` | Render | Commands/queries; co-hosted outbox worker + attention clock | **STAGING**. Production as `os-api-prod` **NOT EVIDENCED** | Carmen personal Render | Carmen personal | Carmen | SKU **unconfirmed** | **UNKNOWN — VERIFY EXTERNALLY** (bundled in staging compute **BAND ONLY** ~USD 14–50 with web) | YES | YES | YES (prod not evidenced) | API, auth resolution, worker, attention clock | YES | **CRITICAL BEFORE PILOT** | Move with Render team; rotate service role after | `OS_RUNTIME_PROFILE`, `OS_AUTH_MODE`, `OS_DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OS_CORS_ORIGINS`, `PORT`, `OS_OUTBOX_WORKER`, `OS_OUTBOX_POLL_MS`, `OS_OUTBOX_BATCH_SIZE`, `OS_ATTENTION_CLOCK_MS`, `OS_AUTH_INVITE_REDIRECT_URL` | `/v1/health`, `/v1/health/ready` only | N/A app; DB separate |
| `isalwa-os-staging` (DB `isalwa_os_staging`) | Render Postgres | **Business truth** — parties, quotes, orders, audit, outbox | **STAGING**. Production as `isalwa-os-prod` + PITR **NOT EVIDENCED** | Carmen personal Render | Carmen personal | Carmen + operator laptop dumps | Class **`0.1c-256mb`**, PG 16, virginia, disk 1 GB, HA off — **not** an invoice line | **UNKNOWN — VERIFY EXTERNALLY** (staging **BAND ONLY** ~USD 7–20) | YES | YES | YES (prod not evidenced) | All OS business data / API readiness | YES | **CRITICAL BEFORE PILOT** | Company billing same instance family; do **not** use Supabase Auth DB as SoR | `OS_DATABASE_URL`; operator files under `~/.isalwa-secrets/isalwa-os-staging.*` (names only) | Provider recovery API historically `recoveryStatus=AVAILABLE` (2026-09-13) | Provider recovery/export + operator `pg_dump`; R2 off-host **planned not provisioned** |
| `isalwa-os-auth-staging` | Supabase Auth **only** (not business DB) | Login, invite, password reset, sessions | **STAGING**. Production as `isalwa-os-auth-prod` **NOT EVIDENCED** | Personal org `carmenaburoda@gmail.com` | Carmen personal | Carmen | Free/Pro **unconfirmed as invoice**; historically `ACTIVE_HEALTHY` | **UNKNOWN — VERIFY EXTERNALLY** (**BAND ONLY** USD 0–25) | YES | YES | YES (prod Auth not evidenced) | Hosted login / invite mail | YES | **CRITICAL BEFORE PILOT** | Company Supabase org; re-invite users; never copy Auth Postgres into OS | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Auth DB password (store only) | Provider dashboard | Auth credentials only — not OS SoR |
| `carmen-ship-it/ISALWA-DEMO` | GitHub | Source, CI | ALL (code); company deploy-approval envs **not** fully modeled | Carmen GitHub user `carmen-ship-it` | Personal / seat billing **VERIFY EXTERNALLY** | Carmen | Private user remote; CI on push/PR to `main` | **UNKNOWN — VERIFY EXTERNALLY** | YES | YES (source of truth) | YES (org + protected production env desired) | No CI / no deploy source | YES | **TRANSFER SOON** (second owner before production approval is real; pilot can run if access shared) | Org transfer/mirror; 2 owners; Environments `staging`/`production` with reviewers | GitHub Environment secrets (names mirrored to Render — none committed) | Actions CI only | Git remote + clones |
| Company hostname / mail DNS | Planned Cloudflare; current = Render subdomain | Brand URL, TLS, SPF/DKIM later | Staging = `*.onrender.com` only. Production hostname **NOT EVIDENCED** | **Unset / undocumented** company zone in repo | UNKNOWN | UNKNOWN | Provider hostname; Cloudflare free planned (**BAND ONLY**) | **UNKNOWN — VERIFY EXTERNALLY** | YES | Optional exception if written (onrender.com OK for pilot) | YES before calling hostname “production” | Brand URL / mail auth | YES when domain exists | **CAN WAIT** for onrender.com pilot; **TRANSFER SOON** before branded production | Company registrar + Cloudflare zone; 2 admins | None in app | N/A | Zone export at registrar |
| Transactional email (Resend / Postmark / SES) | **None** — not provisioned for OS | Quote/alert mail OS sends (≠ Auth invite mail) | N/A | none | none | none | None | **$0 evidenced** (not provisioned). Future **BAND ONLY** USD 10–50 — VERIFY EXTERNALLY when opened | Future yes | NO until OS sends quotes | Before quote email path | N/A today; Auth invites still via Supabase | N/A → create company when approved | **CAN WAIT** | Open company account when send is approved; SPF/DKIM on company domain | Future email API key (server-only) | N/A | N/A |
| Mapbox (optional) / mock | None live in os-web | Basemap tiles if approved | OS uses preparation/mock honesty | none | none | none | No live token | **$0 evidenced**. Live **BAND ONLY** USD 0–50 — VERIFY EXTERNALLY if purchased | If live: YES | NO | Only if live tiles approved | Nothing — map desk already honest without provider | Only if used | **CAN WAIT** | Company account only if live tiles approved | Future `NEXT_PUBLIC_MAPBOX_TOKEN` (public-by-design); optional `MAPBOX_ACCESS_TOKEN` | Desk `provider-status` copy only | N/A |
| OpenAI OS pilot | Not configured | Summarize / ask / draft only — not actions | Off (`AI_ENABLED` unset/false) | none (pilot bill may be Carmen later) | none / Carmen pilot possible | none | Off | **$0 evidenced**. Policy hard cap **USD 20**/mo if enabled — **not** an invoice | Cap ≠ invoice | NO | Optional | Only AI pauses; core OS continues | Company project when approved | **CAN WAIT** | Company OpenAI project; set cap/alerts before `AI_ENABLED=true` | `OPENAI_ISALWA_API_KEY`, `AI_ENABLED` | Provider spend alerts at 25/50/75/90% of policy cap (wire before enable) | N/A |
| WhatsApp Cloud API | Deferred — **excluded** from ownership cost register | Future Señal send — not revenue truth | Deferred | none | N/A deferred | none | Deferred | N/A deferred | N/A | NO (manual conversation labels only) | Business decision later | N/A (send path not live) | Later if approved | **CAN WAIT** | Company Meta app when business decides | None for OS send path today | Mensajes honest “canal automático… no está habilitado” | N/A |
| Sentry (+ planned Better Stack) | **Not integrated** in os-web/os-api deps | Errors / uptime | Not live | none | none | none | None in repo (“Team or free” planned) | **$0 evidenced**. Plan **VERIFY EXTERNALLY** | YES when opened | Strongly recommended before calling observability ready | YES for `OBSERVABILITY_READY` | No productized error/uptime signal | YES — create company org before enabling | **TRANSFER SOON** (alerts must not be Carmen-only) | Company Sentry org; projects `isalwa-os-web` / `isalwa-os-api`; 2 admins | Future Sentry DSN (scrub PII) | Missing in product | N/A |
| Backups / off-host storage | Render recovery + `pg_dump`; planned R2 | Restore drills / disaster recovery | Staging dumps evidenced; R2 **not provisioned**; prod PITR **NOT EVIDENCED** | Carmen operator laptop + Render | Carmen (via Postgres plan) | Carmen | Included in Postgres plan unknown $; R2 **BAND ONLY** ~USD 0–5 planned | Postgres $ **VERIFY EXTERNALLY**; R2 not billed | YES for billed Postgres; R2 N/A | YES — logical dump path evidenced | YES — PITR + encrypted off-host | Blind restore / single-laptop loss | YES (company vault + off-host) | **CRITICAL BEFORE PILOT** for restore drill discipline; R2 **CAN WAIT** if dumps exist | Company vault + shared break-glass; provision R2 when approved | Planned `R2_BACKUP_*`; external DB URL file names only | Provider recovery status | Carmen operator laptop today — **single-laptop risk** |
| Product file storage | Legacy `STORAGE_PROVIDER=mock`; OS product storage **not** live S3/R2 | Product documents | Not live for OS | none | none | none | Mock | **$0 evidenced** | N/A | NO for current pilot surfaces | When product docs require object store | Nothing for current pilot surfaces | When provisioned | **CAN WAIT** | Company object store when approved | Legacy `STORAGE_PROVIDER` (OS does not boot that registry today) | N/A | N/A |
| Outbox worker + Attention clock | **In-process** inside `os-api` — no Render Cron / Vercel cron | Projections / overdue_work aging | Co-hosted with API | Same as `os-api-staging` | Included in API compute | Carmen | Co-hosted architecture | Included in API compute (**VERIFY EXTERNALLY** for host SKU) | Via API host | YES (co-hosted) | YES (same pattern) | Stale projections / overdue aging | N/A — architecture choice | N/A transfer | Keep worker inside `os-api`; do not add second poller until confirmed | `OS_OUTBOX_WORKER`, `OS_OUTBOX_POLL_MS`, `OS_OUTBOX_BATCH_SIZE`, `OS_ATTENTION_CLOCK_MS` | Via API health only | N/A |
| Informal operator vault | `~/.isalwa-secrets/` + Render/Supabase env | DB URLs, service role, passwords | Operator + host | Carmen operator | Product **unconfirmed** — **VERIFY EXTERNALLY** | Carmen | Informal local + host env | UNKNOWN — **VERIFY EXTERNALLY** | YES | YES (at least shared break-glass) | YES — company vault, 2 humans | Ops blind if laptop lost; cannot rotate/recover | YES | **CRITICAL BEFORE PILOT** if second operator joins; else **TRANSFER SOON** | Choose company vault; move secrets; rotate Carmen-only secrets | See consolidated secret names below | N/A | Operator files + provider env; values never in git |
| Company vs personal billing accounts (meta) | Render / Supabase / GitHub / future vendors | Pay + recover access | Staging personal evidenced; company **NOT EVIDENCED** | Carmen personal evidenced | Carmen personal | Carmen | Personal cards | **VERIFY EXTERNALLY** | YES | Billing may stay personal for short pilot **if** recovery shared — still CRITICAL risk | Company billing + 2 payers | Account freeze / single-payer lockout | YES | **CRITICAL BEFORE PILOT** for production; **TRANSFER SOON** for staging longevity | Company legal-entity billing emails; 2 payers | N/A (account access, not app secrets) | Provider billing dashboards | N/A |
| Vercel team `carmen-ship-its-projects` | Vercel | Historical checklist allowed os-web on Vercel; **current hosted OS web is Render** | Non-authoritative for OS host | Carmen personal | Carmen personal | Carmen | Personal team | **VERIFY EXTERNALLY** if still billed | YES if billed | NO for current OS host | NO for OS SoR host | Nothing for current OS if unused | Only if still used elsewhere | **CAN WAIT** / do not treat as OS SoR host | Do not conflate with Architect app | N/A for current OS Render host | N/A | N/A |

**Staging evidence anchors (not production):** web `https://os-web-staging.onrender.com` (service id `srv-dajddb67bikc73bl42q0`); API `https://os-api-staging.onrender.com` (`srv-dajd64gae00c739gpk20`); Postgres id `dpg-dajd3kh5efls738falcg-a`; Auth ref `qbpxuywtoycjpitxoblo` (`sa-east-1`). Do **not** use Architect Supabase `efolotcrdaqdixfiqbek`.

---

## Cost truth

| Bucket | Status | Notes |
|--------|--------|-------|
| **CURRENT VERIFIED MONTHLY COST** | **NONE in repo** | No invoice numbers, billed USD, or confirmed SKU prices found. Mark **VERIFY EXTERNALLY** in Render / Supabase / GitHub / registrar dashboards. |
| **UNKNOWN / UNVERIFIED COST** | **YES** | Render compute SKUs, exact Postgres billed amount, Supabase Auth plan (Free vs Pro), GitHub seats, DNS/registrar, secret-manager product — all unconfirmed as invoices. |
| **PILOT RECOMMENDED COST** | ~USD **80–200**/mo staging+prod combined excluding WhatsApp / AI / maps | **BAND ONLY** — from `PRODUCTION_OWNERSHIP_AND_COSTS.md` / plan §15; **not** an invoice |
| **PRODUCTION BASELINE COST** | Compute ~USD **25–50** + Postgres+PITR ~USD **20–50** + Auth ~USD **0–25** (+ optional Sentry / R2 / DNS) | **BAND ONLY** — VERIFY EXTERNALLY before budgeting |
| **VARIABLE USAGE COSTS** | AI policy hard cap **USD 20**/mo if enabled; maps Architect band USD **0–50** if live; WhatsApp deferred / not in register; email future band USD **10–50** | Caps and bands ≠ invoices |

Observed non-dollar plan class (still **not** a monthly invoice): Render Postgres `isalwa-os-staging` plan string **`0.1c-256mb`**, disk 1 GB, HA disabled (`BACKUP_RESTORE_RUNBOOK.md`).

Do **not** invent vendor invoice dollars. Planning numbers above are labeled **BAND ONLY**.

---

## Carmen personal dependencies

| Dependency | Classification | Why |
|------------|----------------|-----|
| Carmen personal Render account + billing | **CRITICAL BEFORE PILOT** | Entire staging host + Postgres + API/web live here; single payer/admin |
| Carmen personal Supabase org (`carmenaburoda@gmail.com`) | **CRITICAL BEFORE PILOT** | All hosted login/invite |
| Carmen personal email as recovery | **CRITICAL BEFORE PILOT** | Break-glass for Render / Supabase / GitHub |
| `~/.isalwa-secrets` on single laptop | **CRITICAL BEFORE PILOT** | External DB URL + dumps; laptop loss = ops blind |
| Carmen personal billing card(s) | **CRITICAL BEFORE PILOT** (production) / **TRANSFER SOON** (staging longevity) | No company billing evidenced |
| Carmen GitHub `carmen-ship-it` | **TRANSFER SOON** | Source + CI; second owner needed before real production approval |
| Single developer / Cursor-only knowledge | **TRANSFER SOON** | Hand-off docs exist but incomplete |
| Undocumented company DNS / registrar | **CAN WAIT** for onrender.com pilot; **TRANSFER SOON** before branded production |
| Vercel personal team | **CAN WAIT** | Not current OS web host |
| OpenAI / Mapbox / Resend / WhatsApp personal | **CAN WAIT** | Not provisioned for OS |
| Architect Supabase / Vercel | **Out of scope** — do not use for OS |

---

## Monitoring / Backup-Restore exact state

### Monitoring

| Surface | Exact state |
|---------|-------------|
| Owner Provider / System Health UI | **MISSING** — `/sistema` is LIVE SHELL / EMPTY TOOLS; does not open integration health |
| Administración / Capacidades | People + org capability read — **not** provider uptime/billing |
| API health | `GET /v1/health`, `/v1/health/ready` — ops/scripts only, not owner UI |
| Sentry / uptime product | **Not integrated** in `apps/os-web` / `os-api` deps; `OBSERVABILITY_READY` still open |
| GitHub | Actions CI (build/typecheck) only — **no** staging/production deploy workflow evidenced in `.github/workflows/ci.yml` |
| Map honesty | Desk-local preparation copy — not System Health |

### Backup / restore

| Item | Exact state |
|------|-------------|
| Staging Postgres | Provider recovery/export + operator `pg_dump` path evidenced (`BACKUP_RESTORE_RUNBOOK.md`, `scripts/verify-staging-hosted-backup-restore.sh`) |
| Provider recovery | Historically `recoveryStatus=AVAILABLE` (2026-09-13) — re-verify externally |
| Off-host R2 | **Planned, not provisioned** |
| Production PITR | **NOT EVIDENCED** (prod Postgres not evidenced) |
| Operator dumps location | `~/.isalwa-secrets/staging-backups/` (and related) on Carmen laptop — **single-laptop risk** |
| Auth backup | Credentials only — Auth DB is **not** OS system of record |
| App services | Stateless — rebuild from git; no app-data backup needed |

---

## Transfer checklist

### Before pilot (CRITICAL)

- [ ] Second admin on Carmen personal Render **or** company Render team with transfer/recreate of `os-web-staging`, `os-api-staging`, `isalwa-os-staging`
- [ ] Second owner on Supabase Auth staging org/project (or company org + re-invite users)
- [ ] Shared break-glass for recovery email / operator access (not Carmen-only)
- [ ] Shared access to `OS_DATABASE_URL` / external DB URL (vault or second human) — rotate after sharing
- [ ] Staging restore drill discipline confirmed (logical dump path works; document who can run it)
- [ ] Written exception if pilot stays on `*.onrender.com` without company DNS
- [ ] Confirm Auto-Deploy posture: do not leave production-like hosts on silent auto-deploy without CI gate
- [ ] Billing may remain personal for a **short** pilot only if recovery is shared — treat single-payer as CRITICAL risk

### Soon (TRANSFER SOON — before production / longevity)

- [ ] Company legal-entity billing emails and **two** payers on Render, Supabase, GitHub
- [ ] Transfer or mirror GitHub repo to company org; add second owner; Environments `staging` / `production` with production reviewers
- [ ] Company secret manager; move secrets; rotate anything only Carmen can see
- [ ] Create company Sentry org **before** enabling SDKs; alerts not Carmen-only
- [ ] Company registrar + Cloudflare zone before branded production hostname
- [ ] Provision production services only after ownership transfer: `os-web-prod`, `os-api-prod`, `isalwa-os-prod` (PITR), `isalwa-os-auth-prod`
- [ ] VERIFY EXTERNALLY invoice/SKU dollars (do not treat planning bands as invoices)
- [ ] Confirm Postgres plan class still `0.1c-256mb` and whether PITR retention meets pilot/production policy
- [ ] Reconcile stale `ENVIRONMENT_MAP.md` topology paragraph with Wave 2 staging truth

### Can wait

- [ ] Transactional email vendor (until OS sends quotes)
- [ ] Mapbox / live tiles
- [ ] OpenAI (`AI_ENABLED`) — if enabled later: company project + USD 20 hard cap alerts first
- [ ] WhatsApp / Meta Cloud API
- [ ] R2 off-host buckets (if logical dumps + provider recovery remain adequate for pilot)
- [ ] Product object storage beyond mock
- [ ] Vercel as OS host (do not treat as SoR)
- [ ] Provider/System Health product UI beyond `/sistema` shell (product gap, not a transfer blocker for pilot host)

---

## Consolidated secret names (never values)

**os-api / staging host:**  
`OS_DATABASE_URL`, `OS_RUNTIME_PROFILE`, `OS_AUTH_MODE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OS_CORS_ORIGINS`, `PORT`, `OS_API_PORT`, `OS_API_HOST`, `OS_OUTBOX_WORKER`, `OS_PROJECTION_WORKER`, `OS_OUTBOX_POLL_MS`, `OS_OUTBOX_BATCH_SIZE`, `OS_ATTENTION_CLOCK_MS`, `OS_AUTH_INVITE_REDIRECT_URL`

**os-web:**  
`NEXT_PUBLIC_OS_AUTH_MODE`, `NEXT_PUBLIC_OS_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Optional / future:**  
`AI_ENABLED`, `OPENAI_ISALWA_API_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_ACCESS_TOKEN`, Sentry DSN, email API key, `R2_BACKUP_*`, `RENDER_API_KEY` (operator CLI)

**Operator local file names (not git):**  
`~/.isalwa-secrets/isalwa-os-staging.external-database-url`, staging dump paths, fixture/password receipt filenames referenced in os-database staging scripts

---

## Explicit non-claims

- No provider billing dashboards were opened to produce this map; costs unmarked as invoices are **VERIFY EXTERNALLY**.
- No secret **values** are recorded.
- **PRODUCTION ENVIRONMENT: NOT EVIDENCED.** Staging is evidenced; do not collapse staging proof into production.
- Planning figures are **BAND ONLY**, not vendor invoices.
- WhatsApp is deferred and excluded from the ownership cost register.
- This map documents ownership and topology readiness — it is **not** USER-ACCEPTED production readiness.
