# RC4 scope-count reconciliation (21 → 20)

**Date:** 2026-09-17  
**RC4_SHA:** `9e1cfe3ee1f18e568b7f34254e5794cf49baa8b7`  
**SYNTH_SCOPE_CORRECTION_EXECUTED:** NO (verified NOOP; not run)

## Verdict

| Field | Value |
|-------|--------|
| PRIOR_REPORTED_SCOPE_COUNT | 21 |
| CURRENT_CANONICAL_SCOPE_COUNT | 20 |
| PRIOR_21_SCOPE_SOURCE | RC4 cut inspection doc `SYNTH_SCOPE_CORRECTION_INSPECTION.md` prose: `PROPOSED_SCOPES \| Exact OWNER_DEMO_SYNTH_BUSINESS_SCOPES (21 keys)` |
| CURRENT_20_SCOPE_SOURCE | `packages/os-database/src/staging-carmen-synth-demo-scopes.ts` → `OWNER_DEMO_SYNTH_BUSINESS_SCOPES` at RC4_SHA (and all git history of that file: always length 20) |
| SCOPE_PRESENT_IN_PRIOR_21_BUT_NOT_CURRENT_20 | NONE |
| CLASSIFICATION | **COUNTING_ERROR** |
| UNEXPLAINED_SCOPE_LOSS | **0** |

## Proof

The cut-time inspection listed this exact proposed block (20 lines) while labeling it “21 keys”:

```
commercial.customer.create
commercial.org.read
commercial.team.read
commercial.quote.convert.own
commercial.order.convert
commercial.price.approve
commercial.account.reassign
coordination.decision.record
delivery.record
finance.operational.record
issue.manage
management.org.read
operations.coordinator.record
production.entry.member
production.operational.record
production.review.member
purchasing.operational.record
warehouse.finished_goods.allocate
warehouse.finished_goods.receive
warehouse.outbound.record
```

`git show 9e1cfe3:packages/os-database/src/staging-carmen-synth-demo-scopes.ts` → array length **20**.  
Prior commits of the same file also length **20**. No scope was removed from the contract.

Runtime SYNTH membership `0f3da8a7-6d31-4e36-8f45-41331e6f5731` active scopes = the same 20.

## Owner-eval surface sufficiency (canonical 20)

| Surface | Auth path (no tech admin) |
|---------|---------------------------|
| Commercial | commercial.* (create/read/team/quote.convert.own/order.convert/price.approve/account.reassign) |
| Pedido | commercial.order.convert + commercial.quote.convert.own + commercial.org.read |
| Work | operations.coordinator.record + department operational scopes |
| Approvals | commercial.price.approve |
| Issues | issue.manage |
| Commitments | coordination.decision.record |
| Conversations | membership + commercial/ops scopes (no dedicated conversation.* key in product) |
| Production | production.entry.member / operational.record / review.member |
| Warehouse | warehouse.finished_goods.* / outbound.record |
| Purchasing review | purchasing.operational.record |
| Delivery | delivery.record |
| Finance operational | finance.operational.record |
| Management | management.org.read |
| Documents / History / Audit | management.org.read + commercial.org.read |

Forbidden remain absent: `system.admin`, `integration.admin`, `people.admin`, `master_data.admin`, `qa.access`.

## Correction gate

```
SYNTH_SCOPE_CORRECTION_NEEDED = NO
SYNTH_SCOPE_CORRECTION_EXECUTED = NO
SCOPE_COUNT_RECONCILED = YES
```

Authorized to begin full hosted RC4 mutation BV on frozen SHA (disposable SYNTH only).
