# UI-0 — Production OS Web Shell Implementation Evidence

**Lane:** UI-0 — Production shell / auth / navigation  
**Date:** 2026-08-24  
**App:** `apps/os-web`  
**Gate:** **PASS (CONDITIONAL runtime integration)**

---

## Pre-flight foundation status

| Check | Result | Evidence |
|-------|--------|----------|
| Step 15.1 PASS | **YES** | `STEP_15_1_WORK_ATTENTION_PROJECTION_EVIDENCE.md` — Gate PASS 2026-08-24 |
| Auth/session contracts stable | **YES** | `apps/os-api/src/os-session.ts` — dev headers + Supabase JWT unchanged |
| UI-0 without backend contract changes | **YES** | No os-api / os-query edits; uses existing `/health`, `/attention`, `/work-items`, `/approvals`, `/operations/outbox`, `/dev/bootstrap` |
| `apps/os-web` existed | **NO → CREATED** | New Next.js 15 app at `apps/os-web` |
| Parallel-agent file conflict | **NONE** | Only `apps/os-web` + root `dev:os-web` script + docs |

**Cross-lane change requests:** NONE for UI-0 scope.

---

## PLANNED

From `PRODUCTION_UI_ADMIN_SELF_SERVICE_READINESS.md` UI-0 slice:

- Authenticated application shell (desktop + mobile nav)
- Supabase / dev session auth against os-api authority
- Role/capability-aware navigation (admin probe + static LOCKED manifest)
- Canonical OS API client
- Route boundaries: Inicio, Clientes, Trabajo, Aprobaciones, Administración
- Spanish employee vocabulary; no spine jargon
- Honest empty/locked/unavailable states — no fake business data
- Tests + handoff README

---

## IMPLEMENTED

| Area | Location | Notes |
|------|----------|-------|
| App scaffold | `apps/os-web/` | Next 15.5, React 19, Tailwind 4, `@isalwa/ui` |
| Auth — Supabase | `lib/auth/supabase/*`, `lib/auth/actions.ts`, `middleware.ts` | JWT → Bearer; membership validated via os-api |
| Auth — Dev | `devBootstrapAction`, `lib/auth/dev-session.ts` | `POST /v1/dev/bootstrap` + httpOnly cookie |
| API client | `lib/api/os-api-client.ts`, `lib/api/os-api-errors.ts` | Bearer/dev headers, correlation ID, GET retry, Spanish `OsApiError` |
| Shell | `components/shell/*` | Sidebar, mobile nav, user menu, page header |
| States | `components/states/app-states.tsx` | Session expired, access denied, inactive, unavailable, locked |
| Navigation | `lib/navigation/nav-config.ts` | Admin hidden unless `probeAdminAccess()` (GET `/operations/outbox`) |
| Capabilities | `lib/capabilities/manifest.ts` | Static LOCKED/FUTURE — Finanzas, Mensajes |
| Routes | `app/(app)/*` | All production IA routes + honest placeholders |
| Inicio reads | `app/(app)/inicio/page.tsx` | Real `listAttention` / `listWorkItems` / `listApprovals` — empty when none |
| i18n | `lib/i18n/es.ts` | Spanish-first copy |
| Handoff | `apps/os-web/README.md`, `.env.example` | Env, auth, routes, troubleshooting |

**Not implemented (deferred to later UI slices):** Business workflows, command palette, ListMembers admin, GetCapabilityState HTTP, Supabase production tenant linking UI.

---

## TESTED

| Test | Command | Result |
|------|---------|--------|
| Unit — dev session codec | `pnpm --filter @isalwa/os-web test` | **6/6 PASS** |
| Unit — nav admin gating | same | PASS |
| Unit — API error Spanish mapping | same | PASS |
| Typecheck | `pnpm --filter @isalwa/os-web typecheck` | PASS |
| Production build | `pnpm --filter @isalwa/os-web build` | PASS — 12 routes |

Log (local): build output 2026-08-24 — `next build` compiled successfully.

---

## INTEGRATED

| Path | Status |
|------|--------|
| os-api dev bootstrap → dev session cookie → os-api headers | **DESIGNED + CODE COMPLETE** — runtime blocked locally (os-api requires Postgres for PartyGraph store) |
| os-api attention/work/approvals reads on Inicio | **CODE COMPLETE** — same runtime blocker |
| Supabase JWT → os-api session | **ARCHITECTURE ALIGNED** — requires linked AuthIdentity in workforce store |
| Legacy `apps/web` / ActivityEvent | **NOT USED** — grep clean |

---

## VERIFIED

| Claim | Evidence |
|-------|----------|
| App builds | `next build` exit 0 |
| No fake KPIs/customers | Placeholder + EmptyState only on non-Inicio routes; Inicio shows API items or honest empty |
| Nav ≠ authorization | Admin route calls `probeAdminAccess`; URL alone does not grant ops API |
| Browser roles not authority | No client-side role storage; os-api `resolveSession` only |
| Design system reuse | `@isalwa/ui` Button, Panel, PageContainer, EmptyState, ListRow, ExperienceHeader |

