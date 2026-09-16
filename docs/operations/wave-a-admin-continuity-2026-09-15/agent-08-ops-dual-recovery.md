# Wave A Agent 8 — Ops dual recovery / TRANSFER + BREAK-GLASS

**Agent:** 8 ONLY  
**Date:** 2026-09-15  
**Mode:** DOCS ONLY — no product code, no account mutations, no secret values  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Authority:** Wave A admin continuity — operational ownership / recovery / handoff P0  
**Sources:** `docs/operations/ISALWA_OWNER_INFRASTRUCTURE_MAP.md`, `docs/operations/PRODUCTION_OWNERSHIP_AND_COSTS.md`, `docs/operations/company-os-recon-2026-09-15/agent-11-infra-owner-cost.md`  
**Permanent map updated:** `docs/operations/ISALWA_OWNER_INFRASTRUCTURE_MAP.md` § Transfer / break-glass checklist  

---

## Verdict

| Question | Answer |
|----------|--------|
| **Dual recovery today** | **NOT EVIDENCED** — Carmen is sole evidenced admin/payer/recovery path for Render staging, Supabase Auth staging, operator vault, and billing |
| **Accounts transferred to company** | **NO — do not claim transferred** |
| **External ownership mutated this lane** | **NO** — checklist only; transfers require Carmen approval + company legal-entity accounts |
| **PRODUCTION ENVIRONMENT** | **NOT EVIDENCED** — staging ≠ production |
| **Secret values recorded** | **NONE** — names and locations only |

**Desired end state (unchanged):** every production account under the ISALWA legal entity, with **two** people who can pay, recover access, and rotate secrets.

---

## Carmen sole-person dependency (evidenced)

| Surface | Sole-person risk | Why it matters |
|---------|------------------|----------------|
| Render (`os-web-staging`, `os-api-staging`, `isalwa-os-staging`) | Carmen personal account | Host freeze / lost login = no employee UI, API, or business DB |
| Supabase Auth (`isalwa-os-auth-staging`, org email `carmenaburoda@gmail.com`) | Carmen personal org | Lost login = no hosted invite/reset/session admin |
| Billing cards | Carmen personal | Single-payer lockout / unpaid suspend |
| Recovery email | Carmen personal | Break-glass for Render / Supabase / GitHub |
| Operator vault `~/.isalwa-secrets/` | Single laptop | Laptop loss = ops blind for DB URL / dumps / rotate |
| GitHub `carmen-ship-it/ISALWA-DEMO` | Carmen user remote | Source + CI; second owner not evidenced |

Do **not** treat Architect / Vercel / demo / laptop Postgres as OS system of record.

---

## Classification rules (this lane)

| Label | Meaning |
|-------|---------|
| **BLOCKS THIN PILOT** | First thin pilot on staging must not proceed without this dual-recovery step (or an **owner-written exception** naming the accepted risk). |
| **BLOCKS PRODUCTION CLAIM** | Must be true before anyone may call the stack “production,” claim company-owned hosting, or treat ownership as transferred. |
| **TRANSFER SOON** | Does not stop a written thin-pilot exception, but must complete before longevity / branded cutover / real production approval. |

Planning cost bands (~USD 80–200/mo) remain **BAND ONLY** — **VERIFY EXTERNALLY**. No invoices invented.

---

## EXECUTABLE TRANSFER / BREAK-GLASS CHECKLIST

Status for every row below: **NOT DONE / NOT TRANSFERRED** unless Carmen later marks evidence outside this doc.

### A. BLOCKS THIN PILOT

Complete these **before** expanding beyond a solo-operator thin pilot, **or** record a dated owner exception that accepts Carmen-only recovery for a named window.

#### A1. Second admin on Render (staging stack)

