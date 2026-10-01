# Step 16-Prep → Step 16.1 — Commercial Projection Readiness

**Phase:** Step 16-Prep → **Step 16.1 / 16.1A (IMPLEMENTED)**  
**Date:** 2026-08-24  
**Gate result:** **CLOSED (CONDITIONAL)** — Commercial read models + Party/Commercial timeline verified

**Rule:** This document tracks readiness items from prep through Step 16.1A implementation.

---

## Readiness item status (post Step 16.1A)

| Item | Prep status | Step 16.1A status | Evidence |
|------|-------------|-------------------|----------|
| Event contracts (`OS_COMMERCIAL_EVENT_TYPES`) | BLOCKED | **CLOSED** | `packages/os-contracts/src/commercial-events.ts` — 14 types |
| Authoritative Commercial store | BLOCKED | **CLOSED** | `packages/os-commercial`, Prisma Step 16 migration |
| Read models (Opportunity/Quote/Order) | BLOCKED | **CLOSED** | Migration `20260824210000_os_step16_1_commercial_projection` |
| Projection consumer | BLOCKED | **CLOSED** | `CommercialProjectionConsumer`, key `projection.commercial.summary.v1` |
| Authorized queries + HTTP | BLOCKED | **CLOSED** | `GET /v1/opportunities|quotes|orders` |
| Test harness | PREPARED (skipped) | **CLOSED** | 11 commercial + 6 timeline postgres tests |
| HTTP runtime (commands → projection → GET) | NOT VERIFIED | **CLOSED** | 7 HTTP runtime tests |
| Order cancel projection | — | **CLOSED** | Step 16.1A hardening |
| Commercial freshness explicit test | PARTIAL | **CLOSED** | stale/current cycle verified |
| Cliente 360 composition | DOCUMENTED | **PARTIAL** | Party + timeline + Commercial filters documented |
| Timeline / historial | NEEDS CONTRACT | **PARTIAL** | `ListPartyTimeline` + Party/Commercial events; Work/Approval deferred |
| Manager/team commercial visibility | — | **OPEN** | Owner + `people.admin` only; no team hierarchy widening |

---

## Agent 2 status (repository inspection — updated 2026-08-24)

| Artifact | Present? | Evidence |
|----------|----------|----------|
| `packages/os-commercial` | **YES** | Step 16 PASS |
| `STEP_16_COMMERCIAL_CORE_IMPLEMENTATION_EVIDENCE.md` | **YES** | Step 16 gate |
| Commercial commands in `os-contracts` | **YES** | 14 commands in `commercial-commands.ts` |
| Commercial events in foundation registry | **YES** | 14 types in `commercial-events.ts` |
| Authoritative Opportunity/Quote/Order tables | **YES** | `os_opportunities`, `os_quotes`, `os_quote_lines`, `os_orders` |
| Commercial projection consumer keys | **YES** | `projection.commercial.summary.v1` |

**Verdict:** Agent 2 Commercial contracts **PRESENT and STABLE**. Lane F implemented projection consumers per approved hydrate-after-event pattern.

---

## Safe to implement Commercial projections now?

**YES (DONE)** — Step 16.1 verified in Postgres + HTTP. See `STEP_16_1_COMMERCIAL_PROJECTION_EVIDENCE.md`.

---

## Lane F extension points (ready today)

When Agent 2 delivers contracts, Lane F implements **only** in these locations (no `os-commercial` domain edits):

