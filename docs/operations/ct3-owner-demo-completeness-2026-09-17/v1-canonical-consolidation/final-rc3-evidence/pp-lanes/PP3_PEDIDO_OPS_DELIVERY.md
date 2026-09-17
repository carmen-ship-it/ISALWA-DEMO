# PP-3 — Pedido / ops / Nota / Salida / Entrega (manual actions + loop reachability)

**As of:** 2026-09-17  
**Lane:** PP-3  
**Mode:** READ-ONLY code/navigation audit (no product edits; no hosted BV this pass)  
**Anchor pedido (demo seed):** Maderas Oriente `O-000002` · `01M2PMA280KX4AAV7049YKNE07` · party `01M2PM95PV7YP6AECYXSX4GRBW`  
**Related local contract:** `../RC3_POSTSALE_CONTRACT_LOCAL.md` (Approval≠Pedido, Nota≠Salida — LOCAL PASS)  
**Deploy / hosted FULL_POST_SALE_LOOP:** **UNPROVEN** (RC2 FAIL on Pedido auth; RC3 auth fix not yet cut/deployed)

---

## Scoreboard

| Slice | Local code | Reachable in NORMAL nav | Hosted BV |
|---|---|---|---|
| Progress language Cotización→…→Entrega | **PASS** | Pedido lifecycle strip + Entregas progress strip | UNPROVEN |
| Solicitar revisión Producción / Almacén / Compras | **IMPLEMENTED** | Pedido `OrderPrepCard` | UNPROVEN |
| Production update (`Solicitar actualización`) | **IMPLEMENTED** | `/produccion` ops table | UNPROVEN |
| Warehouse facts (ingreso PT) | **IMPLEMENTED** | `/almacen` receive desk | UNPROVEN on RC3 SHA |
| Crear nota de entrega | **IMPLEMENTED** | Pedido panel + `/entregas` ops desk | Prior SYNTH BV PASS (pre-RC3 SHA) |
| PDF nota | **IMPLEMENTED** | `/api/delivery-notes/:id/pdf` link on panel | Prior SYNTH BV PASS |
| Registrar salida | **IMPLEMENTED** | Pedido + `/entregas` (scope-gated) | Prior SYNTH BV PASS |
| Registrar entrega | **IMPLEMENTED** | Pedido + `/entregas` (scope-gated) | Prior SYNTH BV PASS |
| **FULL_POST_SALE_LOOP_HOSTED** (Maderas) | n/a | Blocked if Pedido AccessDenied | **FAIL / BLOCKED** until RC3 deploy + re-prove |

---

## Progress language (canonical)

Two related strips; both fact-only (no auto-advance).

### Pedido detail — full commercial→ops vocabulary

Source: `apps/os-web/lib/operations/pedido-lifecycle.ts` · UI `PedidoLifecycleStrip` on pedido page.

| Step id | Label |
|---|---|
| `cotizacion` | Cotización |
| `pedido` | Pedido |
| `preparacion` | Preparación |
| `nota` | Nota de Entrega |
| `salida` | Salida |
| `entrega` | Entrega |

**Marking rules (facts only):**

| Step | Done when |
|---|---|
| Cotización | `order.quoteId` present |
| Pedido | order document exists |
| Preparación | open OrderPrep review Work **or** `finished_goods.received` evidence linked to this order |
| Nota | issued delivery note |
| Salida | `warehouse_exit.recorded` |
| Entrega | `customer_delivery.recorded` |

**Hard boundaries:** Preparación ≠ Nota; Nota ≠ Salida; Nota alone never marks Salida/Entrega (`pedido-lifecycle.test.ts`, `delivery-progress.test.ts`, `delivery-boundary.test.ts`).

### Entregas desk — post-sale slice

Source: `apps/os-web/lib/delivery/delivery-progress.ts` · UI `DeliveryProgressStrip`.

**Pedido → Nota de Entrega → Salida → Entrega** (no Cotización / Preparación on this strip).

