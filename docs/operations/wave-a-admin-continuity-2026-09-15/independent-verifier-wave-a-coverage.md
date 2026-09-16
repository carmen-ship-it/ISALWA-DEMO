# Independent hosted verifier — Wave A customer coverage P0

**Date:** 2026-09-15 / 2026-09-16 UTC  
**Role:** Independent hosted verifier (not implementation author)  
**Host:** https://os-web-staging.onrender.com  
**API:** https://os-api-staging.onrender.com  

## Exact deploy candidate (ONE SHA)

`fc38ebe4f6a445aa1504436040aab257bbd33a4c`

| Service | Deploy ID | Commit | Match |
| --- | --- | --- | --- |
| os-web-staging | `dep-dal13ltg1s2s73ds7b5g` | `fc38ebe…` | **PASS** |
| os-api-staging | `dep-dal13m5bedkc73as9kr0` | `fc38ebe…` | **PASS** |

Health `/v1/health` + `/v1/health/ready`: **200**

### Relation to prior continuity SHA

| Era | SHA | Scope |
| --- | --- | --- |
| B — continuity close | `a97e17e156f58648beac4c0cd78d3245cc614e85` | SYNTH people.admin work reassign → terminate → history |
| **C — coverage P0 (this receipt)** | **`fc38ebe…`** | Adds `OsCustomerCoverageGrant` to termination preflight + split-authority UX |

## Actor

| Field | Value |
| --- | --- |
| Email | `w2.people-admin@isalwa.demo` |
| Org | `01M2JKF77TXMJNDTKNCYNHH9G5` (**SYNTH only**) |
| Scopes | `people.admin` only — **no** commercial coverage mutate authority |
| Coverage resolution command | **NONE** — **FOUNDATION_GAP** |

Authorized coverage product actor: **NONE** (no Grant/Revoke/ReplaceCoverage command).  
Resolve stand-in for acceptance only: fixture `WAVE_A_REVOKE_ACTIVE_COVERAGE=1` (SYNTH ops tooling; not people.admin UI power).

## Matrix

Artifacts:

- Block phase: `~/.isalwa-secrets/_verifier-wave-a-coverage-out/wave-a-coverage-report.json`
- Resolve phase: `~/.isalwa-secrets/_verifier-wave-a-coverage-out/wave-a-coverage-resolve-report.json`

| Line | Verdict |
| --- | --- |
| Coverage in termination impact | **PASS** |
| Termination blocked while active coverage | **PASS** |
| Blocker identifies customer / responsibility (Spanish) | **PASS** |
| Split-authority UX (no capability-key leak) | **PASS** |
| people.admin gains no coverage power | **PASS** |
| Acting coverage blocks | **PASS** |
| Expired/revoked alone do not block | **PASS** |
| Cross-tenant denied | **PASS** |
| Mobile 390 usable | **PASS** |
| Canonical resolution command | **FOUNDATION_GAP** (`NONE`) |
| Preflight refresh after coverage resolved | **PASS** |
| people.admin cannot call coverage mutate command | **PASS** |
| Termination after resolution | **PASS** |
| History preserved (access-history + grant rows retained revoked) | **PASS** |

## REAL tenant (read-only)

Org `01M2DV9F0V5DXS4G89AKF4D5SR`

| Metric | Before | After |
| --- | --- | --- |
| Parties | 18 | 18 |
| Active customers | 7 | 7 |
| Members | 3 | 3 |
| Coverage grants | 0 | 0 |

**REAL MUTATIONS = NONE**  
**PROTECTED SEVEN = UNCHANGED**

## Verdict

**CUSTOMER COVERAGE CONTINUITY: PASS** (fail-closed preflight + UX; resolution command remains FOUNDATION_GAP)  
**HOSTED INDEPENDENT BV: PASS**  
**Wave B: NOT STARTED**