| Extension | Owner file (future) | Pattern to copy |
|-----------|---------------------|-----------------|
| Consumer key registration | `packages/os-contracts/src/projection.ts` | `projection.party.search.v1` |
| Event type guard | `packages/os-contracts/src/commercial-events.ts` (Agent 2 + D review) | `isOsPartyEventType` |
| Read model DTOs | `packages/os-contracts/src/queries.ts` | `WorkSummaryReadModelSchema` |
| Projection consumer | `packages/os-query/src/commercial/*-projection-consumer.ts` | `PartyProjectionConsumer` — hydrate from authoritative store after event |
| Query services | `packages/os-query/src/commercial/*-query-service.ts` | `PartyQueryService` |
| Store port | `packages/os-query/src/projection-store-port.ts` | extend `OsProjectionStorePort` |
| Prisma read models | `packages/os-database/prisma/migrations/*_commercial_projection/` | Step 15 / 15.1 tables |
| Outbox registration | `apps/os-api/src/os-store.module.ts` | add consumer to `ProjectionRunner` array |
| Rebuild helper | `packages/os-query/src/commercial/rebuild-commercial-projection.ts` | `replayPartyProjectionForOrg` pattern |

**Hydration rule (mandatory):** Same as Party/Work Step 15 — event triggers projection refresh; **authoritative rows** in Agent 2 stores are source of truth for fields; event payload is not the long-term read model.

---

## Read models to build (after contracts)

Design targets — **fields must come from Agent 2 contracts**, not this doc:

### OpportunitySummary (proposed)

| Field category | Likely source (TBD by Agent 2) |
|----------------|--------------------------------|
| IDs | `opportunityId`, `organizationId` |
| Party link | `partyId` / `commercialAccountId` (lens, not second customer) |
| Owner | `ownerMemberId` |
| Lifecycle | `status`, `stage` |
| Timestamps | `createdAt`, `updatedAt`, `closedAt` |
| Freshness | projection metadata |

**Excluded until contract exists:** scores, credit, territory KPIs, AI ranking.

### QuoteSummary

| Field category | Likely source |
|----------------|---------------|
| IDs | `quoteId`, `organizationId` |
| Party / account | `partyId` or `commercialAccountId` |
| Owner | `ownerMemberId` |
| Lifecycle | `status` (draft/sent/accepted/…) |
| Money | `totalCentavos`, `currency` (bigint — salvage REUSE) |
| Linkage | `opportunityId?`, `sourceQuoteId?` |
| Timestamps | `createdAt`, `updatedAt`, `sentAt`, `acceptedAt` |

### QuoteDetail / line read model

Build **only if** Agent 2 exposes line-level authoritative store + events (`quote.line.*` or hydrate from quote aggregate). Otherwise QuoteSummary only for v1.

### OrderSummary

| Field category | Likely source |
|----------------|---------------|
| IDs | `orderId`, `organizationId` |
| Source quote | `quoteId` |
| Party / account | `partyId` / `commercialAccountId` |
| Lifecycle | `status` |
| Money | `totalCentavos`, `currency` |
| Timestamps | `createdAt`, `confirmedAt` |

---

## Cliente 360 integration plan

**Principle:** One Party identity — Commercial read models attach via **CommercialAccount lens**, never a parallel customer table.

```
Cliente 360 (future composed view)
├── Party identity          → GET /v1/parties/:id (authoritative, Step 12)
├── Roles / contacts      → same response
├── CommercialAccount lens  → os_commercial_accounts (authoritative)
├── Opportunities         → SearchOpportunities? (projection, Step 16+)
├── Quotes                  → SearchQuotes? / GetQuote? (projection)
├── Orders                  → SearchOrders? (projection)
├── Open work / attention   → ListOpenWork, ListAttentionItems (Step 15.1 PASS)
├── Timeline                → ListPartyTimeline? (contract TBD — see below)
└── Freshness               → per-consumer ProjectionFreshness on each chapter
```

**Party linkage query pattern:** Filter commercial projections by `partyId` or `commercialAccountId` where `commercialAccount.partyId = :partyId`. Work already supports `subjectType=commercial_account` + `subjectId`.

**No new customer master table.**

---

## Timeline / history status

