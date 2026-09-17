# RC3 STATUS SNAPSHOT (mid-train)

**As of:** 2026-09-17  
**RC2 failed SHA (immutable):** `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc`  
**RC2_BV_RESULT:** FAIL  
**FULL_BUSINESS_LOOP_CLOSED:** NO  

Do **not** begin Carmen product acceptance against RC2.  
Do **not** invite Isa/Álvaro on RC2.

---

## Separation

| Class | Finding |
|---|---|
| **PRODUCT P0** | Owner-eval Pedido AccessDenied — orders used `people.admin`/owner gate; quotes used `commercial.org.read` |
| **PRODUCT consequence** | Cliente360 Pedidos=0 (own-lens list) |
| **HARNESS** | `pedido_maderas` false positive on breadcrumb |
| **HARNESS** | Coverage click targeted hidden input |
| **ENVIRONMENT** | Playwright Chrome SIGABRT in agent sandbox |

---

## RC3-A product fix (landed locally, not deployed)

**Auth contract:** `listOrders` / `getOrder` aligned to `resolveOwnerReadScope` + `canReadOwnedRecord` (same as quotes).  
`ListOrdersQuery.visibility` added. Cliente360 / search / document / finance party lists request `visibility=org` with own fallback.

**Local tests:** `order-owner-eval-read.test.ts` A–G PASS; leadership-visibility orders assertion updated PASS.

**RC3_SHA:** not cut yet (tree still dirty; more lanes pending).  
**Deploy:** not authorized until local gate + clean tree.

---

## Gate board (honest)

| Gate | Status |
|---|---|
| OWNER_EVAL_MADERAS_PEDIDO | LOCAL PASS — HOSTED UNPROVEN |
| CLIENTE360_GRAPH_COHERENT | LOCAL PASS (graph source) — HOSTED UNPROVEN |
| TEMPORARY_COVERAGE_* | HARNESS diagnosis PASS; hosted mutate UNPROVEN |
| FULL_COMMERCIAL_LOOP_HOSTED | PARTIAL from RC2 (Q-000007); RC3 continue after deploy |
| FULL_POST_SALE_LOOP_HOSTED | BLOCKED on Pedido auth until hosted re-prove |
| VIEW_AS / SEARCH / NEGATIVES / MOBILE | UNPROVEN |
| FALSE_POSITIVE_ASSERTIONS_FIXED | AUDITED — harness rewrite pending |
| SAFE_TO_BEGIN_CARMEN_PRODUCT_ACCEPTANCE | **NO** |
| SAFE_TO_INVITE_ISA_ALVARO | **NO** |
| USER_ACCEPTED | **NO** |
| AI_OWNER_REVIEW_READY | **NO** |
| REAL_SEVEN_MUTATED | **NO** |

Evidence: `final-rc3-evidence/`
