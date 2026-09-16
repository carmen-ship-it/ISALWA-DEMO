# Carmen owner-evaluation access receipt (V1 shared login)

**When:** 2026-09-16T18:41Z  
**Worktree:** `.worktrees/wave2-remediation-integrate` · branch `pre-pilot/company-os-pass`  
**Actor:** `carmen.staging@isalwa.demo` · REAL org `01M2DV9F0V5DXS4G89AKF4D5SR` · member `507febfb-59e6-4cd1-9a02-362be66dc5ee`  
**Database:** `isalwa_os_staging` (operator vault `OS_DATABASE_URL`; secrets never printed)  
**Confirm:** `STAGING_FIXTURE_CONFIRM=1`  
**Command:** `STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-carmen-owner-evaluation-grant.ts`

## Safety

| Guard | Result |
|-------|--------|
| Isa/Álvaro accounts created | **NO** |
| `system.admin` granted by this script | **NO** |
| REAL customer truth mutated | **NO** (role assignments only) |
| Technical shortcuts used for business desks | **NO** (explicit BUSINESS scopes only) |

## Grant evidence

| Field | Value |
|-------|-------|
| **BEFORE** | `master_data.admin`, `people.admin`, `qa.access` |
| **MISSING (20)** | `management.org.read`, `commercial.customer.create`, `commercial.team.read`, `commercial.org.read`, `commercial.quote.convert.own`, `commercial.order.convert`, `commercial.account.reassign`, `commercial.price.approve`, `finance.operational.record`, `production.operational.record`, `production.entry.member`, `production.review.member`, `warehouse.finished_goods.receive`, `warehouse.finished_goods.allocate`, `warehouse.outbound.record`, `purchasing.operational.record`, `operations.coordinator.record`, `coordination.decision.record`, `delivery.record`, `issue.manage` |
| **EXACT GRANTED (20)** | same list as MISSING (idempotent inserts; `finance.operational.record` included) |
| **AFTER** | BEFORE ∪ GRANTED; includes `finance.operational.record`; **does not** include `system.admin` |
| **OWNER_EVAL_DONE** | `finance=YES` · `system_admin=NO` |

## Hosted BV (`carmen.staging` @ `https://os-web-staging.onrender.com`)

| Route | Result |
|-------|--------|
| `/finanzas` | **PASS** — desk open (`Registro operativo` / `Finanzas operativas`); **"Sin permiso para el registro operativo" ABSENT** |
| `/almacen` | Desk open / honest operational copy — no false permission deny |
| `/compras` | Desk open / honest operational copy — no false permission deny |
| `/produccion` | Desk open / honest operational copy — no false permission deny |

Evidence JSON (local, not committed): `docs/operations/final-pre-pilot-2026-09-16/carmen-owner-eval-bv/carmen-owner-eval-bv.json`  
DB grant is live immediately — **no deploy required**.

---

## FINAL RETURN

```
CARMEN_OWNER_EVALUATION_PROFILE = READY
WHOLE_BUSINESS_LOOP_VISIBLE = YES
MISSING_BUSINESS_SCOPES_FOUND = management.org.read,commercial.customer.create,commercial.team.read,commercial.org.read,commercial.quote.convert.own,commercial.order.convert,commercial.account.reassign,commercial.price.approve,finance.operational.record,production.operational.record,production.entry.member,production.review.member,warehouse.finished_goods.receive,warehouse.finished_goods.allocate,warehouse.outbound.record,purchasing.operational.record,operations.coordinator.record,coordination.decision.record,delivery.record,issue.manage
EXACT_BUSINESS_SCOPES_GRANTED = management.org.read,commercial.customer.create,commercial.team.read,commercial.org.read,commercial.quote.convert.own,commercial.order.convert,commercial.account.reassign,commercial.price.approve,finance.operational.record,production.operational.record,production.entry.member,production.review.member,warehouse.finished_goods.receive,warehouse.finished_goods.allocate,warehouse.outbound.record,purchasing.operational.record,operations.coordinator.record,coordination.decision.record,delivery.record,issue.manage
FINANCE_OPERATIONAL_ACCESS = PASS
QA_INTERNAL_ONLY = YES
SYSTEM_ADMIN_NOT_USED_AS_BUSINESS_SHORTCUT = YES
ISA_ALVARO_SHARED_EVALUATION_LOGIN_V1 = YES
FUTURE_INDIVIDUAL_ACCOUNTS_REQUIRED_BEFORE_REAL_EMPLOYEE_USE = YES
```

**STOP.**
