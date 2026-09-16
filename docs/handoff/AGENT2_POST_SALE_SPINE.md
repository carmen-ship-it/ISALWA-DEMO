/**
 * AGENT 2 — POST-SALE SPINE
 * Base: 2c931b48fc2ef7370972c75872de066c8bf5c34b
 * Branch: agent2/post-sale-spine
 *
 * Durable Pedido → Producción → Almacén handoff without inventing factory policy.
 * Control Tower owns final API/migration apply / deploy / hosted proof.
 */

# Proof states (do not collapse)

| Capability | State |
|---|---|
| Pedido handoff context + selectors | IMPLEMENTED · TESTED |
| Production human annotation (existing model) | IMPLEMENTED (reuse) · Pedido context UI IMPLEMENTED |
| Expected date → Work dueAt → Attention | IMPLEMENTED · TESTED (payload) · HOSTED UNPROVEN |
| Finished-goods physical receipt + Pedido context | IMPLEMENTED · TESTED · migration/API HOSTED UNPROVEN |
| Allocation / reservation | POLICY_GAP (unchanged) |
| Cliente360 timeline FG events | IMPLEMENTED (association + labels) · HOSTED UNPROVEN |
| Real seven mutation | NO (no hosted write against REAL tenant in this lane) |

# Carmen handoff

ORDER_AS_POSTSALE_ROOT: YES — Pedido is the handoff selector on `/produccion` and `/almacen` (`PedidoHandoffPanel`). Shows customer, originating quote, lines, quantities, commercial context, and human-recorded evidence slots. No opaque ID entry.

PRODUCTION_CONTEXT: YES — Pedido supplies inherited context. Manufacturing annotation remains product-keyed (`OsProductionTraceEntry`); no Order→ProductionRun and no competing state machine.

PRODUCTION_MANUAL_FACTS: YES — Employee selects Pedido + line/product, records human-confirmed milestone (step + note). Uses existing `production.entry.member` / process annotation. Does not auto-start/complete from unrelated events. No invented SLA.

EXPECTED_DATE_ATTENTION: YES (architecturally safe) — Optional expected datetime builds existing `CreateWorkItem` with `dueAt` on customer `party` (WorkSubjectType has no order). Overdue surfaces via existing `overdue_work` Attention. No reminder intervals invented.

FINISHED_GOODS_RECEIPT: YES — `ReceiveFinishedGoods` wired on os-api via prisma port. Optional `contextOrderId` / `contextOrderLineId` / `note` after tenant order-line+product proof (`productRefSnapshot`). Still `allocatesToOrder: false`, `postsStock: false`. Bare `orderId`/`orderLineId`/`sku` rejected. Append-only + idempotent retry. Migration fragment present; hosted apply / BV = Control Tower / UNPROVEN.

ALLOCATION_REMAINS_POLICY_GAP: YES — Receive ≠ allocate. Allocate UI stays V1-validate when write not mounted. No FIFO / valuation / reservation priority invented.

NO_DUPLICATE_ENTRY: YES — Customer / quote / lines / product inherited from Pedido SoR selectors; not retyped.

HISTORY_VISIBLE: YES (wiring) — FG events on PARTY_TIMELINE_EVENT_TYPES allowlist + party association via partyId/orderId + Spanish labels. Hosted projection UNPROVEN until events persist.

NEGATIVE_AUTH: YES (tests) — Receive denies wrong scope, suspended access, foreign/invalid Pedido context, invalid quantity, allocation-shaped links. Warehouse desk unlocks on receive or allocate; neither implies the other. Production entry still not implied by `production.operational.record`.

REAL_SEVEN_MUTATED: NO — This lane adds no hosted mutation against the protected REAL staging tenant. Fixture guards (`assertNotRealTenant`) unchanged. Persist path remains migration/API-gated.

# Key paths

- `packages/os-finished-goods/src/receive.ts` (+ tests)
- `packages/os-database/prisma/fragments/finished-goods-receipt.prisma`
- `packages/os-query/src/party/party-timeline-association.ts`
- `apps/os-web/lib/postsale/*`
- `apps/os-web/components/postsale/pedido-handoff-panel.tsx`
- `apps/os-web/components/production/production-postsale-desk.tsx`
- `apps/os-web/components/warehouse/warehouse-postsale-desk.tsx`
- `apps/os-web/app/(app)/produccion/page.tsx`
- `apps/os-web/app/(app)/almacen/page.tsx`

# Unblock for Control Tower

1. Apply finished-goods Pedido-context migration on staging (never REAL seven).
2. Deploy API+web from agent2 SHA (or integrate SHA).
3. Browser-verify Pedido selectors @1440/@390 and timeline after a synthetic receive.
