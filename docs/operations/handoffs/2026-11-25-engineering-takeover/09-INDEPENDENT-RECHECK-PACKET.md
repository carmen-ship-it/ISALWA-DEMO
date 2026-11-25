# Independent recheck packet — overnight findings

**For:** existing independent reviewer (fresh conversation / separate checkout)  
**Builder:** Cursor writer `b6a344b1-1bdb-4b47-be28-1a0cab32bca6`  
**Prior reviewed candidate:** `eb8c6428793c11cef094ffd76888ea86da343241`  
**Changed candidate to recheck:** `553fdf1c6a3782a04a8cda64e85ee687ec35fd1e` (includes build fix `697068ed` + finding fixes)

## Scope of change since `eb8c6428`

| Finding | Disposition | Evidence |
| --- | --- | --- |
| API `rootDir` / `verify-workflows.seed.ts` build | **FIXED** | Exclude `*.seed.ts`; stop relative import into purchasing source; emit `@isalwa/os-purchasing` / `@isalwa/os-allocation` dist; `pnpm --filter @isalwa/os-api run build` exit 0 |
| Pedido indicators via CreateOrder projection | **IMPLEMENTED** | `overnight-browser-seed.ts` uses CreateOrder + ProjectionRunner; asserts `os_order_read_models` without manual insert |
| Spine fixture hardcoded DB/revision | **FIXED** | `spine-canonical.http.test.ts` derives database name from `OS_DATABASE_URL`; revision from env or `unspecified` |
| Dossier omits note while PDF HTTP allowed | **FIXED** | Pedido page includes API-authorized `deliveryNotes` in dossier; download flag follows successful list |
| Auth matrix list/PDF | **CARRIED** + tests | `pedido-delivery-documents.http.test.ts` 7/7 (owner, teammate, other customer, cross-tenant, team.read+report) |
| A1 two-connection concurrency | **ADDED** | `a1-dispatch-concurrency.pg.test.ts` (real disposable PG / Nest commands) |
| Elapsed 15m / 60m / 48h boundaries | **EXTENDED** | `elapsed-notice-clock.test.ts` exact 60m/15m; prior 48h exact; live catch-up test retained |
| Campana / people-admin browser | **PRIOR AWS proof** on earlier seed; CreateOrder seed + dossier UI need re-browser on AWS | |

## Suggested recheck commands (disposable Postgres)

```bash
pnpm --filter @isalwa/os-contracts build
pnpm --filter @isalwa/os-delivery build
pnpm --filter @isalwa/os-purchasing build
pnpm --filter @isalwa/os-allocation build
pnpm --filter @isalwa/os-api run build
cd apps/os-api && OS_DATABASE_URL=<disposable> OS_AUTH_MODE=dev \
  node --import tsx --test \
  src/a1-dispatch-concurrency.pg.test.ts \
  src/pedido-delivery-documents.http.test.ts \
  src/elapsed-notice-clock.live.test.ts
pnpm --filter @isalwa/os-query exec node --import tsx --test src/notifications/elapsed-notice-clock.test.ts
```

## Non-goals for this recheck

Hosted Q-DEPLOY-01 deploy, evaluation project, WhatsApp real, Mac browser.

## Builder note

Builder continues AWS CreateOrder browser + preview prep. Does **not** self-certify this recheck.
