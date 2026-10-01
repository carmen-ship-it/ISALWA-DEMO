# Step 16 — Lane G Commercial Core Implementation Evidence

**Date:** 2026-08-24  
**Lane:** G — Commercial backend (Phase 1: Opportunity → Quote → Order)  
**Verification log:** `.step16-evidence/verify-20260824T130638Z.log`  
**Verify script:** `scripts/verify-step-16.sh`

---

## Gate summary

| Area | Status |
|------|--------|
| Commercial authority on OS spine | **VERIFIED** |
| PartyGraph customer identity (no duplicate master) | **PASS** |
| Atomic / idempotent commands | **VERIFIED** |
| BusinessEvent / Audit / Outbox | **VERIFIED** |
| Work / Approval boundary (Lane E) | **PASS** — no second approval engine; `RequestApproval` available separately |
| Finance boundary | **PASS** — no ledger / invoice authority |
| Inventory boundary | **PASS** — no stock truth |
| Client policy invented | **NO** |
| Postgres integration | **VERIFIED** (6 tests) |
| Commercial projections (Lane F) | **DEFERRED** → Step 16.1 |
| Product UI (`apps/os-web`) | **NOT VERIFIED** (Agent 4) |

**Step 16 gate:** **PASS (CONDITIONAL)** — backend core verified; read models and product UI deferred.

---

## Architecture audit (pre-implementation)

| Question | Finding |
|----------|---------|
| Existing Commercial contracts | None before Step 16; PartyGraph `CommercialAccount` lens existed (Step 12) |
| Legacy salvage | `apps/api` commerce behavior reference only — **not authority** |
| New authoritative entities | `OsOpportunity`, `OsQuote`, `OsQuoteLine`, `OsOrder` |
| Unknown client policy | RD-02, RD-04, M-01, M-04, M-08, F-07, catalog source, I-02, RD-03 — **not enforced** |
| Blocking unknowns | None for Phase 1 write path |
| Party reference | All commercial rows reference `partyId`; optional `commercialAccountId` from PartyGraph |
| Ownership | `ownerMemberId` on opportunity/quote/order; actor default owner; admin override via `people.admin` |
| Approvals | Lane E `RequestApproval` **not auto-triggered** (no discount thresholds invented) |
| Events | Canonical `BusinessEvent` types — not `ActivityEvent` |
| Finance | Commercial amounts only; no fiscal invoice / AR |
| Inventory | No availability / reservation commands |
| Messaging | No communication truth owned by Commercial |

**Foundation gaps:** None blocking Phase 1.  
**Cross-lane change requests:** None required for core write path. Commercial event types registered in `os-contracts` (D-lane registry extension documented below).

---

## Entities implemented

| Entity | Table | Owner |
|--------|-------|-------|
| Opportunity | `os_opportunities` | Lane G — references Party + optional CommercialAccount |
| Quote | `os_quotes` | Lane G — references Party, optional Opportunity |
| Quote line | `os_quote_lines` | Lane G — deterministic centavos totals |
| Order | `os_orders` | Lane G — created from submitted quote; marks quote `accepted` |

**CommercialAccount:** remains PartyGraph-owned (`os_commercial_accounts`); Commercial only stores FK reference.

---

## Migration

- `packages/os-database/prisma/migrations/20260824200000_os_step16_commercial_core/migration.sql`
- Prisma models: `OsOpportunity`, `OsQuote`, `OsQuoteLine`, `OsOrder`

---

## Commands

| Command | Lifecycle / notes | Auth scope | Verified |
|---------|-------------------|------------|----------|
| `CreateOpportunity` | `open` | `member_active` | YES |
| `UpdateOpportunity` | open only | `member_active` + owner/admin | YES (integration path) |
| `ChangeOpportunityStage` | open only | `member_active` + owner/admin | IMPLEMENTED |
| `CloseOpportunity` | → `won` / `lost` | `member_active` + owner/admin | IMPLEMENTED |
| `AssignOpportunityOwner` | open only; validates target member | `member_active` + owner/admin | IMPLEMENTED |
| `CreateQuote` | `draft` | `member_active` | YES |
| `AddQuoteLine` | draft only | `member_active` + owner/admin | YES |
| `UpdateQuoteLine` | draft only | `member_active` + owner/admin | IMPLEMENTED |
| `RemoveQuoteLine` | draft only | `member_active` + owner/admin | IMPLEMENTED |
| `UpdateQuote` | draft; explicit header discount | `member_active` + owner/admin | IMPLEMENTED |
| `SubmitQuote` | draft → submitted; requires lines | `member_active` + owner/admin | YES |
| `CancelQuote` | draft/submitted; blocked if open order | `member_active` + owner/admin | IMPLEMENTED |
| `CreateOrder` | submitted quote → order; quote → `accepted` | `member_active` | YES |
| `CancelOrder` | open → cancelled | `member_active` + owner/admin | IMPLEMENTED |

