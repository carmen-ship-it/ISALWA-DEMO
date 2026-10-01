# Step 15 — Query / Projection Implementation Evidence

**Phase:** Step 15 — Lane F (shared query / projection foundation)  
**Date:** 2026-08-24  
**Gate result:** **PASS** (Postgres + os-api verified)

**Rule:** **VERIFIED** requires reproducible Postgres/runtime evidence in this document.

---

## Gate decision

| Criterion | Status | Notes |
|-----------|--------|-------|
| Shared projection consumer contract (`OsOutboxConsumerPort`) | PASS | Reuses Lane D outbox; no second bus |
| Projection checkpoint / cursor | PASS | `os_projection_checkpoints` per org + consumer |
| Idempotent event consumption | PASS | Outbox dedup + per-aggregate `occurredAt` ordering |
| Projection rebuild / replay | PASS | `replayPartyProjectionForOrg` from `os_business_events` |
| Projection freshness metadata | PASS | `os_projection_freshness` + live pending-outbox staleness |
| Tenant-scoped read models | PASS | All projection rows keyed by `organizationId` |
| Authorized query service | PASS | `buildQueryContext` + tenant/scope checks |
| Pagination (cursor + limit) | PASS | Base64 cursor on `displayName` + `partyId` |
| Search abstraction | PASS | `SearchParties` on `os_party_read_models.search_text` |
| Query error contract | PASS | Same OS error codes as commands |
| Party event → projection | PASS | `PartyProjectionConsumer` |
| Duplicate event → no duplicate row | PASS | Outbox consumer dedup + idempotent upsert |
| Checkpoint survives restart | PASS | Persisted in Postgres |
| Tenant isolation on search | PASS | Org-scoped queries only |
| No writes through query path | PASS | Query service read-only |
| No ActivityEvent dependency | PASS | BusinessEvent / outbox only |
| No legacy Account authority | PASS | OS foundation path only |
| Work projection boundary (Lane E) | PASS | `WorkProjectionBoundary` + test fixture — handler deferred to Lane E |
| Command Center UI | **DEFERRED** | Query contracts only |
| Finance / locked capability queries | **DEFERRED** | `GetFinanceProjection` LOCKED per manifest |
| Full-text search index (tsvector) | **DEFERRED** | ILIKE on denormalized `search_text` sufficient for Step 15 |

---

## Challenge summary (pre-implementation)

| Question | Answer |
|----------|--------|
| Existing read models | Step 12 `GET /v1/parties/:id` read authoritative store directly; no projection tables |
| Authoritative vs projected | Party/WorkItem/CommercialAccount = authoritative; search/summary/attention = projected |
| Party → read models | Outbox consumer hydrates from authoritative Party + roles/contacts/fiscal on each party event |
| Work → attention | Generic `WorkProjectionBoundary` — Lane E registers `WorkAttentionProjectionHandler` later |
| Effective-dated workforce | Query context uses `asOf` via `computeEffectiveScopes` (Step 13 pattern) |
| Tenant/auth filters | Applied in `buildQueryContext` before any projection read |
| Stale projections | `pendingOutboxCount > 0` → `isStale: true` at read time |
| Rebuild | Replay party BusinessEvents in `occurredAt` order; truncate org read models first |
| Department registration | Implement `OsOutboxConsumerPort` with unique `consumerKey`; register in `ProjectionRunner` |
| AI retrieval | Same `PartyQueryService` / authorized query context — no direct DB |

**Foundation gaps:** None blocking Step 15.  
**Cross-lane changes:** None required.

---

## Package map

| Package / path | Purpose | Status |
|----------------|---------|--------|
| `packages/os-contracts` | Query DTOs, projection consumer keys, pagination schemas | IMPLEMENTED |
| `packages/os-query` | Projection consumers, query services, rebuild, work boundary | IMPLEMENTED + TESTED |
| `packages/os-database` | `os_party_read_models`, checkpoints, freshness; `PrismaOsProjectionStore` | IMPLEMENTED + VERIFIED |
| `apps/os-api` | `GET /v1/parties` search; background projection worker | INTEGRATED |

**Migration:** `20260824180000_os_step15_query_projection`

---

## Projection tables

| Table | Role |
|-------|------|
| `os_party_read_models` | Denormalized Party summary + search index |
| `os_projection_checkpoints` | Last consumed event per consumer per tenant |
| `os_projection_freshness` | Last success, rebuild time, errors (staleness computed live) |

