# Wave 2 — Gate C evidence result (`ef7eeab`)

**Exact candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Integration pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` (unmoved)  
**Application deploy:** **NO**

## GATE C FINAL STATE

```
GATE C = MIGRATED_AND_VERIFIED
```

Proof states (keep separate):

| State | Status |
|---|---|
| MIGRATED | **YES** — staging DB |
| DEPLOYED | **NO** |
| HOSTED | **NO** (app still prior deploy) |
| BROWSER-VERIFIED | **NO** |
| USER-ACCEPTED | **NO** |

---

## Operator execution (Carmen — accepted)

| Fact | Value |
|---|---|
| Host | Carmen Mac — isolated detached worktree `/tmp/isalwa-gate-c-migrate` |
| SHA before execute | `ef7eeabdea5f8f4449ba706caa1a323435d96fcc` |
| Target DB | `isalwa_os_staging` |
| Pre count | **11** |
| Command | `corepack pnpm --filter @isalwa/os-database migrate:deploy` |
| Prisma result | All migrations have been successfully applied |
| Post count | **29** |
| Failed / unfinished / rolled-back | **0** |
| Recovery used | **NO** (7-day PITR proven immediately before) |
| App deploy | **NO** |

### 18 migrations applied (exact)

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

---

## Baseline drift: NONE

PRE = POST for all preserved foundation/commercial counts (orgs 2 … import_rows 37).

---

## Wave 2 presence + empty state

Tables present: coordination decisions, coverage grants, deliveries, FG receipts, allocations, order lines, production trace entries, purchase requests, warehouse exits (and related structures from the chain).

Empty counts (post-migrate, before fixtures): all listed Wave 2 operational tables = **0**.  
`os_order_lines` = **0** (existing 9 orders not backfilled).  
`os_purchase_requests` = **0**.

---

## Do not

- Rerun migrations  
- Deploy automatically  
- Create fixtures yet  
- Move `wave2/integrate` automatically  

## Next

Bounded **staging application deploy** of exact candidate `ef7eeab` + hosted smoke, then Acceptance Gauntlet — see `WAVE2_STAGING_DEPLOYMENT_CHECKLIST.md` and `WAVE2_NEXT_STAGING_DEPLOY_PASS.md`.