| Field | Exact |
|-------|--------|
| **What requires second owner/admin** | Dashboard admin (or Owner) on the same Render account/team that hosts `os-web-staging`, `os-api-staging`, `isalwa-os-staging` |
| **Company email/account needed** | Preferred: company Render **team** + company billing email. Interim: invite second human to Carmen personal team with admin — still personal ownership (not company transfer) |
| **Carmen must click/do** | 1) Open Render Dashboard → Account/Team **Settings** → **Team** (or Members). 2) **Invite** second trusted human with **Admin** (or equivalent that can manage services, env vars, billing alerts). 3) Confirm invite accepted. 4) Do **not** share passwords; use invite + their own login. 5) Optionally create company team later and move/recreate services — **separate** from this interim step |
| **Future owner must verify** | Can open Dashboard; see `os-web-staging` / `os-api-staging` / Postgres `isalwa-os-staging`; can open Environment (names only); receives billing/outage mail if configured |
| **Secrets → company vault** | After dual admin: ensure `OS_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and any `RENDER_API_KEY` copies live in vault for **both** humans — **rotate** anything previously Carmen-laptop-only |
| **Cannot complete until company accounts exist** | Full **company** ownership of Render billing/team. Interim second admin **can** proceed on personal team |
| **Transfer status** | **NOT TRANSFERRED** |

#### A2. Second owner on Supabase Auth staging

| Field | Exact |
|-------|--------|
| **What requires second owner/admin** | Org/project Owner or Admin on Auth project `isalwa-os-auth-staging` (ref `qbpxuywtoycjpitxoblo`) |
| **Company email/account needed** | Preferred: company Supabase org. Interim: invite second human into current personal org |
| **Carmen must click/do** | 1) Supabase Dashboard → Organization → **Team**. 2) Invite second human as **Owner/Admin**. 3) Confirm they can open project `isalwa-os-auth-staging`. 4) Confirm Auth URL/redirect allowlist still matches `https://os-web-staging.onrender.com` (and API CORS origin) — no secret paste into chat |
| **Future owner must verify** | Can view Auth users; can regenerate/rotate service role **only** via vault procedure; never paste service role into browser or tickets |
| **Secrets → company vault** | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public-by-design), `SUPABASE_SERVICE_ROLE_KEY` (server-only), Auth DB password (store only) |
| **Cannot complete until company accounts exist** | Company org transfer / new company Auth projects + user re-invite. Interim dual admin **can** proceed |
| **Transfer status** | **NOT TRANSFERRED** |

#### A3. Shared break-glass (recovery email + operator path)

| Field | Exact |
|-------|--------|
| **What requires second owner/admin** | A second human who can recover Render + Supabase + GitHub if Carmen is unavailable (not “knows Carmen’s password”) |
| **Company email/account needed** | Shared company recovery mailbox **or** documented personal recovery contacts for **two** named humans (owner decision) |
| **Carmen must click/do** | 1) Name Human B in writing. 2) Add Human B as recovery/admin on Render + Supabase (+ GitHub if they will deploy). 3) Confirm both can receive provider reset mail. 4) Store break-glass procedure location (vault note) — **no secret values in git** |
| **Future owner must verify** | Can initiate password reset for their own login; knows who the other break-glass human is; knows **not** to use Auth DB as OS SoR |
| **Secrets → company vault** | Recovery procedure + account inventory (this checklist); not password sharing |
| **Cannot complete until company accounts exist** | Company recovery mailbox. Interim dual personal admins **can** satisfy thin-pilot dual recovery |
| **Transfer status** | **NOT TRANSFERRED** |

#### A4. Shared access to business DB URL (vault or second human)

| Field | Exact |
|-------|--------|
| **What requires second owner/admin** | Second human can retrieve external/internal `OS_DATABASE_URL` without Carmen’s laptop |
| **Company email/account needed** | Company password/secret manager (desired). Interim: vault shared to Human B |
| **Carmen must click/do** | 1) Choose vault product (1Password Business / Bitwarden org / equivalent — **VERIFY EXTERNALLY**). 2) Create vault item names matching ops inventory (values stay in vault). 3) Grant Human B access. 4) **Rotate** DB credentials after first share if URL was ever only on one laptop. 5) Confirm Human B can run restore-drill steps from `BACKUP_RESTORE_RUNBOOK.md` (owner-approved) |
| **Future owner must verify** | Vault item exists for external DB URL file role (`isalwa-os-staging.external-database-url` naming); can open Render Postgres connection info; never commit URL to git |
| **Secrets → company vault** | `OS_DATABASE_URL`; operator file role under `~/.isalwa-secrets/` (migrate off single laptop) |
| **Cannot complete until company accounts exist** | Formal company vault billing. Interim shared vault between two humans **can** unblock thin pilot |
| **Transfer status** | **NOT TRANSFERRED** |

#### A5. Staging restore-drill discipline (who can run it)

| Field | Exact |
|-------|--------|
| **What requires second owner/admin** | Named operator who is not Carmen-only for `pg_dump` / provider recovery path |
| **Company email/account needed** | Same as A1 + A4 |
| **Carmen must click/do** | 1) Walk Human B through `docs/operations/BACKUP_RESTORE_RUNBOOK.md` on **staging only**. 2) Confirm provider recovery historically `AVAILABLE` is re-checked in Dashboard (no dollar inventing). 3) Document who may approve a restore (owner + eng) |
| **Future owner must verify** | Knows restore is owner-approved eng action; Auth DB is **not** SoR; R2 off-host still **not provisioned** (optional for thin pilot if dumps + provider recovery exist) |
| **Secrets → company vault** | Dump encryption passphrase if any; external DB URL |
| **Cannot complete until company accounts exist** | Off-host R2 company buckets (CAN WAIT if dumps exist). Dual-human drill **can** proceed without R2 |
| **Transfer status** | **NOT TRANSFERRED** |

