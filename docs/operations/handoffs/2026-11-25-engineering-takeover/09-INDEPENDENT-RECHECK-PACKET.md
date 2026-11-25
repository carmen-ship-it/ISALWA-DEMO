# Independent recheck packet — overnight findings

**For:** existing independent reviewer (fresh conversation / separate checkout)  
**Builder:** Cursor writer `b6a344b1-1bdb-4b47-be28-1a0cab32bca6`  
**Prior reviewed candidate:** `eb8c6428793c11cef094ffd76888ea86da343241`  
**Changed candidate to recheck:** `556591d77e089b1ccb29773933d8c5949af5a4fe`  
(includes build fix `697068ed`, finding fixes through A1 concurrency seed/lock path)

## Scope of change since `eb8c6428`

| Finding | Disposition | Builder evidence (AWS disposable) |
| --- | --- | --- |
| API `rootDir` / `verify-workflows.seed.ts` build | **FIXED** | Exclude `*.seed.ts`; package imports for purchasing/allocation; `pnpm --filter @isalwa/os-api run build` |
| Pedido indicators via CreateOrder projection | **FIXED** + browser | `overnight-browser-seed.ts` → CreateOrder+ProjectionRunner; Playwright 1440/390 Nota/Salida/Entrega ✓ after reload (`browser-proof/results.json`, order `01M88X24P695KERMG0M65KQQK0`) |
| Spine fixture hardcoded DB/revision | **FIXED** | `spine-canonical.http.test.ts` derives DB name from `OS_DATABASE_URL` |
| Dossier omits note while PDF HTTP allowed | **FIXED** | Pedido page sets `canDownloadNotePdf` from authorized list; `composeDocumentDossier` always gets notes; unit `document-dossier.pedido-viewer.test.ts` 2/2 |
| Auth matrix list/PDF | **VERIFIED** | `pedido-delivery-documents.http.test.ts` **7/7** |
| A1 two-connection concurrency | **VERIFIED** | `a1-dispatch-concurrency.pg.test.ts` **2/2** (competing unlinked Salida lock; linked does not consume extra; unlinked past cap rolls back) — log `a1-concurrency-7.log` |
| Elapsed 15m / 60m / 48h boundaries | **VERIFIED** | unit **6/6** (`packages/os-query/.../elapsed-notice-clock.test.ts`); live **1/1** (`elapsed-notice-clock.live.test.ts`) |
| Campana Enterado persist | **BUILDER-TESTED** | Desktop/mobile: notice visible, Enterado click, reopen after reload; `afterAckLabel≥1` (desktop/mobile). Harness: runtime `browser-proof.mjs` |
| People-admin UI gate | **BUILDER-TESTED** | Admin pages 1440/390 accessible; sales seat **denied** all `/administracion*` (`admin-results.json`). Invite/role/suspend mutations: see `workforce-admin-mutation-http.test.ts` on same candidate |

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
  src/elapsed-notice-clock.live.test.ts \
  src/workforce-admin-mutation-http.test.ts
pnpm --filter @isalwa/os-query exec node --import tsx --test src/notifications/elapsed-notice-clock.test.ts
cd apps/os-web && pnpm exec tsx --test lib/commercial/document-dossier.pedido-viewer.test.ts
```

## Pins

| Field | Value |
| --- | --- |
| Repo | `carmen-ship-it/ISALWA-DEMO` |
| Branch | `wip/overnight-handoff-20261125` |
| Candidate | `556591d77e089b1ccb29773933d8c5949af5a4fe` |
| AWS checkout | `/home/ubuntu/projects/isalwa-wt-overnight-20261125` |
| Disposable DB | `isalwa_overnight_20261125_disposable` (runtime `env.sh`) |
| Writer | `b6a344b1-1bdb-4b47-be28-1a0cab32bca6` |

## Non-goals for this recheck

Hosted Q-DEPLOY-01 deploy, evaluation project, WhatsApp real, Mac browser.

## Builder note

Builder continues AWS spine/admin mutation + preview prep. Does **not** self-certify this recheck. Parent outcome remains **PARTIAL** until independent PASS + hosted journey + Carmen acceptance.
