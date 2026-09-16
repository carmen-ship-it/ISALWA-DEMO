# Entregas operational write desk — Control Tower integrate receipt

**When:** 2026-09-16  
**Branch tip:** `095bb7f952e38f2304ab60bfcaff56f29c8797f0`  
**Prior LIVE:** `5ca147207508c93f083e6cf141547f54c45e6eb0` (auth fix)  
**Deploy started:** WEB `dep-dalhglu1egvs73ekihhg` · API `dep-dalhgm65vjqs73fe2j7g` @ `095bb7f…`

## Intent closed

Warehouse/delivery writers must mutate from `/entregas` without commercial-read on `/clientes/…/pedidos/…`.

## What shipped

| Surface | Change |
|---|---|
| API `GET /delivery-ops/orders` | Open pedidos + lines + customer display name; scopes: `delivery.record` OR `warehouse.outbound.record`; **no money** |
| API `GET /delivery-ops/orders/:id/documents` | Notes + derived timeline for same scopes (read ≠ create) |
| Web `/entregas` | `EntregaOperationalWriteDesk` + order picker (`?orderId=`) + `DeliveryDocumentsPanel` |
| Panel CTAs | Nota/Entrega only if `delivery.record`; Salida only if `warehouse.outbound.record` |
| Actions | `revalidatePath('/entregas')` after mutate |
| Staging grant script | `packages/os-database/src/staging-synth-delivery-record-grant.ts` → SYNTH `w2.coordinacion` + `delivery.record` only |

## Auth proof (code)

- Uses normal session + membership scopes (`resolveSession` / `loadMemberCapabilities`)
- Does **not** introduce `auth.mode==='dev'`
- Does **not** use `people.admin` / `system.admin` shortcuts
- Does **not** broaden commercial-read

## Hosted BV status

Prior re-BV @ `5ca1472` proved auth fix LIVE but Nota/Salida/Entrega **UNPROVEN** (no Entregas write desk; `delivery.record` unassigned on wave2 personas).

Post-`095bb7f` BV: **in flight** (deploy build + SYNTH grant + hosted walk). Do not claim BROWSER_VERIFIED until that receipt lands.

## REAL_SEVEN_MUTATED

**NO** (SYNTH-only design; grant targets SYNTH org `…H9G5` only).
