# Carmen SYNTH membership — MINIMUM SCOPE CORRECTION

**At:** 2026-09-17  
**Org:** SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5` only  
**Member:** `0f3da8a7-6d31-4e36-8f45-41331e6f5731` (`carmen.staging@isalwa.demo`)  
**Script:** `packages/os-database/src/staging-carmen-synth-demo-membership-scope-correct.ts`  
**Policy:** `packages/os-database/src/staging-carmen-synth-demo-scopes.ts`

## Result

| Field | Value |
|---|---|
| CARMEN_SYNTH_MEMBERSHIP_APPLIED | **YES** |
| CARMEN_SYNTH_SCOPE_COUNT_BEFORE | **23** |
| CARMEN_SYNTH_SCOPE_COUNT_AFTER | **20** |
| PEOPLE_ADMIN_PRESENT | **NO** |
| MASTER_DATA_ADMIN_PRESENT | **NO** |
| QA_ACCESS_PRESENT | **NO** |
| SYSTEM_ADMIN_PRESENT | **NO** |
| OWNER_EVAL_ADMIN_BYPASS_REQUIRED | **NO** |
| ROLE_PREVIEW_CHANGES_AUTHORITY | **NO** |
| REAL_MEMBERSHIP_CHANGED | **NO** |
| REAL_STAFF_MEMBERSHIPS_CHANGED | **NO** |
| REAL_SEVEN_MUTATED | **NO** |

## BEFORE_SCOPES (23)

```
commercial.account.reassign
commercial.customer.create
commercial.order.convert
commercial.org.read
commercial.price.approve
commercial.quote.convert.own
commercial.team.read
coordination.decision.record
delivery.record
finance.operational.record
issue.manage
management.org.read
master_data.admin          ← REMOVED
operations.coordinator.record
people.admin               ← REMOVED
production.entry.member
production.operational.record
production.review.member
purchasing.operational.record
qa.access                  ← REMOVED
warehouse.finished_goods.allocate
warehouse.finished_goods.receive
warehouse.outbound.record
```

## AFTER_SCOPES (20)

```
commercial.account.reassign
commercial.customer.create
commercial.order.convert
commercial.org.read
commercial.price.approve
commercial.quote.convert.own
commercial.team.read
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

## REMOVED_SCOPES

| Scope | Why removed |
|---|---|
| `people.admin` | Member/people administration — not owner-eval business authority |
| `master_data.admin` | Unrestricted master-data admin — fixtures supply reference data |
| `qa.access` | QA bypass — must not be on owner acceptance path |

## ADDED_SCOPES

*(none)*

## WHY_EACH_REMAINING_SCOPE_IS_REQUIRED

| Scope | Owner-demo business reason |
|---|---|
| `commercial.customer.create` | View/create clients / Cliente360 commercial path |
| `commercial.org.read` | Org commercial read for owner evaluation |
| `commercial.team.read` | Team commercial visibility |
| `commercial.quote.convert.own` | Explicit eligible Quote → Pedido (own) |
| `commercial.order.convert` | Supported convert path where product requires it |
| `commercial.price.approve` | **Explicit demo business approval capability** (not people.admin / system.admin) |
| `commercial.account.reassign` | Governed commercial owner reassignment UI |
| `coordination.decision.record` | Coordination decision evidence |
| `delivery.record` | Delivery Note / DN PDF / delivery evidence |
| `finance.operational.record` | Finance operational desk |
| `issue.manage` | Issues / commitments work |
| `management.org.read` | Gerencia factual metrics |
| `operations.coordinator.record` | Ops coordinator facts / reviews |
| `production.entry.member` | Production entry facts |
| `production.operational.record` | Production operational notes |
| `production.review.member` | Production review when requested |
| `purchasing.operational.record` | Purchasing operational context |
| `warehouse.finished_goods.allocate` | FG allocation evidence |
| `warehouse.finished_goods.receive` | FG receipt evidence |
| `warehouse.outbound.record` | Salida / outbound record |

## Approval distinction

- Canonical approval **routing** demos use SYNTH named responsible approver (Cargo display ≠ RBAC).
- Carmen may execute an approval interaction only via **`commercial.price.approve`** as deliberate owner-eval business capability.
- **Not** via `people.admin` / `system.admin`.

## Negative proof (SQL)

| Check | Result |
|---|---|
| Forbidden scopes active on SYNTH | **0 rows** |
| Ended history for people/master_data/qa | **ended=true** for all three |
| REAL `people.admin` on REAL member | **still 1** (unchanged) |

## Policy code

Grant script now intersects REAL scopes with `OWNER_DEMO_SYNTH_BUSINESS_SCOPES` and forbids admin/QA. Unit tests: `staging-carmen-synth-demo-scopes.test.ts` (3 pass).
