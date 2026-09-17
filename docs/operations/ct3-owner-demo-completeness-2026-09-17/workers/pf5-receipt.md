# PF-5 — Demo map + management

**Lane:** PF-5  
**Branch:** `ct3/pf5-demo-map-mgmt`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-pf5-demo-map-mgmt`  
**Base:** `6327f43c57f309227906931f6cc08ae54033410e`  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy / hosted:** **UNPROVEN**  
**seed.ts:** not touched (catalog lat/lng already seeded)

## Delivered

| Capability | State |
|---|---|
| Map demo filter (DEMO parties only; no REAL seven geo mix) | **IMPLEMENTED** (pre-existing page filter retained) |
| Portfolio: Clientes / Oportunidades / Valor cotizado / Valor de pedidos | **IMPLEMENTED** + **TESTED** |
| Hover + drawer (valor labels; no Revenue) | **IMPLEMENTED** + **TESTED** |
| `data-map-demo-boundary` when `datos=demo` | **IMPLEMENTED** |
| Gerencia funnel Opp→Cot→Pedidos from demo records | **IMPLEMENTED** + **TESTED** |
| No Revenue / Profit / Margin / salesperson table in demo | **IMPLEMENTED** + **TESTED** |
| `lente=gerencia` → Empresa org lens (Story deep-link) | **IMPLEMENTED** + **TESTED** |

## Files

- `apps/os-web/app/(app)/mapa/page.tsx` — clientCount + dataMode passthrough
- `apps/os-web/components/map/map-experience.tsx` — portfolio labels + demo boundary attr
- `apps/os-web/lib/map/commercial-lens.ts` (+ test) — `clientCount`
- `apps/os-web/lib/management/demo-lens.ts` (+ test) — party filter + hide team table in demo
- `apps/os-web/app/(app)/inicio/page.tsx` — **minimal mount only**: wire management funnel/metrics through `demo-lens` (does not change PF-1 responsibility list filtering)
- `apps/os-web/lib/inicio/page-lens.ts` — `gerencia` alias for org lens
- Receipt: this file

## Tests

```bash
cd apps/os-web && node --import tsx --test \
  lib/map/commercial-lens.test.ts \
  lib/map/hover-model.test.ts \
  lib/map/pending-location.test.ts \
  lib/map/map-desk.test.ts \
  lib/management/commercial-funnel.test.ts \
  lib/management/org-metrics.test.ts \
  lib/management/demo-lens.test.ts \
  lib/inicio/inicio-ux2.test.ts
# → 29 pass / 0 fail
```

## Residuals

- Hosted MAP_BV / MANAGEMENT_BV on this tip: **UNPROVEN**
- `selectedLastUpdatedIso` still null on map (no party update clock)
- Integrator must reconcile inicio mount with PF-1 if both touch `inicio/page.tsx`
