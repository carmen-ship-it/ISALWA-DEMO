# SUPERSESSION MAP

Do not treat old PASS receipts as current truth. Historical evidence kept; status updated.

| OLD_SHA / RECEIPT | WHAT_IT_CLAIMED | CURRENT_STATUS | SUPERSEDED_BY | WHY |
|---|---|---|---|---|
| `f2740d1` (forensic baseline era) | Early CT3 demo densify / PF baseline | SUPERSEDED | later OA + `8e24b7f` live | Product truth moved; use as history only |
| `e5f6d3a` | Post-PF finance/barrel era completeness | SUPERSEDED | OA-1..7 + scope correction | Demo context + membership model corrected |
| `4900634` (if cited in prior packets) | Intermediate owner-demo ship claim | SUPERSEDED | `8e24b7f` / `5032e6c` | Runtime + membership evolved |
| PF-8 BV receipts (pre-OA) | Owner demo “complete enough” | SUPERSEDED | OA collision map | Demo cookie vs REAL company shadowing |
| OA-1 Demo=SYNTH apply | Demo mode uses SYNTH org | DEPLOYED @ `8e24b7f` | — | Still true on live; not View As complete |
| Carmen SYNTH + admin strip `994a138` | Min scopes without people.admin/QA | DEPLOYED @ `8e24b7f` | local full business-eval comment/clarify | Live has strip; local clarifies **full V1 business coverage** meaning |
| Owner BV PASS `a225dfa` | Carmen can evaluate after scope fix | PARTIAL / SUPERSEDED for View As | pending `V1_OWNER_REVIEW_RC` | Did not prove data-narrowing View As |
| Live runtime `8e24b7f` | Current hosted web+API | **LIVE** | next RC only | Ahead commits `a225dfa..5032e6c` not deployed; dirty CR-2/3 local |
| Tip `5032e6c` | Role preview gate with management.org.read | COMMITTED+PUSHED, **not deployed** | RC deploy | Supercedes older “needs system.admin” gate claim |
| Any “View As PASS” before EvaluationProjection | Cosmetic nav-only preview | SUPERSEDED | local EvaluationProjection work | Must not claim HOSTED_PROVEN |

## Deployment candidates (release train)

| Candidate | SHA | Status |
|---|---|---|
| Pre-train micro-deploys | many SHAs through `8e24b7f` | FROZEN history — do not erase |
| `V1_OWNER_REVIEW_RC` | **NOT CUT** | Blocked on View As remaining surfaces + clean tests |

See also: `SUPERSEDED_CLAIM_REGISTER.md`.