---

## Manual action inventory

### A. Solicitar revisión — Producción / Almacén / Compras

| Field | Value |
|---|---|
| Surface | Pedido detail · `OrderPrepCard` (“Preparación operativa”) |
| CTA copy | **Solicitar revisión** (per department) |
| Command | `CreateWorkItem` via `requestOrderPrepReviewAction` |
| Marker | `[[order-prep:{production\|warehouse\|purchasing}:{orderId}]]` |
| Mutates Pedido / stock / delivery? | **No** — Work only |
| Idempotent | Yes — returns existing open review |
| Production assignee gate | Production **requires** assignee; warehouse/compras fall back to requester as Work owner |
| Assignee wiring on page | Actor only if they hold lane scopes (`canRecordProduction` / receive\|outbound / `canRecordPurchasing`); otherwise production CTA blocked with “Aún no hay un responsable…” |
| Proof | `apps/os-web/lib/commercial/order-prep.test.ts` |

### B. Production update

| Field | Value |
|---|---|
| Surface | `/produccion` · `ProductionOpsTable` |
| CTA copy | **Solicitar actualización** |
| Command | `CreateWorkItem` via `requestProductionUpdateAction` |
| Distinct from OrderPrep? | **Yes** — separate marker / copy (`update-request-work.ts`) |
| Pedido context preserved? | Table rows link back via `orderHref`; CTA does not deep-link from PedidoOpsLaneCards with `?orderId=` |
| Evaluation View As | Mutations disabled when evaluation active |

### C. Warehouse facts (ingreso producto terminado)

| Field | Value |
|---|---|
| Surface | `/almacen` · `WarehousePostSaleDesk` |
| Action | `receiveFinishedGoodsAction` → `ReceiveFinishedGoods` |
| Scope | `warehouse.finished_goods.receive` |
| Claims stock disponible? | **No** — copy + pills: ingreso ≠ asignación; not official stock |
| Pedido link-back | Context list → “Abrir pedido”; FG citation may feed Preparación on pedido lifecycle |
| Revalidate gap | Action revalidates `/almacen` + `/inicio` only — **not** `orderHref` (pedido strip may lag until next party-timeline refresh) |

### D. Crear nota de entrega

| Field | Value |
|---|---|
| Surfaces | (1) Pedido `DeliveryDocumentsPanel` (2) `/entregas` `EntregaOperationalWriteDesk` (same panel) |
| CTA | **Crear nota de entrega** (`ENTREGA_PANEL_COPY.createNota`) |
| Command | `CreateNotaDeEntrega` |
| Scope | `delivery.record` + open order + actor member |
| Prefill | Order lines copied; user enters recipient + deliveredBy + qty |
| Numbering | Provisional `NE-PILOT-…` — not official / not invoice |

### E. PDF

| Field | Value |
|---|---|
| CTA | **Descargar PDF** on issued note |
| Route | `/api/delivery-notes/{id}/pdf` |
| Also in | Document dossier (`nota_pdf`), Cliente360 document links |
| Side effect | Download **≠** Salida (`pdfDownloadCreatesSalida` contract) |

### F. Registrar salida

| Field | Value |
|---|---|
| CTA | **Registrar salida** |
| Command | `RecordSalida` |
| Scope | `warehouse.outbound.record` (not implied by `delivery.record`) |
| Nota required? | **No** — optional `deliveryNoteId` |
| Creates nota? | **No** |

### G. Registrar entrega

| Field | Value |
|---|---|
| CTA | **Registrar entrega** |
| Command | `RecordEntrega` |
| Scope | `delivery.record` |
| Required UI field | Recibido por |
| Auto-creates nota? | **No** |

---

## NORMAL navigation walk (post-sale loop)

Intended happy path for an authorized commercial+ops actor after Convert → Pedido exists.

