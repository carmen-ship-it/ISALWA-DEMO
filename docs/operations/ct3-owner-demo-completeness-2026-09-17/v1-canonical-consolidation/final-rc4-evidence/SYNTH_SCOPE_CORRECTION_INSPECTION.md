# SYNTH membership scope-correct — INSPECT ONLY (not executed)

**Status:** SYNTH_SCOPE_CORRECTION_EXECUTED = NO  
**Carmen must separately authorize** before any staging run.

## Identity

| Field | Value |
|-------|--------|
| SCRIPT_PATH | `packages/os-database/src/staging-carmen-synth-demo-membership-scope-correct.ts` |
| RELATED_GRANT_SCRIPT | `packages/os-database/src/staging-carmen-synth-demo-membership.ts` (full allowlist grant; also not executed) |
| TARGET_TENANT | Staging DB only (`assertStagingDatabaseName`) |
| TARGET_ORG | SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5` |
| TARGET_MEMBERSHIP_ID | Resolved at runtime: Carmen person → active member in SYNTH org |
| TARGET_PERSON/ACTOR | `carmen.staging@isalwa.demo` (or `STAGING_ADMIN_EMAIL`) |
| TARGET_DATA_MODE | SYNTH / Demo owner-evaluation membership (not REAL) |

## Scope sets

| Field | Value |
|-------|--------|
| CURRENT_SCOPES | Runtime-only (`CARMEN_SYNTH_SCOPES_BEFORE` log). Not queried at cut. |
| PROPOSED_SCOPES | Exact `OWNER_DEMO_SYNTH_BUSINESS_SCOPES` (21 keys) — see `staging-carmen-synth-demo-scopes.ts` |
| ADDED_SCOPES | Runtime: any PROPOSED missing from CURRENT |
| REMOVED_SCOPES | Runtime: any CURRENT in forbidden set OR not in allowlist |

### PROPOSED_SCOPES (approved V1 business only)

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

### Forbidden (must never remain / never add)

`system.admin`, `integration.admin`, `people.admin`, `master_data.admin`, `qa.access`

## ADDED scopes — why (when missing)

| SCOPE | WHY_REQUIRED | V1_FEATURE | CONTRACT |
|-------|--------------|------------|----------|
| commercial.customer.create | Create customers in Demo | Cliente / Nueva cliente | Owner-eval business allowlist |
| commercial.org.read | Org-wide commercial read | Pedidos index, audit, Cliente360 org | Owner-eval; leadership visibility |
| commercial.team.read | Team commercial lens | View As / desks | Owner-eval |
| commercial.quote.convert.own | Own quote → Pedido | Convertir a Pedido | Commercial convert |
| commercial.order.convert | Convert path where required | Pedido creation | Commercial convert |
| commercial.price.approve | Price exception approval | Aprobaciones | Business capability (not people.admin) |
| commercial.account.reassign | Reassign responsable | Cliente360 reassignment | commercial.account.reassign |
| coordination.decision.record | Coordination facts | Ops / decisions | Owner-eval |
| delivery.record | Nota / entrega | Delivery + PDF | delivery.record |
| finance.operational.record | Finance desk | Finanzas | Owner-eval |
| **issue.manage** | **Resolve / triage issues** | **Resolver incidencia** | **issue-authority-matrix** |
| management.org.read | Gerencia metrics + audit | Gerencia / Auditoría | management.org.read |
| operations.coordinator.record | Ops coordinator | Reviews / ops | Owner-eval |
| production.entry.member | Production entry | Producción | Owner-eval |
| production.operational.record | Production notes | Producción | Owner-eval |
| production.review.member | Production review | Solicitar revisión Producción | OrderPrep |
| purchasing.operational.record | Purchasing review | Solicitar revisión Compras | OrderPrep |
| warehouse.finished_goods.allocate | FG allocate | Almacén | Owner-eval |
| warehouse.finished_goods.receive | FG receive | Almacén | Owner-eval |
| warehouse.outbound.record | Salida | Almacén / outbound | Owner-eval |

## Safety flags (expected)

| Flag | Expected |
|------|----------|
| SCRIPT_IDEMPOTENT | YES (ends extras; creates only missing allowlist rows) |
| SCRIPT_REVERSIBLE | NO (ended assignments need manual restore; adds are soft-reversible by ending) |
| REAL_TOUCHED | NO |
| OTHER_MEMBERSHIPS_TOUCHED | NO |
| REAL_SEVEN_MUTATED | NO |

## Constraints satisfied by code

- SYNTH org only  
- Carmen owner-eval membership only  
- No REAL membership mutation  
- No people.admin / master_data.admin / qa.access / system.admin / integration.admin grants  
- “Full business allowlist” = `OWNER_DEMO_SYNTH_BUSINESS_SCOPES` only
