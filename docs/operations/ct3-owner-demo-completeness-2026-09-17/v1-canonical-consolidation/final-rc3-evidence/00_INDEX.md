# RC3 evidence index

**Status:** IN PROGRESS — correction train open  
**RC2 failed SHA (immutable):** `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc`  
**RC2 BV:** FAIL — do not treat as owner-review ready

## Documents

| Doc | Purpose |
|---|---|
| `RC2_TO_RC3_DEFECT_DELTA.md` | Defect / root cause / contract change |
| `RC3_PEDIDO_AUTH_TRACE.md` | Exact auth decision path (pre-fix trace) |
| `RC3_VIEW_AS_ORDER_NARROWING.md` | View As Pedido/Quote leak after RC3-A + web gate fix |
| `RC3_BV_FALSE_POSITIVE_AUDIT.md` | Harness assertion hardening (audit) |
| `RC3_BV_ASSERTIONS_REWRITTEN.md` | RC3-B rewritten assertions — `FALSE_POSITIVE_ASSERTIONS_REMAINING = 0` |
| `rc3-bv-assert-resource.mjs` | Durable `assertResourceLoaded` helper |
| `rc3-hosted-bv-assertions.mjs` | Hardened checks catalog (Pedido…Work) |
| `harness/` | Patched RC2 hosted BV runners (deny-aware) |
| `RC3_COVERAGE_UI_DIAGNOSIS.md` | Coverage typeahead = harness |
| `RC3_COVERAGE_LOCAL_PROOF.md` | Grant/revoke/convert unit proof (local PASS) |
| `RC3_SEARCH_NEGATIVES_LOCAL.md` | Command-search / demo-real / evaluation negatives (local PASS) |
| `RC3_COMMERCIAL_LOOP_PRECONDITIONS.md` | Line/send/convert local + SYNTH Q-000007 continuation IDs |
| `RC3_POSTSALE_CONTRACT_LOCAL.md` | Approval≠Pedido, Nota≠Salida, Pedido read (local PASS) |
| `RC3_CLIENTE360_GRAPH_LOCAL.md` | load-cliente-360 + order-owner-eval G (local PASS) |

## Preserve

- RC1 evidence folders
- RC2 `final-rc2-evidence-8a153a4/` including `FINAL_RC2_RECEIPT.md` (do not rewrite)

## RC3 local gate (before deploy)

| Gate | Status |
|---|---|
| OWNER_EVAL_PEDIDO_ACCESS | LOCAL PASS — see `RC3_POSTSALE_CONTRACT_LOCAL.md` / order-owner-eval A (hosted pending) |
| CLIENTE360_PEDIDO_GRAPH | LOCAL PASS — see `RC3_CLIENTE360_GRAPH_LOCAL.md` (hosted pending) |
| VIEW_AS_PEDIDO_PROJECTIONS | LOCAL FIX APPLIED — see `RC3_VIEW_AS_ORDER_NARROWING.md` (hosted BV pending) |
| CROSS_TENANT_PEDIDO_DENY | LOCAL PASS — order-owner-eval D–F (`RC3_SEARCH_NEGATIVES_LOCAL.md`) |
| SEARCH_NEGATIVES_LOCAL | **PASS** — see `RC3_SEARCH_NEGATIVES_LOCAL.md` |
| COMMERCIAL_LOOP_PRECONDITIONS | **PASS** (local) — see `RC3_COMMERCIAL_LOOP_PRECONDITIONS.md` |
| POSTSALE_CONTRACT_LOCAL | **PASS** — see `RC3_POSTSALE_CONTRACT_LOCAL.md` |
| BV_FALSE_POSITIVE_ASSERTIONS_FIXED | **PASS** — see `RC3_BV_ASSERTIONS_REWRITTEN.md` |
| COVERAGE_HUMAN_USABLE | PASS (diagnosis) |
| COVERAGE_GRANT_REVOKE_TESTABLE | LOCAL UNIT PASS — see `RC3_COVERAGE_LOCAL_PROOF.md` (hosted BV pending) |
| LOCAL_SECURITY_PACK | PENDING |
| BUILD | PENDING |
| DIRTY_TREE | dirty until integrate |

## Verdict so far

| Fact | Value |
|---|---|
| SAFE_TO_BEGIN_CARMEN_PRODUCT_ACCEPTANCE | **NO** |
| SAFE_TO_INVITE_ISA_ALVARO | **NO** |
| USER_ACCEPTED | **NO** |
| AI_OWNER_REVIEW_READY | **NO** |
| REAL_SEVEN_MUTATED | **NO** |
