# CT3-F — Pedido / ops next-step density receipt

**Date:** 2026-09-17  
**Lane:** CT3-F (PEDIDO / OPERATIONS NEXT-STEP GUIDANCE)  
**Branch:** `ct3/lane-f-ops`  
**Base:** `4b85b115c3fe0cf009f605d65b043b5e2fb7c11b`  
**Tip:** _(set after final commit)_  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-lane-f-ops`  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy:** not performed (worker lane)  
**Hosted:** **UNPROVEN**

---

## Carmen plain language

Pedido detail now opens with a clear top card (number, client, source quote, total, date, responsible), a facts-only lifecycle strip **Cotización → Pedido → Preparación → Salida → Entrega**, then the existing **Prep operativa** (`OrderPrepCard` preserved), then Production / Warehouse / Delivery desk links. **Estado conocido** lists **CONFIRMADO / PENDIENTE DE CONFIRMAR / NO REGISTRADO** plus **RECOMENDACIÓN** and **A QUIÉN PREGUNTAR** from recorded facts only — no invented factory stock, PO, or revenue.

Ops desks gained next-step density: Producción summary + Solicitar actualización Work; Almacén summary + Registrar ingreso de producto terminado; Compras summary without automatic OC; Entregas summary + per-order Pedido/Nota/Salida/Entrega progress; Finanzas stays concise with **Pendiente de confirmar**; Mi trabajo shows Para hoy / Vencido / Próximo / Sin fecha with amber/red/green due rails.

---

## Delivered

| Capability | Proof state |
|---|---|
| Pedido hero card | **IMPLEMENTED** |
| Lifecycle strip (facts only) | **IMPLEMENTED** + **TESTED** |
| Estado conocido CONFIRMADO / PENDIENTE / NO REGISTRADO | **IMPLEMENTED** + **TESTED** |
| OrderPrepCard preserved | **IMPLEMENTED** (CT2 wired; not rewritten) |
| Production / Warehouse / Delivery lane cards | **IMPLEMENTED** |
| Bounded Documents / Work / Timeline | **IMPLEMENTED** |
| Production ops table + Solicitar actualización | **IMPLEMENTED** + **TESTED** (work builder) |
| Warehouse summary + PT receive CTA | **IMPLEMENTED** |
| Purchasing summary + linked pedidos (no auto PO) | **IMPLEMENTED** |
| Delivery summary + progress strip | **IMPLEMENTED** + **TESTED** |
| Finance concise + certainty pill | **IMPLEMENTED** |
| Trabajo summary buckets + due colors | **IMPLEMENTED** + **TESTED** |
| Approvals / Issues visual tones | **IMPLEMENTED** (existing tone helpers) |
| Hosted / browser verify | **UNPROVEN** (no deploy) |

---

## Files

### Lib
- `apps/os-web/lib/operations/pedido-known-state.ts`
- `apps/os-web/lib/operations/pedido-known-state.test.ts`
- `apps/os-web/lib/operations/pedido-lifecycle.ts`
- `apps/os-web/lib/operations/pedido-lifecycle.test.ts`
- `apps/os-web/lib/delivery/delivery-progress.ts`
- `apps/os-web/lib/delivery/delivery-progress.test.ts`
- `apps/os-web/lib/production/update-request-work.ts`
- `apps/os-web/lib/production/update-request-work.test.ts`
- `apps/os-web/lib/production/update-request-actions.ts`
- `apps/os-web/lib/work/trabajo-summary.ts`
- `apps/os-web/lib/work/trabajo-summary.test.ts`
- `apps/os-web/lib/work/due-visual.ts`
- `apps/os-web/lib/work/due-visual.test.ts`
- `apps/os-web/lib/delivery/map-fulfillment.ts` (orderId on panel rows)
- `apps/os-web/lib/finance/copy.ts`

### Components
- `apps/os-web/components/operations/pedido-detail-hero.tsx`
- `apps/os-web/components/operations/pedido-known-state-card.tsx`
- `apps/os-web/components/operations/pedido-lifecycle-strip.tsx`
- `apps/os-web/components/operations/pedido-ops-lane-cards.tsx`
- `apps/os-web/components/production/production-ops-table.tsx`
- `apps/os-web/components/delivery/delivery-progress-strip.tsx`
- `apps/os-web/components/delivery/entrega-summary-strip.tsx`
- `apps/os-web/components/delivery/entrega-panel.tsx`
- `apps/os-web/components/warehouse/warehouse-postsale-desk.tsx`
- `apps/os-web/components/finance/finance-operational-desk.tsx`
- `apps/os-web/components/work/work-list.tsx`

### Pages
- `apps/os-web/app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx`
- `apps/os-web/app/(app)/produccion/page.tsx`
- `apps/os-web/app/(app)/almacen/page.tsx`
- `apps/os-web/app/(app)/compras/page.tsx`
- `apps/os-web/app/(app)/entregas/page.tsx`
- `apps/os-web/app/(app)/finanzas/page.tsx`
- `apps/os-web/app/(app)/trabajo/page.tsx`

### Receipt
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/workers/lane-f-receipt.md`

---

## Honesty constraints honored

- Lifecycle / delivery progress mark **done** only from recorded facts — never from commercial status labels alone
- No fake stock available, automatic PO, or invented revenue
- Production update Work uses canonical production owner when known; otherwise actor-owned coordination Work (no invented plant owner)
- Finance stays operational-record only; no progress bar; disclaimer not spammed on denied state
- Delivery-note PDF CTAs remain on Pedido `DeliveryDocumentsPanel` where authorized
- Did **not** own Conversations, Map, Management funnel, Cliente360 tabs, Quote PDF primary
- REAL untouched; no deploy

---

## Tests run (local)

```bash
cd apps/os-web && pnpm exec tsx --test \
  lib/operations/pedido-known-state.test.ts \
  lib/operations/pedido-lifecycle.test.ts \
  lib/delivery/delivery-progress.test.ts \
  lib/production/update-request-work.test.ts \
  lib/work/trabajo-summary.test.ts \
  lib/work/due-visual.test.ts
```

**Result:** 16/16 **PASS** (requires `@isalwa/os-contracts` build for update-request schema import)

Hosted browser verify: **UNPROVEN** — integrator / CT3-I only.

---

## Residuals

1. Hosted BV of Pedido known-state, lifecycle strip, ops desks — **UNPROVEN**.
2. `/entregas` **Notas preparadas** stays `0` until an org-wide delivery-notes list is mounted (honest empty; per-order notes + PDF remain on Pedido detail).
3. Per-order delivery progress **Nota** stays pending on `/entregas` without a notes-by-order aggregate (Salida/Entrega use fulfillment reads).
4. Production table `dateLabel` remains `—` until a durable last-plant-fact timestamp is wired.
5. Canonical production assignee on Solicitar actualización is null unless a production owner member id is supplied — falls back to actor coordination Work.
6. Did not mutate REAL; did not deploy.

---

## Collision hygiene

- Did **not** mutate REAL tenant / REAL seven.
- Did **not** deploy.
- Did **not** edit Conversations, Map, Management, Cliente360 tab router, or Quote PDF ownership.