**Runtime browser smoke:** **NOT VERIFIED** — local `os-api` failed start without `OS_DATABASE_URL` / Postgres (`PartyGraph requires Postgres store`). Dev login path requires running os-api with database.

---

## DEFERRED

| Item | Reason |
|------|--------|
| Full WCAG audit | UI-0 baseline only (keyboard, landmarks, alerts) |
| Supabase production E2E | Needs configured Supabase + workforce AuthIdentity linkage |
| GetCapabilityState-driven nav | Step 15.2 `GET /v1/capabilities` — os-web still uses static manifest until Agent 4 |
| ListMembers admin UI | Backend **CLOSED** (Step 15.2); UI wiring deferred to Agent 4 |
| Command palette (⌘K) | UI-1+ |
| Live runtime integration log | Blocked on Postgres-backed os-api in this environment |

---

## Carmen handoff summary

### WHERE WE ARE

UI-0 production shell exists at `apps/os-web`. Authenticated layout, Spanish nav, centralized API client, and route placeholders are in place. Inicio can show real attention/work/approval lists when os-api is running with data.

### PRE-FLIGHT FOUNDATION STATUS

Step 15.1 **PASS**. Auth contracts **stable**. No backend edits required for UI-0.

### WHAT ACTUALLY CHANGED

- New app: `apps/os-web` (~40 files)
- Root script: `dev:os-web`
- Docs: this file + register update

### WHAT THE USER CAN NOW SEE/DO

- Open `http://localhost:3200/login`
- Dev mode: one-click bootstrap login → shell with Inicio/Clientes/Trabajo/Aprobaciones
- See honest empty states; Finanzas/Mensajes marked NO CONFIGURADO / PRÓXIMAMENTE
- Administración visible only if os-api grants `people.admin`

### AUTH STATUS

**CONDITIONAL PASS** — code complete; Supabase E2E and dev bootstrap runtime not verified in this session (os-api Postgres dependency).

### API CLIENT STATUS

**PASS** — centralized client, error mapping, retry-safe GET, 401/403 handling.

### ROLE-AWARE NAV STATUS

**CONDITIONAL PASS** — admin via server probe; capability LOCKED via static manifest until GetCapabilityState HTTP.

### WHAT RUNTIME PROVED

Build + unit tests only.

### WHAT IS MOCKED / NOT VERIFIED

- Live os-api + os-web browser session
- Supabase production login chain

### ACCESSIBILITY STATUS

Baseline: semantic landmarks, nav labels, focus styles, alert roles. Formal audit **DEFERRED**.

### ARCHITECTURE DRIFT

**NO** — no parallel auth stack; no legacy demo binding; no backend lane edits.

### CROSS-LANE CHANGE REQUESTS

**NONE**

Recommended future (not UI-0):
- `GET /v1/session/me` — member display + scopes without admin probe (optional UX improvement)
- `GetCapabilityState` HTTP — dynamic LOCKED nav

### LOW-MAINTENANCE HANDOFF

**PASS** — `apps/os-web/README.md` covers install, env, auth, routes, API client, new screen pattern.

### CARMEN-DISAPPEARANCE TEST

**CONDITIONAL PASS** — engineer can clone, install, configure `.env.local`, build, and understand boundaries from README; live auth requires running Postgres-backed os-api (documented).

### NORMAL OPERATION STILL REQUIRING CARMEN

- Linking Supabase users to OS AuthIdentity in workforce store (until admin self-service ships)
- Production Supabase + os-api env configuration first time

### NEW MAINTENANCE BURDEN

- Static capability manifest must be updated when lanes unlock (until GetCapabilityState HTTP)
- Two auth modes (dev/supabase) to keep in sync with `OS_AUTH_MODE` on os-api

### NEXT UI SLICE READY

**YES**

### WHAT NEXT UI SLICE SHOULD BE

**UI-3 Work/Approvals/Inicio** — Step 15.1 queries are PASS. **UI-1 Workforce Admin** — ListMembers + GetCapabilityState HTTP **CLOSED (Step 15.2)**; Agent 4 can wire Equipo + nav.

### EXACT NEXT ACTION

Implement **UI-3**: Trabajo + Aprobaciones read-only list pages using existing os-api queries, with empty states and navigation from Inicio rows.

### EXACT NEXT CURSOR PROMPT

```
STEP UI-3 — TRABAJO / APROBACIONES / INICIO READ SURFACES

Scope: apps/os-web only. Wire /trabajo and /aprobaciones to GET /v1/work-items and GET /v1/approvals. Enhance /inicio row navigation. No backend changes. No fake data. Spanish copy. Reuse createOsApiClient. Add tests. Update UI_3 evidence doc.
```

---

**UI-0 gate:** **PASS (CONDITIONAL)** — implementation + build + unit tests complete; runtime integration conditional on Postgres-backed os-api.