| Item | Status |
|------|--------|
| Canonical event log | `os_business_events` + outbox (Step 11 PASS) |
| Legacy ActivityEvent | Frozen; retirement at Step 16 (`shared-contracts.yaml`) |
| Unified timeline query | **NEEDS CONTRACT** — not in `OS_QUERY_NAMES` |
| Generic timeline DTO | **NEEDS CONTRACT** — no `TimelineEventReadModel` in `os-contracts` |

**Prepared approach (not implemented):**

1. Agent 2 registers Commercial event types in foundation registry (D-lane review).
2. Lane F adds `ListPartyTimeline` (or `GetCustomerHistory`) query:
   - Authorized `partyId` scope
   - Reads **projected timeline rows** OR authorized `BusinessEvent` subset (prefer projection for search/pagination)
   - Merges event types: `party.*`, `work.*`, `approval.*`, `quote.*`, `order.*`, `opportunity.*`
   - Never reads `ActivityEvent`
3. Consumer key candidate: `projection.timeline.party.v1` (requires CROSS_LANE registration when event list is stable).

**Extension needed from Agent 2 / shared contracts:**

- Frozen list of Commercial event types + primary entity types
- Timeline visibility rules per event type (PII / finance fields)
- Query name + pagination schema in `os-contracts`

---

## Projection safety checklist (acceptance criteria)

Every future Commercial projection MUST:

- [x] Scope all rows by `organizationId`
- [x] Use unique `consumerKey` per read-model family
- [x] Skip unknown event types per `PROJECTION_SCHEMA_VERSION_POLICY.onUnknownEventType`
- [x] Reject unknown schema versions per policy
- [x] Upsert idempotently (`lastOccurredAt` + `lastEventId` ordering — Party pattern)
- [x] Persist checkpoint in `os_projection_checkpoints`
- [x] Expose freshness via `os_projection_freshness` + live pending outbox count
- [x] Support org-scoped rebuild from `os_business_events` replay
- [x] Never write authoritative Commercial tables from query/projection path
- [x] Register in `OutboxWorkerHost` via existing `ProjectionRunner` (Step 14.2 PASS)

---

## Test harness

**File:** `packages/os-database/src/commercial-projection-prisma.integration.test.ts`  
**Status:** **CLOSED** — replaced skipped `commercial-projection.harness.test.ts`

| Test | Status |
|------|--------|
| opportunity event → OpportunitySummary | **PASS** |
| quote event → QuoteSummary + lines | **PASS** |
| quote line change → detail projection | **PASS** |
| order event → OrderSummary | **PASS** |
| duplicate delivery idempotent | **PASS** |
| rebuild from event history | **PASS** |
| tenant isolation | **PASS** |
| Party linkage | **PASS** |
| projection freshness | **PARTIAL** (uses shared freshness pattern; explicit stale-when-pending test not added) |
| query path read-only | **PASS** |

**Verify script:** `scripts/verify-step-16-1.sh` — log `.step16-1-evidence/verify-20260824T131442Z.log`

---

## Events available today (actual repository)

### OS foundation (`packages/os-contracts/src/events.ts`)

Workforce, PartyGraph, Work/Approval only — **37 types**. No Commercial.

### Legacy commercial catalog (`packages/domain/src/events/types.ts`)

**NOT authoritative for OS path.** `COMMERCIAL_EVENT_TYPES` (17 legacy demo types) write to `ActivityEvent`. Do **not** use as projection input.

### Expected from Agent 2 (documented in readiness analysis only — **not in repo**)

From `COMMERCIAL_IMPLEMENTATION_READINESS.md` §Event mapping (pending registration):

- `opportunity.created` / `updated` / `closed` (proposed)
- `quote.created` / `revised` / `sent` / `accepted`
- `order.confirmed`
- `visit.*`, `promise.*`, `note.created` (later increments)

Lane F waits for **`OS_COMMERCIAL_EVENT_TYPES` in `os-contracts`** merged by Agent 2.

---

## Cross-lane change requests (for Agent 2)