```
Cliente360 (/clientes/{partyId})
  → Pedidos list (OrderList) → Pedido detail
       ├─ Lifecycle strip (Cotización→…→Entrega)
       ├─ OrderPrepCard → Solicitar revisión Producción|Almacén|Compras → /trabajo
       ├─ PedidoOpsLaneCards
       │     ├─ Abrir producción → /produccion          [orderId NOT passed]
       │     ├─ Abrir almacén   → /almacen              [orderId NOT passed]
       │     └─ Abrir entregas  → /entregas?orderId=…   [orderId preserved]
       └─ DeliveryDocumentsPanel
             → Crear nota → Descargar PDF → Registrar salida → Registrar entrega

Alternate (ops writer without commercial-read):
  Nav Operaciones → /entregas → EntregaOperationalWriteDesk
       → select pedido → same DeliveryDocumentsPanel writes
       → link “Ir a Almacén” for FG receive (not salida)

Alternate warehouse outbound-only:
  /entregas desk with warehouse.outbound.record → Registrar salida only
  Commercial /clientes/…/pedidos/… may AccessDenied (by design — prior BV)
```

### Step-by-step reachability

| Hop | From | To | Reachable? | Notes |
|---|---|---|---|---|
| 1 | Shell Clientes | Cliente360 | Yes | Commercial read |
| 2 | Cliente360 Pedidos | Pedido detail | Yes if `getOrder` allowed | RC2 hosted FAIL for owner Mi vista on Maderas; RC3-A local auth PASS, hosted UNPROVEN |
| 3 | Pedido | Solicitar revisión ×3 | Yes when open + actor | Production blocked without production-scope assignee |
| 4 | Pedido | Escritorio Producción | Yes → `/produccion` | **Context drop:** no `orderId` query; operator re-selects from list |
| 5 | Pedido | Escritorio Almacén | Yes → `/almacen` | Same context drop |
| 6 | Pedido | Escritorio Entregas | Yes → `/entregas?orderId=` | Context preserved |
| 7 | Pedido panel | Crear nota / PDF / Salida / Entrega | Yes if scopes | Buttons hidden when scope missing (not disabled stubs for note when `!allowNote`) |
| 8 | `/produccion` | Solicitar actualización | Yes | Separate from OrderPrep review |
| 9 | `/almacen` | Ingreso PT | Yes if receive scope | Does not register salida |
| 10 | `/compras` | Abastecimiento review visibility | Partial | Sees OrderPrep purchasing Work; **PO SoR write still unwired** (foundation gap) |
| 11 | Nav Operaciones | Any ops desk | Yes | Independent of Pedido URL |
| 12 | Próximo paso on open Pedido | “Ver cliente” | Yes | Does **not** steer into Nota/Salida/Entrega |

---

## Dead ends / friction (NORMAL nav)

| # | Dead end | Evidence | Severity for PP-3 loop |
|---|---|---|---|
| D1 | **Hosted Pedido AccessDenied** blocks entire commercial-rooted loop on Maderas | RC2 receipt; RC3 Pedido auth fix local-only until deploy | **BLOCKER** for FULL_POST_SALE_HOSTED |
| D2 | **PedidoOpsLaneCards → Producción/Almacén lose orderId** | `pedido-ops-lane-cards.tsx` only appends `?orderId=` for delivery | Friction — loop continues via list pick |
| D3 | **orderNextStep** points open Pedido to Cliente, not delivery facts | `next-step.ts` `orderNextStep` | Soft dead end for guided next action |
| D4 | **Production Solicitar revisión** dead if actor lacks production scope (no assignee) | `canRequestOrderPrepReview('production', null) === false` | Soft — warehouse/compras still requestable |
| D5 | **Compras** not on PedidoOpsLaneCards; purchase-request SoR write unwired | Cards = production/warehouse/delivery only; `compras/page.tsx` FOUNDATION_GAP comment | Loop side-branch incomplete for OC |
| D6 | **Scope split**: commercial-only sees panel but no create/salida/entrega CTAs | Prior hosted BV Walk A; page gates `canCreateNote` / `canRecordSalida` / `canRecordEntrega` | Expected gate, not a bug — must switch persona or grant |
| D7 | **Almacén persona** may be denied commercial Pedido URL | Prior BV Walk C | Must use `/entregas` / `/almacen` desks |
| D8 | **ReceiveFinishedGoods** does not revalidate pedido path | `postsale/actions.ts` | Lifecycle Preparación/FG may lag on pedido until refresh |
| D9 | **View As / evaluation** excludes ops desks or read-only | `evaluationAllowsDesk` on produccion/almacen/compras/entregas; production mutations off | Preview path ≠ write path |
| D10 | **Cancelled order** | Write CTAs require `order.status === 'open'` | Hard stop (correct) |

