# Step 16.1 — Lane F Commercial Projection Evidence

**Date:** 2026-08-24  
**Lane:** F extension — Commercial read models + authorized queries  
**Verification log:** `.step16-1-evidence/verify-20260824T131442Z.log`  
**Verify script:** `scripts/verify-step-16-1.sh`

---

## Gate summary

| Area | Status |
|------|--------|
| Opportunity projection | **VERIFIED** |
| Quote + line detail projection | **VERIFIED** |
| Order projection | **VERIFIED** |
| Authorized queries + HTTP | **VERIFIED** |
| Rebuild from replay | **VERIFIED** |
| Duplicate delivery idempotency | **VERIFIED** |
| Money centavo parity | **VERIFIED** |
| Party linkage (no duplicate customer) | **VERIFIED** |
| Timeline / historial query | **DEFERRED** |
| Cliente 360 composed UI | **NOT VERIFIED** (Agent 4) |

**Step 16.1 gate:** **PASS (CONDITIONAL)** — core Commercial read path verified; Party timeline query deferred.

---

## Contract stability (Step 16)

All 14 `OS_COMMERCIAL_EVENT_TYPES` carry sufficient identifiers for hydrate-after-event:

| Event family | primaryEntityType | Hydration source |
|--------------|-------------------|------------------|
| opportunity.* | `opportunity` | `OsCommercialStore.getOpportunityInOrg` |
| quote.* | `quote` | `getQuoteInOrg` + `listQuoteLines` |
| order.* | `order` | `getOrderInOrg` |

Event payloads include stable IDs (`opportunityId`, `quoteId`, `orderId`, `partyId`, centavos as strings in payload). **No CROSS_LANE_CHANGE_REQUEST** — approved Party/Work hydrate pattern reused.

---

## Read models

| Model | Table | Consumer key |
|-------|-------|--------------|
| OpportunitySummary | `os_opportunity_read_models` | `projection.commercial.summary.v1` |
| QuoteSummary | `os_quotes_read_models` | same |
| QuoteLine (detail) | `os_quote_line_read_models` | same |
| OrderSummary | `os_order_read_models` | same |

Migration: `20260824210000_os_step16_1_commercial_projection`

---

## Queries + HTTP

| Query | HTTP | Auth |
|-------|------|------|
| ListOpportunities | `GET /v1/opportunities` | member_active; owner scope |
| GetOpportunity | `GET /v1/opportunities/:id` | owner or people.admin |
| ListQuotes | `GET /v1/quotes` | member_active; owner scope |
| GetQuote | `GET /v1/quotes/:id` | includes lines; owner or admin |
| ListOrders | `GET /v1/orders` | member_active; owner scope |
| GetOrder | `GET /v1/orders/:id` | owner or admin |

Filters: `status`, `stage`, `partyId`, `opportunityId`, `quoteId`, `ownerMemberId` (cannot widen scope for non-admin).

---

## Projection consumer

- **File:** `packages/os-query/src/commercial/commercial-projection-consumer.ts`
- **Pattern:** Event triggers refresh; authoritative `OsCommercialStore` is source of truth
- **Quote lines:** Full replace from authoritative store on any quote event
- **Replay:** `replayCommercialProjectionForOrg`
- **Registered in:** `apps/os-api/src/os-store.module.ts` → `ProjectionRunner`

---

## Postgres verification

| Test | Result |
|------|--------|
| Full happy path projection | PASS |
| Stage / owner / line update | PASS |
| Quote cancel | PASS |
| Duplicate event idempotent | PASS |
| Replay rebuild | PASS |
| Tenant + owner authorization | PASS |
| Read path does not mutate authority | PASS |
| Step 16 core regression | PASS (6 tests) |

---

## HTTP runtime verification

| Test | Result |
|------|--------|
| POST commands → drain → GET opportunities/quotes/orders | PASS |
| Cross-tenant GET quote → 404 | PASS |

---

## Cliente 360 read contract

**PARTIAL / READY for composition:**

```
GET /v1/parties/:id          → Party identity (Step 15)
GET /v1/opportunities?partyId=
GET /v1/quotes?partyId=
GET /v1/orders?partyId=
GET /v1/work-items?subjectType=commercial_account
GET /v1/attention            → personal attention (Step 15.1)
```

No composed single endpoint yet — Agent 4 may aggregate in UI layer.

---

## Timeline / historial

**DEFERRED** — `ListPartyTimeline` not in `OS_QUERY_NAMES`. BusinessEvent spine exists; unified authorized timeline projection requires shared contract (CLR-06 from prep doc remains open).

---

## Rebuild procedure

```bash
# Org-scoped rebuild (from integration test pattern):
replayCommercialProjectionForOrg({ projectionStore, commercialStore }, orgId, consumer)

# Operational: ensure outbox drained via GET /v1/operations/outbox or worker
# Diagnose: os_projection_freshness for consumerKey projection.commercial.summary.v1
```

---

## Policy deferrals

No read-side invented policy (no risk scores, credit blocks, territory KPIs).

---

## Related docs

- `STEP_16_COMMERCIAL_CORE_IMPLEMENTATION_EVIDENCE.md`
- `STEP_16_COMMERCIAL_PROJECTION_READINESS.md` (updated)
- `STEP_15_QUERY_PROJECTION_IMPLEMENTATION_EVIDENCE.md`
