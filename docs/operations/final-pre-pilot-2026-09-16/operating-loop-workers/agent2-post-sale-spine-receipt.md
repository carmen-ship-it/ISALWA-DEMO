# AGENT 2 — POST-SALE SPINE receipt

**When:** 2026-09-16  
**Branch:** `agent2/post-sale-spine`  
**SHA:** `2c6cd1185a2a53e85f20b322aa450ac3cdadcc18`  
**TIP:** `6ec2d5b8aa66b0a730c0c5b622bfe235aba8c5fe` (product tip; receipt docs may trail)  
**Base / map tip:** `03745ab522bb6f4e83b27fbc3353efd598ab07ac` (fast-forwarded)  
**Lane:** Pedido → Producción → Almacén physical receive (not allocate, not delivery)  
**Deploy:** NO · **REAL_SEVEN_MUTATED:** NO

---

## Persistence constitution

| Field | Value |
|---|---|
| **BUSINESS_FACT** | Physical finished-goods receipt into Almacén de Productos Terminados (`OsFinishedGoodsReceipt`). Optional Pedido citation (`contextOrderId` / `contextOrderLineId` / `contextPartyId` / `note`) is operational context only — **not** allocation, reservation, FIFO, valuation, or stock posting. |
| **WRITE_COMMAND** | `ReceiveFinishedGoods` → `receiveFinishedGoods` + `createPrismaFinishedGoodsWriteStore.persistReceiptAndEvent` → durable `os_finished_goods_receipts` + `os_business_events` (`finished_goods.received` / `finished_goods.corrected`), `$transaction` when available. Registered in `command-registry` + `apps/os-api` commands controller. |
| **TENANT_KEY** | Session `organizationId` only. Order/line/product proven in-org via `osOrder` + `osOrderLine.productRefSnapshot`. Foreign / incomplete Pedido context → `invalid_order_context` (not-found equivalence). Suspended / wrong scope denied. |
| **HISTORY_RULE** | Append-only receipts + correction rows (no in-place quantity overwrite). Idempotent retry on `(organizationId, idempotencyKey)` replays the same receipt without a second write. Timeline: `finished_goods.*` allowlisted; party via `payload.partyId` or order→party; Spanish labels on Historial. |
| **REAL_SEVEN_MUTATED** | **NO** |

---

## Defects fixed in this finish pass

1. Prisma port no longer passes domain-only flags (`allocatesToOrder` / `postsStock` / `officialStock`) or ISO strings into `create` — maps DateTime columns and durable fields only.
2. Pedido product proof uses `productRefSnapshot` (schema truth), matching UI handoff `productRef \|\| orderLineId`.
3. API uses stored member `accessStatus` (fail-closed if member missing / foreign org).
4. Concurrent idempotency race: unique-key conflict re-reads and replays.
5. PrismaClient `$transaction` assignability + `pnpm-lock.yaml` workspace link for `@isalwa/os-finished-goods`.

---

## Proof states (do not collapse)

| Capability | State |
|---|---|
| ReceiveFinishedGoods domain + Pedido context | **IMPLEMENTED · TESTED** (`packages/os-finished-goods` 16 pass) |
| Prisma durable write port | **IMPLEMENTED · TESTED** (mock port; hosted apply **UNPROVEN**) |
| API command wiring | **IMPLEMENTED** · hosted **UNPROVEN** (migration not applied this lane) |
| Producción / Almacén Pedido desks | **IMPLEMENTED** · browser **UNPROVEN** |
| Allocation / FIFO / stock ledger | **NOT IN SCOPE** (policy gap unchanged) |
| Delivery commands (Agent 3) | **UNTOUCHED** |
| Hosted BV / deploy | **NOT DONE** (CT) |

---

## Tests run

```text
pnpm test  # @isalwa/os-finished-goods
→ 17 pass / 0 fail (receive + prisma port + reported-fact + writer-matrix)
```

---

## Key paths

- `packages/os-finished-goods/src/receive.ts` (+ tests)
- `packages/os-contracts/src/finished-goods-commands.ts`
- `packages/os-database/prisma/fragments/finished-goods-receipt.prisma`
- `packages/os-database/prisma/migrations/20260920120000_os_finished_goods_receipt_pedido_context/`
- `apps/os-api/src/commands.controller.ts`
- `apps/os-web/lib/postsale/*` · `components/postsale/*` · postsale desks on `/produccion` · `/almacen`
- `docs/handoff/AGENT2_POST_SALE_SPINE.md`

---

## Unblock for Control Tower

1. Apply FG receipt + Pedido-context migration on staging (never REAL seven).
2. Deploy API+web from this SHA (or integrate SHA).
3. Browser-verify Pedido selectors + receive @1440/@390; timeline after synthetic receive.
4. Keep allocate / delivery lanes separate — receive must not substitute for either.
