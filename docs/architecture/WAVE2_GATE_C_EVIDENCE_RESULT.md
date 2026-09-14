# Wave 2 — Gate C evidence result (`ef7eeab`)

**Exact candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Reconciled:** 2026-09-14 (live evidence from Carmen)  
**Integration pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` (unmoved)  
**Deploy / migrate:** **NO**

## Result

**GATE C DB STATE = PROVEN (read-only)**  
**MIGRATION_SQL_SAFE = YES** (for this staging state, full pending chain including purchase rewrite)  
**RECOVERY_READY_TO_APPLY = NO** (current PITR/snapshot not re-verified)  

**Gate C decision for AUTHORIZE APPLY:**

```
BLOCKED_RECOVERY_NOT_PROVEN
```

---

## Live evidence accepted (Carmen / Render os-api-staging shell)

| Fact | Value |
|---|---|
| Operator host purpose | allow-listed read-only shell only |
| Operator host deployed SHA | `1f767fa` (not the release candidate) |
| Database | `isalwa_os_staging` |
| DB user | `isalwa_os_staging_user` |
| PostgreSQL | 16.15 |
| Applied Prisma migrations | **11** |
| Wave 2 migrations applied | **NONE** |
| Purchase tables | **NONE** / `os_purchase_requests` **NOT PRESENT** |
| Purchase rows / status values | **N/A — zero** (table absent) |

No migration/write was executed during evidence capture.

---

## Applied migrations (exact)

1. `20260823120000_os_foundation_step10`
2. `20260824120000_os_step11_outbox_delivery`
3. `20260824140000_os_step12_partygraph`
4. `20260824160000_os_step14_work_approval`
5. `20260824180000_os_step15_query_projection`
6. `20260824190000_os_step15_1_work_attention_projection`
7. `20260824200000_os_step16_commercial_core`
8. `20260824210000_os_step16_1_commercial_projection`
9. `20260824220000_os_step16_1a_party_timeline`
10. `20260913140000_os_location`
11. `20260913150000_os_client_import`

---

## Pre-migration baseline (preserve)

| Table | Count |
|---|---|
| os_organizations | 2 |
| os_persons | 4 |
| os_organization_members | 4 |
| os_parties | 19 |
| os_party_role_assignments | 19 |
| os_commercial_accounts | 19 |
| os_contacts | 12 |
| os_locations | 12 |
| os_opportunities | 2 |
| os_quotes | 27 |
| os_quote_lines | 21 |
| os_orders | 9 |
| os_work_items | 29 |
| os_approval_requests | 10 |
| os_business_events | 345 |
| os_outbox_messages | 345 |
| os_import_batches | 4 |
| os_import_rows | 37 |

Wave 2 tables confirmed **absent** (would be new structures):  
`os_coordination_decisions`, `os_customer_coverage_grants`, `os_deliveries`, `os_finished_goods_receipts`, `os_order_allocations`, `os_production_trace_entries`, `os_purchase_requests`, `os_warehouse_exits`.

---

## Purchase create → rewrite (SQL-proven for this empty staging)

| Step | Migration | Effect on this staging |
|---|---|---|
| CREATE | `20260915180000_os_purchase_request` | Creates empty purchase tables; default status `'requested'`; EN CHECKs |
| intervening | `20260916100000_os_price_list`, `20260916120000_os_special_order` | **No** purchase INSERT/backfill |
| REWRITE | `20260916140000_os_purchase_status_workflow` | DROP old CHECKs → UPDATE 0 rows → default `'solicitado'` → Isa CHECKs |

**Empty-table conditions (all true for this DB):**

1. No purchase rows before `#14` (table absent today; create leaves empty).  
2. No intervening migration inserts/backfills purchase rows.  
3. `#14` succeeds on empty tables (0-row UPDATEs; append-only history trigger does **not** fire when zero rows are updated).  
4. Final CHECKs match Isa workflow ids: `solicitado`, `cotizandose`, `pedido_preparandose`, `entregado`, `cancelled`.

`pedido_preparandose` is a **new allowed status**, not a missing remap of live EN data — **not a live-data-loss problem** on this staging DB.

**Non-empty caveat (not this staging):** if history rows existed, `#14`'s `UPDATE os_purchase_request_status_history` would hit the append-only trigger and fail. That is why empty staging matters.

---

## Standard Prisma apply

Given proven staging state: **`prisma migrate deploy` of the full pending chain is SQL-safe**.  
No skip / `migrate resolve` / manual `_prisma_migrations` insert required.

---

## Recovery

Historical PITR availability label `2026-09-13T18:20:13Z` is **not** current proof.  
Before authorize execute: confirm **current** Render PITR/snapshot restore path for `dpg-dajd3kh5efls738falcg-a` / `isalwa_os_staging`.

---

## Unblock requirement (Carmen)

1. Confirm **current** recovery/PITR (or equivalent restorable snapshot) for staging Postgres.  
2. Authorize controlled apply for candidate `ef7eeab` using normal `prisma migrate deploy`.  
3. Do **not** deploy app until migrate POST checks pass.

Until recovery is proven: **do not apply**.
