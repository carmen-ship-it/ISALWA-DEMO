# UI-4 — Cliente 360 Commercial + Historial Read Surfaces Evidence

**Lane:** UI-4 — Cliente 360 read experience  
**Date:** 2026-08-24  
**App:** `apps/os-web` only  
**Gate:** **PASS (CONDITIONAL runtime integration)**

---

## Pre-flight review gate

| Check | Result |
|-------|--------|
| Step 16.1 evidence + tests | **PASS (CONDITIONAL)** — `STEP_16_1_COMMERCIAL_PROJECTION_EVIDENCE.md` |
| Step 16.1A Party + Commercial timeline | **PASS (CONDITIONAL)** — `STEP_16_1A_COMMERCIAL_TIMELINE_HARDENING_EVIDENCE.md` |
| Timeline does not expose raw BusinessEvent payload | **VERIFIED** — HTTP test asserts `payload === undefined`; UI renders `facts` only |
| Work/Approval timeline deferred | **CONFIRMED** — UI copy states scope explicitly |
| Agent 3 blocker on read-only Commercial UI | **NONE** — G-02 CreateOrder policy does not block read display |

---

## Audit — verified API shapes

| Endpoint | Response | Source |
|----------|----------|--------|
| `GET /v1/opportunities?partyId=` | `{ items: OpportunitySummaryReadModel[], meta, freshness }` | `commercial-query-service.ts`, `queries.ts` |
| `GET /v1/opportunities/:id` | `{ opportunity, freshness }` | same |
| `GET /v1/quotes?partyId=` | `{ items: QuoteSummaryReadModel[], meta, freshness }` | same |
| `GET /v1/quotes/:id` | `{ quote: QuoteDetailReadModel (includes lines), freshness }` | same |
| `GET /v1/orders?partyId=` | `{ items: OrderSummaryReadModel[], meta, freshness }` | same |
| `GET /v1/orders/:id` | `{ order, freshness }` | same |
| `GET /v1/parties/:partyId/timeline` | `{ items: PartyTimelineEntryReadModel[], meta, freshness }` | `party-timeline-query-service.ts` |

**Timeline facts:** allowlisted per `party-timeline-facts.ts` — no raw payload in HTTP model.

**Cross-lane change requests:** NONE

---

## IMPLEMENTED

| Surface | Location | API |
|---------|----------|-----|
| Cliente 360 sections + nav | `app/(app)/clientes/[partyId]/page.tsx`, `components/cliente/cliente-360-nav.tsx` | Party root + 5 parallel reads |
| Parallel load orchestration | `lib/cliente/load-cliente-360.ts` | 6 requests max (see below) |
| Oportunidades list | `components/commercial/opportunity-list.tsx` | `GET /v1/opportunities?partyId=` |
| Oportunidad detail | `app/(app)/clientes/[partyId]/oportunidades/[opportunityId]/page.tsx` | `GET /v1/opportunities/:id` |
| Cotizaciones list | `components/commercial/quote-list.tsx` | `GET /v1/quotes?partyId=` |
| Cotización detail + lines | `app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx` | `GET /v1/quotes/:id` |
| Pedidos list | `components/commercial/order-list.tsx` | `GET /v1/orders?partyId=` |
| Pedido detail | `app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx` | `GET /v1/orders/:id` |
| Historial | `components/commercial/party-timeline-list.tsx` | `GET /v1/parties/:partyId/timeline` |
| Money formatting | `lib/commercial/money.ts` | BigInt centavo strings — no float math |
| Timeline labels | `lib/commercial/timeline-labels.ts` | Spanish labels from `eventType` + allowlisted `facts` |
| Section error/empty/unauthorized | `components/commercial/commercial-section-state.tsx` | Per-section `FetchOutcome` |
| Stale projection UX | Reused `StaleProjectionBanner` | Page-level aggregate + per-section freshness |
| Typed API client | `lib/api/os-api-client.ts` | 7 new read methods |
| Commercial types | `lib/commercial/types.ts` | Aligned to `@isalwa/os-contracts` |

**Sections on `/clientes/[partyId]`:** Resumen, Relaciones, Contactos, Trabajo, Oportunidades, Cotizaciones, Pedidos, Historial (+ Mensajes placeholder)

**Not invented:** probability, pipeline KPIs, territory, credit, shipment, payment, invoice, approval-required labels, catalog metadata

---

## TESTED

| Suite | Result |
|-------|--------|
| `lib/commercial/ui-4.test.ts` | 22 tests PASS |
| Full os-web suite | **48 tests PASS** |
| Typecheck + build | PASS — new nested commercial detail routes |

---

## INTEGRATED

| Path | Status |
|------|--------|
| Postgres os-api browser smoke | **NOT VERIFIED** — `OS_DATABASE_URL` / live stack unavailable in agent environment |
| Legacy Account API | **NOT USED** |
| ActivityEvent API | **NOT USED** |
| Runtime Commercial fixtures in UI | **NOT USED** — tests only |

---

## VERIFIED

- Party remains canonical identity on Cliente 360 page
- Commercial lists filtered by `partyId` (convenience; authorization is os-api)
- Timeline renders allowlisted facts only — no raw payload / event JSON
- Money from centavo strings via BigInt
- Order copy clarifies no fulfillment/payment display
- Historial copy: "Actividad comercial y del cliente" — not complete history
- Multi-role party UX from UI-2 preserved

---

## DEFERRED

- Work/Approval timeline entries in Historial
- Commercial command forms (create/edit/submit)
- Global Commercial nav (nested under Cliente)
- Fiscal identity on party detail HTTP
- Browser E2E smoke vs live Postgres

---

## Performance — request count

**`/clientes/[partyId]` load:**

1. `GET /v1/parties/:partyId` (sequential first — 404 gate)
2. Parallel (5):
   - `GET /v1/opportunities?partyId=&limit=10`
   - `GET /v1/quotes?partyId=&limit=10`
   - `GET /v1/orders?partyId=&limit=10`
   - `GET /v1/parties/:partyId/timeline?limit=20`
   - `GET /v1/work-items?subjectType=party&subjectId=&status=open&limit=5`
3. Member label resolution: `GET /members/:id` per unique member (cached per request via resolver)

**Total documented budget:** 6 primary reads + N member lookups (UI-2/UI-3 pattern).

**Detail routes:** 1 entity GET + member lookups.

---

## Accessibility

- Section anchor nav keyboard focusable (`Cliente360Nav`)
- Lists use semantic `ul`/`ol` with `aria-label`
- Status via `StatusPill` + screen-reader labels on detail fields (`sr-only` dt)
- Timeline uses `<time dateTime>` + ordered list semantics
- Error states use `role="alert"` where applicable
- Stale banner uses `role="status"`

---

## Authorization

- Server-rendered only — no client-side scope widening
- Section-level 403/401/unavailable via `CommercialSectionState`
- Party 404 fails page; commercial entity 404 fails detail route only
- Cross-tenant behavior delegated to os-api (not tested live in this slice)

---

## Files touched (apps/os-web only)

```
lib/api/os-api-client.ts
lib/cliente/load-cliente-360.ts
lib/commercial/*
components/cliente/cliente-360-nav.tsx
components/commercial/*
app/(app)/clientes/[partyId]/page.tsx
app/(app)/clientes/[partyId]/oportunidades/[opportunityId]/page.tsx
app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx
app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx
components/work/stale-projection-banner.tsx (optional stale prop)
```
