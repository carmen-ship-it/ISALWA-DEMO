# ISALWA — Isa / Álvaro Demo & Real-Data Readiness

**Status:** Finish-line orchestration — hosted staging **not live**; synthetic DEV UAT **ready**; real import **blocked**  
**Date:** 2026-09-13 (supersedes 2026-09-02 analysis sections where noted)  
**Confidentiality:** Workbook and commercial paper inspected as structure/concepts only — no names, phones, NITs, or GPS URLs from real clients.

**Sources (not in repo):**

1. `DATOS CLIENTES (1).xls` — staff + customer contact structure (prior analysis).  
2. Real ISALWA commercial document photo (Isa) — layout/process evidence. Concepts: `docs/architecture/ISALWA_REAL_COMMERCIAL_DOCUMENT_FIT.md`.

---

## Current product stage

| Area | Status |
|------|--------|
| Product goal | Hosted, user-testable, client-representative OS |
| Commercial Phase 1 | **READY** for internal human UAT (Clientes → 360 → Oportunidad → Cotización → Historial) |
| Workforce Admin | **CONDITIONAL / SAFE** for verified human DEV UAT |
| G-02 CreateOrder | **DECISION PENDING** — UI not exposed |
| G-08 Commercial Approval | **NOT APPROVED** |
| Production staging plan | **PLANNED** — code hardening partial; **cloud not provisioned** |
| Quote printable PDF (OS) | **READY TO IMPLEMENT** (data exists); **not implemented** on os-web/os-api |
| Delivery Note | **NOT MODELED** — decision required |

Closed defects (do not reopen): Step 14.7 invalid department, UI-LIVE-3B, Cliente 360 null-freshness.

---

## HOSTED SYNTHETIC DEMO vs HOSTED REAL-DATA PILOT

| Track | Goal | Status |
|-------|------|--------|
| **A — Hosted synthetic demo** | Public HTTPS os-web + os-api, staging Postgres, Supabase Auth, synthetic data, real login | **BLOCKED** — Auth project **ready**; Render `RENDER_API_KEY` / account API access **MISSING** (see `docs/operations/STAGING_HOST_OPERATOR_CHECKLIST.md`) |
| **B — Hosted real-data pilot** | Same + governed import of real parties | **Further** — requires A + import gates + Location decision |

Demo on **DEV localhost** with synthetic data remains available **now**.

---

## Workstream A — Hosted staging / auth

### Target (unchanged architecture)

- Render `os-web-staging` + `os-api-staging` (HTTPS)
- Render Postgres `isalwa-os-staging`
- Supabase Auth project **`isalwa-os-auth-staging`** (dedicated; **not** Architect)
- `OS_AUTH_MODE=supabase` only externally — **no** `OS_AUTH_MODE=dev` on public internet
- Exact CORS via `OS_CORS_ORIGINS`
- Synthetic data first

### Repo readiness (code)

| Item | Status |
|------|--------|
| Honor host `PORT` (os-api + os-web) | **DONE** (`resolveListenPort`; `next start --port ${PORT:-3200}`) |
| CORS fail-closed staging/production | **DONE** (`OS_CORS_ORIGINS` validation) |
| Auth mode fail-closed (no dev on staging/prod) | **DONE** in env validation |
| CI Postgres integration on PR | **NOT in** `.github/workflows/ci.yml` (build + typecheck only) |
| Staging deploy workflow | **NOT present** (only `ci.yml`) |
| Cloud services / DNS / secrets | **NOT provisioned** |

### CLI / account evidence (2026-09-13)

| Check | Result |
|-------|--------|
| Supabase CLI | Authenticated (personal) |
| Organization | `carmenaburoda@gmail.com` |
| `isalwa-os-auth-staging` | **CREATED** — ref `qbpxuywtoycjpitxoblo`, region `sa-east-1`, status `ACTIVE_HEALTHY` |
| Role | **AUTH ONLY** — not OS business Postgres |
| Reuse Architect for OS Auth? | **NO** — `Isalwa-Arquitect` (`efolotcrdaqdixfiqbek`) left untouched |
| External staging app URLs | **NOT YET** (Render not provisioned) |
| End-to-end login via os-api | **NOT VERIFIED** |

### SUPABASE AUTH STAGING

| Field | Value |
|-------|--------|
| Status | **IMPLEMENTED** (project + email auth config) — **NOT VERIFIED** until os-api login works end-to-end |
| Project name | `isalwa-os-auth-staging` |
| Organization | `carmenaburoda@gmail.com` |
| Project ref | `qbpxuywtoycjpitxoblo` |
| Region | `sa-east-1` (São Paulo) |
| Project status | `ACTIVE_HEALTHY` |
| API URL hostname | `qbpxuywtoycjpitxoblo.supabase.co` |
| JWT issuer URL | `https://qbpxuywtoycjpitxoblo.supabase.co/auth/v1` |
| Email/password | Enabled (default; social providers off) |
| Redirect placeholders | `http://localhost:3200` (+ 127.0.0.1); Render/staging.local placeholders pending real hosts |
| Users created | **None** (Isa/Álvaro deferred) |
| DB password location | Local operator secret file under `~/.isalwa-secrets/` (not in repo) — Auth project Postgres only |

### Former Supabase human blocker (resolved for project creation)

