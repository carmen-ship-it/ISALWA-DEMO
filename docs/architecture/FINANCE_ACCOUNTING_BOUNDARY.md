# Finance / Accounting Authority Boundary

**Status:** Architecture only — Finance lane **not implemented**  
**Related:** `BOLIVIA_ACCOUNTING_DISCOVERY_MATRIX.md`, ADR `0007-os-finance-boundary.md`

---

## Purpose

Commercial will eventually depend on financial truth. This document defines **who owns what** so the OS does not become a second unofficial ledger and does not fabricate finance when the lane is locked.

**No accounting vendor is selected.** QuickBooks in Architect connector catalog is **scaffolded only** — not an ISALWA recommendation.

---

## Authority split (proposed)

### Authoritative in ISALWA OS (commercial lane)

| Domain | Notes |
|--------|--------|
| Lead, Opportunity, Quote (commercial), Order (commercial state) | Even before Finance active |
| Negotiated price memory (commercial) | With audit |
| Customer communication threads | Linked to Account |
| Commercial commitments (promise-to-pay as commercial object) | Event-backed |
| Visit, field notes | Event-backed |

### Authoritative in external accounting (when connected)

| Domain | Notes |
|--------|--------|
| Official invoice / fiscal document | SIN path deferred in demo |
| General ledger, journal entries | Not duplicated in OS |
| Official accounts receivable / payable | OS **projects** |
| Payroll, inventory valuation | Future lanes |

### OS projects (read models)

| Projection | Fields (illustrative) |
|------------|---------------------|
| `FinanceProjection` | invoiceRef, invoiceStatus, openBalance, agingBucket, paymentReceived, creditHold, creditTerms |
| Metadata | `source`, `sourceRecordId`, `receivedAt`, `effectiveAt`, `freshness`, `provenance`, `conflictState` |

If projection disagrees with another source → **reconciliation** attention item — never silent overwrite.

---

## When Finance capability = LOCKED

- No AR balance KPIs  
- No collection dashboard  
- No AI “finance health” summary  
- Commercial may stage `invoice.requested` — attention: *fiscal issuance not connected*  
- Cross-dept: *credit / balance not verified by accounting system*

---

## Integration adapter pattern

```
External Accounting System
        ↓
Integration Adapter (per vendor — selected after client validation)
        ↓
Validated ingest (idempotent)
        ↓
BusinessEvents (invoice.issued, payment.received, credit.hold.applied, …)
        ↓
FinanceProjection read models
        ↓
Commercial attention / blocks / UI (when authorized)
```

Fallback: Excel/CSV export import with quarantine + human confirm — not silent merge.

---

## Illustrative event flows (NOT approved ISALWA workflows)

| Flow | Example events |
|------|----------------|
| Commercial → Finance | `order.confirmed` → `invoice.requested` |
| Finance → Commercial | `invoice.issued` (external ref) → `balance.updated` |
| Credit | `credit.hold.applied` → Commercial quote blocked |
| Collections | `promise.broken` → attention; `payment.received` → resolve |

Mark all as **architectural examples** until discovery validates.

---

## Bolivia fiscal

- Public NIT for ISALWA S.R.L. is **known** from registry sources (see `PRODUCT_BLUEPRINT.md`).  
- Customer NIT rules, SIN activation, e-invoicing timeline: **CLIENT VALIDATION REQUIRED**.  
- Demo: tax lines = 0; `fiscal_payload_json` nullable in engineering plan.

---

## Dual-run and reconciliation

Mission 15 recommends dual-run periods for fiscal integrations. Architecture requires:

- projection stale TTL  
- `projection.conflict.detected` event  
- manual reconciliation WorkItem  
- audit on applied resolution  
