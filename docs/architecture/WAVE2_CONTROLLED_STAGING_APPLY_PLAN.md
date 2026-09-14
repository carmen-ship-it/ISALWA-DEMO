# Wave 2 — controlled staging apply plan (`ef7eeab`)

**Exact candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Branch:** `wave2/candidate-unified`  
**Integration pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` (must not move)  
**Live Gate C DB evidence:** **ACCEPTED**  
**SQL chain:** **MIGRATION_SQL_SAFE** (full pending sequence including purchase rewrite)  
**Recovery:** **NOT CURRENTLY PROVEN** → do **not** execute until Carmen confirms current PITR/snapshot  
**Execute apply/deploy this pass:** **NO**

Staging: `isalwa-os-staging` · `dpg-dajd3kh5efls738falcg-a` · `isalwa_os_staging` · PG 16.15  
Applied today: **11** migrations (ends `20260913150000_os_client_import`)

---

## PRE (required before APPLY)

### Recovery verification (blocking)

1. Confirm **current** Render PITR / snapshot availability for `dpg-dajd3kh5efls738falcg-a`.
2. Record restore procedure to a **new** instance + re-point `OS_DATABASE_URL`.
3. Do **not** treat historical label `2026-09-13T18:20:13Z` as sufficient alone.

### Candidate / baseline

1. Clean worktree at **`ef7eeabdea5f8f4449ba706caa1a323435d96fcc`** (release candidate).
2. Re-confirm `_prisma_migrations` count = **11**.
3. Capture baseline counts (Carmen’s Gate C set) — must remain unchanged post-migrate:

| Fact | Pre |
|---|---|
| organizations | 2 |
| persons | 4 |
| organization_members | 4 |
| parties | 19 |
| party_role_assignments | 19 |
| commercial_accounts | 19 |
| contacts | 12 |
| locations | 12 |
| opportunities | 2 |
| quotes | 27 |
| quote_lines | 21 |
| orders | 9 |
| work_items | 29 |
| approval_requests | 10 |
| business_events | 345 |
| outbox_messages | 345 |
| import_batches | 4 |
| import_rows | 37 |
| purchase / Wave2 ops tables | NOT_PRESENT |

Do **not** fabricate Wave 2 rows into the seven-customer tenant during migrate.

---

## APPLY (authorized next pass only — DO NOT EXECUTE NOW)

Preferred mechanism: **normal Prisma history** (no skip, no `migrate resolve`, no manual `_prisma_migrations` insert).

```bash
# Exact candidate checkout
git checkout --detach ef7eeabdea5f8f4449ba706caa1a323435d96fcc
# From packages/os-database with staging OS_DATABASE_URL (secret — never commit)
pnpm --filter @isalwa/os-database exec prisma migrate deploy
# or repo-documented equivalent: pnpm --filter @isalwa/os-database migrate:deploy
```

**Expected sequence (18):**

1. `20260914120000_os_reported_operational_fact`
2. `20260914133000_os_commitments_internal_notifications`
3. `20260915100000_os_product_catalog`
4. `20260915110000_os_order_line`
5. `20260915120000_os_operational_case`
6. `20260915130000_os_production_trace`
7. `20260915140000_os_customer_conversation`
8. `20260915150000_os_delivery`
9. `20260915160000_os_customer_committed_date`
10. `20260915170000_os_order_allocation`
11. `20260915180000_os_purchase_request`
12. `20260916100000_os_price_list`
13. `20260916120000_os_special_order`
14. `20260916140000_os_purchase_status_workflow`
15. `20260916160000_os_coordination_decision`
16. `20260917120000_os_finished_goods_receipt`
17. `20260917140000_os_external_document_number`
18. `20260918120000_os_customer_coverage_grant`

**Expected final migration count:** **29**

---

## POST

1. `_prisma_migrations` = 29; last = `20260918120000_os_customer_coverage_grant`
2. Tables present: purchase (+ history/notes), production trace, FG receipts, allocations, warehouse exits, deliveries, coordination decisions, coverage grants, reported facts, catalog, order lines, etc.
3. Purchase constraints allow Isa ids; default `solicitado`
4. Baseline counts unchanged (section PRE)
5. Empty Wave 2 counts (before synthetic fixtures):

| Table / domain | Expected |
|---|---|
| os_purchase_requests | **0** |
| os_purchase_request_status_history | **0** |
| os_production_trace_entries (+ related) | **0** |
| os_finished_goods_receipts | **0** |
| os_order_allocations | **0** |
| os_warehouse_exits | **0** |
| os_deliveries | **0** |
| os_coordination_decisions | **0** |
| os_customer_coverage_grants | **0** |
| os_order_lines | **0** (new; existing 9 orders not backfilled) |

6. App/Prisma validate against schema; then (separate authorization) deploy `ef7eeab` web/api
7. Health + auth smoke only after deploy authorization

---

## ROLLBACK TRIGGER

Stop and restore if any of:

- migrate deploy fails mid-sequence
- baseline count drift on listed foundation/commercial tables
- purchase constraints do not match Isa ids after apply
- unexpected rows appear in Wave 2 tables from migrate itself
- seven-customer integrity drift

**Rollback procedure:** Render PITR/snapshot → new instance → re-point staging `OS_DATABASE_URL` → do not hand-edit schema undo.

---

## PHASE map (unchanged intent)

| Phase | Action | Now |
|---|---|---|
| 0 | Recovery/PITR verification | **BLOCKING** |
| 1 | Pre baseline | captured by Carmen; reconfirm |
| 2 | `prisma migrate deploy` full pending | SQL-ready; wait recovery |
| 3 | Prisma/app compatibility | after migrate |
| 4 | Post counts/integrity | after migrate |
| 5 | Deploy exact SHA `ef7eeab` | separate auth |
| 6 | Hosted health/auth/data smoke | after deploy |
| 7 | Adversarial hosted acceptance | after smoke |
