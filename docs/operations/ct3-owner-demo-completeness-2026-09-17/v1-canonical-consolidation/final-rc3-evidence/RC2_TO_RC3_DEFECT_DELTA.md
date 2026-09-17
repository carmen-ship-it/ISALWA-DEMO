# RC2 → RC3 defect delta

**RC2 failed deploy SHA (immutable):** `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc`  
**RC2 BV result:** FAIL — do not continue acceptance against RC2.  
**RC3 purpose:** Bounded correction train for material hosted Pedido AccessDenied + follow-on BV honesty.

RC2 receipts under `final-rc2-evidence-8a153a4/` are **historical evidence only** — not rewritten.

---

## DEFECT (P0 product)

| Field | Value |
|---|---|
| DEFECT | Carmen Owner Evaluation (SYNTH, no View As) cannot read authorized DEMO MADERAS Pedido |
| HOSTED_REPRO_BEFORE | `/clientes/01M2PM95…/pedidos/01M2PMA280…` → AccessDenied; Resumen Pedidos=0 |
| ROOT_CAUSE | `CommercialQueryService.getOrder` / `listOrders` used legacy `canViewCommercialRecord` (owner **or** `people.admin` only). Quotes/opportunities already use `canReadOwnedRecord` / `commercial.org.read`. Carmen has `commercial.org.read`, lacks `people.admin`, Maderas order owned by `w2.asesor`. |
| AUTH_CONTRACT_CHANGED? | **YES** — orders aligned to same leadership visibility as quotes/opportunities (`resolveOwnerReadScope` + `canReadOwnedRecord`). Not a special Carmen / Pedido ID exception. |
| FILES_CHANGED (RC3-A) | `packages/os-contracts/src/queries.ts` (orders `visibility`); `packages/os-query/.../commercial-query-service.ts`; `packages/os-query/.../projection-store-port.ts`; `packages/os-database/.../prisma-projection-store.ts` (`ownerMemberIds`); `apps/os-web/lib/cliente/load-cliente-360.ts` (+ document-links, finance-summary, quote related orders, command-search lenses) |
| TEST_ADDED | `packages/os-query/src/commercial/order-owner-eval-read.test.ts`; update `leadership-visibility.test.ts` |
| HOSTED_RESULT_AFTER | Pending RC3 deploy + freeze BV |
| REGRESSION_RISK | List default remains `visibility=own` (personal lens). Org graph requires `visibility=org` + `commercial.org.read`. View As list narrowing via `commercialListQueryFromProjection` unchanged. |

## HARNESS defects (not product)

| Item | Classification |
|---|---|
| `pedido_maderas` PASS on breadcrumb "Pedido" while AccessDenied | HARNESS false positive — see `RC3_BV_FALSE_POSITIVE_AUDIT.md` |
| Playwright Chrome SIGABRT in agent sandbox | ENVIRONMENT — not a product skip |
| Coverage typeahead click on hidden `actingAdvisorMemberId` | HARNESS — UI human-usable; see `RC3_COVERAGE_UI_DIAGNOSIS.md` |

## Separation rule

Fix **product Pedido auth** first. Do not conflate with harness/environment. Do not deploy until RC3 local gate passes and tree is clean.