All commands: `POST /v1/commands/{commandName}` via `apps/os-api/src/commands.controller.ts`.

---

## Business events

Registered in `packages/os-contracts/src/commercial-events.ts` and merged into `OS_FOUNDATION_EVENT_TYPES`:

- `opportunity.created`, `opportunity.updated`, `opportunity.stage_changed`, `opportunity.closed`, `opportunity.owner_assigned`
- `quote.created`, `quote.updated`, `quote.line_added`, `quote.line_updated`, `quote.line_removed`, `quote.submitted`, `quote.cancelled`
- `order.created`, `order.cancelled`

`capabilityKey: 'commercial'` on emitted events.

---

## Packages / files

| Package | Role |
|---------|------|
| `packages/os-contracts` | `commercial-commands.ts`, `commercial-events.ts`, registry + scopes |
| `packages/os-commercial` | `CommercialCommandService`, store port, money helpers |
| `packages/os-database` | `PrismaOsCommercialStore`, migration, integration tests |
| `apps/os-api` | Command routing wiring |

---

## Money

- Integer **centavos** (`bigint` in Postgres)
- Currency: `BOB` only (extensible enum)
- Deterministic line total: `quantity × unitPrice − lineDiscount`
- Quote total: `sum(lines) − headerDiscount`
- Unit tests: `packages/os-commercial/src/money.test.ts`

---

## Postgres verification

**Script:** `scripts/verify-step-16.sh`

| Test | Result |
|------|--------|
| Happy path Party → Opportunity → Quote → line → Submit → Order | PASS |
| Cross-tenant party rejection | PASS |
| Malformed / negative money | PASS |
| Idempotency (no duplicate opportunity) | PASS |
| Transaction rollback on outbox append failure | PASS |
| Lifecycle rejects (empty submit, order from draft) | PASS |

---

## Policy deferrals (NOT invented)

| ID | Topic | Step 16 behavior |
|----|-------|------------------|
| RD-02 | Discount approval thresholds | Discount fields stored; **no auto-approval** |
| RD-04 | Territory structure | `territoryId` on CommercialAccount only (PartyGraph) |
| M-01 | Capture policy | Not enforced |
| M-04 | Duplicate policy | Not enforced |
| M-08 | Commercial owner rules | Simple owner/admin edit gate only |
| F-07 | Credit policy | Not enforced |
| — | Catalog source | Optional `productRef` on lines; no catalog authority |
| I-02 | Messaging inclusion | Not implemented |
| RD-03 | Accounting provider | Finance lane locked |

---

## Boundaries

| Boundary | Status |
|----------|--------|
| PartyGraph integration | **PASS** — customer identity not duplicated |
| Work / Approval | **PASS** — no CommercialApproval engine |
| Finance | **PASS** — no invoice/ledger |
| Inventory | **PASS** — no stock commands |
| Legacy Account / ActivityEvent | **PASS** — not used as authority |

---

## Deferred (Step 16.1+)

- Commercial projection consumer + authorized read queries (Lane F extension)
- HTTP runtime tests for Commercial commands (os-api)
- Quote production UI (`apps/os-web` — Agent 4)
- Explicit `RequestApproval` integration when client defines thresholds

---

## Carmen-disappearance checklist

1. `docker compose up` + `OS_DATABASE_URL=postgresql://isalwa:isalwa@localhost:5432/isalwa`
2. `bash scripts/verify-step-16.sh`
3. Trace: command → `CommercialCommandService` → Prisma tables → `os_business_events` / `os_audit_logs` / `os_outbox_messages`
4. Extend: add field to store-types + migration + command handler + event payload + test

**Carmen required for normal commercial operation:** **NO** (backend) / **YES** (product UI until Agent 4 ships Commercial screens)

---

## Related docs

- `docs/architecture/COMMERCIAL_IMPLEMENTATION_READINESS.md`
- `docs/architecture/STORAGE_CONTRACT.md`
- `docs/architecture/API_SERVICE_CONTRACT.md`
- `docs/adr/0007-os-finance-boundary.md`
