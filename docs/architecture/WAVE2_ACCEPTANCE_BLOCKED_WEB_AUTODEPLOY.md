# Wave 2 — acceptance blocked: web Auto-Deploy still ON

**Date:** 2026-09-14  
**Hosted candidate:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc` (API+web live)  
**Stop reason:** `os-web-staging` **Auto-Deploy = yes**  
**Fixtures created:** **NO** · **Acceptance gauntlet:** **NOT STARTED**  
**Pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` unchanged

## Proven config

| Service | Auto-Deploy | Pre-Deploy |
|---|---|---|
| os-api-staging | **OFF** (`no`) | blank |
| os-web-staging | **ON** (`yes`) | none |

Live SHA both services: `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`

## Why agent stopped

1. Pass rule: do not continue acceptance while web can drift automatically.  
2. Render CLI `services update` exposes `--auto-deploy` **enable only** — no disable flag.  
3. Direct Render API PATCH with CLI session material returned **401**.  
4. Changing Dashboard Auto-Deploy may trigger `service_updated` (same risk as preDeploy clear).

## Exact Carmen click instructions

1. Open [Render Dashboard](https://dashboard.render.com) → service **`os-web-staging`**  
2. **Settings** → **Build & Deploy**  
3. Find **Auto-Deploy**  
4. Current: **Yes / On**  
5. Set to **No / Off**  
6. **Save**  
7. Note: Save may trigger an incidental redeploy of the **currently configured commit** (expect `ef7eeab…` if that is still the live tip — **not** a new Wave 2 candidate).  
8. Confirm Settings show Auto-Deploy **Off**  
9. Confirm live deploy SHA still `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
10. Then re-authorize: **synthetic fixtures + hosted acceptance**

### Rollback

Turn Auto-Deploy back **On** in the same Settings page (not recommended during acceptance).

## Not done this pass

- Synthetic tenant / users  
- Capability grants  
- Role-home validation  
- Acceptance Gauntlet  
- Browser verification  

## Planned capabilities (reference only — not granted)

From `packages/os-contracts/src/v1-planned-assignments.ts` (cargo grants nothing):

| Function | Intended capabilities (planned) |
|---|---|
| Asesor Comercial | `commercial.customer.create`, `commercial.quote.convert.own` |
| Jefe Comercial | `commercial.team.read` |
| Gerente General | `management.org.read` |
| Encargado de Producción | `production.operational.record`, `production.entry.member` |
| Encargado de Almacén | `warehouse.finished_goods.receive`, `warehouse.finished_goods.allocate`, `warehouse.outbound.record` |
| Encargada de Compras | `purchasing.operational.record` |
| Contabilidad | `finance.operational.record` |
| Auxiliar/Coordinación | `operations.coordinator.record`, `coordination.decision.record` |
| Owner/Super Admin | `management.org.read`, `system.admin` |

Explicitly **not** auto-granted: `delivery.record`, `commercial.order.convert`, `commercial.exception.authorize`, `production.review.member`, `people.admin`.

## Proof states (unchanged)

MIGRATED=YES · DEPLOYED=YES · HOSTED=YES · BROWSER-VERIFIED=**NO** · USER-ACCEPTED=**NO** · SAFE FOR ISA/ÁLVARO=**NO**
