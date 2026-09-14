# Wave 2 — final local pilot unblock (warehouse exit)

**Start tip:** `423901f3669b277d590807055856beae0d5e760d`  
**Ending tip:** branch tip of this pass (see git HEAD)  
**Integration pin (unmoved):** `316426f272bce29924ffd4991da88ffe7d421bbd`  
**Deploy / migrate / pin move:** NO  
**LOCAL_PILOT_CORE:** READY (migrations unapplied; Gate C HOLD; SAFE FOR ISA NO)

## Warehouse exit

- `warehouse.outbound.record` registered on `OPERATIONS_ACCESS_SCOPE_KEYS` + session capability list
- V1 planned: Encargado de Almacén may receive outbound (not auto-granted; no person created)
- prisma_port writer via `createPrismaDeliveryStore` + `DeliveryCommandService.recordWarehouseExit`
- receive ≠ allocate ≠ outbound ≠ delivery (negative tests)
- Factory note remains BUSINESS_ROLE_REQUIRES_MAPPING
- Migration `20260915150000_os_delivery` (+ external number) **UNAPPLIED**

## Fulfillment chain (code)

FinishedGoodsReceipt → allocation → warehouse exit → customer delivery

## UI

Warehouse allocate product/Pedido selectors upgraded from giant `<select>` to `SearchableSelect` (tenant-scoped page facts). Full server-side search when live inventory load is wired.

## Gate C packages

- `docs/architecture/GATE_C_MIGRATION_INVENTORY.md`
- `docs/operations/GATE_C_READ_ONLY_EVIDENCE.sql`
- Purchase REWRITE still **BLOCKED**

## Deferred (intentional / visible)

- Purchase transitions: BLOCKED_BY_GATE_C
- Coordination **read**: P1 CROSS_LANE visible limitation
- CUSTOMER_INFORMED_OF_ORDER: P1 FOUNDATION_GAP
- Special-order write: P1 CROSS_LANE
- delivery.record remains unassigned to a V1 function (explicit grant only)

## Journey readiness

| Journey | State | First breakpoint |
|---|---|---|
| Vender | READY_LOCAL | coverage migration unapplied / HOSTED |
| Atender un Pedido | PARTIAL | Guiado pattern-only |
| Producción | READY_LOCAL | migrations unapplied / HOSTED |
| Cumplir Pedido | READY_LOCAL | migrations unapplied / HOSTED |
| Entregar | READY_LOCAL | migrations unapplied / HOSTED; delivery.record must be explicitly assigned |
| Resolver un problema | PARTIAL | prior-decision read P1 closed |
| Coordinar la empresa | PARTIAL | read P1 closed |
| Gerencia | PARTIAL | hosted honesty; purchase/read gaps visible |

## Gates

- Gate A: LOCAL DEPLOYMENT CANDIDATE READY
- Gate C: HOLD / BLOCKED_DB_STATE_UNKNOWN
- SAFE FOR ISA / ÁLVARO: NO
