# UI-2 — Cliente / Party Master Read Surfaces Evidence

**Lane:** UI-2 — Clientes / PartyGraph read experience  
**Date:** 2026-08-24  
**App:** `apps/os-web` only  
**Gate:** **PASS (CONDITIONAL runtime integration)**

---

## Audit — verified API shapes

| Endpoint | Response | Source |
|----------|----------|--------|
| `GET /v1/parties` | `{ items: PartySummaryReadModel[], meta: PaginatedMeta, freshness: ProjectionFreshness }` | `party-query-service.ts`, `queries.ts` |
| `GET /v1/parties/:id` | `{ party, roles, contacts, commercialAccount }` | `parties.controller.ts` |

**Search filters (backend-supported):** `q`, `status` (`active|deactivated|merged`), `roleKey`, `cursor`, `limit`

**Not on HTTP detail (DEFERRED):** `FiscalIdentity` — store has `listFiscalIdentitiesForParty` but no HTTP field on `GET /v1/parties/:id`

**Cross-lane change requests:** NONE for UI-2 read scope

---

## IMPLEMENTED

| Surface | Location | Notes |
|---------|----------|-------|
| Clientes list + search | `app/(app)/clientes/page.tsx` | Server-driven search via URL params |
| Search UX | `components/party/party-search-form.tsx` | GET navigation, role chips, clear, load more |
| Party list rows | `components/party/party-list.tsx` | Multi-role badges, duplicate status, commercial lens |
| Party detail | `app/(app)/clientes/[partyId]/page.tsx` | Datos generales, Relaciones, Contactos, Cuenta comercial |
| Multi-role UX | `lib/party/labels.ts` `multiRoleHint` | One entity, many roles — no duplicate records |
| Duplicate/merge | List: `duplicateStatus`; Detail: `mergedIntoPartyId` | Read-only — no merge actions |
| Fiscal section | Honest deferral copy | No NIT display without HTTP contract |
| Cliente 360 placeholders | `FutureSectionPlaceholder` | Oportunidades, Cotizaciones, Historial, Mensajes — locked |
| Related work | Detail: one filtered `listWorkItems` call | `subjectType=party&subjectId=` |
| Work → Cliente nav | `components/work/work-list.tsx`, `/trabajo?subjectType=party` | UI-3 integration |
| Typed API client | `searchParties`, `getParty` | `lib/party/types.ts` |
| Loading | `clientes/loading.tsx` | Loading shell |

---

## TESTED

| Suite | Result |
|-------|--------|
| `lib/party/ui-2.test.ts` | 13 tests PASS |
| Full os-web suite | 26 tests PASS |
| Typecheck + build | PASS — `/clientes`, `/clientes/[partyId]` routes |

---

## INTEGRATED

| Path | Status |
|------|--------|
| Postgres os-api browser smoke | **NOT VERIFIED** — environment blocked |
| Legacy Account API | **NOT USED** |
| Step 15 SearchParties projection | **CODE ALIGNED** |

---

## VERIFIED

- One canonical Party with multiple role badges (not separate customer/supplier records)
- Employee Spanish labels — no PartyGraph jargon in UI
- No runtime fake data
- Authorization: server-rendered from os-api only
- Role labels are presentation-only

---

## DEFERRED

- Fiscal identity display (no HTTP field)
- Commercial read sections (Agent 2 projections not UI-integrated per parallel safety)
- Edit/create/merge commands
- Browser E2E smoke

---

## Carmen handoff

### CLIENTES LIST — PASS
### CLIENTE DETAIL — PASS (CONDITIONAL fiscal)
### MULTI-ROLE PARTY UX — PASS
### CONTACTS — PASS
### FISCAL DATA — DEFERRED (no HTTP contract)

### COMMERCIAL UI INTEGRATION READY — NO

Commercial command/write path exists (Step 16), but **production UI read integration** for opportunities/quotes/orders is explicitly deferred — placeholders only until Agent 2 publishes stable read contracts for employee UI.

### NEXT UI SLICE — Cliente 360 enrichment OR UI-1 Workforce Admin

Work integration on detail exists. Commercial UI blocked on read projection readiness. UI-1 blocked on `ListMembers` HTTP.

### EXACT NEXT ACTION

When Agent 2 verifies commercial **read** projections for UI: wire Oportunidades/Cotizaciones sections on `/clientes/[partyId]`.

### EXACT NEXT CURSOR PROMPT

```
STEP UI-4 — COMMERCIAL READ ON CLIENTE 360 (when Agent 2 read gate PASS)

Scope: apps/os-web only. Replace FutureSectionPlaceholder for Oportunidades/Cotizaciones/Pedidos on /clientes/[partyId] using verified GET /v1/opportunities, /quotes, /orders party-scoped queries. Read-only. No commands. Spanish copy. Tests + evidence.
```

---

**UI-2 gate:** **PASS (CONDITIONAL)**
