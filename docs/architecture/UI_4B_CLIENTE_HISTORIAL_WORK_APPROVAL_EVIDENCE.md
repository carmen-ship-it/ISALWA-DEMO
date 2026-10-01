# UI-4B — Cliente Historial Work + Approval Enrichment Evidence

**Lane:** UI-4B — Cliente Historial display extension  
**Date:** 2026-08-24  
**App:** `apps/os-web` only  
**Backend dependency:** Step 16.1B — `STEP_16_1B_WORK_APPROVAL_TIMELINE_EVIDENCE.md`  
**Gate:** **PASS (CONDITIONAL runtime integration)**

---

## Pre-flight review gate

| Check | Result |
|-------|--------|
| Step 16.1B Work + Approval timeline backend | **PASS (CONDITIONAL)** |
| Timeline association backend-owned | **VERIFIED** — UI does not resolve WorkItem → Party |
| Raw payload / contextSnapshot excluded | **VERIFIED** — HTTP + UI guards |
| Commercial approval subjects | **NOT ENABLED** — unchanged |
| Mutation actions in Historial | **NONE** — display-only slice |

---

## IMPLEMENTED

| Change | Location |
|--------|----------|
| Work event Spanish labels | `lib/commercial/timeline-labels.ts` |
| Approval event Spanish labels | same |
| Hidden internal fact keys (IDs, subjectType, subjectId) | `HIDDEN_FACT_KEYS` in timeline-labels |
| Bounded `reason` rendering when allowlisted | `factLine` — work.cancelled, approval.rejected |
| Historial scope copy updated | `HISTORIAL_SCOPE_COPY` + `party-timeline-list.tsx` |
| Unknown event fallback | `Actividad registrada` |
| Label extension point documented | comment on `timelineEventLabel` |
| Work/Approval timeline fixtures | `lib/commercial/fixtures.ts` |

**No changes:** `load-cliente-360.ts`, API client, backend packages, association logic.

---

## Work events shown

| eventType | Label |
|-----------|-------|
| `work.created` | Trabajo creado |
| `task.reassigned` | Trabajo reasignado |
| `work.completed` | Trabajo completado |
| `work.cancelled` | Trabajo cancelado |

**Facts rendered (allowlisted only):** `title` on create; `reason` on cancel when present. Internal IDs and association metadata hidden.

---

## Approval events shown

| eventType | Label |
|-----------|-------|
| `approval.requested` | Aprobación solicitada |
| `approval.approved` | Aprobación aprobada |
| `approval.rejected` | Aprobación rechazada |

**Facts rendered:** `reason` on reject when present. No `contextSnapshot`, no subject registry terminology, no member/approval IDs.

---

## Timeline domains shown (Historial)

- PartyGraph (party, contact, merge events)
- Commercial (opportunity, quote, order events)
- Work (party-associated only — backend filter)
- Approval (party-associated only — backend filter)

**Explicitly not claimed:** Lead, Finance, Messaging, Territory, unassociated Work, commercial approval subjects.

---

## Historial scope copy

**Before:** “Actividad comercial y del cliente. No incluye trabajo ni aprobaciones todavía.”

**After:** “Actividad del cliente, comercial, trabajo y aprobaciones relacionadas.”

---

## TESTED

| Suite | Coverage |
|-------|----------|
| `lib/commercial/ui-4b.test.ts` | 13 scenarios — work/approval labels, mixed chronology, payload/contextSnapshot guards, unknown fallback, scope copy, party/commercial regression |
| `lib/commercial/ui-4.test.ts` | Unchanged regression — party/commercial timeline |
| Full os-web suite | **101 tests PASS** (17 new in ui-4b) |
| Typecheck + build | PASS |

---

## INTEGRATED

| Path | Status |
|------|--------|
| Live browser smoke vs Postgres os-api | **NOT VERIFIED** — env unavailable in agent run |
| Timeline fetch path | **UNCHANGED** — `GET /v1/parties/:partyId/timeline` via `load-cliente-360.ts` |

---

## Safety invariants

| Invariant | Status |
|-----------|--------|
| RAW PAYLOAD EXPOSED | **NO** |
| CONTEXTSNAPSHOT EXPOSED | **NO** |
| UI association logic | **NO** |
| Approve/reject / work mutation buttons | **NO** |
| CreateOrder exposed | **NO** (G-02) |

---

## Cross-lane change requests

**NONE**

---

## Architecture drift

**NO** — extends existing timeline-labels + party-timeline-list pattern from UI-4.
