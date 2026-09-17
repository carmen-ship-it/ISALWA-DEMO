# PF-2 — Demo operations density receipt

**Date:** 2026-09-17  
**Lane:** PF-2 (DEMO OPERATIONS DENSITY)  
**Branch:** `ct3/pf2-demo-operations`  
**Base:** `6327f43c57f309227906931f6cc08ae54033410e`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-pf2-demo-operations`  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy:** not performed (worker lane)  
**Hosted:** **UNPROVEN**

---

## Delivered

| Desk | Density | Proof |
|---|---|---|
| Producción | Pedido rows + open production review Work link | IMPLEMENTED |
| Almacén | Pedido context + warehouse review + Demo FG citation (seeded-ids) | IMPLEMENTED + TESTED (citations) |
| Compras | Linked pedidos + supply review from order-prep Work | IMPLEMENTED |
| Entregas | Nota/Salida/Entrega from notes + exits + deliveries | IMPLEMENTED |
| Trabajo | Existing due buckets (Para hoy / Vencido / Próximo / Sin fecha) preserved | IMPLEMENTED (prior) |
| Incidencias | StatGroup Abiertas / Asignadas a mí / Resueltas | IMPLEMENTED |
| Compromisos | Vence pronto / Equipo / Cumplidos buckets | IMPLEMENTED + TESTED |

Honesty: no invented stock, automatic PO, or factory stages. FG “Ingreso PT citado” is Demo-only from `seeded-ids.json`, not stock available.

---

## Files

- `apps/os-web/app/(app)/produccion/page.tsx`
- `apps/os-web/app/(app)/almacen/page.tsx`
- `apps/os-web/app/(app)/compras/page.tsx`
- `apps/os-web/app/(app)/entregas/page.tsx`
- `apps/os-web/app/(app)/incidencias/page.tsx`
- `apps/os-web/app/(app)/compromisos/page.tsx`
- `apps/os-web/components/production/production-ops-table.tsx`
- `apps/os-web/lib/delivery/load-entregas.ts`
- `apps/os-web/lib/delivery/map-fulfillment.ts`
- `apps/os-web/lib/purchasing/load-linked-orders.ts`
- `apps/os-web/lib/commitments/desk-buckets.ts` (+ test)
- `apps/os-web/lib/warehouse/demo-fg-citations.ts` (+ test)
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/workers/pf2-seed-requests.md`
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/workers/pf2-receipt.md`

Did **not** edit `packages/os-database/src/owner-demo/seed.ts`.

---

## Tests run (local)

```bash
cd apps/os-web && tsx --test \
  lib/commitments/desk-buckets.test.ts \
  lib/warehouse/demo-fg-citations.test.ts \
  lib/delivery/delivery-progress.test.ts
```

**Result:** 8/8 **PASS**

Hosted BV: **UNPROVEN**.

---

## Residuals

1. SYNTH densify re-apply / PF-1 seed requests — see `pf2-seed-requests.md`.
2. Org-wide FG receipt list API absent — Demo citations use seeded id map only.
3. Incidencias “Asignadas a mí” depends on actor matching seed owner.
4. Hosted browser verify — integrator / PF-8.
