# CONTROL TOWER 2 — COLLISION MAP

BASE_SOURCE_SHA: `1244d84ef75142d973c8f7aa44caeadd66361768`
INTEGRATOR: Control Tower 2 only (`ct2/exec-ux-intelligence`)
PRIOR CT WORKTREE: DO NOT WRITE (`wave2-remediation-integrate`)

## ONE WRITER PER BOUNDARY

| Lane | Boundary (exclusive write) | May READ |
|---|---|---|
| UX-1 | `components/shell/**`, `lib/navigation/**`, `lib/capabilities/resolve-nav.ts`, `lib/shell/**`, NEW `lib/role-preview/**`, NEW `components/shell/role-preview*`, `components/operating/quick-view-host.tsx` (mount only if needed), command palette files | nav consumers |
| UX-2 | `components/inicio/**`, `components/management/**`, `components/executive/**`, `components/commercial/inicio-*`, `lib/inicio/**`, `lib/management/**`, `lib/executive/**`, `lib/leadership/**`, `lib/roles/**`, `app/(app)/inicio/**` | shell, work attention types |
| UX-3 | `components/cliente/**`, `components/party/cliente-360*`, `lib/cliente/**`, `app/(app)/clientes/**` | shell drawer host API |
| UX-4 | `components/map/**`, `lib/map/**`, `app/(app)/mapa/**` | quick-view host |
| UX-5 | `components/notifications/**`, `lib/notifications/**`, NEW anticipation under `lib/anticipation/**` + `components/anticipation/**`, `components/walkthrough/**` (training tips/quickstart only), order-prep card NEW under `components/commercial/order-prep*` | Attention/Work query APIs |
| UX-6 | `app/(app)/auditoria/**`, NEW/EXISTING audit components under `components/audit/**`, `lib/audit/**` | BusinessEvent query |
| UX-7 | `app/(app)/finanzas/**`, `app/(app)/trabajo/**`, `app/(app)/aprobaciones/**`, `app/(app)/incidencias/**`, `app/(app)/almacen/**`, `app/(app)/entregas/**`, `app/(app)/produccion/**`, matching `components/{finance,work,delivery,production,warehouse}/**` visual cleanup only | — |
| UX-8 | `components/ai/**`, `apps/os-api` AI adapters/controllers only, AI evidence docs under ct2 receipts | auth scopes |
| UX-9 | FINAL VERIFIER — Control Tower only; no parallel writer | all |

## SHARED CONTRACTS (read-only to writers; CT integrates)

- Do not edit `packages/os-contracts` schemas unless lane owns a required additive field — prefer UI projection over schema change.
- Do not mutate REAL_SEVEN tenant / import batch.
- Credentials: local-secret only; never echo.

## INTEGRATION ORDER

1. UX-1 (shell/nav/preview)  
2. UX-5 (notifications mount into shell)  
3. UX-2, UX-3, UX-4, UX-6, UX-7 (parallel-safe after exclusive paths)  
4. UX-8 (non-blocking)  
5. UX-9 hosted BV by Control Tower
