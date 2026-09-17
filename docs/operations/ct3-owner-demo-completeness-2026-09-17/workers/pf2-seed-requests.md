# PF-2 → PF-1 seed requests

**From:** PF-2 (`ct3/pf2-demo-operations`)  
**To:** PF-1 fixture owner (`seed.ts` — do not edit from PF-2)  
**At:** 2026-09-17  

UI density reads existing SoR + `seeded-ids.json` FG citations. No new invented stock/PO/stages.

## Already expected from `ensureDemoDeskDensity` (re-apply if not live)

Idempotent SYNTH-only creates already coded in seed — confirm applied on staging:

| Spec | Purpose |
|---|---|
| Work `Revisión de producción · {O-…}` with `[[order-prep:production:{orderId}]]` on MADERAS | Producción review density |
| Work `Revisión de almacén · {O-…}` with `[[order-prep:warehouse:{orderId}]]` | Almacén review |
| Work `Revisión de abastecimiento · {O-…}` with `[[order-prep:purchasing:{orderId}]]` | Compras supply review |
| Work dues: today / due-soon / overdue / completed DEMO titles | Trabajo Para hoy / Vencido / Próximo |
| Issues: open + in_progress(assigned) + resolved for FERRETERÍA with DEMO titles + order refs | Incidencias tabs |
| Commitments: client due-soon + team (null party) + fulfilled MADERAS | Compromisos buckets |
| FG receipts + DN for MADERAS / HOTEL; Salida+Entrega only where seed already loops | Entregas Nota/Salida/Entrega |

## Bounded extras (optional — only if densify re-apply still thin)

1. **Publish `warehouseExitId` / `deliveryId` into `seeded-ids.json`** for MADERAS (and HOTEL if created) so Almacén/Entregas can cite without only relying on fulfillment list APIs.
2. **Ensure `in_progress` FERRETERÍA issue owner** is a member visible to common owner-demo actors (`w2.coordinacion` / people-admin) so “Asignadas a mí” is non-empty for BV roles — do not invent SLA.
3. **Do not** invent stock quantities, automatic PO, or factory stage machines.

## Out of scope for PF-1 from this lane

- Org-wide finished-goods list HTTP API (FG citation uses seeded id map in Demo mode only).
- REAL seven mutation — refuse.