Non-dead-ends worth noting:

- `/entregas` ops desk is a **complete write path** without opening commercial Pedido (by design for warehouse/delivery writers).
- Trabajo links from OrderPrep “Ver trabajo” keep the review loop alive after Solicitar revisión.

---

## Scope matrix (write gates)

| Action | Scope predicate | Primary surfaces |
|---|---|---|
| Solicitar revisión (Work) | Session + CreateWorkItem authority; production assignee rule | Pedido |
| Solicitar actualización | Session + CreateWorkItem | `/produccion` |
| Ingreso PT | `warehouse.finished_goods.receive` | `/almacen` |
| Crear nota / Registrar entrega | `delivery.record` | Pedido + `/entregas` |
| Registrar salida | `warehouse.outbound.record` | Pedido + `/entregas` |
| PDF download | Read of note (API route auth) | Pedido + `/entregas` + dossier |

Contracts: `packages/os-contracts/src/operations-scopes.ts`, `delivery.ts` copy constants.

---

## Local proof citations (do not claim hosted)

| Concern | Suite / doc |
|---|---|
| Nota ≠ Salida ≠ Entrega; PDF ≠ salida | `packages/os-delivery` `delivery-boundary.test.ts` |
| Lifecycle vocabulary + fact marks | `apps/os-web/lib/operations/pedido-lifecycle.test.ts` |
| Entregas progress strip | `apps/os-web/lib/delivery/delivery-progress.test.ts` |
| OrderPrep Work builders | `apps/os-web/lib/commercial/order-prep.test.ts` |
| Pedido org.read after RC3-A | `RC3_POSTSALE_CONTRACT_LOCAL.md` / `order-owner-eval-read.test.ts` |
| Prior SYNTH Entregas BV (non-RC3 SHA) | `docs/operations/final-pre-pilot-2026-09-16/operating-loop-hosted-bv-receipt.md` |

---

## Explicit non-claims

| Claim | Status |
|---|---|
| FULL_POST_SALE_LOOP_HOSTED on Maderas O-000002 under RC3 SHA | **UNPROVEN / BLOCKED** pending cut+deploy+BV |
| Official document numbering / factura | **Not claimed** |
| Compras OC write complete | **Not claimed** — foundation gap |
| Automatic factory / stock / SLA after Pedido | **Not claimed** — manual facts only |
| REAL seven mutated by this audit | **NO** |

---

## Verdict

**PP-3 local reachability: LOOP WIRED with known friction.**  
Manual actions Solicitar revisión (×3), production update, warehouse FG receive, Crear nota, PDF, Registrar salida, and Registrar entrega are **implemented and reachable via NORMAL navigation** from Pedido and/or Operaciones desks. Progress language **Cotización → Pedido → Preparación → Nota → Salida → Entrega** is coded on the Pedido strip.

**Hosted Maderas full loop remains FAIL/BLOCKED** until RC3 Pedido auth is deployed and re-proven. Soft dead ends: ops lane cards drop `orderId` for Producción/Almacén; open-Pedido next-step returns to Cliente; Compras OC write incomplete; persona/scope splits require the correct desk.

**SAFE_TO_CLAIM_PP3_HOSTED_PASS = NO**
