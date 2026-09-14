# Wave 2 P0 operating-loop completion pass

**Start tip:** `2388a96fecf2a9bddcf64e767af393cfe788612c`  
**Ending tip:** `0ccbe9d39534358bbfc20dffe1a982da33386965`  
**Integration pin (unmoved):** `316426f272bce29924ffd4991da88ffe7d421bbd`  
**Deploy / migrate / pin move:** NO  
**LOCAL_PILOT_CORE:** NOT_READY

## Quote / coverage

- CreateOrder: owner OR active customer coverage OR `commercial.order.convert`
- Coverage: `OsCustomerCoverageGrant` + `listActiveCustomerCoverageGrants` (migration **unapplied**)
- `commercial.quote.convert.own`: **DEPRECATE_LATER** (own-quote only; unwired into CreateOrder)
- Audit: primary owner, acting advisor, coverage source, converting actor; `sharedOwnership: false`
- Adversarial tests: owner, covering advisor, unrelated, expired/revoked, order.convert, convert.own denied for non-owner

## New additive migration this pass (UNAPPLIED)

- `packages/os-database/prisma/migrations/20260918120000_os_customer_coverage_grant/`

## Pre-existing additive migrations still UNAPPLIED (required for ports)

- `20260915130000_os_production_trace`
- `20260915150000_os_delivery`
- `20260915170000_os_order_allocation`
- `20260916160000_os_coordination_decision`
- `20260917120000_os_finished_goods_receipt`
- (and related catalog/order-line/purchase/conversation/date/price/special-order migrations already on branch)

Blocked rewrite (not applied, not touched for writer):

- `20260916140000_os_purchase_status_workflow` → purchase transitions **BLOCKED_BY_GATE_C**

## REAL_PERSISTENT prisma_port (code ready; migration unapplied)

| Writer | Capability | State |
|---|---|---|
| Production entry / quema / loss / consumption | `production.entry.member` | IMPLEMENTED |
| Finished goods receive | `warehouse.finished_goods.receive` | IMPLEMENTED |
| Allocation (partial/multiple) | `warehouse.finished_goods.allocate` | IMPLEMENTED |
| Customer delivery | `delivery.record` | IMPLEMENTED |
| Coordination decision write | `coordination.decision.record` | IMPLEMENTED |
| Payment evidence (non-ledger) | `finance.operational.record` | IMPLEMENTED |

## Blockers preserved

- Warehouse exit: `WAREHOUSE_EXIT_WRITE_AUTHORITY` CROSS_LANE (`warehouse.outbound.record` not registered)
- Purchase transitions: `BLOCKED_BY_GATE_C`
- Customer informed general: P1 `FOUNDATION_GAP` — `CUSTOMER_INFORMED_OF_ORDER`
- Special order write: CROSS_LANE
- Coordination **read**: CROSS_LANE (write ≠ read)

## Journey readiness (local code)

| Journey | State | First remaining breakpoint |
|---|---|---|
| Vender | PARTIAL | Coverage grant migration unapplied; hosted convert UNPROVEN |
| Atender un Pedido | PARTIAL | Guiado pattern-only; no invented order screen |
| Producción | READY_LOCAL | Migrations unapplied / HOSTED UNPROVEN |
| Cumplir Pedido | READY_LOCAL | Migrations unapplied / HOSTED UNPROVEN |
| Entregar | PARTIAL | Warehouse exit write AUTHORITY_BLOCKED |
| Resolver un problema | PARTIAL | Case/decision read path incomplete; write ≠ board history |
| Coordinar la empresa | PARTIAL | Prior-decision **read** CROSS_LANE |
| Gerencia | PARTIAL | Hosted honesty; purchase/exit gaps surface as incomplete |

## Modo Guiado

Continuar opens existing routes only; copy does not claim live/connected/official. Warehouse allocate UI shows permission text when `canAllocate` is false. Entregar does not invent salida.

## Gates

- Gate A: LOCAL DEPLOYMENT CANDIDATE READY
- Gate C: HOLD / BLOCKED_DB_STATE_UNKNOWN
- SAFE FOR ISA / ÁLVARO: NO
- Staging deploy: blocked until Gate C + controlled migration/deploy plan + warehouse-exit authority decision