#### A6. Written onrender.com pilot exception (hostname)

| Field | Exact |
|-------|--------|
| **What requires second owner/admin** | Owner sign-off that thin pilot may use `*.onrender.com` without company DNS |
| **Company email/account needed** | None for exception text; company DNS later |
| **Carmen must click/do** | Record dated exception (owners): pilot host = `https://os-web-staging.onrender.com`; brand production hostname **not** claimed |
| **Future owner must verify** | Staging URL is practice host; production claim still **NOT EVIDENCED** |
| **Secrets → company vault** | N/A |
| **Cannot complete until company accounts exist** | N/A for exception; branded production **does** need company DNS |
| **Transfer status** | Exception may be written without transfer; domain **NOT TRANSFERRED** |

---

### B. BLOCKS PRODUCTION CLAIM

None of the following may be marked complete until evidenced. Staging proof does **not** satisfy these.

| # | Item | Carmen must click/do (when approved) | Future owner verifies | Company account required? | Secrets → vault | Status |
|---|------|--------------------------------------|----------------------|---------------------------|-----------------|--------|
| B1 | Company legal-entity billing emails + **two** payers on Render, Supabase, GitHub | Create/attach company billing; add second payer; stop sole personal card as production payer | Invoices go to company; two humans can update payment method | **YES** | N/A (account access) | **NOT DONE** |
| B2 | Company Render team owns prod services | Provision only after ownership transfer: `os-web-prod`, `os-api-prod`, `isalwa-os-prod` (PITR), under company team; Auto-Deploy **off** for production | Service names exist; second admin; no silent auto-deploy | **YES** | Prod env secret **names** mirrored; rotate after move | **NOT EVIDENCED / NOT TRANSFERRED** |
| B3 | Company Supabase Auth prod | Create `isalwa-os-auth-prod` in company org; re-invite users; do **not** copy Auth Postgres into OS | Login works on prod web origin; Architect project unused | **YES** | Prod `SUPABASE_*` + service role | **NOT EVIDENCED / NOT TRANSFERRED** |
| B4 | GitHub company org + production Environment reviewers | Transfer/mirror `ISALWA-DEMO`; 2 owners; Environments `staging`/`production` with reviewers on production | Protected `main`; production deploy needs approval | **YES** | GitHub Environment secret names only | **NOT TRANSFERRED** |
| B5 | Company registrar + DNS before branded hostname | Register/transfer zone; Cloudflare (plan: free DNS); 2 admins; TLS to web | `app.<company-domain>` (or chosen host) resolves; not Carmen-only registrar | **YES** | N/A in app | **NOT EVIDENCED** |
| B6 | Company secret manager + two humans | Move all host secrets; revoke laptop-only copies; rotate Carmen-only secrets | Human B can rotate without Carmen laptop | **YES** | Full inventory in map § Consolidated secret names | **NOT TRANSFERRED** |
| B7 | Production Postgres PITR + encrypted off-host | Enable PITR on prod instance; provision company off-host (planned R2) when approved | Restore drill on isolated instance | **YES** | `R2_BACKUP_*` when provisioned; prod `OS_DATABASE_URL` | **NOT EVIDENCED** |
| B8 | Observability alerts ≠ Carmen-only | Create **company** Sentry org **before** enabling SDKs; alert destination = two ops humans | Alert test reaches both | **YES** before enable | Future Sentry DSN (scrub PII) | **NOT INTEGRATED / NOT TRANSFERRED** |
| B9 | Dual recovery proven on production accounts | Repeat A1–A5 against **prod** team/org (not staging) | Two humans deploy, restore, invite/suspend without Carmen | **YES** | Prod vault | **NOT DONE** |

**Explicit:** Do **not** create production infrastructure in Wave A. Do **not** call staging “production.”

---

### C. TRANSFER SOON (longevity / before real production approval)

