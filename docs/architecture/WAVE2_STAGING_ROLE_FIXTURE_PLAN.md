# Wave 2 — staging role / capability fixture plan (`ef7eeab`)

**Exact candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Do NOT create fake real employees, emails, or AuthIdentities in this prep pass.**

Source of intended scopes: `packages/os-contracts/src/v1-planned-assignments.ts`  
Authority rule: cargo/title grant **nothing**. Explicit assignment only.

## Execution status

**HOSTED_APP_SHA:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc` (unchanged; not this tooling)  
**Script:** `packages/os-database/src/staging-wave2-role-fixtures.ts`  
**Guards:** fail-closed confirm + staging DB name/host + Supabase ref + migration count 29 — see `WAVE2_FIXTURE_TOOL_PIN.md`  
**Hosted execution:** **NOT RUN** in the tooling pin pass. Operator run is a separate authorize step.

Emails (exact): `w2.asesor|jefe|gerente|produccion|almacen|compras|contabilidad|coordinacion|owner@isalwa.demo`

## Planned synthetic fixtures

Use a **synthetic tenant** distinct from the seven real imported customers.

| Function | Operating home | Planned explicit capabilities | Notes |
|---|---|---|---|
| Asesor Comercial | asesor | `commercial.customer.create`, `commercial.quote.convert.own` | Coverage convert needs separate coverage grant rows + owner semantics |
| Jefe Comercial | jefe | `commercial.team.read` | Exception authorize is **not** auto-granted |
| Gerente General | gerente | `management.org.read` | Not `people.admin` / `system.admin` |
| Encargado de Producción | produccion | `production.operational.record`, `production.entry.member` | Review scope separate / unassigned |
| Encargado de Almacén | almacen | `warehouse.finished_goods.receive`, `warehouse.finished_goods.allocate`, `warehouse.outbound.record` | Three distinct authorities |
| Encargada de Compras | compras | `purchasing.operational.record` | Transitions blocked while purchase REWRITE HOLD |
| Contabilidad / Caja | contabilidad | `finance.operational.record` | Non-ledger payment evidence |
| Auxiliar / Coordinación | auxiliar | `operations.coordinator.record`, `coordination.decision.record` | Write ≠ read |
| Owner / Super Admin | system-controls | `management.org.read`, `system.admin` | Technical layer |

## Explicitly unassigned (must be granted only when testing that path)

| Capability | Why |
|---|---|
| `delivery.record` | Not planned on Almacén; Entregar tester needs explicit grant |
| `commercial.order.convert` | Explicit converter path |
| `commercial.exception.authorize` | Explicit slot |
| `production.review.member` | Separate from entry |
| `people.admin` | Not a business shortcut |

## Preserve separation in fixtures

Never bundle:

`warehouse.finished_goods.receive`  
`warehouse.finished_goods.allocate`  
`warehouse.outbound.record`  
`delivery.record`

into one “warehouse all” grant.

## Real seven customers

- Read-only integrity checks only  
- No synthetic adversarial writes in their tenant  
- No migration backfill targeted at them  