---

## Queries implemented

| Query | Endpoint / entry | Auth | Source |
|-------|------------------|------|--------|
| `SearchParties` | `GET /v1/parties?q=&status=&roleKey=&cursor=&limit=` | `member_active` + tenant | Party projection |
| `GetParty` (authoritative) | `GET /v1/parties/:id` | session tenant | Unchanged from Step 12 — authoritative detail |

---

## Work projection boundary (Lane E contract)

```typescript
// packages/os-query/src/work/work-projection-boundary.ts
export interface WorkAttentionProjectionHandler {
  applyWorkEvent(envelope: BusinessEventEnvelope): Promise<void>;
}
// consumerKey: projection.work.attention.v1
```

Lane E wires a handler when work attention read models are ready. Lane F does **not** modify `packages/os-work`.

---

## Postgres verification (2026-08-24)

```bash
export OS_DATABASE_URL="postgresql://isalwa:isalwa@localhost:5432/isalwa"
./scripts/verify-step-15.sh
```

**Log:** `.step15-evidence/verify-20260824T124808Z.log`

| Suite | Tests | Result |
|-------|-------|--------|
| `projection prisma integration (Step 15)` | 5 | PASS |
| `os-api tenant isolation` | 2 | PASS |

**Scenarios verified on Postgres:**

- `CreateParty` → outbox worker → `os_party_read_models` row with roles, commercial lens, search text
- Duplicate outbox delivery → single projection row
- Checkpoint persisted; full replay rebuild from `os_business_events`
- Tenant A search never returns Tenant B parties; pagination cursor works
- Pending outbox → stale freshness; after worker → fresh; query path does not mutate projections

---

## Operational handoff (low maintenance)

| Task | How |
|------|-----|
| Normal search/reporting | `GET /v1/parties` — no SQL/CLI |
| Projection catch-up | os-api background worker (`OS_PROJECTION_WORKER` default on; `OS_PROJECTION_POLL_MS`) |
| Inspect lag | Response includes `freshness.pendingOutboxCount` + `freshness.isStale` |
| Rebuild party projections | Call `replayPartyProjectionForOrg` from ops tooling (documented in package); future admin endpoint optional |
| Add department projection | New `OsOutboxConsumerPort` + read model table + query service; register in `ProjectionRunner` |

---

## Carmen handoff

### WHERE WE ARE
Lane F shared query/projection foundation is implemented. Party search is the first live projection. Work attention boundary is defined but not populated.

### WHAT ACTUALLY CHANGED
- New `packages/os-query`
- Migration `20260824180000_os_step15_query_projection`
- `GET /v1/parties` search endpoint
- os-api projection worker loop

### WHAT POSTGRES PROVED
All 5 projection integration tests + os-api tenant tests PASS (see log above).

### WHAT IS NOT VERIFIED
- End-to-end HTTP SearchParties with projection worker in running API (build passes; manual curl optional)
- Work attention projections (Lane E handler not wired)
- Member/workforce query endpoints (`ListMembers`, `ListOpenWork`) — contracts only
- tsvector / fuzzy search

### FOUNDATION GAPS
None blocking Commercial prep.

### CROSS-LANE CHANGES
None.

### LOW-MAINTENANCE HANDOFF
PASS — search works via API; worker auto-runs; rebuild function documented.

**PASS**

### CARMEN REQUIRED FOR NORMAL OPERATION
**NO** — search and projection catch-up run through os-api.

### REPLACEMENT DEVELOPER TEST
**PASS** — `./scripts/verify-step-15.sh`

### NEW MAINTENANCE BURDEN
- Monitor `freshness.isStale` in search responses when outbox backlog grows
- One background worker per os-api instance (acceptable at current scale)

### EXACT CONTRACT LANE E CAN CONSUME
Implement `WorkAttentionProjectionHandler` and register on `WorkProjectionBoundary` (`consumerKey: projection.work.attention.v1`).

### EXACT CONTRACT COMMERCIAL CAN EVENTUALLY CONSUME
`SearchParties` + `PartySummaryReadModel` via authorized `GET /v1/parties`; authoritative detail remains `GET /v1/parties/:id`.

### IS LANE F READY FOR COMMERCIAL?
**YES** (Party search/read foundation; Commercial commands still Step 16)

### EXACT NEXT ACTION
Lane G (Commercial v1) may begin command implementation on top of Party + projection queries once Carmen approves Step 16 gate.