| ID | Request | Status |
|----|---------|--------|
| CLR-01 | Add `OS_COMMERCIAL_EVENT_TYPES` + `isOsCommercialEventType()` | **CLOSED** |
| CLR-02 | Commercial command/event payload schemas + scopes | **CLOSED** |
| CLR-03 | Authoritative Prisma models + `OsCommercialStore` port | **CLOSED** |
| CLR-04 | Register projection consumer keys in `projection.ts` | **CLOSED** |
| CLR-05 | Read model Zod schemas + query names in `queries.ts` | **CLOSED** |
| CLR-06 | Timeline query contract (`ListPartyTimeline`) | **CLOSED** — PartyGraph + Commercial + Work + Approval (safe association); Lead excluded |

---

## Low-maintenance handoff (for projection implementer)

1. Wait for Agent 2 Step 16 core gate PASS + `OS_COMMERCIAL_EVENT_TYPES` in repo.
2. Copy `PartyProjectionConsumer` → `Commercial*ProjectionConsumer`.
3. Extend `OsProjectionStorePort` + migration for read tables.
4. Register consumer in `os-store.module.ts` `ProjectionRunner`.
5. Add query service + HTTP routes (new controller or extend parties — **avoid Agent 2 domain files**).
6. Add replay helper + `./scripts/verify-step-16-commercial-projection.sh`.
7. Un-skip harness tests; require Postgres evidence like Step 15.

**Diagnose failure:** existing ops surfaces — `GET /v1/operations/outbox`, dead-letter recovery (Step 14.3), projection freshness on query responses.

**Rebuild:** truncate org commercial read models → replay Commercial event types from `os_business_events`.

---

## Architecture drift

**NO** — Step 16.1 follows approved hydrate-after-event pattern; no second authority.

---

## Carmen handoff (post Step 16.1)

### AGENT 2 COMMERCIAL CONTRACT STATUS

**PRESENT — STABLE**

### SAFE TO IMPLEMENT COMMERCIAL PROJECTIONS NOW

**YES — IMPLEMENTED AND VERIFIED**

### EXACT EVENTS AVAILABLE

14 `OS_COMMERCIAL_EVENT_TYPES`: `opportunity.*` (5), `quote.*` (7), `order.*` (2). Registered in `os-contracts`.

### READ MODELS READY TO BUILD

**IMPLEMENTED:** OpportunitySummary, QuoteSummary, QuoteLine detail, OrderSummary.

### CLIENTE 360 INTEGRATION PLAN

**PARTIAL / READY:** Compose `GET /v1/parties/:id` + `GET /v1/parties/:partyId/timeline` + Commercial list queries + Work/Attention (Step 15.1). Agent 4 aggregates in UI.

### TIMELINE STATUS

**PARTIAL (CONDITIONAL PASS)** — `ListPartyTimeline` for PartyGraph + Commercial. Work/Approval deferred (Agent 1).

### CROSS-LANE CHANGE REQUESTS

CLR-01 through CLR-05 **CLOSED**. CLR-06 **CLOSED** (contracted historial domains; Lead deferred).

### ARCHITECTURE DRIFT

**NO**

### LOW-MAINTENANCE HANDOFF

**PASS (CONDITIONAL)** — rebuild documented in `STEP_16_1A_COMMERCIAL_TIMELINE_HARDENING_EVIDENCE.md`.

### EXACT NEXT ACTION

**Agent 4:** Wire Cliente historial + Commercial tabs using timeline and Commercial GET endpoints.

### EXACT NEXT CURSOR PROMPT

```
STEP 16.2 — CLIENTE 360 UI (Agent 4 scope)

Add Cliente detail historial tab using GET /v1/parties/:partyId/timeline
and Commercial list queries filtered by partyId.
Use stale-projection banner. Render facts from timeline entries — no invented policy labels.
Do NOT expose raw event payloads. Do NOT edit backend packages.
```