| # | Item | Why soon | Carmen must click/do | Blocks thin pilot? | Status |
|---|------|----------|----------------------|--------------------|--------|
| C1 | Second GitHub owner on `carmen-ship-it/ISALWA-DEMO` (interim) or org transfer | Source/CI continuity; production approval not real with one owner | Settings → Collaborators/Owners → invite; later org transfer/mirror | No if access shared for pilot | **NOT TRANSFERRED** |
| C2 | Company billing on staging longevity (even if personal OK for short pilot) | Single-payer risk compounds | Attach company payment method when legal entity ready | No **if** A3 dual recovery shared | **NOT TRANSFERRED** |
| C3 | Company vault productization (beyond interim share) | Laptop loss + seat churn | Choose vendor; migrate `~/.isalwa-secrets` roles | No **if** A4 interim share done | **NOT TRANSFERRED** |
| C4 | Company Sentry org (create before SDK enable) | Alerts must not be Carmen-only | Create org/projects `isalwa-os-web` / `isalwa-os-api`; 2 admins | No until observability claimed | **NOT DONE** |
| C5 | Company DNS / Cloudflare before brand cutover | Required for production hostname claim | Registrar + zone; 2 admins | No for onrender.com pilot with A6 exception | **NOT EVIDENCED** |
| C6 | VERIFY EXTERNALLY invoice/SKU dollars | Bands ≠ invoices | Open Render/Supabase/GitHub/registrar billing; record outside git if needed | No | **UNVERIFIED** |
| C7 | Confirm Postgres plan class / PITR policy | Staging class documented `0.1c-256mb` historically — re-check | Dashboard plan + backup retention vs policy | No for thin pilot if restore path works | **VERIFY EXTERNALLY** |
| C8 | Reconcile stale `ENVIRONMENT_MAP.md` topology vs Wave 2 staging truth | Avoid false “not provisioned” reads | Doc edit when scheduled | No | Open |
| C9 | Optional vendors under company **before** enable | Email / Mapbox / OpenAI / WhatsApp / R2 | Open company accounts only when approved; AI: USD 20 hard-cap alerts before `AI_ENABLED=true` | No | **NOT PROVISIONED** |

---

## What cannot be completed until company-owned accounts exist

1. True company ownership of Render / Supabase / GitHub / registrar (personal second-admin is **interim dual recovery**, not transfer).  
2. Production services (`os-*-prod`, `isalwa-os-auth-prod`) under company billing.  
3. Branded production hostname and mail DNS (SPF/DKIM when transactional email starts).  
4. Company vault as system of record for all secrets (interim shared vault ≠ company org vault).  
5. Company Sentry / email / maps / OpenAI / Meta — create under company **before** enabling.  
6. Any claim that “accounts were transferred” — **forbidden until evidenced**.

---

## Secret names for vault (never values)

Same inventory as permanent map — copy for break-glass packing list:

**os-api / host:** `OS_DATABASE_URL`, `OS_RUNTIME_PROFILE`, `OS_AUTH_MODE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OS_CORS_ORIGINS`, `PORT`, `OS_OUTBOX_WORKER`, `OS_OUTBOX_POLL_MS`, `OS_OUTBOX_BATCH_SIZE`, `OS_ATTENTION_CLOCK_MS`, `OS_AUTH_INVITE_REDIRECT_URL`

**os-web:** `NEXT_PUBLIC_OS_AUTH_MODE`, `NEXT_PUBLIC_OS_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Operator / future:** `RENDER_API_KEY`, `OPENAI_ISALWA_API_KEY`, `AI_ENABLED`, Sentry DSN, email API key, `R2_BACKUP_*`, external DB URL file role names under `~/.isalwa-secrets/`

---

## Wave A return fields (Agent 8)

| Field | Value |
|-------|--------|
| **DUAL RECOVERY** | Executable checklist written; **NOT TRANSFERRED**; Carmen sole-person dependency remains evidenced |
| **BLOCKS THIN PILOT** | A1 Render second admin; A2 Supabase second owner; A3 shared break-glass; A4 shared DB URL/vault; A5 restore-drill dual human; A6 written onrender.com exception (or accept hostname risk in writing) |
| **BLOCKS PRODUCTION CLAIM** | B1–B9 (company billing/payers, prod services, Auth prod, GitHub org+reviewers, company DNS, company vault, prod PITR/off-host, non-Carmen alerts, dual recovery on **prod**) |
| **TRANSFER SOON** | C1–C9 |
| **CAPABILITY MAP UPDATED** | NO this lane (ops docs only); infra map § Transfer / break-glass **YES** → `docs/operations/ISALWA_OWNER_INFRASTRUCTURE_MAP.md` |
| **SAFE FOR FIRST THIN PILOT (ops dual-recovery lane)** | **CONDITIONAL** — product thin pilot may proceed only with **owner-written exception** accepting Carmen-only recovery **or** after A1–A5 (and A6 if claiming hostname exception). Dual recovery itself: **UNPROVEN** |
| **Account mutations performed** | **NONE** |

---

## Explicit non-claims

- No provider dashboards were changed; no invites sent by this agent.  
- No secret **values** recorded.  
- No product code changed.  
- Staging host evidence is not production.  
- Planning cost bands are not invoices (**VERIFY EXTERNALLY**).  
- WhatsApp remains deferred / out of ownership cost register.  
- This document is **not** USER-ACCEPTED production readiness.
