# UI-3 — Work / Approvals / Inicio Read Surfaces Evidence

**Lane:** UI-3 — Employee-facing read surfaces  
**Date:** 2026-08-24  
**App:** `apps/os-web` only  
**Gate:** **PASS (CONDITIONAL runtime integration)**

---

## Audit — API response shapes (verified from contracts + query services)

| Endpoint | Response shape |
|----------|----------------|
| `GET /v1/work-items` | `{ items: WorkSummaryReadModel[], meta: PaginatedMeta, freshness: ProjectionFreshness }` |
| `GET /v1/work-items/:id` | `{ work: WorkSummaryReadModel, freshness }` |
| `GET /v1/approvals` | `{ items: ApprovalSummaryReadModel[], meta, freshness }` |
| `GET /v1/approvals/:id` | `{ approval: ApprovalSummaryReadModel, freshness }` |
| `GET /v1/attention` | `{ items: AttentionItemReadModel[], meta, freshness }` |
| `GET /v1/members/:id` | `{ member, person, organizationId }` — owner/approver display names |

Sources: `packages/os-contracts/src/queries.ts`, `packages/os-query/src/work/*-query-service.ts`, Step 15.1 evidence.

**Cross-lane change requests:** NONE

---

## IMPLEMENTED

| Surface | Files | Behavior |
|---------|-------|----------|
| **Trabajo list** | `app/(app)/trabajo/page.tsx`, `components/work/work-list.tsx` | Real open work; status, priority, due, owner, subject, approval state |
| **Trabajo detail** | `app/(app)/trabajo/[workItemId]/page.tsx` | Read-only detail via `getWorkItem` |
| **Aprobaciones list** | `app/(app)/aprobaciones/page.tsx`, `components/work/approval-list.tsx` | Pending approvals; read-only banner |
| **Aprobaciones detail** | `app/(app)/aprobaciones/[approvalRequestId]/page.tsx` | Read-only detail |
| **Inicio** | `app/(app)/inicio/page.tsx` | Attention-first layout; real triple fetch; row navigation |
| **Attention UX** | `components/work/attention-list.tsx`, `lib/work/labels.ts` | `reasonCode` / `reasonDetail` copy; derived-not-task disclaimer |
| **Stale indicator** | `components/work/stale-projection-banner.tsx` | When `freshness.isStale` |
| **Error states** | `components/work/query-surface-state.tsx`, `lib/work/query-errors.ts` | 401/403/unavailable Spanish |
| **Member labels** | `lib/work/member-resolver.ts` | Parallel `GET /v1/members/:id` — no hard-coded names |
| **Loading** | `*/loading.tsx` on inicio/trabajo/aprobaciones | Loading shell |
| **Typed client** | `lib/api/os-api-client.ts`, `lib/work/types.ts` | Typed list/detail responses |

**Not implemented (explicitly deferred):** Approve/reject commands, work create/reassign, party name hydration for subject context, manager hierarchy views.

---

## TESTED

| Suite | Result |
|-------|--------|
| `lib/work/ui-3.test.ts` | 13 tests PASS — labels, attention UX, errors, fixtures, navigation |
| `lib/os-web.test.ts` | 6 tests PASS (UI-0 regression) |
| Typecheck | PASS |
| Build | PASS — 14 routes including detail pages |

---

## INTEGRATED

| Path | Status |
|------|--------|
| os-api query runtime (Postgres) | **NOT VERIFIED locally** — os-api requires `OS_DATABASE_URL` |
| Step 15.1 HTTP contracts | **CODE ALIGNED** — field names from `WorkSummaryReadModelSchema` etc. |
| Legacy demo API | **NOT USED** |

---

## VERIFIED

- No fake business data in runtime pages
- Authorization: only os-api-returned items rendered; 403/401 surfaced honestly
- Attention preserves derivation truth (reason copy + disclaimer)
- No approve/reject action buttons
- Nav links only to existing routes (`/trabajo/[id]`, `/aprobaciones/[id]`)

---

## DEFERRED

- Browser E2E against live os-api + Postgres
- Party display name on work subject (would need party fetch — optional UI-2 overlap)
- Approval decision commands (future UI slice)
- Full WCAG audit

---

## Carmen handoff

### WHERE WE ARE

UI-3 delivers production read surfaces for Trabajo, Aprobaciones, and an actionable Inicio using Step 15.1 Lane F queries only.

### TRABAJO STATUS

**PASS** — list + detail, real DTO fields, empty/error/stale/unauthorized handling.

### APROBACIONES STATUS

**PASS** — list + detail, read-only honesty, decision statuses displayed.

### INICIO STATUS

**PASS** — attention-first, linked rows, no KPIs, no fake totals.

### WHAT THE USER CAN NOW DO

- See assigned open work with due dates and context
- Review pending approvals (read-only)
- Start from Inicio with derived attention items explaining why they appear
- Navigate to trabajo/aprobaciones detail pages

### WHAT REMAINS READ-ONLY

- All approval decisions
- Work create/reassign/complete
- No command buttons in this slice

### WHAT RUNTIME PROVED

Build + 19 unit tests.

### WHAT IS MOCKED / NOT VERIFIED

Live os-api + Postgres browser smoke (environment blocked).

### AUTHORIZATION STATUS

**PASS** — server-fetched only; error states for 401/403; no client role hacks.

### ACCESSIBILITY STATUS

Semantic lists, `aria-label` on lists, `sr-only` dt labels, focusable row links, `role="status"` on stale banner, `role="alert"` on errors. Formal audit deferred.

### CROSS-LANE CHANGE REQUESTS

**NONE**

### ARCHITECTURE DRIFT

**NO**

### LOW-MAINTENANCE HANDOFF

**PASS** — README updated with API mapping; `lib/work/fixtures.ts` documents DTO shapes for tests.

### CARMEN-DISAPPEARANCE TEST

**CONDITIONAL PASS** — engineer can extend list rendering via `components/work/*` and `lib/work/labels.ts`; live diagnosis requires Postgres os-api.

### NORMAL OPERATION STILL REQUIRING CARMEN

- First-time Postgres + os-api local setup (documented in README)

### NEW MAINTENANCE BURDEN

- Member label N+1 fetches on lists (bounded by page size; acceptable for UI-3)

### NEXT UI SLICE READY

**YES**

### RECOMMENDED NEXT UI SLICE

**UI-2 Party / Cliente Master** — `GET /v1/parties` search is PASS; enriches work subject context. UI-1 blocked on `ListMembers` HTTP. Commercial UI waits for Agent 2 Step 16.

### EXACT NEXT ACTION

Implement **UI-2**: `/clientes` search list + detail using `SearchParties` / `GetParty`.

### EXACT NEXT CURSOR PROMPT

```
STEP UI-2 — PARTY / CLIENTE MASTER READ SURFACES

Scope: apps/os-web only. Replace /clientes placeholder with GET /v1/parties search and GET /v1/parties/:id detail. Spanish employee copy. No fake data. Reuse createOsApiClient and @isalwa/ui. No backend changes. Add tests + UI_2 evidence doc.
```

---

**UI-3 gate:** **PASS (CONDITIONAL)** — implementation complete; runtime integration conditional on Postgres-backed os-api.