Previously: project did not exist. **Resolved 2026-09-13** by CLI create under personal org. Remaining: wire hosted os-api/os-web + managed OS Postgres + secrets; replace redirect placeholders with real Render URLs.

---

## Workstream B — Real data model fit (XLS + paper)

| Classification | Result |
|----------------|--------|
| Overall XLS fit | **CONDITIONAL** — commercial/contact core maps; geo does not |
| Party + contact + customer role | **Supported** |
| Staff Person | **Supported** (invite separate; no AuthIdentity from sheet) |
| NIT in workbook | **Absent** |
| Location / Address / GPS | **REAL_DATA_MODEL_GAP** |
| Paper-added gaps | Bill-to / Factura a; delivery acknowledgment; DN vs Quote; numbering **policy** |

Detail: `docs/data/CLIENT_DATA_INTAKE_MAPPING_PLAN.md`  
Document matrix: `docs/architecture/ISALWA_REAL_COMMERCIAL_DOCUMENT_FIT.md`

**Import:** still **NOT YET** — gates unchanged (staging, auth, tenant, backup/restore or approved exception, dry-run importer, Location treatment explicit).

---

## Workstream C — Commercial document fit

**Overall:** **CONDITIONAL**

- Quote line economics (qty, description, unit price, totals): **PASS**
- Human `quoteNumber`: **PARTIAL** (exists as `Q-######`; sequence policy undecided)
- FiscalIdentity: **PARTIAL** (domain yes; UI/HTTP exposure missing)
- Address / DN / signatures / Factura a: **GAP** or **DECISION REQUIRED**
- Cotización vs Nota de Entrega: **DECISION REQUIRED** (do not equate)

---

## Workstream D — Client-ready UX

### Exact demo journey (DEV — Spanish)

1. Abrir `http://localhost:3200` → **Entrar (desarrollo)**  
2. **Inicio**  
3. **Clientes** → **Cliente Step17 S.A.**  
4. **Cliente 360**  
5. **Oportunidad** → **Cotización** (líneas BOB, enviar)  
6. **Historial**  
7. *(Opcional)* **Administración → Equipo** — solo María Quispe para suspender/reactivar/finalizar  

Guide: `docs/uat/FIRST_HUMAN_INTERNAL_UAT_GUIDE.md`

### Does it look like ISALWA’s work?

| Aspect | Verdict |
|--------|---------|
| Journey shape (cliente → oportunidad → cotización) | **Yes** — matches commercial loop |
| Line entry like paper (qty, detalle, precio, totales) | **Yes** |
| Paper header blocks (dirección, NIT, factura a, firmas) | **Not yet** |
| Printable note | **Missing** |
| Synthetic names/products | Improved toward BO sanitarios-style lines in UI fixtures; seed party still “Cliente Step17 S.A.” |

### UX gaps before Isa/Álvaro (hosted or DEV)

| Gap | Severity |
|-----|----------|
| Hosted URL + real login | Blocks remote UAT |
| No Quote print/PDF | P1 for paper realism |
| Submitted quote previously hid lines | **Fixed 2026-09-13** (read-only lines) |
| Fiscal identity not on Cliente 360 | P2 for bill-to realism |
| Create pedido absent | Expected (G-02) |
| “Cliente Step17” label feels synthetic | P2 polish for demo narrative |

---

## Privacy / Git

- Workbook stays outside the monorepo.  
- Do not commit real commercial document photos with readable PII.  
- `.gitignore` already covers spreadsheet patterns.

---

## Business questions

`docs/uat/ISA_ALVARO_BUSINESS_QUESTIONS.md`

---

## Finish-line priority (authoritative)

1. Real hosted staging with safe auth  
2. P0/P1 blocking commercial journey for Isa/Álvaro  
3. Quote/document realism without unresolved policy  
4. Controlled real-data import readiness  
5. Location/GPS canonical slice  
6. Orders/approvals only after decisions  

---

## First safe next slice

**One only:** Carmen creates a personal Render API key (`dashboard.render.com` → Account Settings → API Keys → name `isalwa-os-staging-cursor`) and exports `RENDER_API_KEY` for Cursor — then resume hosted staging provision (Postgres `isalwa-os-staging` + os-api + os-web).

Exact checklist: `docs/operations/STAGING_HOST_OPERATOR_CHECKLIST.md`

### Exact next Cursor prompt (after RENDER_API_KEY is available)

```
ISALWA OS — resume HOST REAL STAGING with RENDER_API_KEY available.

Auth project already exists:
- isalwa-os-auth-staging / qbpxuywtoycjpitxoblo / sa-east-1 / AUTH ONLY

Vercel team ready for os-web: carmen-ship-its-projects

Follow docs/operations/STAGING_HOST_OPERATOR_CHECKLIST.md and
docs/architecture/PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md.

Constraints unchanged: no real XLS import, no G-02/G-08, no Architect touch,
no OS_AUTH_MODE=dev externally, Supabase Auth DB ≠ OS_DATABASE_URL.

Provision: Render Postgres isalwa-os-staging → migrate:deploy → synthetic seed →
os-api staging → os-web (Vercel) → Supabase redirects → Carmen login smoke →
then Isa/Álvaro invites.

STOP after smoke; REAL_DATA_ALLOWED=NO until backup+restore drill.
```
