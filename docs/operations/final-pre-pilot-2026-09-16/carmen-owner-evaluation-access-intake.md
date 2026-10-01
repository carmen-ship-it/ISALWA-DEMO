# Control Tower — V1 owner review access correction (intake)

**When:** 2026-09-16  
**Decision:** First Isa/Álvaro Version 1 review uses **Carmen’s pilot evaluation login** (shared, temporary). No Isa/Álvaro employee accounts yet.

## Profile target

ONE Carmen owner-evaluation profile with explicit **BUSINESS** scopes for the whole normal V1 loop.

- **Not** future workforce model  
- **Not** `system.admin` / `people.admin` as shortcuts for ordinary business desks  
- QA / Ver Como / secrets / IdP / destructive tenant controls remain out of evaluation product

## Finanzas gap (evidence)

Hosted Carmen saw `Sin permiso para el registro operativo` on `/finanzas`.  
Required existing capability: `finance.operational.record` (not implied by `people.admin`).

## Code ready (worktree)

| Artifact | Path |
|---|---|
| Grant list (no system.admin) | `packages/os-database/src/staging-carmen-owner-evaluation-grant-spec.ts` |
| Additive staging CLI | `packages/os-database/src/staging-carmen-owner-evaluation-grant.ts` |
| Unit test | `…-grant-spec.test.ts` **PASS** |

**Grant list (20 business scopes):**  
`management.org.read`, `commercial.customer.create`, `commercial.team.read`, `commercial.org.read`, `commercial.quote.convert.own`, `commercial.order.convert`, `commercial.account.reassign`, `commercial.price.approve`, `finance.operational.record`, `production.operational.record`, `production.entry.member`, `production.review.member`, `warehouse.finished_goods.receive`, `warehouse.finished_goods.allocate`, `warehouse.outbound.record`, `purchasing.operational.record`, `operations.coordinator.record`, `coordination.decision.record`, `delivery.record`, `issue.manage`

## Handoff

Master §2 / §6 / §11 / §14 / §17 / claims updated for temporary shared evaluation login wording (Carmen-approved copy).

## Grant execution

**CLOSED** by `carmen-owner-evaluation-access-receipt.md` · commit `21d4ce5`  
`CARMEN_OWNER_EVALUATION_PROFILE = READY` · `FINANCE_OPERATIONAL_ACCESS = PASS` · 20 BUSINESS scopes · no `system.admin`

(Pre-grant values below are historical only.)

~~`CARMEN_OWNER_EVALUATION_PROFILE = NOT READY`~~  
~~`FINANCE_OPERATIONAL_ACCESS = FAIL`~~

