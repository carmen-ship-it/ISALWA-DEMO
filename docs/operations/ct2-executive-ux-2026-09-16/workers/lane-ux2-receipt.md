# LANE UX-2 — INICIO + MANAGEMENT INTELLIGENCE

| Field | Value |
|---|---|
| LANE | UX-2 |
| WORKTREE | `/Users/carmen/projects/isalwa/.worktrees/ct2-lane-ux2-inicio` |
| BRANCH | `ct2/lane-ux2-inicio-management` |
| BASE_SOURCE_SHA | `1244d84ef75142d973c8f7aa44caeadd66361768` |
| INTEGRATOR | Control Tower 2 (`ct2-exec-ux-intel`) |

## Scope delivered

- Single Inicio command center: greeting, summary cards, Mi día (max 7), lens tabs **Mi trabajo | Equipo | Empresa** (not stacked).
- Removed stacked `OperatingHomes` and stacked `InicioLeadershipSection` from Inicio.
- Empresa: period metrics (7/30/90) including **Tasa cotización → pedido** (`—` when denominator 0).
- Equipo: team table (alphabetical, no ranking/scores).
- **Para revisar** + **Oportunidades de mejora** deterministic insight cards on Equipo/Empresa lenses.
- Owner **Ver ejemplo** modal with `EJEMPLO · DATOS FICTICIOS` watermark (non-persisted preview only).
- No Revenue / ranking / invented score labels on Inicio surfaces.

## Changed paths (apps/os-web)

- `app/(app)/inicio/page.tsx`
- `components/inicio/inicio-summary-cards.tsx`, `inicio-mi-dia.tsx`, `inicio-lens-tabs.tsx`
- `components/management/management-org-metrics.tsx`, `management-team-table.tsx`, `management-insights-panel.tsx`, `management-example-preview.tsx`
- `lib/inicio/*` (summary, mi-dia, page-lens, build-summary-cards)
- `lib/management/org-metrics.ts`, `team-metrics.ts`, `quote-to-order-rate.ts`, `improvement-insights.ts`, `example-preview.ts`, `party-count-by-owner.ts`

## Tests (local)

From `apps/os-web`:

```bash
npx tsx --test \
  lib/inicio/inicio-ux2.test.ts \
  lib/management/quote-to-order-rate.test.ts \
  lib/management/inicio-management.test.ts \
  lib/work/inicio-attention.test.ts \
  lib/shell/visual-system.test.ts
```

## Proof state

| State | Inicio UX-2 |
|---|---|
| IMPLEMENTED | YES |
| TESTED | YES (unit/static) |
| INTEGRATED | NO (lane branch only) |
| HOSTED | UNPROVEN |
| BROWSER-VERIFIED | UNPROVEN |

## Notes

- Shell/nav untouched (UX-1 boundary).
- Historical operating-loop / Entregas architecture not rebuilt.
